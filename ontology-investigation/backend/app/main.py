from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db import init_db
from .routers import ontology_router, graph_router, ai_router, semantic_model_router, scenarios_router


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

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ontology_router)
app.include_router(graph_router)
app.include_router(ai_router)
app.include_router(semantic_model_router)
app.include_router(scenarios_router)


@app.get("/")
def root():
    return {
        "name": "Business Ontology Framework",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "perspectives": "/api/perspectives",
            "systems": "/api/systems",
            "entities": "/api/entities",
            "observations": "/api/observations",
            "measures": "/api/measures",
            "metrics": "/api/metrics",
            "processes": "/api/processes",
            "graph": {
                "trace_metric": "/api/graph/trace-metric/{metric_id}",
                "impact": "/api/graph/impact/{observation_id}",
                "perspective_view": "/api/graph/perspective/{perspective_id}",
            },
            "ai": {
                "explain": "/api/ai/explain-metric",
                "gaps": "/api/ai/find-gaps",
                "suggest": "/api/ai/suggest-measures",
            },
        },
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
