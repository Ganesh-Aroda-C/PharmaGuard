import sys
import argparse
import json
from pathlib import Path

# Add project root and backend to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.app.evaluation.evaluator import EvaluationEngine


def main():
    parser = argparse.ArgumentParser(description="Pharmacovigilance Evaluation Suite CLI")
    parser.add_argument("command", choices=["run", "compare"], help="Command to execute")
    parser.add_argument("--prompt-version", default="v1", choices=["v1", "v2"], help="Prompt version to evaluate")
    args = parser.parse_args()

    engine = EvaluationEngine()

    if args.command == "run":
        print(f"\n=======================================================")
        print(f"RUNNING PHARMACOVIGILANCE EVALUATION SUITE (Prompt {args.prompt_version})")
        print(f"=======================================================\n")
        res = engine.run_suite(prompt_version=args.prompt_version)
        print("\n--- Summary Metrics ---")
        print(f"Scenarios Evaluated: {res['scenario_count']}")
        print(f"Passed: {res['passed_count']} ({res['pass_rate']*100:.1f}%)")
        print(f"Groundedness: {res['metrics']['groundedness']:.3f}")
        print(f"Context Relevance: {res['metrics']['context_relevance']:.3f}")
        print(f"Faithfulness: {res['metrics']['faithfulness']:.3f}")
        print(f"Hallucination Rate: {res['metrics']['hallucination_rate']:.3f}")
        print("\nScenario Breakdown:")
        for s in res["scenarios"]:
            print(f"  [{s['status'][:6]}] {s['scenario_id']}: {s['name']} (Faithfulness: {s.get('faithfulness', 0.0)})")

    elif args.command == "compare":
        print("\nRunning Prompt v1 vs Prompt v2 Comparative Evaluation...")
        res_v1 = engine.run_suite(prompt_version="v1")
        res_v2 = engine.run_suite(prompt_version="v2")

        print("\n=======================================================")
        print("PROMPT VERSION COMPARISON EXPERIMENT RESULTS (L2 & L3)")
        print("=======================================================")
        print(f"{'Metric':<24} | {'Prompt v1':<12} | {'Prompt v2':<12} | {'Delta':<10}")
        print("-" * 65)
        for metric in ["groundedness", "context_relevance", "faithfulness", "hallucination_rate"]:
            v1_val = res_v1["metrics"][metric]
            v2_val = res_v2["metrics"][metric]
            delta = v2_val - v1_val
            sign = "+" if delta >= 0 else ""
            print(f"{metric.replace('_', ' ').title():<24} | {v1_val:<12.3f} | {v2_val:<12.3f} | {sign}{delta:<10.3f}")
        print("-" * 65)
        print(f"Pass Rate                | {res_v1['pass_rate']*100:<11.1f}% | {res_v2['pass_rate']*100:<11.1f}% | +{(res_v2['pass_rate']-res_v1['pass_rate'])*100:.1f}%")


if __name__ == "__main__":
    main()
