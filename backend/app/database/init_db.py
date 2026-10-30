import logging
from backend.app.database.session import engine, Base
from backend.app.database.models import (
    AdverseEventReportModel,
    QuarantinedSubmissionModel,
    AgentRunModel,
    AgentStepModel,
    AssessmentResultModel,
    ReviewerFeedbackModel,
    CorpusDocumentModel,
    EvaluationRunModel,
    AuditEventModel
)

logger = logging.getLogger(__name__)


def init_db():
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
