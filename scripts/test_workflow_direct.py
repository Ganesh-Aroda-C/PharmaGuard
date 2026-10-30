import sys
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uuid
import time
from backend.app.database.init_db import init_db
from backend.app.database.session import SessionLocal
from backend.app.database.models import AdverseEventReportModel, AgentRunModel
from backend.app.agents.orchestrator import agent_workflow


def test_orchestrator_scenario_4_1():
    init_db()
    db = SessionLocal()

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    run_id = str(uuid.uuid4())
    correlation_id = f"corr-{uuid.uuid4().hex[:8]}"

    report_data = {
        "case_id": case_id,
        "idempotency_key": f"test-idemp-{uuid.uuid4().hex[:8]}",
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

    db_report = AdverseEventReportModel(
        case_id=case_id,
        idempotency_key=report_data["idempotency_key"],
        suspect_drug=report_data["suspect_drug"],
        product_identifier=report_data["product_identifier"],
        reaction_description=report_data["reaction_description"],
        patient_age=report_data["patient_age"],
        patient_sex=report_data["patient_sex"],
        onset_relative_days=report_data["onset_relative_days"],
        is_hospitalized=report_data["is_hospitalized"],
        outcome=report_data["outcome"],
        reporter_type=report_data["reporter_type"],
        source_type=report_data["source_type"]
    )
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

    print("\n--- Invoking LangGraph Multi-Agent Workflow ---")
    final_state = agent_workflow.invoke(initial_state)

    print("\n=== Workflow Completed Successfully ===")
    print(f"Status: {final_state.get('status')}")
    print(f"Is Serious: {final_state.get('is_serious')} | Criteria: {final_state.get('seriousness_criteria')}")
    print(f"Is Expected: {final_state.get('is_expected')} | Terms: {final_state.get('matched_medical_terms')}")
    print(f"Recommended Route: {final_state.get('recommended_route')} (Timeline: {final_state.get('reporting_timeline_days')} days)")
    print(f"Modifying Provisions: {final_state.get('modifying_provisions')}")
    print(f"Route Rationale: {final_state.get('route_rationale')}")
    print(f"All Citations Verified: {final_state.get('all_citations_verified')}")
    print(f"Citations Count: {len(final_state.get('citations', []))}")
    for c in final_state.get("citations", []):
        print(f"  - [{c['citation_id']}] {c['document_title']} | {c['section_or_clause']} (Page {c.get('page_number')}): \"{c['quoted_text'][:80]}...\"")
    print(f"Total Steps Traced: {len(final_state.get('step_traces', []))}")
    print(f"Total Cost USD: ${final_state.get('total_cost_usd'):.6f}")

    assert final_state.get("status") == "completed", "Status must be completed"
    assert final_state.get("is_serious") is True, "Must be assessed as serious"
    assert final_state.get("recommended_route") == "expedited_report", "Must route to expedited_report"
    assert len(final_state.get("citations", [])) > 0, "Must have verified citations"
    print("\nALL ASSERTIONS PASSED FOR CRITICAL SCENARIO 4.1!\n")


if __name__ == "__main__":
    test_orchestrator_scenario_4_1()
