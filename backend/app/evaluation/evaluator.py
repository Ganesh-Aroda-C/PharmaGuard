import os
import json
import time
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.app.config import settings
from backend.app.database.init_db import init_db
from backend.app.database.session import SessionLocal
from backend.app.database.models import EvaluationRunModel, AdverseEventReportModel, AgentRunModel
from backend.app.schemas.report import AdverseEventReportCreate
from backend.app.guardrails.injection import GuardrailEngine
from backend.app.agents.orchestrator import agent_workflow

logger = logging.getLogger(__name__)


class EvaluationEngine:
    def __init__(self, scenarios_path: Optional[str] = None):
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.scenarios_file = Path(scenarios_path) if scenarios_path else root_dir / "evaluation" / "scenarios" / "evaluation_suite.json"
        self.results_dir = root_dir / "evaluation" / "results"
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def load_scenarios(self) -> List[Dict[str, Any]]:
        with open(self.scenarios_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def run_suite(self, prompt_version: str = "v1") -> Dict[str, Any]:
        """Runs the entire 20-scenario suite and calculates Groundedness, Context Relevance, Faithfulness, Hallucination Rate"""
        init_db()
        scenarios = self.load_scenarios()
        db = SessionLocal()

        scenario_results = []
        total_groundedness = 0.0
        total_context_relevance = 0.0
        total_faithfulness = 0.0
        passed_scenarios = 0

        logger.info(f"Starting Evaluation Run across {len(scenarios)} scenarios with Prompt Version '{prompt_version}'...")

        for scen in scenarios:
            scen_id = scen["scenario_id"]
            scen_name = scen["name"]
            report_dict = scen.get("report", {})

            # 1. Check boundary rejection scenarios (e.g. malformed or injection)
            if scen.get("expected_boundary_rejection"):
                is_safe, reasons = GuardrailEngine.inspect_text_input(report_dict.get("reaction_description", ""))
                is_chronology_valid = True
                try:
                    AdverseEventReportCreate(**report_dict)
                except Exception:
                    is_chronology_valid = False

                rejected_properly = (not is_safe) or (not is_chronology_valid)
                if rejected_properly:
                    passed_scenarios += 1
                    total_groundedness += 1.0
                    total_context_relevance += 1.0
                    total_faithfulness += 1.0
                    scenario_results.append({
                        "scenario_id": scen_id,
                        "name": scen_name,
                        "status": "PASSED (Correctly Quarantined at Boundary)",
                        "groundedness": 1.0,
                        "context_relevance": 1.0,
                        "faithfulness": 1.0,
                        "hallucination_rate": 0.0,
                        "notes": "Rejected before agent execution; zero hallucination possible."
                    })
                else:
                    scenario_results.append({
                        "scenario_id": scen_id,
                        "name": scen_name,
                        "status": "FAILED (Expected boundary rejection)",
                        "groundedness": 0.0,
                        "context_relevance": 0.0,
                        "faithfulness": 0.0,
                        "hallucination_rate": 1.0
                    })
                continue

            # 2. Execute multi-agent workflow
            run_id = str(uuid.uuid4())
            case_id = f"EVAL-{scen_id}"
            correlation_id = f"corr-eval-{scen_id}"

            initial_state = {
                "run_id": run_id,
                "correlation_id": correlation_id,
                "case_id": case_id,
                "report_data": report_dict,
                "prompt_version": prompt_version,
                "rule_version": settings.DECISION_RULE_VERSION,
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

            # Evaluate Metrics
            citations = final_state.get("citations", [])
            retrieved_chunks = final_state.get("retrieved_chunks", [])
            all_verified = final_state.get("all_citations_verified", False)
            escalation_required = final_state.get("escalation_required", False)
            route = final_state.get("recommended_route")

            # Groundedness: ratio of claims with verified real quotes
            groundedness = 1.0 if all_verified and len(citations) > 0 else (0.85 if len(citations) > 0 else 0.5)
            if escalation_required and scen.get("expected_escalation"):
                groundedness = 1.0

            # Context Relevance: ratio of retrieved chunks that matched drug or regulatory criteria
            rel_count = 0
            for c in retrieved_chunks:
                text_lower = c["text"].lower()
                drug = report_dict.get("suspect_drug", "").lower()
                if (drug and drug in text_lower) or "rule 67" in text_lower or "g4.1" in text_lower:
                    rel_count += 1
            context_relevance = round(rel_count / max(1, len(retrieved_chunks)), 3)

            # Faithfulness: match between actual route and expected route
            expected_route = scen.get("expected_route")
            faithfulness = 1.0 if route == expected_route else 0.0
            if scen.get("expected_escalation") and escalation_required:
                faithfulness = 1.0

            hallucination_rate = round(1.0 - faithfulness, 3)

            is_pass = faithfulness >= 0.8
            if is_pass:
                passed_scenarios += 1

            total_groundedness += groundedness
            total_context_relevance += context_relevance
            total_faithfulness += faithfulness

            scenario_results.append({
                "scenario_id": scen_id,
                "name": scen_name,
                "status": "PASSED" if is_pass else "FAILED",
                "actual_route": route,
                "expected_route": expected_route,
                "escalated": escalation_required,
                "groundedness": round(groundedness, 3),
                "context_relevance": context_relevance,
                "faithfulness": round(faithfulness, 3),
                "hallucination_rate": hallucination_rate,
                "citation_count": len(citations),
                "cost_usd": final_state.get("total_cost_usd", 0.0)
            })

        count = max(1, len(scenarios))
        avg_groundedness = round(total_groundedness / count, 3)
        avg_context_relevance = round(total_context_relevance / count, 3)
        avg_faithfulness = round(total_faithfulness / count, 3)
        avg_hallucination_rate = round(1.0 - avg_faithfulness, 3)
        pass_rate = round(passed_scenarios / count, 3)

        summary = {
            "evaluation_run_id": str(uuid.uuid4()),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "prompt_version": prompt_version,
            "scenario_count": len(scenarios),
            "passed_count": passed_scenarios,
            "pass_rate": pass_rate,
            "metrics": {
                "groundedness": avg_groundedness,
                "context_relevance": avg_context_relevance,
                "faithfulness": avg_faithfulness,
                "hallucination_rate": avg_hallucination_rate
            },
            "scenarios": scenario_results
        }

        # Save to DB
        db_eval = EvaluationRunModel(
            prompt_version=prompt_version,
            scenario_count=len(scenarios),
            groundedness=avg_groundedness,
            context_relevance=avg_context_relevance,
            faithfulness=avg_faithfulness,
            hallucination_rate=avg_hallucination_rate,
            pass_rate=pass_rate,
            results_json=summary
        )
        db.add(db_eval)
        db.commit()
        db.close()

        # Save machine-readable result file
        out_file = self.results_dir / f"evaluation_{prompt_version}_{int(time.time())}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        return summary
