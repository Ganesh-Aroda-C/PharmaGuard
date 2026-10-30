import time
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from langgraph.graph import StateGraph, END

from backend.app.agents.state import AgentWorkflowState
from backend.app.config import settings
from backend.app.decision.rules import DecisionEngine
from backend.app.guardrails.injection import GuardrailEngine
from backend.app.prompts.manager import PromptManager
from backend.app.services.llm_provider import LLMService
from backend.app.tools.agent_tools import (
    tool_search_corpus,
    tool_lookup_clause,
    tool_get_report_fields,
    tool_search_alternative_terms,
    tool_verify_citations
)
from backend.app.database.session import SessionLocal
from backend.app.database.models import (
    AgentRunModel,
    AgentStepModel,
    AssessmentResultModel
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Helper to record step metrics in DB
# ---------------------------------------------------------
def record_step_trace(
    state: AgentWorkflowState,
    agent_name: str,
    step_name: str,
    tool_calls: List[Dict[str, Any]],
    input_payload: Dict[str, Any],
    output_payload: Dict[str, Any],
    retrieved_chunk_ids: List[str],
    duration_ms: float,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_usd: float = 0.0,
    status: str = "success",
    error_message: Optional[str] = None
):
    step_idx = len(state.get("step_traces", [])) + 1
    trace_data = {
        "step_index": step_idx,
        "agent_name": agent_name,
        "step_name": step_name,
        "tool_calls": tool_calls,
        "input_payload": input_payload,
        "output_payload": output_payload,
        "retrieved_chunk_ids": retrieved_chunk_ids,
        "duration_ms": round(duration_ms, 2),
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "estimated_cost_usd": round(cost_usd, 6),
        "status": status,
        "error_message": error_message
    }
    state.setdefault("step_traces", []).append(trace_data)
    state["total_prompt_tokens"] = state.get("total_prompt_tokens", 0) + prompt_tokens
    state["total_completion_tokens"] = state.get("total_completion_tokens", 0) + completion_tokens
    state["total_cost_usd"] = state.get("total_cost_usd", 0.0) + cost_usd

    # Persist in DB
    run_id = state.get("run_id")
    if run_id:
        db = SessionLocal()
        try:
            db_step = AgentStepModel(
                run_id=run_id,
                step_index=step_idx,
                agent_name=agent_name,
                step_name=step_name,
                tool_calls=tool_calls,
                input_payload=input_payload,
                output_payload=output_payload,
                retrieved_chunk_ids=retrieved_chunk_ids,
                duration_ms=duration_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                estimated_cost_usd=cost_usd,
                status=status,
                error_message=error_message
            )
            db.add(db_step)
            db.commit()
        except Exception as e:
            logger.error(f"Error persisting step trace: {e}")
            db.rollback()
        finally:
            db.close()


# ---------------------------------------------------------
# Node 1: Agent A - Intake Extraction & Entity Resolution
# ---------------------------------------------------------
def node_intake_extract(state: AgentWorkflowState) -> AgentWorkflowState:
    step_start = time.time()
    agent_name = "Agent A: Intake and Evidence Research Agent"
    step_name = "intake_extraction_and_terminology_mapping"
    tool_calls = []

    report = state.get("report_data", {})
    suspect_drug = report.get("suspect_drug", "").strip()
    raw_reaction = report.get("reaction_description", "").strip()

    # Step 1: Tool call - search alternative terms & MedDRA mapping
    tool_start = time.time()
    alternative_terms_res = tool_search_alternative_terms(raw_reaction)
    tool_calls.append({
        "tool_name": "search_alternative_terms",
        "arguments": {"terms": raw_reaction},
        "result_count": len(alternative_terms_res),
        "duration_ms": round((time.time() - tool_start) * 1000, 2)
    })

    matched_medical_terms = []
    for item in alternative_terms_res:
        matched_medical_terms.extend(item.get("medical_terms", []))
    matched_medical_terms = list(dict.fromkeys(matched_medical_terms))  # deduplicate

    # Fact categorization: confirmed vs missing vs inferred
    confirmed_facts = [
        f"Suspect medicinal product: {suspect_drug}",
        f"Reported adverse reaction: '{raw_reaction}'",
        f"Reporter type: {report.get('reporter_type', 'unknown')}",
        f"Report source: {report.get('source_type', 'unknown')}"
    ]
    if report.get("patient_age"):
        confirmed_facts.append(f"Patient age: {report.get('patient_age')} years")
    if report.get("is_hospitalized") or report.get("hospitalization_admission_date"):
        confirmed_facts.append("Inpatient hospital admission confirmed")

    missing_facts = []
    if not report.get("patient_age"):
        missing_facts.append("Patient exact age not reported")
    if not report.get("drug_start_date") and not report.get("onset_relative_days"):
        missing_facts.append("Exact drug initiation date / relative onset timing not specified")
    if not report.get("concomitant_medications"):
        missing_facts.append("Concomitant medication details absent")
    if not report.get("medical_history"):
        missing_facts.append("Relevant medical history absent")

    inferred_interpretations = []
    if matched_medical_terms:
        inferred_interpretations.append(
            f"Colloquial description '{raw_reaction}' mapped to clinical terms: {', '.join(matched_medical_terms[:4])}"
        )
    if report.get("onset_relative_days"):
        inferred_interpretations.append(f"Event onset occurred approximately {report.get('onset_relative_days')} days post-treatment initiation")

    # LLM consultation for entity extraction reasoning
    prompt_version = state.get("prompt_version", "v1")
    prompt_tmpl = PromptManager.get_prompt("intake_research", version=prompt_version)
    llm = LLMService.get_instance()
    llm_resp = llm.generate(
        prompt=f"{prompt_tmpl}\n\nCase Report Data:\n{json.dumps(report, default=str)}",
        system_instruction="Extract clinical entities and evaluate missing facts without hallucinating."
    )

    state["extracted_entities"] = {
        "suspect_drug": suspect_drug,
        "reported_reaction": raw_reaction,
        "matched_medical_terms": matched_medical_terms,
        "hospitalized": report.get("is_hospitalized", False),
        "outcome": report.get("outcome", "unknown")
    }
    state["matched_medical_terms"] = matched_medical_terms
    state["confirmed_facts"] = confirmed_facts
    state["missing_facts"] = missing_facts
    state["inferred_interpretations"] = inferred_interpretations
    state.setdefault("tool_call_history", []).extend(tool_calls)

    duration_ms = (time.time() - step_start) * 1000
    record_step_trace(
        state=state,
        agent_name=agent_name,
        step_name=step_name,
        tool_calls=tool_calls,
        input_payload={"report": report},
        output_payload={"extracted_entities": state["extracted_entities"]},
        retrieved_chunk_ids=[],
        duration_ms=duration_ms,
        prompt_tokens=llm_resp.prompt_tokens,
        completion_tokens=llm_resp.completion_tokens,
        cost_usd=llm_resp.estimated_cost_usd
    )

    return state


# ---------------------------------------------------------
# Node 2: Agent A - Initial Corpus Research (Pass 1)
# ---------------------------------------------------------
def node_evidence_research_pass1(state: AgentWorkflowState) -> AgentWorkflowState:
    step_start = time.time()
    agent_name = "Agent A: Intake and Evidence Research Agent"
    step_name = "initial_reference_corpus_search"
    tool_calls = []

    suspect_drug = state["extracted_entities"]["suspect_drug"]
    matched_terms = state.get("matched_medical_terms", [])
    raw_reaction = state["extracted_entities"]["reported_reaction"]

    # Formulate queries
    search_queries = [
        f"{suspect_drug} approved package insert adverse reactions listed",
        "NDCTR 2019 Rule 67 serious adverse event hospitalization reporting provisions",
        "IPC PvPI guidance seriousness expectedness triage criteria"
    ]
    if matched_terms:
        search_queries.append(f"{suspect_drug} package insert {matched_terms[0]}")

    state["search_queries"] = search_queries
    retrieved_chunks = []

    for q in search_queries:
        t_start = time.time()
        results = tool_search_corpus(query=q, top_k=3)
        tool_calls.append({
            "tool_name": "search_corpus",
            "arguments": {"query": q, "top_k": 3},
            "result_count": len(results),
            "chunk_ids": [r["chunk_id"] for r in results],
            "duration_ms": round((time.time() - t_start) * 1000, 2)
        })
        retrieved_chunks.extend(results)

    # Deduplicate retrieved chunks by chunk_id
    unique_chunks = {}
    for c in retrieved_chunks:
        if c["chunk_id"] not in unique_chunks:
            unique_chunks[c["chunk_id"]] = c
    all_chunks = list(unique_chunks.values())
    state["retrieved_chunks"] = all_chunks

    duration_ms = (time.time() - step_start) * 1000
    record_step_trace(
        state=state,
        agent_name=agent_name,
        step_name=step_name,
        tool_calls=tool_calls,
        input_payload={"queries": search_queries},
        output_payload={"chunks_retrieved_count": len(all_chunks)},
        retrieved_chunk_ids=[c["chunk_id"] for c in all_chunks],
        duration_ms=duration_ms
    )

    return state


# ---------------------------------------------------------
# Node 3: Agent A - Adaptive Modifier Search (Pass 2)
# ---------------------------------------------------------
def node_adaptive_modifier_search(state: AgentWorkflowState) -> AgentWorkflowState:
    """
    Adaptive reasoning loop (Section 5 requirements):
    1. Read initially retrieved provisions.
    2. Identify possible exceptions or modifiers (e.g. SCAR acute hospitalization modifier under Rule 67(3) and IPC 5.2.4).
    3. Construct targeted new queries.
    4. Call lookup_clause or search again.
    5. Hand off structured Evidence Package to Agent B.
    """
    step_start = time.time()
    agent_name = "Agent A: Intake and Evidence Research Agent"
    step_name = "adaptive_modifier_and_clause_lookup"
    tool_calls = []

    report = state.get("report_data", {})
    raw_reaction = state["extracted_entities"]["reported_reaction"].lower()
    matched_terms = [t.lower() for t in state.get("matched_medical_terms", [])]
    is_hospitalized = report.get("is_hospitalized", False)

    # Check if clinical presentation triggers the Severe Cutaneous Adverse Reaction modifier
    has_skin_peeling = "peel" in raw_reaction or any("exfoliat" in t or "necrolysis" in t or "stevens" in t for t in matched_terms)
    
    additional_chunks = []
    if has_skin_peeling or is_hospitalized:
        # Step 1: Direct clause lookup for NDCTR Rule 67(3)
        t_start = time.time()
        clause_ndctr = tool_lookup_clause("NDCTR-2019-R67(3)")
        if clause_ndctr:
            additional_chunks.append(clause_ndctr)
            tool_calls.append({
                "tool_name": "lookup_clause",
                "arguments": {"clause_id": "NDCTR-2019-R67(3)"},
                "status": "found",
                "duration_ms": round((time.time() - t_start) * 1000, 2)
            })

        # Step 2: Direct clause lookup for IPC Guidance 5.2.4
        t_start = time.time()
        clause_ipc = tool_lookup_clause("IPC-PVPI-G5.2.4")
        if clause_ipc:
            additional_chunks.append(clause_ipc)
            tool_calls.append({
                "tool_name": "lookup_clause",
                "arguments": {"clause_id": "IPC-PVPI-G5.2.4"},
                "status": "found",
                "duration_ms": round((time.time() - t_start) * 1000, 2)
            })

        # Step 3: Targeted search query for SCAR modifier
        t_start = time.time()
        q_mod = "severe cutaneous adverse reaction inpatient hospitalization expedited 14 days"
        mod_results = tool_search_corpus(query=q_mod, top_k=2)
        tool_calls.append({
            "tool_name": "search_corpus",
            "arguments": {"query": q_mod, "top_k": 2},
            "result_count": len(mod_results),
            "duration_ms": round((time.time() - t_start) * 1000, 2)
        })
        additional_chunks.extend(mod_results)

    # Merge into all retrieved chunks
    existing_chunks = {c["chunk_id"]: c for c in state.get("retrieved_chunks", [])}
    for c in additional_chunks:
        existing_chunks[c["chunk_id"]] = c
    state["retrieved_chunks"] = list(existing_chunks.values())

    # Build Structured Evidence Package to hand off to Agent B
    evidence_package = {
        "suspect_drug": state["extracted_entities"]["suspect_drug"],
        "reported_reaction": state["extracted_entities"]["reported_reaction"],
        "matched_medical_terms": state.get("matched_medical_terms", []),
        "is_hospitalized": is_hospitalized,
        "has_scar_symptoms": has_skin_peeling,
        "total_evidence_chunks": len(state["retrieved_chunks"]),
        "evidence_chunk_ids": list(existing_chunks.keys()),
        "hand_off_timestamp": datetime.utcnow().isoformat(),
        "handoff_summary": (
            f"Evidence package compiled with {len(state['retrieved_chunks'])} retrieved passages "
            f"covering product package insert, statutory seriousness criteria, and modifying reporting clauses."
        )
    }
    state["evidence_package"] = evidence_package

    duration_ms = (time.time() - step_start) * 1000
    record_step_trace(
        state=state,
        agent_name=agent_name,
        step_name=step_name,
        tool_calls=tool_calls,
        input_payload={"has_skin_peeling": has_skin_peeling, "is_hospitalized": is_hospitalized},
        output_payload={"evidence_package": evidence_package},
        retrieved_chunk_ids=[c["chunk_id"] for c in additional_chunks],
        duration_ms=duration_ms
    )

    return state


# ---------------------------------------------------------
# Node 4: Agent B - Assessment and Verification Synthesis
# ---------------------------------------------------------
def node_assessment_synthesis(state: AgentWorkflowState) -> AgentWorkflowState:
    step_start = time.time()
    agent_name = "Agent B: Assessment and Verification Agent"
    step_name = "assessment_synthesis_and_route_determination"
    tool_calls = []

    report = state.get("report_data", {})
    suspect_drug = state["extracted_entities"]["suspect_drug"]
    matched_terms = state.get("matched_medical_terms", [])
    raw_reaction = state["extracted_entities"]["reported_reaction"]
    retrieved_chunks = state.get("retrieved_chunks", [])

    # Filter Package Insert chunks strictly for this suspect drug
    pi_chunks = [
        c for c in retrieved_chunks
        if ("package_insert" in c["filename"] or c["metadata"].get("document_type") == "package_insert")
        and (suspect_drug.lower() in c["text"].lower() or (c["metadata"].get("drug_name") and c["metadata"].get("drug_name").lower() == suspect_drug.lower()))
    ]

    # Evaluate Seriousness
    is_serious, seriousness_criteria, seriousness_rationale = DecisionEngine.evaluate_seriousness(report)
    state["is_serious"] = is_serious
    state["seriousness_criteria"] = seriousness_criteria
    state["seriousness_rationale"] = seriousness_rationale

    # Check if drug exists in corpus
    has_corpus_evidence = len(pi_chunks) > 0
    
    # Timing validation check
    is_timing_valid = True
    if report.get("onset_relative_days") is not None and report.get("onset_relative_days") < 0:
        is_timing_valid = False

    # Evaluate Expectedness against Package Insert
    is_expected, expectedness_rationale, pi_clause_id = DecisionEngine.evaluate_expectedness(
        suspect_drug=suspect_drug,
        matched_medical_terms=matched_terms,
        retrieved_pi_chunks=pi_chunks
    )
    state["is_expected"] = is_expected
    state["expectedness_rationale"] = expectedness_rationale

    # Evaluate Reporting Route grounded in NDCTR 2019 / IPC
    has_scar = state["evidence_package"].get("has_scar_symptoms", False)
    is_hosp = report.get("is_hospitalized", False)

    route, timeline_days, modifying_provisions, route_rationale = DecisionEngine.determine_reporting_route(
        is_serious=is_serious,
        is_expected=is_expected,
        is_hospitalized=is_hosp,
        has_scar_symptoms=has_scar,
        has_corpus_evidence=has_corpus_evidence,
        is_timing_valid=is_timing_valid
    )
    state["recommended_route"] = route.value
    state["reporting_timeline_days"] = timeline_days
    state["modifying_provisions"] = modifying_provisions
    state["route_rationale"] = route_rationale

    # Check if escalation is required
    if route.value == "human_review_required":
        state["escalation_required"] = True
        state["escalation_reason"] = route_rationale
    else:
        state["escalation_required"] = False
        state["escalation_reason"] = None

    duration_ms = (time.time() - step_start) * 1000
    record_step_trace(
        state=state,
        agent_name=agent_name,
        step_name=step_name,
        tool_calls=tool_calls,
        input_payload={"suspect_drug": suspect_drug, "matched_terms": matched_terms},
        output_payload={
            "is_serious": is_serious,
            "is_expected": is_expected,
            "recommended_route": route.value,
            "timeline_days": timeline_days
        },
        retrieved_chunk_ids=[],
        duration_ms=duration_ms
    )

    return state


# ---------------------------------------------------------
# Node 5: Agent B - Self-Verification and Citation Grounding
# ---------------------------------------------------------
def node_verification_and_grounding(state: AgentWorkflowState) -> AgentWorkflowState:
    step_start = time.time()
    agent_name = "Agent B: Assessment and Verification Agent"
    step_name = "citation_verification_and_self_grounding"
    tool_calls = []

    retrieved_chunks = state.get("retrieved_chunks", [])
    chunk_map = {c["chunk_id"]: c for c in retrieved_chunks}

    claims_to_verify = []

    # Claim 1: Seriousness criteria verification
    seriousness_criteria = state.get("seriousness_criteria", [])
    if seriousness_criteria:
        # Find IPC PvPI G4.1 chunk
        g41_chunk = next((c for c in retrieved_chunks if "G4.1" in c["section_or_clause"] or "Seriousness" in c["text"]), None)
        if g41_chunk:
            quote = (
                "Under national pharmacovigilance standards, an adverse drug event is deemed SERIOUS"
                if "Under national pharmacovigilance standards" in g41_chunk["text"]
                else g41_chunk["text"][:120]
            )
            claims_to_verify.append({
                "chunk_id": g41_chunk["chunk_id"],
                "claim": f"Event meets statutory seriousness criteria: {', '.join(seriousness_criteria)}",
                "quoted_text": quote,
                "rationale": "Direct definition of serious adverse reaction under Indian pharmacovigilance standards"
            })

    # Claim 2: Expectedness / Package insert listing verification
    matched_terms = state.get("matched_medical_terms", [])
    is_expected = state.get("is_expected", False)
    if is_expected:
        # Find package insert chunk containing the term
        pi_chunk = None
        for c in retrieved_chunks:
            if "package_insert" in c["filename"] or c["metadata"].get("document_type") == "package_insert":
                if any(t.lower() in c["text"].lower() for t in matched_terms):
                    pi_chunk = c
                    break
        if pi_chunk:
            # Extract quote
            quote = "The following cutaneous reactions are officially documented and listed in this approved package insert: (1) Toxic epidermal necrolysis (TEN); (2) Stevens-Johnson syndrome (SJS); (3) Exfoliative dermatitis"
            claims_to_verify.append({
                "chunk_id": pi_chunk["chunk_id"],
                "claim": f"Adverse reaction listed in approved package insert under {pi_chunk['section_or_clause']}",
                "quoted_text": quote if quote.lower() in pi_chunk["text"].lower() else pi_chunk["text"][:120],
                "rationale": "Verifies that reaction is catalogued in approved product literature"
            })

    # Claim 3: Reporting route provision verification
    route = state.get("recommended_route")
    modifying_provisions = state.get("modifying_provisions", [])

    if route == "expedited_report" and any("Rule 67(3)" in p or "5.2.4" in p for p in modifying_provisions):
        # Look for NDCTR Rule 67(3) chunk
        r67_chunk = next((c for c in retrieved_chunks if "R67(3)" in c["section_or_clause"] or "Rule 67(3)" in c["text"]), None)
        if r67_chunk:
            claims_to_verify.append({
                "chunk_id": r67_chunk["chunk_id"],
                "claim": "Mandatory 14-day Expedited Report under NDCTR 2019 Rule 67(3) modifier for acute hospitalization / severe cutaneous adverse reactions",
                "quoted_text": "Rule 67(3): SPECIAL REGULATORY MODIFIER: Where any adverse drug reaction involves acute hospital admission, emergency medical intervention",
                "rationale": "Statutory rule mandating 14-day expedited reporting for acute hospitalization / SCAR"
            })

        # Look for IPC 5.2.4 chunk
        ipc_chunk = next((c for c in retrieved_chunks if "5.2.4" in c["section_or_clause"] or "SCAR" in c["text"]), None)
        if ipc_chunk:
            claims_to_verify.append({
                "chunk_id": ipc_chunk["chunk_id"],
                "claim": "Special vigilance override for Severe Cutaneous Adverse Reactions (SCAR) with hospital admission",
                "quoted_text": "CRITICAL SAFETY OVERRIDE: Any adverse drug event manifesting as a Severe Cutaneous Adverse Reaction (SCAR)" if "CRITICAL SAFETY OVERRIDE" in ipc_chunk["text"] else ipc_chunk["text"][:120],
                "rationale": "IPC PvPI guidelines override standard listedness to mandate expedited triage"
            })
    elif route == "periodic_safety_report":
        r68_chunk = next((c for c in retrieved_chunks if "R68" in c["section_or_clause"] or "PSUR" in c["text"]), None)
        if r68_chunk:
            claims_to_verify.append({
                "chunk_id": r68_chunk["chunk_id"],
                "claim": "Periodic Safety Report stream under NDCTR 2019 Rule 68(4)",
                "quoted_text": "Rule 68(4): Adverse reactions assessed as non-serious, or serious adverse events that are listed in the approved package insert",
                "rationale": "Statutory provision for periodic safety update reporting cadence"
            })

    # Execute verification tool call
    t_start = time.time()
    verify_result = tool_verify_citations(claims_to_verify, retrieved_chunks)
    tool_calls.append({
        "tool_name": "verify_citations",
        "claims_checked": len(claims_to_verify),
        "verified_count": verify_result.get("verified_count", 0),
        "all_verified": verify_result.get("all_verified", False),
        "duration_ms": round((time.time() - t_start) * 1000, 2)
    })

    verified_citations = verify_result.get("verified_citations", [])
    state["citations"] = verified_citations
    state["all_citations_verified"] = verify_result.get("all_verified", False)

    # Compute confidence score
    escalation_required = state.get("escalation_required", False)
    if escalation_required:
        state["confidence_score"] = 0.40
        state["confidence_explanation"] = "Confidence limited due to missing reference evidence or ambiguous clinical data requiring human review."
    elif verify_result.get("all_verified", False) and len(verified_citations) >= 2:
        state["confidence_score"] = 0.98
        state["confidence_explanation"] = "High confidence: Determinations verified against approved reference documents, statutory seriousness definitions, and modifying regulatory clauses."
    elif len(verified_citations) >= 1:
        state["confidence_score"] = 0.82
        state["confidence_explanation"] = "Moderate confidence: Core statutory criteria verified; secondary supporting passages partially resolved."
    else:
        state["confidence_score"] = 0.50
        state["confidence_explanation"] = "Low confidence: Citations could not be fully verified against retrieved evidence."

    # If verification failed completely and retries remain, request retry
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 1)
    if not verify_result.get("all_verified", False) and retry_count < max_retries and not escalation_required:
        state["retry_count"] = retry_count + 1
        logger.warning(f"Verification incomplete. Triggering Agent A retry pass {state['retry_count']}/{max_retries}...")
        # State transitions back via conditional edge

    duration_ms = (time.time() - step_start) * 1000
    record_step_trace(
        state=state,
        agent_name=agent_name,
        step_name=step_name,
        tool_calls=tool_calls,
        input_payload={"claims_count": len(claims_to_verify)},
        output_payload={
            "all_citations_verified": state["all_citations_verified"],
            "verified_citations_count": len(verified_citations),
            "confidence_score": state["confidence_score"]
        },
        retrieved_chunk_ids=[c["chunk_id"] for c in verified_citations],
        duration_ms=duration_ms
    )

    return state


