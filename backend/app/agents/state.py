from typing import Dict, Any, List, Optional, TypedDict


class AgentWorkflowState(TypedDict, total=False):
    # Identifiers & Metadata
    run_id: str
    correlation_id: str
    case_id: str
    report_data: Dict[str, Any]
    prompt_version: str
    rule_version: str

    # Agent A Output (Intake & Research)
    extracted_entities: Dict[str, Any]
    matched_medical_terms: List[str]
    confirmed_facts: List[str]
    missing_facts: List[str]
    inferred_interpretations: List[str]
    search_queries: List[str]
    retrieved_chunks: List[Dict[str, Any]]
    evidence_package: Dict[str, Any]

    # Agent B Output (Assessment & Verification)
    is_serious: Optional[bool]
    seriousness_criteria: List[str]
    seriousness_rationale: Optional[str]
    
    is_expected: Optional[bool]
    expectedness_rationale: Optional[str]
    
    recommended_route: Optional[str]
    reporting_timeline_days: Optional[int]
    modifying_provisions: List[str]
    route_rationale: Optional[str]
    
    citations: List[Dict[str, Any]]
    all_citations_verified: bool
    confidence_score: float
    confidence_explanation: str
    
    # Escalation & Loop Bounds
    escalation_required: bool
    escalation_reason: Optional[str]
    retry_count: int
    max_retries: int
    iteration_step: int
    max_steps: int
    
    # Observability & Tokens
    tool_call_history: List[Dict[str, Any]]
    step_traces: List[Dict[str, Any]]
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost_usd: float
    start_time: float
    status: str
    error: Optional[str]
