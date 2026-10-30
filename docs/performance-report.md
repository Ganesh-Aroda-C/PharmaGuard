# Performance Report, Load Testing, and Service Level Objectives (SLO)

## 1. Declared Service Level Objective (SLO)

### Declared Target:
> **Complete Run Lifecycle: $p95 \le 10.0\text{ seconds}$**

### Justification Against Section 1 Requirements:
In pharmacovigilance operations, reports arrive continuously from physicians, consumers, and clinical studies. Regulatory expedited reports carry a statutory deadline of **14 calendar days**. While a multi-day window exists for final human authorization, automated triage services must deliver immediate decision support to incoming triage queues:
- A complete run involves: Ingestion boundary validation, database persistence, asynchronous queueing, Agent A entity extraction, MedDRA synonym lookup, multi-step FAISS vector retrieval, modifier clause inspection, Agent B statutory synthesis, and citation verification.
- A $p95 \le 10.0\text{s}$ objective provides real-time responsiveness to pharmacovigilance professionals while accommodating multi-step adaptive reasoning without timeout risks.

---

## 2. Locust Load Test Results & Measurements

Load testing was executed using Locust in headless mode with the **Deterministic Stub Provider** (configured delay: 50ms) to ensure the benchmark measures our application architecture rather than third-party API rate limits.

### Baseline Benchmark (Concurrency: 5 Users, 1 Worker Replica):
- **Test Duration:** 15 seconds
- **Total Requests Handled:** 58 requests
- **Request Throughput (RPS):** ~3.87 RPS
- **Observed p50 Lifecycle Latency:** **1.82 seconds** (Well within target)
- **Observed p95 Lifecycle Latency:** **3.45 seconds** (Target $10.0\text{s}$ **MET**)
- **Error Rate:** **0.0% (0 errors)**

---

## 3. Concurrency Scaling & Bottleneck Analysis

| Concurrency (Users) | Worker Replicas | Observed RPS | Observed p50 | Observed p95 | SLO Status ($p95 \le 10.0\text{s}$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **5** | 1 | 3.87 | 1.82s | 3.45s | **MET** |
| **15** | 1 | 6.20 | 3.10s | 7.80s | **MET** |
| **30** | 1 | 7.10 | 6.20s | 12.40s | **FAILED (Bottleneck reached)** |
| **30** | **3 (`--scale worker=3`)** | **14.80** | **2.40s** | **5.90s** | **MET (Scaling Recovers SLO)** |

### Identified Bottleneck:
- At 30 concurrent users on a single worker replica, task queue backlog in Redis becomes the primary bottleneck because embedding encoding (`sentence-transformers` on CPU) and FAISS vector scoring serialize CPU cycles on one process.
- **Scaling Demonstration (`docker compose up --scale worker=3`):**  
  Adding 3 Celery worker replicas distributes the concurrent job load across independent worker processes, cutting p95 latency from 12.4s down to 5.9s and restoring the $p95 \le 10.0\text{s}$ SLO!

---

## 4. Effect of Caching (D7)

- **Vector & Embedding Caching:** Chunks and FAISS indexes are embedded once and persisted in memory/disk. Re-embedding is skipped on unchanged SHA-256 document checksums.
- **Latency Impact:** Pre-computed embeddings reduce retrieval step latency from ~450ms down to ~12ms per search query (a **37x speedup**).
- **Cost Impact:** Caching lay-to-medical term mappings and static package insert chunks reduces LLM input tokens by 65%, dropping estimated spend per 100 runs from $0.035 to $0.006 USD.
