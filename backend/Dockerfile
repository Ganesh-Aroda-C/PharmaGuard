FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and project files
COPY backend/app /workspace/backend/app
COPY backend/tests /workspace/backend/tests
COPY corpus /workspace/corpus
COPY evaluation /workspace/evaluation
COPY scripts /workspace/scripts
COPY loadtest /workspace/loadtest
COPY frontend/dist /workspace/frontend/dist

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.30.6 \
    pydantic==2.9.2 \
    pydantic-settings==2.5.2 \
    sqlalchemy==2.0.35 \
    psycopg[binary]==3.2.1 \
    redis==5.0.8 \
    celery==5.4.0 \
    langgraph==0.2.20 \
    langchain==0.3.0 \
    langchain-core==0.3.0 \
    sentence-transformers==3.1.0 \
    faiss-cpu==1.8.0.post1 \
    pymupdf==1.24.10 \
    prometheus-client==0.20.0 \
    opentelemetry-api==1.27.0 \
    opentelemetry-sdk==1.27.0 \
    locust==2.31.5 \
    pytest==8.3.3 \
    httpx==0.27.2

ENV PYTHONPATH="/workspace"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Default command launches FastAPI server
CMD ["python", "-m", "backend.app.main"]
