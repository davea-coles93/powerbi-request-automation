"""Ingestion router for importing TMDL models into the ontology."""
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.tmdl_parser import parse_tmdl_directory
from app.services.tmdl_ingestion import tmdl_to_ontology
from app.routers.scenarios import clear_database, seed_from_data

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


# --- Request / Response Models ---

class IngestRequest(BaseModel):
    model_path: str  # Path to .SemanticModel/definition/ directory
    model_name: str = "Imported Model"


class IngestPreviewResponse(BaseModel):
    entities: int
    attributes: int
    measures: int
    metrics: int
    relationships: int
    tables: List[str]
    sample_measures: List[str]


class AvailableModel(BaseModel):
    path: str
    name: str
    definition_path: str


class LoadResponse(BaseModel):
    success: bool
    message: str
    entities: int
    attributes: int
    measures: int
    metrics: int


# --- Helpers ---

def _find_definition_path(model_path: str) -> Path:
    """Resolve the definition directory from a model path.

    Accepts either:
        - Path to the .SemanticModel directory
        - Path to the .SemanticModel/definition directory

    Validates the path is within the project root to prevent path traversal.
    """
    p = Path(model_path).resolve()
    project_root = _get_project_root().resolve()

    # Security: ensure path is within the project root
    try:
        p.relative_to(project_root)
    except ValueError:
        raise ValueError(f"Path must be within the project directory. Got: {model_path}")

    # If already pointing to definition/
    if p.name == "definition" and p.is_dir():
        return p

    # If pointing to .SemanticModel directory
    def_path = p / "definition"
    if def_path.is_dir():
        return def_path

    # Try as-is
    if p.is_dir():
        return p

    raise FileNotFoundError(f"Could not find TMDL definition directory at: {model_path}")


def _get_project_root() -> Path:
    """Get the project root directory (powerbi-request-automation)."""
    # Navigate up from this file: routers/ -> app/ -> backend/ -> ontology-investigation/ -> root
    return Path(__file__).resolve().parent.parent.parent.parent.parent


def _scan_for_semantic_models() -> List[AvailableModel]:
    """Scan known directories for .SemanticModel folders."""
    root = _get_project_root()
    models = []

    # Directories to scan
    scan_dirs = [
        root / "sample-data",
        root / "models",
    ]

    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue

        # Recursively find .SemanticModel directories
        for item in scan_dir.rglob("*.SemanticModel"):
            if item.is_dir():
                def_path = item / "definition"
                if def_path.is_dir() and (def_path / "tables").is_dir():
                    # Derive a human-readable name from the directory structure
                    # e.g., "models/adventure-works/sales-sample.SemanticModel" -> "Adventure Works - Sales Sample"
                    relative = item.relative_to(root)
                    parts = list(relative.parts)

                    # Get the parent folder name and the model name
                    model_file_name = item.stem  # e.g., "sales-sample"
                    parent_name = parts[-2] if len(parts) >= 2 else ""

                    # Clean up the name
                    nice_name = model_file_name.replace("-", " ").replace("_", " ").title()
                    if parent_name and parent_name not in ("sample-data", "models"):
                        parent_nice = parent_name.replace("-", " ").replace("_", " ").title()
                        display_name = f"{parent_nice} - {nice_name}"
                    else:
                        display_name = nice_name

                    models.append(AvailableModel(
                        path=str(item),
                        name=display_name,
                        definition_path=str(def_path),
                    ))

    return models


# --- Endpoints ---

@router.post("/tmdl/preview", response_model=IngestPreviewResponse)
async def preview_tmdl_ingestion(request: IngestRequest):
    """Preview what would be imported from a TMDL model without loading into DB."""
    try:
        def_path = _find_definition_path(request.model_path)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        model = parse_tmdl_directory(str(def_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse TMDL: {str(e)}")

    # Convert to ontology to get accurate counts
    ontology_data = tmdl_to_ontology(model, request.model_name)

    # Get sample measure names (up to 10)
    sample_measures = [
        m["name"] for m in ontology_data["measures"][:10]
    ]

    return IngestPreviewResponse(
        entities=len(ontology_data["entities"]),
        attributes=len(ontology_data["attributes"]),
        measures=len(ontology_data["measures"]),
        metrics=len(ontology_data["metrics"]),
        relationships=len(model.relationships),
        tables=[t.name for t in model.tables],
        sample_measures=sample_measures,
    )


@router.post("/tmdl/load", response_model=LoadResponse)
async def load_tmdl_model(request: IngestRequest, db: Session = Depends(get_db)):
    """Parse TMDL model, convert to ontology, and load into database.

    This replaces the current database contents with the imported model.
    """
    try:
        def_path = _find_definition_path(request.model_path)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        model = parse_tmdl_directory(str(def_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse TMDL: {str(e)}")

    ontology_data = tmdl_to_ontology(model, request.model_name)

    try:
        # Clear existing data
        clear_database(db)

        # Seed with the imported model data
        seed_from_data(db, ontology_data)

        return LoadResponse(
            success=True,
            message=f"Successfully imported '{request.model_name}' with {len(ontology_data['entities'])} entities, {len(ontology_data['attributes'])} attributes, {len(ontology_data['measures'])} measures",
            entities=len(ontology_data["entities"]),
            attributes=len(ontology_data["attributes"]),
            measures=len(ontology_data["measures"]),
            metrics=len(ontology_data["metrics"]),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model into database: {str(e)}"
        )


@router.get("/available-models", response_model=List[AvailableModel])
async def list_available_models():
    """List TMDL models available for import from known project directories.

    Scans sample-data/ and models/ subdirectories for .SemanticModel folders.
    """
    try:
        return _scan_for_semantic_models()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scan for models: {str(e)}"
        )
