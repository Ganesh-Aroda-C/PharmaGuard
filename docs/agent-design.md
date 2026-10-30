# Multi-Agent Design and Reasoning Architecture

## 1. Multi-Agent Division of Responsibilities

The system rejects single-prompt or undifferentiated pipeline designs. Two distinct agents maintain independent states, separate prompts, and segregated roles:

| Dimension | Agent A: Intake & Research Agent | Agent B: Assessment & Verification Agent |
| :--- | :--- | :--- |
| **System Role** | Clinical entity extractor & regulatory legal researcher | Clinical evaluator, safety auditor, & citation verifier |
| **Input State** | Validated report payload, lay reaction descriptions | Structured `evidence_package`, mapped MedDRA terms |
| **Primary Tools** | `search_alternative_terms`, `search_corpus`, `lookup_clause` | `verify_citations` |
| **Prompt Artifact** | `intake_research_v1` / `v2` | `assessment_verification_v1` / `v2` |
| **Adaptive Loop** | Pass 1: Base search &rarr; Pass 2: Modifier query formulation | Verifies citations &rarr; Triggers retry pass or escalates |
| **Failure Mode** | Returns unmapped entities or flags missing demographics | Rejects ungrounded claims; mandates Human Escalation |

---

## 2. Adaptive Reasoning Loop (Addressing the Difficult Case 4.1)

A naive RAG pipeline embeds the patient's complaint ("The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital") and retrieves package insert passages. Because the patient is unaware of regulatory rules, a single embedding search never retrieves **NDCTR 2019 Rule 67(3)** or **IPC Guidance 5.2.4**.

### Adaptive Execution Flow:
1. **Entity & Synonym Resolution:**
   - Input: `"skin started peeling badly"`
   - `search_alternative_terms` maps this to: `exfoliative dermatitis`, `toxic epidermal necrolysis (TEN)`, `stevens-johnson syndrome (SJS)`.
2. **Initial Search (Pass 1):**
   - Agent A queries: `"Carbamazepine approved package insert adverse reactions"` and `"NDCTR 2019 Rule 67 serious adverse event hospitalization"`.
   - Results show: Carbamazepine lists exfoliative dermatitis under Section 6.1 (Expected). Routine rules suggest serious expected reactions go to Periodic Safety Reports (PSUR).
3. **Clinical Modifier Detection (Adaptive Step):**
   - Agent A notices that the report documents **acute hospital admission** accompanied by **severe epidermal peeling / SCAR symptoms**.
   - Agent A formulates targeted secondary queries derived from regulatory knowledge:
     - Direct Clause Lookup: `NDCTR-2019-R67(3)` ("Special Regulatory Modifier for Acute Hospitalization & Severe Cutaneous Reactions").
     - Direct Clause Lookup: `IPC-PVPI-G5.2.4` ("Special Safety Override for Severe Cutaneous Adverse Reactions").
4. **Handoff to Agent B:**
   - Agent A packages both baseline and modifying provisions into `evidence_package`.
5. **Synthesis & Grounding:**
   - Agent B applies `DecisionEngine.determine_reporting_route(...)`.
   - The modifying provision overrides routine periodic reporting and classifies the case as an **Expedited Report (14 calendar days)**.
6. **Self-Verification Tool:**
   - Agent B calls `verify_citations(...)` against the retrieved chunks.
   - Every citation is validated against verbatim text. If verification fails and retry count is below limit, Agent B requests a revised search from Agent A.
   - If evidence remains missing, it routes to **Human Pharmacovigilance Review Required**.

---

## 3. Loop Bounds and Guardrails

To prevent run-away loops and budget exhaustion:
- **Maximum Reasoning Steps:** Fixed to 8 graph transitions.
- **Maximum Agent Retries:** Bounded to 1 retry cycle.
- **Provider Timeout:** 15.0 seconds per model call with exponential backoff.
- **Total Wall-Clock Timeout:** Enforced at 25.0 seconds maximum per run.
- **Prohibition on Unsupported Determinations:** If citations do not resolve to indexed text, the system is strictly prohibited from returning a completed recommendation; it must escalate.
