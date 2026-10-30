import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SECRET_KEY: str = "dev-secret-key-change-in-production-pv-service-2026"

    # Database: PostgreSQL for Docker/prod, SQLite for local
    DATABASE_URL: str = Field(default="sqlite:///./pv_service.db")

    # Redis & Task Runner
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    USE_CELERY: bool = Field(default=False)

    # LLM Settings
    LLM_PROVIDER: str = Field(default="deterministic_stub")  # deterministic_stub, openai, gemini, ollama
    LLM_MODEL: str = Field(default="pv-deterministic-v1")
    LLM_STUB_DELAY_SECONDS: float = Field(default=0.05)
    LLM_TEMPERATURE: float = Field(default=0.0)
    LLM_TIMEOUT_SECONDS: float = Field(default=15.0)
    LLM_MAX_RETRIES: int = Field(default=3)

    # API keys
    OPENAI_API_KEY: str = Field(default="")
    GEMINI_API_KEY: str = Field(default="")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")

    # Resilience & Guardrails
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = Field(default=3)
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT_SECONDS: float = Field(default=30.0)
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60)

    # Ingestion & Corpus
    CORPUS_DIR: str = Field(default=str(BASE_DIR / "corpus" / "documents"))
    MANIFEST_DIR: str = Field(default=str(BASE_DIR / "corpus" / "manifests"))
    FAISS_INDEX_DIR: str = Field(default=str(BASE_DIR / "corpus" / "faiss_index"))
    EMBEDDING_MODEL_NAME: str = Field(default="all-MiniLM-L6-v2")

    # Prompt & Rule Versions
    DEFAULT_PROMPT_VERSION: str = "v1"
    DECISION_RULE_VERSION: str = "1.0.0-ndctr2019-ipc"

    # SLO Configuration (D6 requirement)
    SLO_P95_SECONDS: float = 10.0

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
