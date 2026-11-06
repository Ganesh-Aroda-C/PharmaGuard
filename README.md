# PharmaGuard – Physician Clinical Decision Support System

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-emerald.svg)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange.svg)](https://github.com/langchain-ai/langgraph)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Application Type:** Physician-Only Clinical Decision Support System (CDS)  
> **Domain:** Pharmaceuticals & Drug Safety (Pharmacovigilance)  
> **Access Policy:** Strictly Restricted to Licensed Medical Practitioners, Clinical Pharmacologists, and Authorized Qualified Persons for Pharmacovigilance (QPPV). Public and patient self-registration are disabled.  
> **Authoritative Regulatory Standards:** *The New Drugs and Clinical Trials Rules, 2019 (NDCTR 2019)* and *Indian Pharmacopoeia Commission (IPC) PvPI Guidelines*.

---

## 1. Primary Objective & Clinical Governance

**PharmaGuard** is a specialized clinical decision support application designed for hospitals, healthcare institutions, and pharmacovigilance safety units. Attending physicians and medical specialists evaluate adverse drug reactions (ADRs) against statutory reporting rules and approved drug product information.

### Core Capabilities
1. **Clinical ADR Intake:** Doctors record suspected medications, dosage, frequency, dates of initiation and onset, clinical narrative, patient demographics (with data minimization), hospitalization timelines, and laboratory diagnostic context.
2. **Seriousness Evaluation:** Automated evaluation against statutory *ICH E2A / NDCTR 2019* criteria (*Death, Life-Threatening, Inpatient Hospitalization, Persistent Disability, Congenital Anomaly, or Medically Important Events*).
3. **Expectedness Evaluation:** Comparison of reported clinical events against the approved product package insert / Summary of Product Characteristics (SmPC).
4. **Statutory Triage Stream:**
   - **Expedited Report (Within 14 Calendar Days):** Mandatory submission to CDSCO / PvPI for Serious Unexpected ADRs or Serious ADRs triggering emergency safety modifiers (e.g., acute hospitalization with Severe Cutaneous Adverse Reactions under NDCTR 2019 Rule 67(3) and IPC G5.2.4).
   - **Periodic Safety Update Report (PSUR Stream):** Routine periodic monitoring cadence for expected non-serious events and listed serious reactions without modifiers.
   - **Human Pharmacovigilance Review Mandatory:** Mandatory escalation when the suspect drug falls outside the approved reference corpus, chronology is contradictory, or clinical evidence is ambiguous.

> **CRITICAL CLINICAL DISCLAIMER:** PharmaGuard operates strictly as a Clinical Decision Support System. **The system NEVER submits regulatory reports automatically.** All AI-generated triage assessments must be evaluated, verified, and authorized by a licensed medical practitioner and designated Qualified Person for Pharmacovigilance (QPPV).

---

## 2. Authentication & Role-Based Access Control (RBAC)

PharmaGuard enforces backend-level authentication on all clinical endpoints:
- **No Public / Patient Access:** Public registration, patient self-service, and anonymous reporting endpoints are completely eliminated.
- **Role-Based Access Control:**
  - `physician`: Attending medical doctors who create cases, review assessments, and record clinical observations.
  - `qppv`: Qualified Persons Responsible for Pharmacovigilance who perform statutory regulatory review, star rating, and sign-offs.
  - `admin`: Medical directors who manage institutional settings and provision new authorized doctor accounts.
- **Audit Logging:** Every login attempt, case submission, triage run, QPPV sign-off, and account provisioning action is recorded in an immutable audit trail (`/api/v1/audit-logs`).

### Default Authorized Doctor Accounts for Demonstration
| Doctor Name | Official Email | Default Password | Role | Registration No. | Affiliated Institution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. S. Sharma, MD** | `dr.sharma@pharmaguard.med` | `PhysicianSecret2026!` | `qppv` | MCI-48291 | AIIMS, New Delhi |
| **Dr. R. Patel, MBBS, MD** | `dr.patel@pharmaguard.med` | `PhysicianSecret2026!` | `physician` | MCI-61024 | PGIMER, Chandigarh |
| **Dr. Ananya Iyer, MD** | `dr.iyer@pharmaguard.med` | `PhysicianSecret2026!` | `physician` | MCI-77319 | NIMHANS, Bengaluru |
| **Admin Medical Directorate** | `admin@pharmaguard.med` | `AdminClinical2026!` | `admin` | MCI-ADMIN-01 | CDSCO Regulatory Directorate |

---

## 3. Physician Dashboard Interface Structure

The application interface is structured around 8 primary medical workflows:
1. **Clinical Dashboard:** Executive clinical KPIs (Total ADR Cases, Pending QPPV Reviews, Serious Cases Flagged, Triaged Assessments), attending doctor banner, and recent cases table.
2. **New ADR Assessment:** 5-section clinical intake form with medication dosage, frequency, chronological dates, seriousness indicators, and laboratory findings.
3. **Case Management:** Searchable, filterable database of clinical ADR cases with attending doctor, dosage, seriousness badges, and assessment links.
4. **AI Evidence Research:** Interactive reference corpus explorer detailing indexed clauses from NDCTR 2019, IPC PvPI guidance, and approved package inserts.
5. **Clinical Assessment:** 7-section clinical breakdown (Case Summary, Suspected Drug & Reaction, Seriousness, Expectedness, Recommended Route, Evidence Citations with quotes, and Reviewer Decision).
6. **Regulatory Reporting:** Dedicated QPPV authorization workspace with Approve, Request More Info, and Reject actions.
7. **Audit Logs:** Immutable audit log table recording timestamp, event type, practitioner, role, resource ID, action, and details.
8. **Doctor Profile & Settings:** Medical credentials, hospital affiliation, account provisioning form (Admin/QPPV only), system parameters, and diagnostic tools.

---

## 4. Multi-Agent Architecture

PharmaGuard coordinates two distinct agents via **LangGraph**:

```
[ Attending Physician Case Submission ]
                    │
                    ▼
[ Strict Ingestion Boundary (Pydantic + Guardrail Engine) ]
  - Chronology validation (drug start before stop)
  - Adversarial prompt injection quarantine
  - Token bucket rate limiting & doctor verification
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  AGENT A: Intake & Evidence Research Agent             │
│  - Extracts suspect drug, reaction narrative, & dosage.│
│  - Maps colloquial terms to MedDRA clinical synonyms.  │
│  - Queries FAISS vector store over approved corpus.    │
│  - Searches for exception clauses (NDCTR R67(3), PvPI).│
└──────────────────────────┬─────────────────────────────┘
                           │ (Structured Evidence Package)
                           ▼
┌────────────────────────────────────────────────────────┐
│  AGENT B: Assessment & Verification Agent              │
│  - Evaluates Seriousness against ICH E2A criteria.     │
│  - Evaluates Expectedness against Package Insert terms.│
│  - Overrides routine periodic stream if SCAR present.  │
│  - Verifies 100% citation grounding (Rejects unproven).│
│  - Recommends regulatory route with confidence score.  │
└──────────────────────────┬─────────────────────────────┘
                           │ (Grounded Triage Determination)
                           ▼
┌────────────────────────────────────────────────────────┐
│  STATUTORY AUTHORIZATION: QPPV Review Queue            │
│  - Licensed doctor inspects citations and evidence.    │
│  - Approves, rejects, or requests additional data.     │
│  - Permanent audit event logged in database.           │
└────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

- **Backend:** Python 3.11 / 3.13, FastAPI, LangGraph, LangChain, Pydantic v2, SQLAlchemy 2.0, `sentence-transformers` (`all-MiniLM-L6-v2`), FAISS Vector Index, PyMuPDF (`fitz`), pytest.
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide icons, responsive light medical theme.
- **Security & RBAC:** PBKDF2-HMAC-SHA256 password hashing, HMAC-SHA256 bearer tokens, token bucket rate limiter, pattern-based prompt injection guardrails, circuit breaker.
- **Observability:** Prometheus metrics (`/api/v1/metrics`), Grafana, OpenTelemetry, declared p95 latency tracking.

---

## 6. Quick Start & Demonstration

### Step 1: Run Automated Test Suite
To verify all 20 boundary, multi-agent, circuit breaker, and RBAC authentication tests:
```powershell
py -3.13 -m pytest backend/tests/ -v
```

### Step 2: Start the Application Server
```powershell
py -3.13 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### Step 3: Access the Physician Portal
1. Open your browser at **[http://localhost:8000/](http://localhost:8000/)**.
2. Select any authorized doctor preset (e.g., **Dr. S. Sharma, MD - Authorized QPPV**).
3. Click **"Authenticate & Enter Clinical Portal"**.
4. Test **Scenario 4.1** using the **"Demo Scenarios"** modal to observe the full multi-agent triage, citation grounding, and QPPV sign-off workflow.
5. Inspect the **Audit Logs** tab to verify that your login and clinical actions have been immutably recorded.

---

## 7. License & Compliance
Distributed under the MIT License. Developed in concordance with CDSCO, IPC PvPI, and ICH E2B(R3) pharmacovigilance regulatory standards.
