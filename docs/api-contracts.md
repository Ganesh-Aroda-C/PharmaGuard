# REST API Contracts and Ingestion Boundary Specification

The Pharmacovigilance Adverse Event Intake and Triage Service publishes a formal OpenAPI 3.0 contract. All external interfaces enforce schema, range, categorical, chronology, and security guardrail validation.

## Base URL
`/api/v1`

---

## 1. POST `/api/v1/reports`
Submits a synthetic adverse event report for asynchronous triage.

### Ingestion Validation Rules:
- `idempotency_key`: Required, string, 4–128 characters. Submitting an existing key returns the existing run without duplicate processing.
- `suspect_drug`: Required, string, 2–200 characters.
- `reaction_description`: Required, string, 5–2500 characters. Checked by `GuardrailEngine` for prompt-injection patterns.
- `patient_age`: Optional, integer between `0` and `130`.
- `drug_start_date` & `event_onset_date`: Valid ISO 8601 dates (`YYYY-MM-DD`). Cannot be in the future. Event onset date cannot precede drug start date.
- `drug_stop_date`: Cannot precede `drug_start_date`.
- `hospitalization_admission_date` & `hospitalization_discharge_date`: Discharge cannot precede admission.
- `is_death`: When `True`, `outcome` cannot be `recovered` or `recovering`.

### Request Example:
```json
{
  "idempotency_key": "case-req-9042",
  "suspect_drug": "Carbamazepine",
  "product_identifier": "Tegretol 200mg Tablets IP",
  "reaction_description": "The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital.",
  "patient_age": 34,
  "patient_sex": "female",
  "drug_start_date": "2026-05-01",
  "event_onset_date": "2026-05-08",
  "onset_relative_days": 7,
  "is_hospitalized": true,
  "outcome": "not_recovered",
  "reporter_type": "physician",
  "source_type": "spontaneous"
}
```

### Success Response (`202 Accepted`):
```json
{
  "run_id": "8f9d95f9-9588-57ad-c959-8875a1701718",
  "case_id": "CASE-4F81AB92",
  "correlation_id": "corr-c19b3a0e12fd",
  "status": "queued",
  "created_at": "2026-10-26T06:14:11.498Z",
  "message": "Report validated and queued for asynchronous multi-agent triage."
}
```

### Boundary Rejection Response (`422 Unprocessable Content`):
*Triggered when chronology, ranges, or injection rules fail. Record is quarantined immediately.*
```json
{
  "detail": {
    "message": "Report rejected at ingestion boundary before agent execution",
    "quarantined_record_id": "quar-94fa-23e1",
    "field_errors": [
      {
        "loc": ["drug_stop_date"],
        "msg": "Drug stop date (2026-05-01) cannot precede drug start date (2026-05-15)",
        "type": "value_error"
      }
    ]
  }
}
```

---

## 2. GET `/api/v1/runs/{run_id}`
Retrieves current run status, progress, and completed assessment results.

### Response Example:
```json
{
  "run_id": "8f9d95f9-9588-57ad-c959-8875a1701718",
  "case_id": "CASE-4F81AB92",
  "correlation_id": "corr-c19b3a0e12fd",
  "status": "completed",
  "started_at": "2026-10-26T06:14:11.500Z",
  "completed_at": "2026-10-26T06:14:13.220Z",
  "total_duration_ms": 1720.5,
  "total_prompt_tokens": 182,
  "total_completion_tokens": 63,
  "total_cost_usd": 0.000065,
  "assessment": {
    "case_id": "CASE-4F81AB92",
    "suspect_drug": "Carbamazepine",
    "reported_reaction": "The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital.",
    "matched_medical_terms": ["exfoliative dermatitis", "toxic epidermal necrolysis", "stevens-johnson syndrome"],
    "is_serious": true,
    "seriousness_criteria_met": ["Inpatient Hospitalization (IPC-PVPI-G4.1 / NDCTR Rule 67)"],
    "seriousness_rationale": "Event satisfies statutory seriousness criteria under IPC-PVPI-G4.1: Inpatient Hospitalization.",
    "is_expected": true,
    "expectedness_rationale": "Reaction 'exfoliative dermatitis' is documented and listed in approved Package Insert under [Clause CBZ-PI-SEC6.1].",
    "recommended_route": "expedited_report",
    "reporting_timeline_days": 14,
    "modifying_provisions_applied": [
      "NDCTR-2019-R67(3) - Special Regulatory Modifier for Acute Hospitalization & SCAR",
      "IPC-PVPI-G5.2.4 - Special Safety Override for Severe Cutaneous Adverse Reactions"
    ],
    "route_rationale": "Mandatory Expedited Safety Report within 14 calendar days. Although cutaneous reactions may be catalogued in the package insert, acute hospital admission with severe cutaneous manifestations triggers emergency expedited reporting under NDCTR 2019 Rule 67(3) and IPC Guidance Clause 5.2.4.",
    "citations": [
      {
        "citation_id": "CIT-001",
        "document_title": "Indian Pharmacopoeia Commission Pharmacovigilance Guidance for Marketing Authorisation Holders",
        "section_or_clause": "[Clause IPC-PVPI-G4.1] Seriousness Evaluation Criteria",
        "page_number": 1,
        "quoted_text": "Under national pharmacovigilance standards, an adverse drug event is deemed SERIOUS if it results in any of the following outcomes: (1) Patient Death; (2) Life-threatening condition; (3) Inpatient Hospitalization",
        "relevance_rationale": "Direct definition of serious adverse reaction under Indian pharmacovigilance standards",
        "verified": true
      }
    ],
    "all_citations_verified": true,
    "confidence_score": 0.98,
    "confidence_explanation": "High confidence: Determinations verified against approved reference documents, statutory seriousness definitions, and modifying regulatory clauses.",
    "prompt_version": "v1",
    "rule_version": "1.0.0-ndctr2019-ipc",
    "regulatory_disclaimer": "DECISION SUPPORT RECOMMENDATION ONLY: This assessment is generated by an automated multi-agent triage service. The system NEVER submits a regulatory report automatically. All recommendations must be evaluated and authorized by a qualified pharmacovigilance professional."
  }
}
```

---

## 3. GET `/api/v1/runs/{run_id}/trace`
Returns the complete audit trace for a run. Every tool call, search query, retrieved chunk ID, duration, and token usage is reconstructible.

---

## 4. POST `/api/v1/feedback`
Records reviewer satisfaction / dissatisfaction and reasons.

### Request:
```json
{
  "run_id": "8f9d95f9-9588-57ad-c959-8875a1701718",
  "satisfactory": true,
  "rating": 5,
  "feedback_reason": "Correctly applied emergency 14-day SCAR modifier for hospitalized patient.",
  "reviewer_role": "Qualified Person for Pharmacovigilance"
}
```