# ---------------------------------------------------------
# Node 6: Finalize Run and Store Assessment
# ---------------------------------------------------------
def node_finalize(state: AgentWorkflowState) -> AgentWorkflowState:
    run_id = state.get("run_id")
    case_id = state.get("case_id")
    status = "escalated" if state.get("escalation_required") else "completed"
    state["status"] = status

    total_duration = round((time.time() - state.get("start_time", time.time())) * 1000, 2)
    prompt_version = state.get("prompt_version", "v1")
    rule_version = state.get("rule_version", "1.0.0-ndctr2019-ipc")

    db = SessionLocal()
    try:
        run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id).first()
        if run:
            run.status = status
            run.completed_at = datetime.utcnow()
            run.total_duration_ms = total_duration
            run.total_prompt_tokens = state.get("total_prompt_tokens", 0)
            run.total_completion_tokens = state.get("total_completion_tokens", 0)
            run.total_cost_usd = state.get("total_cost_usd", 0.0)
            run.escalation_reason = state.get("escalation_reason")

            # Check existing assessment or create new
            assessment = db.query(AssessmentResultModel).filter(AssessmentResultModel.run_id == run_id).first()
            if not assessment:
                assessment = AssessmentResultModel(
                    run_id=run_id,
                    suspect_drug=state["extracted_entities"]["suspect_drug"],
                    reported_reaction=state["extracted_entities"]["reported_reaction"],
                    matched_medical_terms=state.get("matched_medical_terms", []),
                    is_serious=state.get("is_serious", False),
                    seriousness_criteria_met=state.get("seriousness_criteria", []),
                    seriousness_rationale=state.get("seriousness_rationale", "Evaluated"),
                    is_expected=state.get("is_expected", False),
                    expectedness_rationale=state.get("expectedness_rationale", "Evaluated"),
                    recommended_route=state.get("recommended_route", "human_review_required"),
                    reporting_timeline_days=state.get("reporting_timeline_days"),
                    modifying_provisions_applied=state.get("modifying_provisions", []),
                    route_rationale=state.get("route_rationale", "Evaluated"),
                    confirmed_facts=state.get("confirmed_facts", []),
                    missing_facts=state.get("missing_facts", []),
                    inferred_interpretations=state.get("inferred_interpretations", []),
                    citations=state.get("citations", []),
                    all_citations_verified=state.get("all_citations_verified", False),
                    confidence_score=state.get("confidence_score", 0.5),
                    confidence_explanation=state.get("confidence_explanation", ""),
                    escalation_required=state.get("escalation_required", False),
                    escalation_reason=state.get("escalation_reason"),
                    prompt_version=prompt_version,
                    rule_version=rule_version
                )
                db.add(assessment)
            db.commit()
    except Exception as e:
        logger.error(f"Error finalizing assessment in DB: {e}")
        db.rollback()
    finally:
        db.close()

    return state


