from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager

from .db import init_db
from .routers import (
    ontology_router,
    perspectives_router,
    systems_router,
    entities_router,
    attributes_router,
    measures_router,
    metrics_router,
    graph_router,
    ai_router,
    semantic_model_router,
    scenarios_router,
    ingestion_router,
    discovery_router,
    templates_router,
    workshop_ai_router,
    process_ai_router,
    gap_ai_router,
    guided_discovery_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="Business Ontology Framework",
    description="""
    A framework for connecting semantic models, measures, and metrics
    to business processes across operational, management, and financial perspectives.
    """,
    version="0.1.0",
    lifespan=lifespan,
)

# Request body size limit (2MB for JSON, file uploads have their own limits)
MAX_BODY_SIZE = 2 * 1024 * 1024  # 2MB


class LimitRequestBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_type = request.headers.get("content-type", "")
        # Skip file uploads — they have per-endpoint limits in discovery.py
        if "multipart/form-data" in content_type:
            return await call_next(request)
        # Check Content-Length header for early rejection
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_BODY_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request body too large. Maximum is {MAX_BODY_SIZE // (1024*1024)}MB."},
                    )
            except ValueError:
                pass
        return await call_next(request)


app.add_middleware(LimitRequestBodyMiddleware)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Factory-generated CRUD routers
app.include_router(perspectives_router)
app.include_router(systems_router)
app.include_router(entities_router)
app.include_router(attributes_router)
app.include_router(measures_router)
app.include_router(metrics_router)

# Custom routers
app.include_router(ontology_router)
app.include_router(graph_router)
app.include_router(ai_router)
app.include_router(semantic_model_router)
app.include_router(scenarios_router)
app.include_router(ingestion_router)
app.include_router(discovery_router)
app.include_router(templates_router)
app.include_router(workshop_ai_router)
app.include_router(process_ai_router)
app.include_router(gap_ai_router)
app.include_router(guided_discovery_router)


@app.get("/")
def root():
    return {
        "name": "Business Ontology Framework",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/ai/provider")
def ai_provider_info():
    """Return the currently configured AI provider."""
    from .config import AI_PROVIDER, AI_MODEL, AZURE_AI_PROJECT_ENDPOINT
    info = {"provider": AI_PROVIDER}
    if AI_PROVIDER == "anthropic":
        info["model"] = AI_MODEL
    elif AI_PROVIDER == "azure":
        info["endpoint"] = AZURE_AI_PROJECT_ENDPOINT[:50] + "..." if len(AZURE_AI_PROJECT_ENDPOINT) > 50 else AZURE_AI_PROJECT_ENDPOINT
    return info
