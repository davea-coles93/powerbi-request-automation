"""Scenarios router for loading different seed data scenarios."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import delete, select, func
from pydantic import BaseModel
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

from app.db.database import (
    get_db,
    PerspectiveDB,
    SystemDB,
    EntityDB,
    AttributeDB,
    MeasureDB,
    MetricDB,
    ProcessDB,
    SemanticTableDB,
    EntityRelationshipDB,
)
from app.db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
    SemanticTableRepository,
    EntityRelationshipRepository,
)
from app.models import (
    Perspective,
    System,
    Entity,
    Attribute,
    Measure,
    Metric,
    Process,
    EntityRelationship,
)
from app.models.semantic_model import Table


router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


class ScenarioInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str


class ScenarioStatus(BaseModel):
    current_scenario: Optional[str] = None
    available_scenarios: List[ScenarioInfo]


def _get_current_scenario() -> str | None:
    """Read current scenario from state file."""
    state_file = Path("/app/data/scenario_state.json") if Path("/app/data").exists() else Path(__file__).parent.parent.parent / "data" / "scenario_state.json"
    try:
        return json.loads(state_file.read_text()).get("current_scenario")
    except (FileNotFoundError, json.JSONDecodeError):
        return "manufacturing"  # default


def _set_current_scenario(scenario_id: str | None) -> None:
    """Write current scenario to state file."""
    state_file = Path("/app/data/scenario_state.json") if Path("/app/data").exists() else Path(__file__).parent.parent.parent / "data" / "scenario_state.json"
    state_file.write_text(json.dumps({"current_scenario": scenario_id}))


# Available scenarios with metadata
SCENARIOS = {
    "manufacturing": {
        "id": "manufacturing",
        "name": "Manufacturing Operations",
        "description": "Complete manufacturing scenario with production tracking, quality control, and financial metrics",
        "icon": "🏭",
        "file": "seed_data.json"
    },
    "tceu": {
        "id": "tceu",
        "name": "TCEU - Project Portfolio & Mieruka Replacement",
        "description": "Enterprise project governance, resource management, timesheet management, and financial forecasting for TCEU's digital consulting practice",
        "icon": "🚗",
        "file": "seed_data_tceu.json"
    }
}


def get_seed_data_path(scenario_file: str) -> Path:
    """Get the path to a seed data file, checking Docker and local paths."""
    possible_paths = [
        Path("/app/data") / scenario_file,  # Docker volume mount
        Path(__file__).parent.parent.parent / "data" / scenario_file,  # Local relative
    ]

    for path in possible_paths:
        if path.exists():
            return path

    raise FileNotFoundError(f"Could not find {scenario_file} in any of: {possible_paths}")


def clear_database(db: Session):
    """Clear all data from the database."""
    # Delete in order that respects foreign key constraints
    # Most dependent tables first, then their dependencies
    tables = [
        ProcessDB.__table__,
        MetricDB.__table__,
        MeasureDB.__table__,
        EntityRelationshipDB.__table__,
        AttributeDB.__table__,
        EntityDB.__table__,
        SemanticTableDB.__table__,
        SystemDB.__table__,
        PerspectiveDB.__table__,
    ]

    # Delete all rows from each table
    for table in tables:
        result = db.execute(delete(table))
        logger.info(f"Deleted {result.rowcount} rows from {table.name}")

    # Commit once after all deletes
    db.commit()
    logger.info("Database cleared successfully")


def load_seed_data_from_file(scenario_file: str) -> dict:
    """Load seed data from a specific JSON file."""
    seed_path = get_seed_data_path(scenario_file)
    with open(seed_path, "r") as f:
        return json.load(f)


SEED_ORDER = [
    ("perspectives", PerspectiveRepository, Perspective),
    ("systems", SystemRepository, System),
    ("entities", EntityRepository, Entity),
    ("attributes", AttributeRepository, Attribute),
    ("measures", MeasureRepository, Measure),
    ("metrics", MetricRepository, Metric),
    ("processes", ProcessRepository, Process),
    ("relationships", EntityRelationshipRepository, EntityRelationship),
    ("semantic_tables", SemanticTableRepository, Table),
]


def seed_from_data(db: Session, data: dict):
    """Seed the database with provided data in a single transaction."""
    from app.db.database import Base
    for key, repo_class, model_class in SEED_ORDER:
        repo = repo_class(db)
        for item in data.get(key, []):
            pydantic_obj = model_class(**item)
            db_item = repo.model_class(**pydantic_obj.model_dump())
            db.add(db_item)
    db.commit()


def serialize_current_state(db: Session) -> dict:
    """Serialize the entire current ontology state to a dict matching seed format."""
    result: dict = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "format_version": "1.0",
    }

    for key, repo_class, model_class in SEED_ORDER:
        repo = repo_class(db)
        items = repo.get_all()
        result[key] = [item.model_dump() for item in items]

    return result


@router.get("/status", response_model=ScenarioStatus)
async def get_scenario_status():
    """Get current scenario and list of available scenarios."""
    return ScenarioStatus(
        current_scenario=_get_current_scenario(),
        available_scenarios=[ScenarioInfo(**info) for info in SCENARIOS.values()]
    )


DEFAULT_PERSPECTIVES = [
    {"id": "operational", "name": "Operational", "purpose": "Execute and record business activities",
     "primary_concern": "What work is being done?", "typical_actors": [], "consumes_from": [], "feeds": ["management"]},
    {"id": "management", "name": "Management", "purpose": "Measure and monitor performance",
     "primary_concern": "How are we performing?", "typical_actors": [], "consumes_from": ["operational"], "feeds": ["financial"]},
    {"id": "financial", "name": "Financial", "purpose": "Account for and report financial position",
     "primary_concern": "What's the financial position?", "typical_actors": [], "consumes_from": ["management"], "feeds": []},
]


@router.post("/clear")
async def clear_workspace(db: Session = Depends(get_db)):
    """Clear all data and start with an empty workspace (keeps default perspectives)."""
    try:
        clear_database(db)
        # Re-seed the 3 default perspectives
        repo = PerspectiveRepository(db)
        for p in DEFAULT_PERSPECTIVES:
            repo.create(Perspective(**p))
        _set_current_scenario(None)
        return {"success": True, "message": "Workspace cleared. Default perspectives preserved."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing workspace: {str(e)}")


@router.post("/load/{scenario_id}")
async def load_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Load a specific scenario by clearing the database and reseeding."""
    # Check if scenario exists
    if scenario_id not in SCENARIOS:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{scenario_id}' not found. Available: {list(SCENARIOS.keys())}"
        )

    scenario = SCENARIOS[scenario_id]

    try:
        # Load seed data
        data = load_seed_data_from_file(scenario["file"])

        # Clear existing data
        clear_database(db)

        # Seed with new data
        seed_from_data(db, data)

        # Update current scenario
        _set_current_scenario(scenario_id)

        return {
            "success": True,
            "message": f"Successfully loaded scenario: {scenario['name']}",
            "scenario": ScenarioInfo(**scenario)
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error loading scenario: {str(e)}")


@router.get("/export")
def export_ontology(db: Session = Depends(get_db)):
    """Export the current ontology state as a downloadable JSON file."""
    data = serialize_current_state(db)
    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": "attachment; filename=ontology_export.json"
        },
    )


@router.post("/import")
async def import_ontology(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import an ontology from a previously exported JSON file.

    Clears the current database and loads the uploaded data.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file")

    try:
        contents = await file.read()
        data = json.loads(contents)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")

    # Validate that it has at least some expected keys
    expected_keys = {"perspectives", "entities"}
    if not expected_keys.intersection(data.keys()):
        raise HTTPException(
            status_code=400,
            detail=f"JSON must contain at least one of: {expected_keys}",
        )

    try:
        clear_database(db)
        seed_from_data(db, data)
        _set_current_scenario(None)  # custom import, not a named scenario

        counts = {
            key: len(data.get(key, []))
            for key, _, _ in SEED_ORDER
            if data.get(key)
        }

        return {
            "success": True,
            "message": f"Ontology imported successfully from {file.filename}",
            "counts": counts,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error importing ontology: {str(e)}")
