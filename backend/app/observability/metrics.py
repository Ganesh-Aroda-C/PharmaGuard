import time
from prometheus_client import (
    Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
)

# Prometheus Metrics Definitions
HTTP_REQUESTS_TOTAL = Counter(
    "pv_http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code"]
)

REPORT_SUBMISSIONS_TOTAL = Counter(
    "pv_report_submissions_total",
    "Total adverse event reports submitted at boundary",
    ["status"]  # accepted, rejected, quarantined
)

AGENT_RUNS_TOTAL = Counter(
    "pv_agent_runs_total",
    "Total multi-agent workflow executions",
    ["route", "status"]  # expedited_report, periodic_safety_report, human_review_required, etc.
)

RUN_LATENCY_SECONDS = Histogram(
    "pv_run_latency_seconds",
    "End-to-end agent run duration from submission to completion",
    buckets=[0.5, 1.0, 2.0, 5.0, 7.5, 10.0, 15.0, 30.0, 60.0]
)

AGENT_STEP_DURATION_SECONDS = Histogram(
    "pv_agent_step_duration_seconds",
    "Duration of individual agent reasoning steps",
    ["agent_name", "step_name"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0]
)

TOOL_CALLS_TOTAL = Counter(
    "pv_tool_calls_total",
    "Total tool invocations by agents",
    ["tool_name"]
)

PROMPT_TOKENS_TOTAL = Counter(
    "pv_prompt_tokens_total",
    "Total prompt tokens consumed",
    ["prompt_version"]
)

COMPLETION_TOKENS_TOTAL = Counter(
    "pv_completion_tokens_total",
    "Total completion tokens consumed",
    ["prompt_version"]
)

ESTIMATED_COST_USD_TOTAL = Counter(
    "pv_estimated_cost_usd_total",
    "Total estimated LLM spend in USD"
)

CIRCUIT_BREAKER_STATE = Gauge(
    "pv_circuit_breaker_state",
    "Circuit breaker state: 0=CLOSED, 1=HALF_OPEN, 2=OPEN"
)

CORPUS_CHUNK_COUNT = Gauge(
    "pv_corpus_chunk_count",
    "Total chunks indexed in reference vector store"
)


def get_metrics_payload():
    return generate_latest(), CONTENT_TYPE_LATEST
