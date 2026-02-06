from .ontology import router as ontology_router
from .graph import router as graph_router
from .ai import router as ai_router
from .semantic_model import router as semantic_model_router
from .scenarios import router as scenarios_router

__all__ = ["ontology_router", "graph_router", "ai_router", "semantic_model_router", "scenarios_router"]
