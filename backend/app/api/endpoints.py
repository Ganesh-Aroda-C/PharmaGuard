import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.config import settings
from backend.app.database.session import get_db
from backend.app.database.models import (
    AdverseEventReportModel,
    AgentRunModel,
    AgentStepModel,
    AssessmentResultModel,
    QuarantinedSubmissionModel,
    ReviewerFeedbackModel,
    EvaluationRunModel
)
from backend.app.schemas.report import (
    AdverseEventReportCreate,
    ReportSubmissionResponse,
    FeedbackCreate,
    FeedbackResponse,
    RunStatus
)
from backend.app.guardrails.injection import GuardrailEngine
from backend.app.guardrails.rate_limiter import rate_limiter
from backend.app.guardrails.circuit_breaker import CircuitBreaker
from backend.app.ingestion.indexer import IngestionPipeline
from backend.app.tasks.worker import dispatch_run_task
from backend.app.observability.metrics import (
    HTTP_REQUESTS_TOTAL,
    REPORT_SUBMISSIONS_TOTAL,
    AGENT_RUNS_TOTAL,
    get_metrics_payload
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------
# F1 & F2: Strict Ingestion Boundary & Report Submission
# ---------------------------------------------------------
@router.post(
    "/reports",
    response_model=ReportSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Validate and submit synthetic adverse event report"
)
async def submit_adverse_event_report(
    raw_request: Request,
    db: Session = Depends(get_db)
):
    """
    Strict Ingestion Boundary:
    - Enforces schema, range, categorical, and chronology validation.
    - Inspects for prompt injection attempts.
    - Rate limits per client.
    - Rejects and quarantines malformed or injected submissions with field-level errors before any agent starts!
    - Deduplicates identical submissions via idempotency_key.
    """
    client_ip = raw_request.client.host if raw_request.client else "127.0.0.1"

    # Rate limiting check (Cost control per client)
    allowed, remaining = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum allowable requests per minute reached for this client."
        )

    try:
        body_bytes = await raw_request.body()
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        REPORT_SUBMISSIONS_TOTAL.labels(status="quarantined").inc()
        quarantine = QuarantinedSubmissionModel(
            raw_payload={"raw": str(body_bytes)},
            field_errors=[{"field": "body", "error": f"Invalid JSON payload: {str(e)}"}],
            rejection_reason="Malformed JSON syntax at ingestion boundary",
            source_ip=client_ip
        )
        db.add(quarantine)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "Malformed JSON syntax", "quarantined_id": quarantine.id}
        )

    # Validate against strict Pydantic model
    try:
        report_in = AdverseEventReportCreate(**payload)
    except ValidationError as val_err:
        REPORT_SUBMISSIONS_TOTAL.labels(status="quarantined").inc()
        errors = [
            {"loc": err["loc"], "msg": err["msg"], "type": err["type"]}
            for err in val_err.errors()
        ]
        quarantine = QuarantinedSubmissionModel(
            idempotency_key=payload.get("idempotency_key"),
            raw_payload=payload,
            field_errors=errors,
            rejection_reason="Pydantic schema / range / chronology validation failure at ingestion boundary",
            source_ip=client_ip
        )
        db.add(quarantine)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Report rejected at ingestion boundary before agent execution",
                "quarantined_record_id": quarantine.id,
                "field_errors": errors
            }
        )

    # Prompt injection & toxicity defense on free-text inputs
    is_safe, reasons = GuardrailEngine.inspect_text_input(report_in.reaction_description)
    if not is_safe:
        REPORT_SUBMISSIONS_TOTAL.labels(status="quarantined").inc()
        quarantine = QuarantinedSubmissionModel(
            idempotency_key=report_in.idempotency_key,
            raw_payload=payload,
            field_errors=[{"field": "reaction_description", "error": r} for r in reasons],
            rejection_reason="Prompt injection / security guardrail policy violation",
            source_ip=client_ip
        )
        db.add(quarantine)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Report rejected due to security guardrail violation (Prompt Injection detected)",
                "quarantined_record_id": quarantine.id,
                "reasons": reasons
            }
        )

    # Idempotency / Deduplication check
    existing_report = db.query(AdverseEventReportModel).filter(
        AdverseEventReportModel.idempotency_key == report_in.idempotency_key
    ).first()

    if existing_report:
        # Return existing active or completed run
        existing_run = db.query(AgentRunModel).filter(AgentRunModel.report_id == existing_report.id).first()
        if existing_run:
            logger.info(f"Duplicate submission detected with idempotency_key '{report_in.idempotency_key}'. Returning existing run {existing_run.id}.")
            return ReportSubmissionResponse(
                run_id=existing_run.id,
                case_id=existing_report.case_id,
                correlation_id=existing_run.correlation_id,
                status=RunStatus(existing_run.status),
                created_at=existing_run.started_at,
                message="Idempotent response: Returning existing evaluation run for duplicate idempotency key."
            )

    # Persist validated report
    correlation_id = f"corr-{uuid.uuid4().hex[:12]}"
    run_id = str(uuid.uuid4())

    db_report = AdverseEventReportModel(
        case_id=report_in.case_id or f"CASE-{uuid.uuid4().hex[:8].upper()}",
        idempotency_key=report_in.idempotency_key,
        suspect_drug=report_in.suspect_drug,
        product_identifier=report_in.product_identifier,
        reaction_description=report_in.reaction_description,
        patient_age=report_in.patient_age,
        patient_age_group=report_in.patient_age_group,
        patient_sex=report_in.patient_sex.value,
        drug_start_date=report_in.drug_start_date.isoformat() if report_in.drug_start_date else None,
        drug_stop_date=report_in.drug_stop_date.isoformat() if report_in.drug_stop_date else None,
        event_onset_date=report_in.event_onset_date.isoformat() if report_in.event_onset_date else None,
        onset_relative_days=report_in.onset_relative_days,
        is_death=report_in.is_death,
        is_hospitalized=report_in.is_hospitalized,
        is_life_threatening=report_in.is_life_threatening,
        is_disability=report_in.is_disability,
        is_congenital_anomaly=report_in.is_congenital_anomaly,
        is_other_medically_important=report_in.is_other_medically_important,
        hospitalization_admission_date=report_in.hospitalization_admission_date.isoformat() if report_in.hospitalization_admission_date else None,
        hospitalization_discharge_date=report_in.hospitalization_discharge_date.isoformat() if report_in.hospitalization_discharge_date else None,
        outcome=report_in.outcome.value,
        reporter_type=report_in.reporter_type.value,
        source_type=report_in.source_type.value,
        medical_history=report_in.medical_history,
        concomitant_medications=report_in.concomitant_medications,
        raw_payload=payload
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Create Agent Run
    db_run = AgentRunModel(
        id=run_id,
        report_id=db_report.id,
        correlation_id=correlation_id,
        status="queued",
        prompt_version=settings.DEFAULT_PROMPT_VERSION,
        rule_version=settings.DECISION_RULE_VERSION,
        started_at=datetime.utcnow()
    )
    db.add(db_run)
    db.commit()

    REPORT_SUBMISSIONS_TOTAL.labels(status="accepted").inc()

    # Dispatch asynchronous execution
    dispatch_run_task(run_id)

    return ReportSubmissionResponse(
        run_id=run_id,
        case_id=db_report.case_id,
        correlation_id=correlation_id,
        status=RunStatus.QUEUED,
        created_at=db_run.started_at,
        message="Report validated and queued for asynchronous multi-agent triage."
    )


# ---------------------------------------------------------
# Run Status & Results Polling Endpoint
# ---------------------------------------------------------
@router.get("/runs/{run_id}", summary="Retrieve current run status and assessment results")
def get_run_status(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    result_payload = None
    if run.assessment:
        a = run.assessment
        result_payload = {
            "case_id": run.report.case_id,
            "suspect_drug": a.suspect_drug,
            "reported_reaction": a.reported_reaction,
            "matched_medical_terms": a.matched_medical_terms,
            "is_serious": a.is_serious,
            "seriousness_criteria_met": a.seriousness_criteria_met,
            "seriousness_rationale": a.seriousness_rationale,
            "is_expected": a.is_expected,
            "expectedness_rationale": a.expectedness_rationale,
            "recommended_route": a.recommended_route,
            "reporting_timeline_days": a.reporting_timeline_days,
            "modifying_provisions_applied": a.modifying_provisions_applied,
            "route_rationale": a.route_rationale,
            "confirmed_facts": a.confirmed_facts,
            "missing_facts": a.missing_facts,
            "inferred_interpretations": a.inferred_interpretations,
            "citations": a.citations,
            "all_citations_verified": a.all_citations_verified,
            "confidence_score": a.confidence_score,
            "confidence_explanation": a.confidence_explanation,
            "escalation_required": a.escalation_required,
            "escalation_reason": a.escalation_reason,
            "prompt_version": a.prompt_version,
            "rule_version": a.rule_version,
            "regulatory_disclaimer": (
                "DECISION SUPPORT RECOMMENDATION ONLY: This assessment is generated by an automated multi-agent "
                "pharmacovigilance triage service. The system NEVER submits a regulatory report automatically. "
                "All recommendations must be evaluated and authorized by a qualified pharmacovigilance professional."
            )
        }

    return {
        "run_id": run.id,
        "case_id": run.report.case_id if run.report else None,
        "correlation_id": run.correlation_id,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "total_duration_ms": run.total_duration_ms,
        "total_prompt_tokens": run.total_prompt_tokens,
        "total_completion_tokens": run.total_completion_tokens,
        "total_cost_usd": run.total_cost_usd,
        "error_message": run.error_message,
        "escalation_reason": run.escalation_reason,
        "assessment": result_payload
    }


# ---------------------------------------------------------
# Trace Inspection Endpoint
# ---------------------------------------------------------
@router.get("/runs/{run_id}/trace", summary="Inspect detailed multi-agent execution trace")
def get_run_trace(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    steps = db.query(AgentStepModel).filter(AgentStepModel.run_id == run_id).order_by(AgentStepModel.step_index).all()

    return {
        "run_id": run.id,
        "correlation_id": run.correlation_id,
        "case_id": run.report.case_id if run.report else None,
        "status": run.status,
        "prompt_version": run.prompt_version,
        "rule_version": run.rule_version,
        "total_duration_ms": run.total_duration_ms,
        "total_prompt_tokens": run.total_prompt_tokens,
        "total_completion_tokens": run.total_completion_tokens,
        "total_cost_usd": run.total_cost_usd,
        "step_count": len(steps),
        "steps": [
            {
                "step_index": s.step_index,
                "agent_name": s.agent_name,
                "step_name": s.step_name,
                "tool_calls": s.tool_calls,
                "input_payload": s.input_payload,
                "output_payload": s.output_payload,
                "retrieved_chunk_ids": s.retrieved_chunk_ids,
                "duration_ms": s.duration_ms,
                "prompt_tokens": s.prompt_tokens,
                "completion_tokens": s.completion_tokens,
                "estimated_cost_usd": s.estimated_cost_usd,
                "status": s.status,
                "error_message": s.error_message,
                "created_at": s.created_at.isoformat() if s.created_at else None
            }
            for s in steps
        ]
    }


# ---------------------------------------------------------
# Report Metadata Endpoint
# ---------------------------------------------------------
@router.get("/reports/{report_id}", summary="Retrieve original report metadata and assessment runs")
def get_report(report_id: str, db: Session = Depends(get_db)):
    rep = db.query(AdverseEventReportModel).filter(
        (AdverseEventReportModel.id == report_id) | (AdverseEventReportModel.case_id == report_id)
    ).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")

    return {
        "id": rep.id,
        "case_id": rep.case_id,
        "suspect_drug": rep.suspect_drug,
        "product_identifier": rep.product_identifier,
        "reaction_description": rep.reaction_description,
        "patient_age": rep.patient_age,
        "patient_sex": rep.patient_sex,
        "drug_start_date": rep.drug_start_date,
        "onset_relative_days": rep.onset_relative_days,
        "is_hospitalized": rep.is_hospitalized,
        "outcome": rep.outcome,
        "reporter_type": rep.reporter_type,
        "created_at": rep.created_at.isoformat() if rep.created_at else None,
        "runs": [
            {
                "run_id": r.id,
                "status": r.status,
                "route": r.assessment.recommended_route if r.assessment else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None
            }
            for r in rep.runs
        ]
    }


# ---------------------------------------------------------
# Feedback Endpoints
# ---------------------------------------------------------
@router.post("/feedback", response_model=FeedbackResponse, summary="Submit reviewer feedback on assessment")
def create_feedback(feedback_in: FeedbackCreate, db: Session = Depends(get_db)):
    run = db.query(AgentRunModel).filter(AgentRunModel.id == feedback_in.run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{feedback_in.run_id}' not found")

    fb = ReviewerFeedbackModel(
        run_id=feedback_in.run_id,
        satisfactory=feedback_in.satisfactory,
        rating=feedback_in.rating,
        feedback_reason=feedback_in.feedback_reason,
        reviewer_role=feedback_in.reviewer_role
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackResponse(
        feedback_id=fb.id,
        run_id=fb.run_id,
        satisfactory=fb.satisfactory,
        feedback_reason=fb.feedback_reason,
        created_at=fb.created_at
    )


@router.get("/feedback/summary", summary="Aggregate reviewer feedback metrics")
def get_feedback_summary(db: Session = Depends(get_db)):
    total = db.query(ReviewerFeedbackModel).count()
    if total == 0:
        return {
            "total_feedbacks": 0,
            "satisfactory_count": 0,
            "unsatisfactory_count": 0,
            "satisfaction_rate": 0.0,
            "average_rating": None,
            "recent_feedbacks": []
        }

    satisfactory_count = db.query(ReviewerFeedbackModel).filter(ReviewerFeedbackModel.satisfactory == True).count()
    avg_rating = db.query(func.avg(ReviewerFeedbackModel.rating)).scalar()
    recent = db.query(ReviewerFeedbackModel).order_by(ReviewerFeedbackModel.created_at.desc()).limit(10).all()

    return {
        "total_feedbacks": total,
        "satisfactory_count": satisfactory_count,
        "unsatisfactory_count": total - satisfactory_count,
        "satisfaction_rate": round(satisfactory_count / total, 3),
        "average_rating": round(float(avg_rating), 2) if avg_rating else None,
        "recent_feedbacks": [
            {
                "id": f.id,
                "run_id": f.run_id,
                "satisfactory": f.satisfactory,
                "rating": f.rating,
                "reason": f.feedback_reason,
                "reviewer_role": f.reviewer_role,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in recent
        ]
    }


# ---------------------------------------------------------
# Health, Readiness, Corpus, and Circuit Breaker
# ---------------------------------------------------------
@router.get("/health", summary="Liveness probe")
def get_health():
    return {
        "status": "healthy",
        "service": "pharmacovigilance-intake-service",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/ready", summary="Readiness probe")
def get_readiness(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(func.now())
    except Exception:
        db_ok = False

    pipeline = IngestionPipeline()
    corpus_status = pipeline.get_status()

    return {
        "ready": db_ok and corpus_status.get("index_healthy", False),
        "database_connected": db_ok,
        "corpus_indexed": corpus_status.get("index_healthy", False),
        "total_corpus_chunks": corpus_status.get("total_chunks", 0)
    }


@router.get("/metrics", summary="Prometheus metrics scrape target")
def get_metrics():
    content, content_type = get_metrics_payload()
    return Response(content=content, media_type=content_type)


@router.get("/corpus/status", summary="Indexed corpus freshness and status")
def get_corpus_status():
    pipeline = IngestionPipeline()
    return pipeline.get_status()


@router.get("/circuit-breaker/status", summary="LLM provider circuit breaker status")
def get_circuit_breaker_status():
    breaker = CircuitBreaker.get_breaker("llm_provider")
    return breaker.get_status()


@router.post("/circuit-breaker/simulate-failure", summary="Simulate provider failure to trip circuit breaker for testing")
def simulate_circuit_breaker_failure():
    breaker = CircuitBreaker.get_breaker("llm_provider")
    breaker.record_manual_failure()
    return {"message": "Recorded simulated provider failure", "current_state": breaker.get_status()}


@router.post("/circuit-breaker/reset", summary="Reset circuit breaker to CLOSED")
def reset_circuit_breaker():
    breaker = CircuitBreaker.get_breaker("llm_provider")
    breaker.reset()
    return {"message": "Circuit breaker reset to CLOSED", "current_state": breaker.get_status()}


# ---------------------------------------------------------
# Evaluation Endpoints (L3 Requirement)
# ---------------------------------------------------------
@router.get("/evaluations", summary="Retrieve historical evaluation runs and quality metrics")
def get_evaluations(db: Session = Depends(get_db)):
    runs = db.query(EvaluationRunModel).order_by(EvaluationRunModel.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "prompt_version": r.prompt_version,
            "scenario_count": r.scenario_count,
            "groundedness": r.groundedness,
            "context_relevance": r.context_relevance,
            "faithfulness": r.faithfulness,
            "hallucination_rate": r.hallucination_rate,
            "pass_rate": r.pass_rate,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "summary": r.results_json
        }
        for r in runs
    ]


@router.post("/evaluations/run", summary="Trigger batch evaluation run over 20 synthetic scenarios")
def trigger_evaluation_run(prompt_version: str = "v1"):
    from backend.app.evaluation.evaluator import EvaluationEngine
    engine = EvaluationEngine()
    result = engine.run_suite(prompt_version=prompt_version)
    return result


# ---------------------------------------------------------
# Dashboard Aggregate Summary
# ---------------------------------------------------------
@router.get("/dashboard/stats", summary="Overview statistics for main dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_reports = db.query(AdverseEventReportModel).count()
    total_runs = db.query(AgentRunModel).count()
    completed_runs = db.query(AgentRunModel).filter(AgentRunModel.status == "completed").count()
    escalated_runs = db.query(AgentRunModel).filter(AgentRunModel.status == "escalated").count()
    queued_runs = db.query(AgentRunModel).filter(AgentRunModel.status.in_(["queued", "running"])).count()
    failed_runs = db.query(AgentRunModel).filter(AgentRunModel.status == "failed").count()
    quarantined_count = db.query(QuarantinedSubmissionModel).count()

    # p50 & p95 latency
    durations = [
        r.total_duration_ms for r in db.query(AgentRunModel.total_duration_ms).filter(
            AgentRunModel.total_duration_ms.isnot(None)
        ).all()
    ]
    p50_latency_ms = None
    p95_latency_ms = None
    if durations:
        import numpy as np
        p50_latency_ms = round(float(np.percentile(durations, 50)), 1)
        p95_latency_ms = round(float(np.percentile(durations, 95)), 1)

    # Route breakdown
    routes = db.query(
        AssessmentResultModel.recommended_route, func.count(AssessmentResultModel.id)
    ).group_by(AssessmentResultModel.recommended_route).all()
    route_counts = {r[0]: r[1] for r in routes}

    recent_runs = db.query(AgentRunModel).order_by(AgentRunModel.started_at.desc()).limit(10).all()

    pipeline = IngestionPipeline()
    corpus_status = pipeline.get_status()

    return {
        "total_reports": total_reports,
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "escalated_runs": escalated_runs,
        "queued_runs": queued_runs,
        "failed_runs": failed_runs,
        "quarantined_count": quarantined_count,
        "p50_latency_ms": p50_latency_ms,
        "p95_latency_ms": p95_latency_ms,
        "declared_slo_p95_sec": settings.SLO_P95_SECONDS,
        "route_breakdown": route_counts,
        "corpus_status": corpus_status,
        "recent_runs": [
            {
                "run_id": r.id,
                "case_id": r.report.case_id if r.report else None,
                "suspect_drug": r.report.suspect_drug if r.report else None,
                "status": r.status,
                "route": r.assessment.recommended_route if r.assessment else None,
                "duration_ms": r.total_duration_ms,
                "started_at": r.started_at.isoformat() if r.started_at else None
            }
            for r in recent_runs
        ]
    }
