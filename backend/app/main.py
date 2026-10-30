import os
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database.init_db import init_db
from backend.app.api.endpoints import router as api_router
from backend.app.observability.metrics import HTTP_REQUESTS_TOTAL

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("pv_service")

# Initialize database tables on startup
init_db()

app = FastAPI(
    title="Pharmacovigilance Adverse Event Intake and Triage Service",
    description=(
        "Production-style multi-agent pharmacovigilance triage service conforming to "
        "The New Drugs and Clinical Trials Rules, 2019 and Indian Pharmacopoeia Commission (IPC) PvPI standards. "
        "The service accepts synthetic adverse drug event reports, enforces strict ingestion boundary validation, "
        "performs adaptive multi-step reference corpus retrieval, assesses seriousness & expectedness, and "
        "routes cases to Expedited, Periodic Safety, or Human Review streams with source-verified citations. "
        "\n\n**CRITICAL STATUTORY DISCLAIMER:** The system NEVER submits a regulatory report automatically. "
        "All recommendations must be evaluated and authorized by a Qualified Person for Pharmacovigilance."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Middleware (allows React frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Correlation ID and Request Timing Middleware
@app.middleware("http")
async def correlation_and_metrics_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or f"corr-{os.urandom(6).hex()}"
    start_time = time.time()

    response = await call_next(request)

    duration_ms = (time.time() - start_time) * 1000
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Response-Time-MS"] = f"{duration_ms:.2f}"

    # Track Prometheus request counts
    endpoint = request.url.path
    status_code = response.status_code
    try:
        HTTP_REQUESTS_TOTAL.labels(method=request.method, endpoint=endpoint, status_code=status_code).inc()
    except Exception:
        pass

    return response


# Include API Routers
app.include_router(api_router)

# Mount Frontend static build if available
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", summary="Serve Single Page Application")
    def serve_spa(full_path: str):
        from fastapi.responses import FileResponse
        # Check if requested file exists in dist
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", summary="Root index")
    def root_index():
        return {
            "service": "Pharmacovigilance Adverse Event Intake and Triage Service",
            "course": "UE24AM342AA5 - ML System Design and AgentOps",
            "documentation": "/docs",
            "health": "/api/v1/health",
            "metrics": "/api/v1/metrics",
            "api_version": "1.0.0"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
