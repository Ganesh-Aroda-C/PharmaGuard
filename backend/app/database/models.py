import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class AdverseEventReportModel(Base):
    __tablename__ = "adverse_event_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(64), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(128), unique=True, nullable=False, index=True)
    
    suspect_drug = Column(String(200), nullable=False)
    product_identifier = Column(String(100), nullable=True)
    reaction_description = Column(Text, nullable=False)
    
    patient_age = Column(Integer, nullable=True)
    patient_age_group = Column(String(32), nullable=True)
    patient_sex = Column(String(32), nullable=True)
    
    drug_start_date = Column(String(32), nullable=True)
    drug_stop_date = Column(String(32), nullable=True)
    event_onset_date = Column(String(32), nullable=True)
    onset_relative_days = Column(Integer, nullable=True)
    
    is_death = Column(Boolean, default=False)
    is_hospitalized = Column(Boolean, default=False)
    is_life_threatening = Column(Boolean, default=False)
    is_disability = Column(Boolean, default=False)
    is_congenital_anomaly = Column(Boolean, default=False)
    is_other_medically_important = Column(Boolean, default=False)
    
    hospitalization_admission_date = Column(String(32), nullable=True)
    hospitalization_discharge_date = Column(String(32), nullable=True)
    
    outcome = Column(String(32), default="unknown")
    reporter_type = Column(String(32), default="consumer")
    source_type = Column(String(32), default="spontaneous")
    
    medical_history = Column(Text, nullable=True)
    concomitant_medications = Column(JSON, default=list)
    raw_payload = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    runs = relationship("AgentRunModel", back_populates="report", cascade="all, delete-orphan")


class QuarantinedSubmissionModel(Base):
    """Stores rejected requests that failed schema/range/chronology validation before agent start"""
    __tablename__ = "quarantined_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    idempotency_key = Column(String(128), nullable=True, index=True)
    raw_payload = Column(JSON, nullable=False)
    field_errors = Column(JSON, nullable=False)
    rejection_reason = Column(Text, nullable=False)
    source_ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AgentRunModel(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("adverse_event_reports.id"), nullable=False, index=True)
    correlation_id = Column(String(64), nullable=False, index=True)
    status = Column(String(32), default="queued", index=True)  # queued, running, completed, escalated, failed, rejected
    
    prompt_version = Column(String(32), default="v1")
    rule_version = Column(String(64), default="1.0.0-ndctr2019-ipc")
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    total_duration_ms = Column(Float, nullable=True)
    
    total_prompt_tokens = Column(Integer, default=0)
    total_completion_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    
    error_message = Column(Text, nullable=True)
    escalation_reason = Column(Text, nullable=True)
    
    report = relationship("AdverseEventReportModel", back_populates="runs")
    steps = relationship("AgentStepModel", back_populates="run", cascade="all, delete-orphan")
    assessment = relationship("AssessmentResultModel", back_populates="run", uselist=False, cascade="all, delete-orphan")
    feedbacks = relationship("ReviewerFeedbackModel", back_populates="run", cascade="all, delete-orphan")


class AgentStepModel(Base):
    __tablename__ = "agent_steps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id"), nullable=False, index=True)
    step_index = Column(Integer, nullable=False)
    agent_name = Column(String(64), nullable=False)
    step_name = Column(String(64), nullable=False)
    
    tool_calls = Column(JSON, default=list)
    input_payload = Column(JSON, default=dict)
    output_payload = Column(JSON, default=dict)
    retrieved_chunk_ids = Column(JSON, default=list)
    
    duration_ms = Column(Float, default=0.0)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)
    
    status = Column(String(32), default="success")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("AgentRunModel", back_populates="steps")


class AssessmentResultModel(Base):
    __tablename__ = "assessment_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id"), unique=True, nullable=False, index=True)
    
    suspect_drug = Column(String(200), nullable=False)
    reported_reaction = Column(Text, nullable=False)
    matched_medical_terms = Column(JSON, default=list)
    
    is_serious = Column(Boolean, nullable=False)
    seriousness_criteria_met = Column(JSON, default=list)
    seriousness_rationale = Column(Text, nullable=False)
    
    is_expected = Column(Boolean, nullable=False)
    expectedness_rationale = Column(Text, nullable=False)
    
    recommended_route = Column(String(64), nullable=False)
    reporting_timeline_days = Column(Integer, nullable=True)
    modifying_provisions_applied = Column(JSON, default=list)
    route_rationale = Column(Text, nullable=False)
    
    confirmed_facts = Column(JSON, default=list)
    missing_facts = Column(JSON, default=list)
    inferred_interpretations = Column(JSON, default=list)
    
    citations = Column(JSON, default=list)
    all_citations_verified = Column(Boolean, default=True)
    confidence_score = Column(Float, default=1.0)
    confidence_explanation = Column(Text, nullable=False)
    
    escalation_required = Column(Boolean, default=False)
    escalation_reason = Column(Text, nullable=True)
    
    prompt_version = Column(String(32), nullable=False)
    rule_version = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("AgentRunModel", back_populates="assessment")


class ReviewerFeedbackModel(Base):
    __tablename__ = "reviewer_feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id"), nullable=False, index=True)
    satisfactory = Column(Boolean, nullable=False)
    rating = Column(Integer, nullable=True)
    feedback_reason = Column(Text, nullable=True)
    reviewer_role = Column(String(100), default="Qualified Person for Pharmacovigilance")
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("AgentRunModel", back_populates="feedbacks")


class CorpusDocumentModel(Base):
    __tablename__ = "corpus_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    source_url = Column(String(512), nullable=True)
    version = Column(String(64), default="1.0")
    sha256_checksum = Column(String(64), nullable=False)
    chunk_count = Column(Integer, default=0)
    indexed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="indexed")
    metadata_json = Column(JSON, default=dict)


class EvaluationRunModel(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prompt_version = Column(String(32), nullable=False)
    scenario_count = Column(Integer, default=0)
    groundedness = Column(Float, default=0.0)
    context_relevance = Column(Float, default=0.0)
    faithfulness = Column(Float, default=0.0)
    hallucination_rate = Column(Float, default=0.0)
    pass_rate = Column(Float, default=0.0)
    results_json = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    correlation_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    actor = Column(String(64), default="system")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
