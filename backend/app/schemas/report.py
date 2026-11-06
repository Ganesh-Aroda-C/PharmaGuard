from datetime import date, datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, field_validator
import uuid


class ReporterType(str, Enum):
    PHYSICIAN = "physician"
    PHARMACIST = "pharmacist"
    OTHER_HCP = "other_hcp"
    CONSUMER = "consumer"
    LITERATURE = "literature"
    REGULATOR = "regulator"


class PatientSex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"


class Outcome(str, Enum):
    RECOVERED = "recovered"
    RECOVERING = "recovering"
    NOT_RECOVERED = "not_recovered"
    FATAL = "fatal"
    UNKNOWN = "unknown"


class SourceType(str, Enum):
    SPONTANEOUS = "spontaneous"
    CLINICAL_TRIAL = "clinical_trial"
    POST_MARKETING_STUDY = "post_marketing_study"
    LITERATURE = "literature"


class ReportingRoute(str, Enum):
    EXPEDITED_REPORT = "expedited_report"
    PERIODIC_SAFETY_REPORT = "periodic_safety_report"
    NON_REPORTABLE = "non_reportable"
    HUMAN_REVIEW_REQUIRED = "human_review_required"


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    ESCALATED = "escalated"
    FAILED = "failed"
    REJECTED = "rejected"


class AdverseEventReportCreate(BaseModel):
    """Synthetic Adverse Drug Event Intake Report Contract (Strict Ingestion Boundary)"""
    case_id: Optional[str] = Field(default_factory=lambda: f"CASE-{uuid.uuid4().hex[:8].upper()}", max_length=64)
    idempotency_key: str = Field(..., min_length=4, max_length=128, description="Unique key for deduplication and idempotency")
    
    suspect_drug: str = Field(..., min_length=2, max_length=200, description="Name of the suspect pharmaceutical product")
    product_identifier: Optional[str] = Field(None, max_length=100, description="Brand name, NDC, or batch number")
    dosage: Optional[str] = Field(None, max_length=100, description="Medication dosage (e.g. 200mg, 10mg/kg)")
    frequency: Optional[str] = Field(None, max_length=100, description="Frequency (e.g. Once daily, Twice daily BD, PRN)")
    
    reaction_description: str = Field(..., min_length=5, max_length=2500, description="Reported adverse reaction in reporter's own words")
    
    # Patient demographics (de-identified)
    patient_age: Optional[int] = Field(None, ge=0, le=130, description="Patient age in years")
    patient_age_group: Optional[str] = Field(None, max_length=32, description="e.g. adult, pediatric, elderly")
    patient_sex: PatientSex = Field(default=PatientSex.UNKNOWN)
    
    # Timing & Chronology
    drug_start_date: Optional[date] = None
    drug_stop_date: Optional[date] = None
    event_onset_date: Optional[date] = None
    onset_relative_days: Optional[int] = Field(None, ge=0, le=3650, description="Onset timing in days after drug initiation")
    
    # Seriousness criteria indicators
    is_death: bool = Field(default=False)
    is_hospitalized: bool = Field(default=False)
    is_life_threatening: bool = Field(default=False)
    is_disability: bool = Field(default=False)
    is_congenital_anomaly: bool = Field(default=False)
    is_other_medically_important: bool = Field(default=False)
    
    # Hospitalization details
    hospitalization_admission_date: Optional[date] = None
    hospitalization_discharge_date: Optional[date] = None
    
    # Clinical outcome and context
    outcome: Outcome = Field(default=Outcome.UNKNOWN)
    reporter_type: ReporterType = Field(default=ReporterType.PHYSICIAN)
    source_type: SourceType = Field(default=SourceType.SPONTANEOUS)
    medical_history: Optional[str] = Field(None, max_length=2000)
    supporting_clinical_notes: Optional[str] = Field(None, max_length=2000)
    concomitant_medications: Optional[List[str]] = Field(default_factory=list)

    @field_validator("suspect_drug", "reaction_description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty or purely whitespace")
        return s

    @model_validator(mode="after")
    def validate_chronology_and_consistency(self):
        today = date.today()

        # Date validity against today
        if self.drug_start_date and self.drug_start_date > today:
            raise ValueError(f"Drug start date {self.drug_start_date} cannot be in the future")
        if self.event_onset_date and self.event_onset_date > today:
            raise ValueError(f"Event onset date {self.event_onset_date} cannot be in the future")

        # Drug start vs stop
        if self.drug_start_date and self.drug_stop_date:
            if self.drug_stop_date < self.drug_start_date:
                raise ValueError(f"Drug stop date ({self.drug_stop_date}) cannot precede drug start date ({self.drug_start_date})")

        # Drug start vs Event onset
        if self.drug_start_date and self.event_onset_date:
            if self.event_onset_date < self.drug_start_date:
                raise ValueError(
                    f"Event onset date ({self.event_onset_date}) cannot precede drug start date ({self.drug_start_date})"
                )

        # Hospitalization consistency
        if self.hospitalization_admission_date and not self.is_hospitalized:
            self.is_hospitalized = True
            
        if self.hospitalization_admission_date and self.hospitalization_discharge_date:
            if self.hospitalization_discharge_date < self.hospitalization_admission_date:
                raise ValueError("Hospitalization discharge date cannot precede admission date")

        # Death vs Outcome consistency
        if self.is_death and self.outcome not in (Outcome.FATAL, Outcome.UNKNOWN):
            raise ValueError("When is_death is True, outcome cannot be recovered or recovering")

        return self


