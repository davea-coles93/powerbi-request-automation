"""Ingestion router for importing TMDL models into the ontology."""
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    EntityRelationshipRepository,
)
from app.models import Perspective, System, Entity, Attribute, Measure, Metric, EntityRelationship
from app.services.tmdl_parser import parse_tmdl_directory
from app.services.tmdl_ingestion import tmdl_to_ontology

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


# --- Request / Response Models ---

class IngestRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_path: str  # Path to .SemanticModel/definition/ directory
    model_name: str = "Imported Model"


class IngestMergeRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_path: str
    model_name: str = "Imported Model"
    conflict_strategy: str = "skip"  # "skip" or "update"


class IngestPreviewResponse(BaseModel):
    entities: int
    attributes: int
    measures: int
    metrics: int
    relationships: int
    entity_relationships: int = 0
    tables: List[str]
    sample_measures: List[str]


class MergeConflict(BaseModel):
    id: str
    name: str
    entity_type: str  # "entity", "attribute", "measure", "metric", "system", "perspective"
    existing_name: str


class MergePreviewResponse(BaseModel):
    new_entities: int
    new_attributes: int
    new_measures: int
    new_metrics: int
    new_systems: int
    new_perspectives: int
    conflicting_entities: int
    conflicting_attributes: int
    conflicting_measures: int
    conflicting_metrics: int
    conflicts: List[MergeConflict]
    tables: List[str]
    sample_measures: List[str]
    relationships: int
    total_entities: int
    total_attributes: int
    total_measures: int
    total_metrics: int


class MergeLoadResponse(BaseModel):
    success: bool
    message: str
    created: dict
    skipped: dict
    updated: dict


class AvailableModel(BaseModel):
    path: str
    name: str
    definition_path: str


# --- Helpers ---

def _get_scan_dirs() -> List[Path]:
    """Get directories to scan for TMDL models.

    Uses TMDL_SCAN_DIRS env var if set (comma-separated paths),
    otherwise falls back to project-relative paths.
    """
    env_dirs = os.environ.get("TMDL_SCAN_DIRS")
    if env_dirs:
        return [Path(d.strip()).resolve() for d in env_dirs.split(",") if d.strip()]

    root = Path(__file__).resolve().parent.parent.parent.parent.parent
    return [root / "sample-data", root / "models"]


def _get_allowed_roots() -> List[Path]:
    """Get directories that are valid parent paths for model loading."""
    return [d for d in _get_scan_dirs() if d.exists()]


def _find_definition_path(model_path: str) -> Path:
    """Resolve the definition directory from a model path."""
    p = Path(model_path).resolve()

    allowed = _get_allowed_roots()
    if not any(p == root or root in p.parents for root in allowed):
        raise ValueError(
            f"Path must be within an allowed model directory. Got: {model_path}"
        )

    if p.name == "definition" and p.is_dir():
        return p

    def_path = p / "definition"
    if def_path.is_dir():
        return def_path

    if p.is_dir():
        return p

    raise FileNotFoundError(f"Could not find TMDL definition directory at: {model_path}")


def _scan_for_semantic_models() -> List[AvailableModel]:
    """Scan configured directories for .SemanticModel folders."""
    models = []

    for scan_dir in _get_scan_dirs():
        if not scan_dir.exists():
            continue

        for item in scan_dir.rglob("*.SemanticModel"):
            if item.is_dir():
                def_path = item / "definition"
                if def_path.is_dir() and (def_path / "tables").is_dir():
                    model_file_name = item.stem
                    try:
                        relative = item.relative_to(scan_dir)
                        parts = list(relative.parts)
                        parent_name = parts[-2] if len(parts) >= 2 else ""
                    except ValueError:
                        parent_name = ""

                    nice_name = model_file_name.replace("-", " ").replace("_", " ").title()
                    if parent_name:
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


