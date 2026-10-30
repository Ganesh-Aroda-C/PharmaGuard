import uuid
import time
import pytest
from backend.app.database.init_db import init_db
from backend.app.database.session import SessionLocal
from backend.app.database.models import AdverseEventReportModel, AgentRunModel
from backend.app.agents.orchestrator import agent_workflow
from backend.app.tools.agent_tools import (
    tool_search_corpus,
    tool_lookup_clause,
    tool_search_alternative_terms,
    tool_verify_citations
)


def test_tools_functionality():
    # Test 1: alternative terms mapping
    synonyms = tool_search_alternative_terms("The patient's skin started peeling badly")
    assert len(synonyms) > 0
    matched_terms = synonyms[0]["medical_terms"]
    assert any("exfoliative" in t or "toxic epidermal necrolysis" in t for t in matched_terms)

    # Test 2: clause lookup
    clause = tool_lookup_clause("NDCTR-2019-R67(3)")
    assert clause is not None
    assert "NDCTR-2019-R67(3)" in clause["section_or_clause"] or "NDCTR-2019-R67(3)" in clause["text"]
    assert "Cutaneous" in clause["text"] or "Hospitalization" in clause["text"] or "Rule 67" in clause["text"]

    # Test 3: corpus search
    search_res = tool_search_corpus("Carbamazepine package insert adverse reactions listed", top_k=2)
    assert len(search_res) > 0
    assert "carbamazepine" in search_res[0]["text"].lower()


def test_citation_verification_rejects_hallucinations():
    """
    Requirement 8 & 9:
    Every citation must resolve to real text. Unsupported conclusions are rejected.
    """
    sample_chunks = [
        {
            "chunk_id": "test:p1:c1",
            "document_title": "NDCTR 2019",
            "section_or_clause": "Rule 67(1)",
            "text": "Rule 67(1): In the event of any serious adverse event, report within 14 calendar days."
        }
    ]

    # Valid claim with actual quote
    valid_claim = [{
        "chunk_id": "test:p1:c1",
        "claim": "Report within 14 calendar days",
        "quoted_text": "report within 14 calendar days"
    }]
    res_valid = tool_verify_citations(valid_claim, sample_chunks)
    assert res_valid["all_verified"] is True
    assert len(res_valid["verified_citations"]) == 1

    # Fabricated claim not in text
    fabricated_claim = [{
        "chunk_id": "test:p1:c1",
        "claim": "Must report within 48 hours for cosmetic surgery",
        "quoted_text": "Must report within 48 hours for cosmetic surgery"
    }]
    res_fake = tool_verify_citations(fabricated_claim, sample_chunks)
    assert res_fake["all_verified"] is False
    assert len(res_fake["unverified_claims"]) == 1


def test_critical_scenario_4_1_grounded_routing():
    """
    Requirement 21 & Scenario 4.1:
    'The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital.'
    Verifies:
    1. Everyday words mapped to clinical MedDRA terms.
    2. Seriousness assessed based on hospitalization.
    3. Expectedness evaluated against package insert.
    4. Adaptive modifier search finds NDCTR Rule 67(3) and IPC 5.2.4.
    5. Final route is Expedited Report within 14 calendar days with verified citations.
    """
    init_db()
    db = SessionLocal()

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    run_id = str(uuid.uuid4())
    correlation_id = f"corr-{uuid.uuid4().hex[:8]}"

    report_data = {
        "case_id": case_id,
        "idempotency_key": f"test-scen41-{uuid.uuid4().hex[:8]}",
        "suspect_drug": "Carbamazepine",
        "product_identifier": "Tegretol 200mg",
        "reaction_description": "The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital.",
        "patient_age": 34,
        "patient_sex": "female",
        "onset_relative_days": 7,
        "is_hospitalized": True,
        "outcome": "not_recovered",
        "reporter_type": "physician",
        "source_type": "spontaneous"
    }

    db_report = AdverseEventReportModel(**report_data)
    db.add(db_report)
    db.commit()

    db_run = AgentRunModel(
        id=run_id,
        report_id=db_report.id,
        correlation_id=correlation_id,
        status="running",
        prompt_version="v1",
        rule_version="1.0.0-ndctr2019-ipc"
    )
    db.add(db_run)
    db.commit()
    db.close()

    initial_state = {
        "run_id": run_id,
        "correlation_id": correlation_id,
        "case_id": case_id,
        "report_data": report_data,
        "prompt_version": "v1",
        "rule_version": "1.0.0-ndctr2019-ipc",
        "start_time": time.time(),
        "tool_call_history": [],
        "step_traces": [],
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_cost_usd": 0.0,
        "retry_count": 0,
        "max_retries": 1
    }

    final_state = agent_workflow.invoke(initial_state)

    assert final_state["is_serious"] is True
    assert final_state["is_expected"] is True
    assert final_state["recommended_route"] == "expedited_report"
    assert final_state["reporting_timeline_days"] == 14
    assert len(final_state["modifying_provisions"]) >= 1
    assert any("Rule 67(3)" in p or "5.2.4" in p for p in final_state["modifying_provisions"])
    assert final_state["status"] == "completed"
    assert len(final_state["citations"]) > 0


def test_unknown_drug_escalates_to_human_pv_review():
    """
    Requirement 11 & F7:
    An unknown drug outside the indexed corpus must trigger escalation to human review.
    """
    init_db()
    db = SessionLocal()

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    run_id = str(uuid.uuid4())
    correlation_id = f"corr-{uuid.uuid4().hex[:8]}"

    report_data = {
        "case_id": case_id,
        "idempotency_key": f"test-unknown-{uuid.uuid4().hex[:8]}",
        "suspect_drug": "Zabirafos-X402",  # Not in corpus!
        "reaction_description": "Severe systemic pyrexia and rash.",
        "patient_age": 50,
        "is_hospitalized": True,
        "outcome": "unknown",
        "reporter_type": "physician"
    }

    db_report = AdverseEventReportModel(**report_data)
    db.add(db_report)
    db.commit()

    db_run = AgentRunModel(
        id=run_id,
        report_id=db_report.id,
        correlation_id=correlation_id,
        status="running",
        prompt_version="v1"
    )
    db.add(db_run)
    db.commit()
    db.close()

    initial_state = {
        "run_id": run_id,
        "correlation_id": correlation_id,
        "case_id": case_id,
        "report_data": report_data,
        "prompt_version": "v1",
        "rule_version": "1.0.0-ndctr2019-ipc",
        "start_time": time.time(),
        "tool_call_history": [],
        "step_traces": [],
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_cost_usd": 0.0,
        "retry_count": 0,
        "max_retries": 1
    }

    final_state = agent_workflow.invoke(initial_state)

    assert final_state["escalation_required"] is True
    assert final_state["recommended_route"] == "human_review_required"
    assert "outside indexed corpus" in final_state["escalation_reason"] or "reference" in final_state["escalation_reason"]
