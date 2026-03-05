"""Templates router for importing pre-built process templates."""
import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.repositories import (
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
)
from app.models import System, Entity, Attribute, Measure, Metric, Process


router = APIRouter(prefix="/api/templates", tags=["templates"])


class TemplateMeta(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    category: str


class TemplateInfo(TemplateMeta):
    process_count: int
    step_count: int
    system_count: int
    entity_count: int
    attribute_count: int
    measure_count: int
    metric_count: int


class ImportSummary(BaseModel):
    success: bool
    message: str
    created: dict
    skipped: dict


def get_templates_dir() -> Path:
    """Get path to templates directory."""
    possible = [
        Path("/app/data/templates"),
        Path(__file__).parent.parent.parent / "data" / "templates",
    ]
    for p in possible:
        if p.is_dir():
            return p
    raise FileNotFoundError("Templates directory not found")


def load_template(template_id: str) -> dict:
    """Load a template JSON file by ID."""
    templates_dir = get_templates_dir()
    path = templates_dir / f"{template_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Template '{template_id}' not found")
    with open(path) as f:
        return json.load(f)


@router.get("/", response_model=List[TemplateInfo])
async def list_templates():
    """List all available process templates."""
    try:
        templates_dir = get_templates_dir()
    except FileNotFoundError:
        return []

    results = []
    for path in sorted(templates_dir.glob("*.json")):
        try:
            with open(path) as f:
                data = json.load(f)
            meta = data.get("template_meta", {})
            processes = data.get("processes", [])
            step_count = sum(len(p.get("steps", [])) for p in processes)
            results.append(TemplateInfo(
                id=meta.get("id", path.stem),
                name=meta.get("name", path.stem),
                description=meta.get("description", ""),
                icon=meta.get("icon", "📋"),
                category=meta.get("category", "General"),
                process_count=len(processes),
                step_count=step_count,
                system_count=len(data.get("systems", [])),
                entity_count=len(data.get("entities", [])),
                attribute_count=len(data.get("attributes", [])),
                measure_count=len(data.get("measures", [])),
                metric_count=len(data.get("metrics", [])),
            ))
        except Exception:
            continue

    return results


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Get full template data for preview."""
    try:
        return load_template(template_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")


@router.post("/{template_id}/import", response_model=ImportSummary)
async def import_template(template_id: str, db: Session = Depends(get_db)):
    """Import a template into the current workspace (merge, not replace)."""
    try:
        data = load_template(template_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    created = {}
    skipped = {}

    def track(entity_type: str, action: str):
        bucket = created if action == "created" else skipped
        bucket[entity_type] = bucket.get(entity_type, 0) + 1

    try:
        # Import in dependency order: systems → entities → attributes → measures → metrics → processes

        sys_repo = SystemRepository(db)
        for item in data.get("systems", []):
            _, action = sys_repo.upsert(System(**item), strategy="skip")
            track("systems", action)

        ent_repo = EntityRepository(db)
        for item in data.get("entities", []):
            _, action = ent_repo.upsert(Entity(**item), strategy="skip")
            track("entities", action)

        attr_repo = AttributeRepository(db)
        for item in data.get("attributes", []):
            _, action = attr_repo.upsert(Attribute(**item), strategy="skip")
            track("attributes", action)

        meas_repo = MeasureRepository(db)
        for item in data.get("measures", []):
            _, action = meas_repo.upsert(Measure(**item), strategy="skip")
            track("measures", action)

        met_repo = MetricRepository(db)
        for item in data.get("metrics", []):
            _, action = met_repo.upsert(Metric(**item), strategy="skip")
            track("metrics", action)

        # For processes: if ID exists, suffix it
        proc_repo = ProcessRepository(db)
        for proc in data.get("processes", []):
            proc_id = proc["id"]
            if proc_repo.exists(proc_id):
                # Find a free suffix
                suffix = 2
                while proc_repo.exists(f"{proc_id}_{suffix}"):
                    suffix += 1
                proc["id"] = f"{proc_id}_{suffix}"
                proc["name"] = f"{proc['name']} ({suffix})"
            proc_repo.create(Process(**proc))
            track("processes", "created")

        meta = data.get("template_meta", {})
        return ImportSummary(
            success=True,
            message=f"Imported '{meta.get('name', template_id)}' successfully",
            created=created,
            skipped=skipped,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