def _parse_and_convert(model_path: str, model_name: str):
    """Parse TMDL and convert to ontology data. Returns (tmdl_model, ontology_data)."""
    try:
        def_path = _find_definition_path(model_path)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        model = parse_tmdl_directory(str(def_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse TMDL: {str(e)}")

    ontology_data = tmdl_to_ontology(model, model_name)
    return model, ontology_data


# --- Endpoints ---

@router.post("/tmdl/preview", response_model=IngestPreviewResponse)
async def preview_tmdl_ingestion(request: IngestRequest):
    """Preview what would be imported from a TMDL model (legacy format)."""
    model, ontology_data = _parse_and_convert(request.model_path, request.model_name)

    return IngestPreviewResponse(
        entities=len(ontology_data["entities"]),
        attributes=len(ontology_data["attributes"]),
        measures=len(ontology_data["measures"]),
        metrics=len(ontology_data["metrics"]),
        relationships=len(model.relationships),
        entity_relationships=len(ontology_data.get("relationships", [])),
        tables=[t.name for t in model.tables],
        sample_measures=[m["name"] for m in ontology_data["measures"][:10]],
    )


@router.post("/tmdl/preview-merge", response_model=MergePreviewResponse)
async def preview_tmdl_merge(request: IngestRequest, db: Session = Depends(get_db)):
    """Preview merge: show what's new vs what conflicts with existing data."""
    model, ontology_data = _parse_and_convert(request.model_path, request.model_name)

    conflicts: List[MergeConflict] = []

    def count_conflicts(items, entity_type, repo):
        new_count = 0
        conflict_count = 0
        for item in items:
            existing = repo.get_by_id(item["id"])
            if existing:
                conflict_count += 1
                conflicts.append(MergeConflict(
                    id=item["id"],
                    name=item["name"],
                    entity_type=entity_type,
                    existing_name=existing.name,
                ))
            else:
                new_count += 1
        return new_count, conflict_count

    new_ent, conf_ent = count_conflicts(
        ontology_data["entities"], "entity", EntityRepository(db))
    new_attr, conf_attr = count_conflicts(
        ontology_data["attributes"], "attribute", AttributeRepository(db))
    new_meas, conf_meas = count_conflicts(
        ontology_data["measures"], "measure", MeasureRepository(db))
    new_met, conf_met = count_conflicts(
        ontology_data["metrics"], "metric", MetricRepository(db))
    new_sys, _ = count_conflicts(
        ontology_data["systems"], "system", SystemRepository(db))
    new_persp, _ = count_conflicts(
        ontology_data["perspectives"], "perspective", PerspectiveRepository(db))

    return MergePreviewResponse(
        new_entities=new_ent,
        new_attributes=new_attr,
        new_measures=new_meas,
        new_metrics=new_met,
        new_systems=new_sys,
        new_perspectives=new_persp,
        conflicting_entities=conf_ent,
        conflicting_attributes=conf_attr,
        conflicting_measures=conf_meas,
        conflicting_metrics=conf_met,
        conflicts=conflicts,
        tables=[t.name for t in model.tables],
        sample_measures=[m["name"] for m in ontology_data["measures"][:10]],
        relationships=len(model.relationships),
        total_entities=len(ontology_data["entities"]),
        total_attributes=len(ontology_data["attributes"]),
        total_measures=len(ontology_data["measures"]),
        total_metrics=len(ontology_data["metrics"]),
    )


@router.post("/tmdl/load", response_model=MergeLoadResponse)
async def load_tmdl_model(request: IngestMergeRequest, db: Session = Depends(get_db)):
    """Parse TMDL model and merge into existing ontology (non-destructive).

    Processes and user-created data are preserved. Use conflict_strategy
    to control behavior for ID collisions: "skip" (default) or "update".
    """
    _, ontology_data = _parse_and_convert(request.model_path, request.model_name)
    strategy = request.conflict_strategy

    counters = {
        "created": {"perspectives": 0, "systems": 0, "entities": 0,
                    "attributes": 0, "measures": 0, "metrics": 0, "relationships": 0},
        "skipped": {"perspectives": 0, "systems": 0, "entities": 0,
                    "attributes": 0, "measures": 0, "metrics": 0, "relationships": 0},
        "updated": {"perspectives": 0, "systems": 0, "entities": 0,
                    "attributes": 0, "measures": 0, "metrics": 0, "relationships": 0},
    }

    try:
        # Perspectives: always skip (structural, idempotent)
        repo = PerspectiveRepository(db)
        for item in ontology_data.get("perspectives", []):
            _, action = repo.upsert(Perspective(**item), strategy="skip")
            counters[action]["perspectives"] += 1

        # Systems: always skip (the BI system is structural)
        repo = SystemRepository(db)
        for item in ontology_data.get("systems", []):
            _, action = repo.upsert(System(**item), strategy="skip")
            counters[action]["systems"] += 1

        # Entities: user-chosen strategy
        repo = EntityRepository(db)
        for item in ontology_data.get("entities", []):
            _, action = repo.upsert(Entity(**item), strategy=strategy)
            counters[action]["entities"] += 1

        # Attributes: user-chosen strategy
        repo = AttributeRepository(db)
        for item in ontology_data.get("attributes", []):
            _, action = repo.upsert(Attribute(**item), strategy=strategy)
            counters[action]["attributes"] += 1

        # Measures: user-chosen strategy
        repo = MeasureRepository(db)
        for item in ontology_data.get("measures", []):
            _, action = repo.upsert(Measure(**item), strategy=strategy)
            counters[action]["measures"] += 1

        # Metrics: user-chosen strategy
        repo = MetricRepository(db)
        for item in ontology_data.get("metrics", []):
            _, action = repo.upsert(Metric(**item), strategy=strategy)
            counters[action]["metrics"] += 1

        # Relationships: user-chosen strategy
        repo = EntityRelationshipRepository(db)
        for item in ontology_data.get("relationships", []):
            _, action = repo.upsert(EntityRelationship(**item), strategy=strategy)
            counters[action]["relationships"] += 1

        # NOTE: Processes are NOT touched — TMDL has no process data
        # NOTE: SemanticTables are NOT touched — they come from recommendation

        total_created = sum(counters["created"].values())
        total_skipped = sum(counters["skipped"].values())

        return MergeLoadResponse(
            success=True,
            message=f"Merged '{request.model_name}': {total_created} items added, {total_skipped} existing items preserved",
            created=counters["created"],
            skipped=counters["skipped"],
            updated=counters["updated"],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Merge failed: {str(e)}"
        )


@router.get("/available-models", response_model=List[AvailableModel])
async def list_available_models():
    """List TMDL models available for import from known project directories."""
    try:
        return _scan_for_semantic_models()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scan for models: {str(e)}"
        )
