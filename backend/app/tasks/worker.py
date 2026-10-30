import os
import time
import uuid
import logging
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor

from backend.app.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.models import AgentRunModel, AdverseEventReportModel
from backend.app.agents.orchestrator import agent_workflow

logger = logging.getLogger(__name__)

# Celery instance setup
try:
    from celery import Celery
    celery_app = Celery(
        "pv_tasks",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        task_track_started=True
    )
except Exception as e:
    logger.warning(f"Celery initialization deferred: {e}")
    celery_app = None


# Core execution function used by both Celery and ThreadPool fallback
def execute_agent_run(run_id: str) -> Dict[str, Any]:
    logger.info(f"Starting execution of run_id: {run_id}")
    db = SessionLocal()
    try:
        run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id).first()
        if not run:
            logger.error(f"Run {run_id} not found in database.")
            return {"status": "failed", "error": "Run not found"}

        report = run.report
        if not report:
            logger.error(f"Report for run {run_id} not found in database.")
            run.status = "failed"
            run.error_message = "Associated report not found"
            db.commit()
            return {"status": "failed", "error": "Report not found"}

        # Update status to running
        run.status = "running"
        db.commit()

        # Build initial state
        initial_state = {
            "run_id": run.id,
            "correlation_id": run.correlation_id,
            "case_id": report.case_id,
            "report_data": {
                "case_id": report.case_id,
                "idempotency_key": report.idempotency_key,
                "suspect_drug": report.suspect_drug,
                "product_identifier": report.product_identifier,
                "reaction_description": report.reaction_description,
                "patient_age": report.patient_age,
                "patient_age_group": report.patient_age_group,
                "patient_sex": report.patient_sex,
                "drug_start_date": report.drug_start_date,
                "drug_stop_date": report.drug_stop_date,
                "event_onset_date": report.event_onset_date,
                "onset_relative_days": report.onset_relative_days,
                "is_death": report.is_death,
                "is_hospitalized": report.is_hospitalized,
                "is_life_threatening": report.is_life_threatening,
                "is_disability": report.is_disability,
                "is_congenital_anomaly": report.is_congenital_anomaly,
                "is_other_medically_important": report.is_other_medically_important,
                "hospitalization_admission_date": report.hospitalization_admission_date,
                "hospitalization_discharge_date": report.hospitalization_discharge_date,
                "outcome": report.outcome,
                "reporter_type": report.reporter_type,
                "source_type": report.source_type,
                "medical_history": report.medical_history,
                "concomitant_medications": report.concomitant_medications
            },
            "prompt_version": run.prompt_version or "v1",
            "rule_version": run.rule_version or "1.0.0-ndctr2019-ipc",
            "start_time": time.time(),
            "tool_call_history": [],
            "step_traces": [],
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_cost_usd": 0.0,
            "retry_count": 0,
            "max_retries": 1
        }

        # Invoke LangGraph multi-agent pipeline
        final_state = agent_workflow.invoke(initial_state)

        logger.info(f"Completed run_id: {run_id} with final status: {final_state.get('status')}")
        return {"status": final_state.get("status"), "run_id": run_id}

    except Exception as e:
        logger.exception(f"Unhandled exception during agent run {run_id}: {e}")
        try:
            run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(e)
                db.commit()
        except Exception:
            pass
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()


if celery_app:
    @celery_app.task(name="tasks.execute_pv_assessment", bind=True, max_retries=2)
    def celery_execute_pv_assessment(self, run_id: str):
        return execute_agent_run(run_id)


# Local fallback executor when Redis/Celery is not used or offline
_thread_pool = ThreadPoolExecutor(max_workers=4)


def dispatch_run_task(run_id: str):
    """Dispatches assessment task via Celery if configured/active, else background ThreadPool"""
    if settings.USE_CELERY and celery_app:
        try:
            celery_execute_pv_assessment.delay(run_id)
            return "celery"
        except Exception as e:
            logger.warning(f"Failed to enqueue to Celery ({e}); dispatching via ThreadPool fallback.")
            _thread_pool.submit(execute_agent_run, run_id)
            return "thread_fallback"
    else:
        _thread_pool.submit(execute_agent_run, run_id)
        return "thread_pool"
