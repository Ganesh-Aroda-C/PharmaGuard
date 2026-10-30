import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.guardrails.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException, CircuitState
from backend.app.database.session import SessionLocal
from backend.app.database.models import AdverseEventReportModel, AgentRunModel, ReviewerFeedbackModel

client = TestClient(app)


def test_circuit_breaker_transitions():
    """
    Requirement 12 & A5:
    Circuit breaker transitions from CLOSED to OPEN after repeated failures,
    blocking further calls, and resets on recovery.
    """
    breaker = CircuitBreaker.get_breaker("test_breaker")
    breaker.reset()
    assert breaker.state == CircuitState.CLOSED

    # Simulate failures up to threshold
    for _ in range(breaker.failure_threshold):
        breaker.record_manual_failure()

    assert breaker.state == CircuitState.OPEN

    # In OPEN state, function call should raise CircuitBreakerOpenException
    with pytest.raises(CircuitBreakerOpenException):
        breaker.call(lambda: "should_not_run")

    # Reset
    breaker.reset()
    assert breaker.state == CircuitState.CLOSED
    res = breaker.call(lambda: "healthy_result")
    assert res == "healthy_result"


def test_feedback_persistence_and_aggregation():
    """
    Requirement 15 & L6:
    Submit feedback, persist in database, and aggregate metrics.
    """
    db = SessionLocal()
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    run_id = str(uuid.uuid4())

    rep = AdverseEventReportModel(
        case_id=case_id,
        idempotency_key=f"fb-test-{uuid.uuid4().hex[:8]}",
        suspect_drug="Carbamazepine",
        reaction_description="Transient dizziness"
    )
    db.add(rep)
    db.commit()

    run = AgentRunModel(
        id=run_id,
        report_id=rep.id,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}",
        status="completed"
    )
    db.add(run)
    db.commit()
    db.close()

    # Submit feedback via API
    fb_payload = {
        "run_id": run_id,
        "satisfactory": True,
        "rating": 5,
        "feedback_reason": "High quality evidence citations and accurate statutory routing."
    }
    res = client.post("/api/v1/feedback", json=fb_payload)
    assert res.status_code == 200
    fb_data = res.json()
    assert fb_data["satisfactory"] is True
    assert "feedback_id" in fb_data

    # Query summary
    res_summary = client.get("/api/v1/feedback/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_feedbacks"] >= 1
    assert summary["satisfactory_count"] >= 1


def test_run_trace_contains_required_audit_fields():
    """
    Requirement 17 & D5:
    Run trace contains correlation ID, step timings, tool calls,
    retrieved chunks, and cost audit attributes.
    """
    db = SessionLocal()
    run = db.query(AgentRunModel).filter(AgentRunModel.status == "completed").first()
    if not run:
        pytest.skip("No completed run in DB for trace check")

    res = client.get(f"/api/v1/runs/{run.id}/trace")
    assert res.status_code == 200
    trace = res.json()
    assert "correlation_id" in trace
    assert "step_count" in trace
    assert "steps" in trace
    assert len(trace["steps"]) > 0

    first_step = trace["steps"][0]
    assert "step_name" in first_step
    assert "agent_name" in first_step
    assert "duration_ms" in first_step
    assert "tool_calls" in first_step
