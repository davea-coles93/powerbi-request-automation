"""Scenarios router for loading different seed data scenarios."""
import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import delete, select, func
from pydantic import BaseModel

from app.db.database import (
    get_db,
    init_db,
    SessionLocal,
    engine,
    PerspectiveDB,
    SystemDB,
    EntityDB,
    AttributeDB,
    MeasureDB,
    MetricDB,
    ProcessDB,
    SemanticTableDB,
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
)
from app.models import (
    Perspective,
    System,
    Entity,
    Attribute,
    Measure,
    Metric,
    Process,
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


# Track current scenario (in-memory - could be stored in DB)
_current_scenario = "manufacturing"

# Available scenarios with metadata
SCENARIOS = {
    "manufacturing": {
        "id": "manufacturing",
        "name": "Manufacturing Operations",
        "description": "Complete manufacturing scenario with production tracking, quality control, and financial metrics",
        "icon": "🏭",
        "file": "seed_data.json"
    },
    "toyota_connected": {
        "id": "toyota_connected",
        "name": "Toyota Connected - Project Portfolio",
        "description": "Software project management and financial forecasting with stage gates and portfolio planning",
        "icon": "📊",
        "file": "seed_data_toyota_connected.json"
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
        AttributeDB.__table__,
        EntityDB.__table__,
        SemanticTableDB.__table__,
        SystemDB.__table__,
        PerspectiveDB.__table__,
    ]

    # Delete all rows from each table
    for table in tables:
        result = db.execute(delete(table))
        print(f"Deleted {result.rowcount} rows from {table.name}")

    # Commit once after all deletes
    db.commit()

    # Verify deletion worked by counting rows
    for table in tables:
        count_query = select(func.count()).select_from(table)
        count = db.execute(count_query).scalar()
        if count > 0:
            print(f"WARNING: {table.name} still has {count} rows after clear, forcing delete")
            # Force delete again
            db.execute(delete(table))

    # Final commit if any force deletes happened
    db.commit()
    print("Database cleared successfully")


def load_seed_data_from_file(scenario_file: str) -> dict:
    """Load seed data from a specific JSON file."""
    seed_path = get_seed_data_path(scenario_file)
    with open(seed_path, "r") as f:
        return json.load(f)


def seed_from_data(db: Session, data: dict):
    """Seed the database with provided data."""
    # Seed perspectives
    repo = PerspectiveRepository(db)
    for item in data.get("perspectives", []):
        repo.create(Perspective(**item))

    # Seed systems
    repo = SystemRepository(db)
    for item in data.get("systems", []):
        repo.create(System(**item))

    # Seed entities
    repo = EntityRepository(db)
    for item in data.get("entities", []):
        repo.create(Entity(**item))

    # Seed attributes
    repo = AttributeRepository(db)
    for item in data.get("attributes", []):
        repo.create(Attribute(**item))

    # Seed measures
    repo = MeasureRepository(db)
    for item in data.get("measures", []):
        repo.create(Measure(**item))

    # Seed metrics
    repo = MetricRepository(db)
    for item in data.get("metrics", []):
        repo.create(Metric(**item))

    # Seed processes
    repo = ProcessRepository(db)
    for item in data.get("processes", []):
        repo.create(Process(**item))

    # Seed semantic tables
    repo = SemanticTableRepository(db)
    for item in data.get("semantic_tables", []):
        repo.create(Table(**item))


@router.get("/status", response_model=ScenarioStatus)
async def get_scenario_status():
    """Get current scenario and list of available scenarios."""
    return ScenarioStatus(
        current_scenario=_current_scenario,
        available_scenarios=[ScenarioInfo(**info) for info in SCENARIOS.values()]
    )


@router.post("/load/{scenario_id}")
async def load_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Load a specific scenario by clearing the database and reseeding."""
    global _current_scenario

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
        _current_scenario = scenario_id

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