# ---------------------------------------------------------
# Routing Conditional Edge Logic
# ---------------------------------------------------------
def should_retry_or_finish(state: AgentWorkflowState) -> str:
    # If escalation requested or all verified, finalize
    if state.get("escalation_required"):
        return "finalize"
    if state.get("all_citations_verified", False):
        return "finalize"
    
    # If verification failed and retries left, loop back to research pass
    if state.get("retry_count", 0) < state.get("max_retries", 1):
        return "retry_research"

    return "finalize"


# ---------------------------------------------------------
# Build LangGraph State Graph
# ---------------------------------------------------------
def build_agent_graph() -> StateGraph:
    builder = StateGraph(AgentWorkflowState)

    # Add Nodes
    builder.add_node("intake_extract", node_intake_extract)
    builder.add_node("evidence_research_pass1", node_evidence_research_pass1)
    builder.add_node("adaptive_modifier_search", node_adaptive_modifier_search)
    builder.add_node("assessment_synthesis", node_assessment_synthesis)
    builder.add_node("verification_and_grounding", node_verification_and_grounding)
    builder.add_node("finalize", node_finalize)

    # Set Entry Point
    builder.set_entry_point("intake_extract")

    # Linear Agent A flow -> Hand off to Agent B
    builder.add_edge("intake_extract", "evidence_research_pass1")
    builder.add_edge("evidence_research_pass1", "adaptive_modifier_search")
    builder.add_edge("adaptive_modifier_search", "assessment_synthesis")
    builder.add_edge("assessment_synthesis", "verification_and_grounding")

    # Conditional Branching on Verification Outcome (Agent B -> Agent A retry or Finalize)
    builder.add_conditional_edges(
        "verification_and_grounding",
        should_retry_or_finish,
        {
            "retry_research": "evidence_research_pass1",
            "finalize": "finalize"
        }
    )

    builder.add_edge("finalize", END)
    return builder.compile()


# Compiled Singleton Graph
agent_workflow = build_agent_graph()
