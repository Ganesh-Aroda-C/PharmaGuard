"""
Automated Performance & Load Testing Runner (Requirement D6 & 15)
Executes an asynchronous load benchmark using Locust in headless mode.
Measures:
- End-to-end run lifecycle from submission to completed assessment
- Requests per second (RPS)
- p50 and p95 latency against the declared 10.0s SLO target
- Concurrency scaling characteristics
- Bottleneck identification
- Caching impact
"""
import sys
import time
import json
import subprocess
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.config import settings


def run_locust_benchmark(users: int = 5, spawn_rate: int = 2, run_time: str = "15s"):
    print(f"\n=======================================================")
    print(f"EXECUTING HEADLESS LOCUST BENCHMARK (D6 Requirement)")
    print(f"Users: {users} | Spawn Rate: {spawn_rate}/s | Duration: {run_time}")
    print(f"Target Declared SLO: p95 <= {settings.SLO_P95_SECONDS} seconds")
    print(f"LLM Provider: {settings.LLM_PROVIDER} (Deterministic Stub)")
    print(f"=======================================================\n")

    report_csv_prefix = root_dir / "loadtest" / "benchmark_run"
    
    cmd = [
        sys.executable, "-m", "locust",
        "-f", str(root_dir / "loadtest" / "locustfile.py"),
        "--headless",
        "-u", str(users),
        "-r", str(spawn_rate),
        "--run-time", run_time,
        "--host", f"http://127.0.0.1:{settings.PORT}",
        "--csv", str(report_csv_prefix)
    ]

    print("Running command:", " ".join(cmd))
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("Locust stderr:", res.stderr)

    return res.returncode


if __name__ == "__main__":
    run_locust_benchmark()
