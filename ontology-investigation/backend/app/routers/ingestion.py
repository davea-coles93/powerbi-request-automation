"""Ingestion router for importing TMDL models and PowerApp solutions into the ontology."""
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
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
    ProcessRepository,
)
from app.models import Perspective, System, Entity, Attribute, Measure, Metric, Process, EntityRelationship
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


# ── Power BI Semantic Model Ingestion (zip upload) ───────────────────────

MAX_UPLOAD_ZIP_SIZE = 50 * 1024 * 1024  # 50 MB


def _find_tmdl_definition_in_zip(extract_root: Path) -> Optional[Path]:
    """Smart detection: find the TMDL definition/ directory inside an extracted zip.

    Users might zip:
      1. The .SemanticModel/ folder directly
      2. A parent folder containing .pbip + .SemanticModel/ + .Report/
      3. Just the definition/ folder
      4. Any nesting depth (e.g., MyProject/MyModel.SemanticModel/definition/)

    We look for a folder that contains model.tmdl and a tables/ subfolder.
    """
    # Strategy 1: Look for *.SemanticModel/definition/ pattern
    for sm_dir in extract_root.rglob("*.SemanticModel"):
        if sm_dir.is_dir():
            def_path = sm_dir / "definition"
            if def_path.is_dir() and (def_path / "model.tmdl").exists():
                return def_path

    # Strategy 2: Look for any definition/ dir containing model.tmdl
    for model_file in extract_root.rglob("model.tmdl"):
        parent = model_file.parent
        if parent.name == "definition" and (parent / "tables").is_dir():
            return parent

    # Strategy 3: Maybe they zipped the definition folder contents directly
    if (extract_root / "model.tmdl").exists() and (extract_root / "tables").is_dir():
        return extract_root

    return None


