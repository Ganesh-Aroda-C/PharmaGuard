# Operations Runbook: Incident Response & Troubleshooting

## Failure Mode 1: LLM Provider Timeout or Outage (Circuit Breaker Tripping)

### 1. Symptoms:
- API status endpoint returns `escalated` or runs take longer than normal.
- Circuit breaker state displays `OPEN` in dashboard header and Prometheus metrics (`pv_circuit_breaker_state = 2`).
- Logs report `CircuitBreakerOpenException: Circuit breaker 'llm_provider' is OPEN`.

### 2. Confirmation:
- Check circuit breaker status endpoint:
  ```bash
  curl http://localhost:8000/api/v1/circuit-breaker/status
  ```
  Expected output shows `"state": "OPEN"`, `"failure_count" >= 3`.

### 3. Recovery Procedure:
1. Verify network connectivity to the upstream model provider (or Ollama/local daemon).
2. If using the deterministic stub for testing, ensure `LLM_PROVIDER=deterministic_stub` in `.env`.
3. Reset the circuit breaker via REST API:
   ```bash
   curl -X POST http://localhost:8000/api/v1/circuit-breaker/reset
   ```
4. Verify circuit transitions back to `CLOSED`. New incoming runs resume normal processing.

---

## Failure Mode 2: Vector Index Missing or Stale After Corpus Document Update

### 1. Symptoms:
- API readiness check (`/api/v1/ready`) returns `"ready": false`, `"corpus_indexed": false`.
- Agent A searches return empty chunk sets or fail to match package inserts.
- Submissions trigger automatic escalation to human review due to missing reference documents.

### 2. Confirmation:
- Inspect corpus status:
  ```bash
  python -m backend.app.ingestion status
  ```
- Check if `corpus/faiss_index/faiss.index` exists or has 0 chunks.

### 3. Recovery Procedure:
1. Verify reference PDFs are present in `corpus/documents/`:
   - `ndctr_2019_rules.pdf`
   - `ipc_pvpi_guidance_mah.pdf`
   - `carbamazepine_package_insert.pdf`
2. Run idempotent ingestion pipeline:
   ```bash
   python -m backend.app.ingestion ingest
   ```
3. If files were modified, run force reindex:
   ```bash
   python -m backend.app.ingestion reindex
   ```
4. Query `/api/v1/ready` to verify `"ready": true` and `"total_corpus_chunks" >= 28`.
