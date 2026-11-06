import logging
from sqlalchemy import text
from backend.app.database.session import engine, SessionLocal, Base
from backend.app.database.models import (
    AdverseEventReportModel,
    QuarantinedSubmissionModel,
    AgentRunModel,
    AgentStepModel,
    AssessmentResultModel,
    ReviewerFeedbackModel,
    CorpusDocumentModel,
    EvaluationRunModel,
    AuditEventModel,
    AuthorizedDoctorModel
)
from backend.app.auth.security import hash_password

logger = logging.getLogger(__name__)

INITIAL_DOCTORS = [
    {
        "email": "dr.sharma@pharmaguard.med",
        "password": "PhysicianSecret2026!",
        "full_name": "Dr. S. Sharma, MD",
        "medical_license_number": "MCI-48291",
        "specialty": "Clinical Pharmacology & Drug Safety",
        "institution": "All India Institute of Medical Sciences (AIIMS)",
        "role": "qppv"
    },
    {
        "email": "dr.patel@pharmaguard.med",
        "password": "PhysicianSecret2026!",
        "full_name": "Dr. R. Patel, MBBS, MD",
        "medical_license_number": "MCI-61024",
        "specialty": "Internal Medicine",
        "institution": "Postgraduate Institute of Medical Education & Research (PGIMER)",
        "role": "physician"
    },
    {
        "email": "dr.iyer@pharmaguard.med",
        "password": "PhysicianSecret2026!",
        "full_name": "Dr. Ananya Iyer, MD",
        "medical_license_number": "MCI-77319",
        "specialty": "Neurology & Epilepsy Care",
        "institution": "National Institute of Mental Health and Neurosciences (NIMHANS)",
        "role": "physician"
    },
    {
        "email": "admin@pharmaguard.med",
        "password": "AdminClinical2026!",
        "full_name": "Admin Medical Directorate",
        "medical_license_number": "MCI-ADMIN-01",
        "specialty": "Medical Administration & Regulatory Compliance",
        "institution": "Central Pharmacovigilance Regulatory Directorate",
        "role": "admin"
    }
]


def migrate_sqlite_schema(db):
    """Safely adds missing columns to existing SQLite tables without losing existing records"""
    migrations = [
        ("audit_events", "actor_role", "VARCHAR(64)"),
        ("audit_events", "resource_id", "VARCHAR(64)"),
        ("audit_events", "action", "VARCHAR(64)"),
        ("audit_events", "ip_address", "VARCHAR(64)"),
        ("adverse_event_reports", "dosage", "VARCHAR(100)"),
        ("adverse_event_reports", "frequency", "VARCHAR(100)"),
        ("adverse_event_reports", "attending_physician_id", "VARCHAR(36)"),
        ("adverse_event_reports", "attending_physician_name", "VARCHAR(128)"),
        ("adverse_event_reports", "attending_physician_license", "VARCHAR(64)")
    ]

    for table, column, col_type in migrations:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"))
            db.commit()
            logger.info(f"Migrated column {column} on table {table}")
        except Exception:
            # Column already exists
            db.rollback()


def seed_authorized_doctors(db):
    for doc in INITIAL_DOCTORS:
        existing = db.query(AuthorizedDoctorModel).filter(AuthorizedDoctorModel.email == doc["email"]).first()
        if not existing:
            new_doctor = AuthorizedDoctorModel(
                email=doc["email"],
                password_hash=hash_password(doc["password"]),
                full_name=doc["full_name"],
                medical_license_number=doc["medical_license_number"],
                specialty=doc["specialty"],
                institution=doc["institution"],
                role=doc["role"],
                is_active=True
            )
            db.add(new_doctor)
            logger.info(f"Provisioned authorized physician: {doc['full_name']} ({doc['email']})")
    db.commit()


def init_db():
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
    
    db = SessionLocal()
    try:
        migrate_sqlite_schema(db)
        seed_authorized_doctors(db)
    except Exception as e:
        logger.error(f"Error seeding authorized physicians: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