@router.post("/powerbi/parse")
async def parse_powerbi_zip(file: UploadFile = File(...)):
    """Parse a Power BI semantic model from a zip upload.

    Accepts a zip containing a .SemanticModel folder (PBIP format).
    Smart detection finds the TMDL definition directory regardless of
    how the user zipped it (whole project, just the model, nested folders).

    Returns the same ontology element format as PowerApp parse for
    consistent review-then-load workflow.
    """
    import tempfile
    import zipfile

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a .zip archive")

    data = await file.read()
    if len(data) > MAX_UPLOAD_ZIP_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum is {MAX_UPLOAD_ZIP_SIZE // (1024*1024)}MB.",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = Path(tmpdir) / "upload.zip"
        zip_path.write_bytes(data)

        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(tmpdir)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid zip file")

        extract_root = Path(tmpdir)
        def_path = _find_tmdl_definition_in_zip(extract_root)

        if not def_path:
            raise HTTPException(
                status_code=400,
                detail="Could not find a TMDL semantic model in this zip. "
                       "Expected a .SemanticModel/definition/ folder containing "
                       "model.tmdl and a tables/ subdirectory.",
            )

        # Reuse existing TMDL parser + ontology converter
        model = parse_tmdl_directory(str(def_path))

        # Infer a model name from the .SemanticModel folder name
        model_name = "Uploaded Model"
        for parent in def_path.parents:
            if parent.name.endswith(".SemanticModel"):
                model_name = parent.name.replace(".SemanticModel", "")
                break

        ontology_data = tmdl_to_ontology(model, model_name)

        return {
            "source_type": "powerbi",
            "model_name": model_name,
            "tmdl_tables": [t.name for t in model.tables],
            "tmdl_relationships": len(model.relationships),
            **ontology_data,
        }


# ── Power BI Live Connection ─────────────────────────────────────────────


class PowerBIConnectRequest(BaseModel):
    """Credentials for establishing a Power BI session."""
    tenant_id: str
    client_id: str
    client_secret: str


class PowerBIExtractRequest(BaseModel):
    """Request body for extracting schema from a live Power BI dataset."""
    workspace_id: str
    dataset_id: str
    session_token: Optional[str] = None  # If omitted, uses env vars


@router.get("/powerbi/live/status")
async def powerbi_live_status():
    """Check if Power BI live connection is configured (via env vars)."""
    from app.config import POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET

    configured = all([POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET])
    return {
        "configured": configured,
        "tenant_id": POWERBI_TENANT_ID[:8] + "..." if POWERBI_TENANT_ID else "",
        "client_id": POWERBI_CLIENT_ID[:8] + "..." if POWERBI_CLIENT_ID else "",
    }


@router.post("/powerbi/live/connect")
async def powerbi_connect(request: PowerBIConnectRequest):
    """Establish a Power BI credential session.

    Credentials are stored in memory only (never on disk) and expire
    after 30 minutes of inactivity. Returns a session token to use
    with subsequent requests.

    The endpoint validates the credentials by attempting to acquire a token.
    """
    from app.services.powerbi_live_service import (
        PowerBILiveService,
        PowerBIAuthError,
        create_credential_session,
    )

    # Validate credentials by attempting token acquisition
    svc = PowerBILiveService(
        tenant_id=request.tenant_id,
        client_id=request.client_id,
        client_secret=request.client_secret,
    )
    try:
        svc._acquire_token()
    except PowerBIAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Credentials are valid — create a session
    token = create_credential_session(
        tenant_id=request.tenant_id,
        client_id=request.client_id,
        client_secret=request.client_secret,
    )

    return {
        "session_token": token,
        "expires_in_minutes": 30,
        "client_id": request.client_id[:8] + "...",
    }


@router.post("/powerbi/live/disconnect")
async def powerbi_disconnect(session_token: str):
    """Destroy a Power BI credential session, clearing credentials from memory."""
    from app.services.powerbi_live_service import destroy_session

    removed = destroy_session(session_token)
    return {"disconnected": removed}


@router.get("/powerbi/live/workspaces")
async def list_powerbi_workspaces(session_token: Optional[str] = None):
    """List Power BI workspaces the service principal has access to."""
    from app.services.powerbi_live_service import get_powerbi_live_service, PowerBIAuthError

    try:
        svc = get_powerbi_live_service(session_token)
        return svc.list_workspaces()
    except PowerBIAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/powerbi/live/workspaces/{workspace_id}/datasets")
async def list_powerbi_datasets(workspace_id: str, session_token: Optional[str] = None):
    """List datasets in a Power BI workspace."""
    from app.services.powerbi_live_service import get_powerbi_live_service, PowerBIAuthError

    try:
        svc = get_powerbi_live_service(session_token)
        return svc.list_datasets(workspace_id)
    except PowerBIAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/powerbi/live/extract")
async def extract_powerbi_live(request: PowerBIExtractRequest):
    """Extract schema from a live Power BI dataset.

    Connects to the dataset via REST API + DMV queries and extracts
    the full model: tables, columns, measures (with DAX), relationships,
    and inferred data sources from M query expressions.

    Returns the same format as /powerbi/parse and /powerapp/parse.
    """
    from app.services.powerbi_live_service import (
        get_powerbi_live_service,
        PowerBIAuthError,
        PowerBIQueryError,
    )

    try:
        svc = get_powerbi_live_service(request.session_token)
        result = svc.extract_schema(request.workspace_id, request.dataset_id)
        return result
    except PowerBIAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except PowerBIQueryError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Generic Parsed-Elements Load ─────────────────────────────────────────
# Both PowerBI parse and PowerApp parse return the same shape of data.
# The /powerbi/load and /powerapp/load endpoints both use the same load
# handler — just different prefixes for API clarity.


# ── PowerApp Solution Ingestion ──────────────────────────────────────────


@router.post("/powerapp/parse")
async def parse_powerapp_solution(file: UploadFile = File(...)):
    """Parse a PowerApp solution zip and return extracted ontology elements.

    This is Pass 1 (deterministic extraction). Returns entities, attributes,
    processes, measures, and systems found in the solution without writing
    anything to the database. The caller can review and then POST to
    /powerapp/load to persist.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a .zip archive")

    data = await file.read()
    if len(data) > MAX_UPLOAD_ZIP_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum is {MAX_UPLOAD_ZIP_SIZE // (1024*1024)}MB.",
        )

    from app.services.powerapp_parser import PowerAppSolutionParser

    parser = PowerAppSolutionParser()
    result = parser.parse_bytes(data)
    return result.to_dict()


class ParsedElementsLoadRequest(BaseModel):
    """Request body for loading parsed elements (from any source) into the ontology."""
    entities: List[dict] = []
    attributes: List[dict] = []
    processes: List[dict] = []
    measures: List[dict] = []
    metrics: List[dict] = []
    systems: List[dict] = []
    relationships: List[dict] = []
    perspectives: List[dict] = []
    conflict_strategy: str = "skip"  # "skip" or "update"


def _load_parsed_elements(
    request: ParsedElementsLoadRequest,
    db: Session,
) -> MergeLoadResponse:
    """Persist parsed elements into the ontology database.

    Generic loader used by both PowerApp and Power BI ingestion.
    Accepts the output from any /parse endpoint (or a subset after user review).
    """
    from app.models.process import ProcessStep

    strategy = request.conflict_strategy
    element_types = [
        "perspectives", "systems", "entities", "attributes",
        "measures", "metrics", "processes", "relationships",
    ]
    counters = {
        action: {t: 0 for t in element_types}
        for action in ("created", "skipped", "updated")
    }

    try:
        # Perspectives
        repo = PerspectiveRepository(db)
        for item in request.perspectives:
            _, action = repo.upsert(Perspective(**item), strategy="skip")
            counters[action]["perspectives"] += 1

        # Systems
        repo = SystemRepository(db)
        for item in request.systems:
            system = System(
                id=item["id"],
                name=item["name"],
                type=item.get("type", "Other"),
                vendor=item.get("vendor"),
                reliability_default=item.get("reliability_default"),
                integration_status=item.get("integration_status"),
                notes=item.get("notes"),
                state=item.get("state", "as-is"),
            )
            _, action = repo.upsert(system, strategy=strategy)
            counters[action]["systems"] += 1

        # Entities
        repo = EntityRepository(db)
        for item in request.entities:
            entity = Entity(
                id=item["id"],
                name=item["name"],
                description=item.get("description"),
                core_attributes=item.get("core_attributes", []),
                lenses=item.get("lenses", []),
                state=item.get("state", "as-is"),
            )
            _, action = repo.upsert(entity, strategy=strategy)
            counters[action]["entities"] += 1

        # Attributes
        repo = AttributeRepository(db)
        for item in request.attributes:
            attribute = Attribute(
                id=item["id"],
                name=item["name"],
                description=item.get("description"),
                entity_id=item.get("entity_id", ""),
                system_id=item.get("system_id", ""),
                source_table=item.get("source_table"),
                source_column=item.get("source_column"),
                state=item.get("state", "as-is"),
            )
            _, action = repo.upsert(attribute, strategy=strategy)
            counters[action]["attributes"] += 1

        # Measures
        repo = MeasureRepository(db)
        for item in request.measures:
            measure = Measure(
                id=item["id"],
                name=item["name"],
                description=item.get("description"),
                logic=item.get("logic"),
                formula=item.get("formula", ""),
                input_attribute_ids=item.get("input_attribute_ids", []),
                input_measure_ids=item.get("input_measure_ids", []),
                perspective_ids=item.get("perspective_ids", []),
                state=item.get("state", "as-is"),
            )
            _, action = repo.upsert(measure, strategy=strategy)
            counters[action]["measures"] += 1

        # Metrics
        repo = MetricRepository(db)
        for item in request.metrics:
            metric = Metric(
                id=item["id"],
                name=item["name"],
                description=item.get("description"),
                business_question=item.get("business_question", ""),
                calculated_by_measure_ids=item.get("calculated_by_measure_ids", []),
                perspective_ids=item.get("perspective_ids", []),
                state=item.get("state", "as-is"),
            )
            _, action = repo.upsert(metric, strategy=strategy)
            counters[action]["metrics"] += 1

        # Processes
        proc_repo = ProcessRepository(db)
        for item in request.processes:
            steps = [
                ProcessStep(
                    id=s["id"],
                    sequence=s.get("sequence", idx + 1),
                    name=s["name"],
                    description=s.get("description"),
                    perspective_id=s.get("perspective_id", "operational"),
                    depends_on_step_ids=s.get("depends_on_step_ids", []),
                    systems_used_ids=s.get("systems_used_ids", []),
                    waste_category=s.get("waste_category"),
                    state=s.get("state", "as-is"),
                )
                for idx, s in enumerate(item.get("steps", []))
            ]
            process = Process(
                id=item["id"],
                name=item["name"],
                description=item.get("description"),
                steps=steps,
                state=item.get("state", "as-is"),
            )
            _, action = proc_repo.upsert(process, strategy=strategy)
            counters[action]["processes"] += 1

        # Relationships
        rel_repo = EntityRelationshipRepository(db)
        for item in request.relationships:
            _, action = rel_repo.upsert(EntityRelationship(**item), strategy=strategy)
            counters[action]["relationships"] += 1

        total_created = sum(counters["created"].values())
        total_skipped = sum(counters["skipped"].values())

        return MergeLoadResponse(
            success=True,
            message=f"Import: {total_created} items added, {total_skipped} existing items preserved",
            created=counters["created"],
            skipped=counters["skipped"],
            updated=counters["updated"],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Load failed: {str(e)}",
        )


@router.post("/powerbi/load", response_model=MergeLoadResponse)
async def load_powerbi_elements(
    request: ParsedElementsLoadRequest,
    db: Session = Depends(get_db),
):
    """Load parsed Power BI elements into the ontology."""
    return _load_parsed_elements(request, db)


@router.post("/powerapp/load", response_model=MergeLoadResponse)
async def load_powerapp_elements(
    request: ParsedElementsLoadRequest,
    db: Session = Depends(get_db),
):
    """Load parsed PowerApp elements into the ontology."""
    return _load_parsed_elements(request, db)


# ── Document (PDF / DOCX / PPTX / Image) Ingestion ──────────────────────

MAX_UPLOAD_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB

DOCUMENT_EXTENSIONS = {
    ".pdf", ".docx", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
}


@router.post("/document/parse")
async def parse_document_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Parse a document (PDF, Word, PowerPoint, or image) using AI extraction.

    Two-stage process:
    1. Text/image extraction using Python libraries (pdfplumber, python-docx, python-pptx)
    2. Haiku AI call to interpret content and extract ontology elements

    This is Pass 1 of the ingestion pipeline. Unlike spreadsheets and Power BI
    which use deterministic parsing, documents require AI to understand unstructured
    content. Haiku is used for fast, cheap extraction — the heavier cross-source
    enrichment (Pass 2) uses Sonnet via /enrich.

    The AI receives the current ontology context so it can reference existing
    elements rather than creating duplicates.

    Returns the same ontology element format as other /parse endpoints.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = "." + file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(sorted(DOCUMENT_EXTENSIONS))}",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum is {MAX_UPLOAD_DOCUMENT_SIZE // (1024*1024)}MB.",
        )

    # Build ontology context for the AI
    from app.services.ontology_context import OntologyContextBuilder
    from app.services.document_parser import parse_document

    ontology_context = OntologyContextBuilder(db).summary()

    try:
        result = await parse_document(
            data=data,
            filename=file.filename,
            ontology_context=ontology_context,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document parsing failed: {str(e)}",
        )


@router.post("/document/load", response_model=MergeLoadResponse)
async def load_document_elements(
    request: ParsedElementsLoadRequest,
    db: Session = Depends(get_db),
):
    """Load parsed document elements into the ontology."""
    return _load_parsed_elements(request, db)


# ── Spreadsheet (Excel / CSV) Ingestion ──────────────────────────────────

MAX_UPLOAD_SPREADSHEET_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post("/spreadsheet/parse")
async def parse_spreadsheet(file: UploadFile = File(...)):
    """Parse an Excel (.xlsx) or CSV file and return extracted ontology elements.

    This is Pass 1 (deterministic extraction). Profiles every column to infer
    data types, classify dimensions vs measures, and compute statistics.

    For large files, only the first 50,000 rows are profiled to keep memory
    usage bounded. The full row count is reported in the response.

    Returns the same ontology element format as other /parse endpoints for
    consistent review-then-load workflow. Also includes `column_profiles`
    with per-column statistics for the review UI.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(
            status_code=400,
            detail="File must be .xlsx, .xls, or .csv",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_SPREADSHEET_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum is {MAX_UPLOAD_SPREADSHEET_SIZE // (1024*1024)}MB.",
        )

    from app.services.spreadsheet_parser import SpreadsheetParser

    parser = SpreadsheetParser()

    if ext == "csv":
        result = parser.parse_csv_bytes(data, filename=file.filename)
    else:
        result = parser.parse_excel_bytes(data, filename=file.filename)

    return result.to_dict()


@router.post("/spreadsheet/load", response_model=MergeLoadResponse)
async def load_spreadsheet_elements(
    request: ParsedElementsLoadRequest,
    db: Session = Depends(get_db),
):
    """Load parsed spreadsheet elements into the ontology."""
    return _load_parsed_elements(request, db)


# ── Cross-Source AI Enrichment (Pass 2) ──────────────────────────────────


class EnrichRequest(BaseModel):
    """Request body for AI enrichment of staged ingestion data."""
    staged_sources: List[dict]  # List of parsed source outputs (from any /parse endpoint)
    user_guidance: str = ""  # Optional instructions (e.g., "This is manufacturing data")


@router.post("/enrich")
async def enrich_staged_sources(
    request: EnrichRequest,
    db: Session = Depends(get_db),
):
    """AI-enrich staged elements from multiple ingested sources (Pass 2).

    Takes the combined output of all Pass 1 parsers and uses AI to:
    - Deduplicate entities across sources
    - Regroup flat columns into logical entities
    - Infer relationships between entities
    - Reclassify dimensions vs measures where heuristics were wrong
    - Promote terminal measures to metrics with business questions
    - Assign perspectives (operational, management, financial)
    - Identify gaps and missing data

    Streams the response as SSE. The response includes an ```enrichment``` block
    with the refined ontology elements, ready for review and loading.

    Workflow:
    1. Upload sources via /powerbi/parse, /spreadsheet/parse, /powerapp/parse
    2. Accumulate all parse results in the frontend
    3. POST all of them here for cross-source AI enrichment
    4. Review the enriched result
    5. POST accepted elements to the appropriate /load endpoint
    """
    if not request.staged_sources:
        raise HTTPException(status_code=400, detail="No staged sources provided")

    from app.services.ingestion_ai_service import IngestionAIService

    service = IngestionAIService(db)
    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Set ANTHROPIC_API_KEY or configure Azure AI.",
        )

    return StreamingResponse(
        service.enrich_stream(
            staged_sources=request.staged_sources,
            user_guidance=request.user_guidance,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
