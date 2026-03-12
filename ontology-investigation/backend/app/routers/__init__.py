from .ontology import (
    router as ontology_router,
    perspectives_router,
    systems_router,
    entities_router,
    attributes_router,
    measures_router,
    metrics_router,
)
from .graph import router as graph_router
from .ai import router as ai_router
from .semantic_model import router as semantic_model_router
from .scenarios import router as scenarios_router
from .ingestion import router as ingestion_router
from .discovery import router as discovery_router
from .templates import router as templates_router
from .workshop_ai import router as workshop_ai_router
from .process_ai import router as process_ai_router
from .gap_ai import router as gap_ai_router
from .guided_discovery import router as guided_discovery_router

__all__ = [
    "ontology_router",
    "perspectives_router",
    "systems_router",
    "entities_router",
    "attributes_router",
    "measures_router",
    "metrics_router",
    "graph_router",
    "ai_router",
    "semantic_model_router",
    "scenarios_router",
    "ingestion_router",
    "discovery_router",
    "templates_router",
    "workshop_ai_router",
    "process_ai_router",
    "gap_ai_router",
    "guided_discovery_router",
]