class Citation(BaseModel):
    citation_id: str
    document_title: str
    section_or_clause: str
    page_number: Optional[int] = None
    quoted_text: str
    relevance_rationale: str
    verified: bool = True


class AssessmentResult(BaseModel):
    case_id: str
    suspect_drug: str
    reported_reaction: str
    matched_medical_terms: List[str] = Field(default_factory=list)
    
    # Seriousness assessment
    is_serious: bool
    seriousness_criteria_met: List[str] = Field(default_factory=list)
    seriousness_rationale: str
    
    # Expectedness assessment
    is_expected: bool  # True if listed in approved package insert
    expectedness_rationale: str
    
    # Final Routing Recommendation
    recommended_route: ReportingRoute
    reporting_timeline_days: Optional[int] = None  # e.g., 14 calendar days for expedited
    modifying_provisions_applied: List[str] = Field(default_factory=list)
    route_rationale: str
    
    # Missing / Ambiguous Facts
    confirmed_facts: List[str] = Field(default_factory=list)
    missing_facts: List[str] = Field(default_factory=list)
    inferred_interpretations: List[str] = Field(default_factory=list)
    
    # Verifications & Citations
    citations: List[Citation] = Field(default_factory=list)
    all_citations_verified: bool = True
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_explanation: str
    
    # Escalation details
    escalation_required: bool = False
    escalation_reason: Optional[str] = None
    
    # Metadata & Governance
    prompt_version: str
    rule_version: str
    evaluation_timestamp: datetime = Field(default_factory=datetime.utcnow)
    regulatory_disclaimer: str = (
        "DECISION SUPPORT RECOMMENDATION ONLY: This assessment is generated by an automated multi-agent "
        "pharmacovigilance triage system. The system NEVER submits a regulatory report automatically. "
        "All determinations must be reviewed and authorized by a qualified pharmacovigilance professional."
    )


class AgentStepTrace(BaseModel):
    step_index: int
    agent_name: str
    step_name: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    input_payload: Dict[str, Any] = Field(default_factory=dict)
    output_payload: Dict[str, Any] = Field(default_factory=dict)
    retrieved_chunk_ids: List[str] = Field(default_factory=list)
    duration_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    status: str = "success"
    error_message: Optional[str] = None


class RunTrace(BaseModel):
    run_id: str
    correlation_id: str
    case_id: str
    status: RunStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_duration_ms: Optional[float] = None
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_cost_usd: float = 0.0
    prompt_version: str
    rule_version: str
    steps: List[AgentStepTrace] = Field(default_factory=list)
    assessment_result: Optional[AssessmentResult] = None
    error: Optional[str] = None


class ReportSubmissionResponse(BaseModel):
    run_id: str
    case_id: str
    correlation_id: str
    status: RunStatus
    created_at: datetime
    message: str


class FeedbackCreate(BaseModel):
    run_id: str
    satisfactory: bool
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback_reason: Optional[str] = Field(None, max_length=1000)
    reviewer_role: Optional[str] = Field("Qualified Person for Pharmacovigilance", max_length=100)


class FeedbackResponse(BaseModel):
    feedback_id: str
    run_id: str
    satisfactory: bool
    feedback_reason: Optional[str] = None
    created_at: datetime
