"""API endpoints for semantic model management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.semantic_model import (
    SemanticModel,
    Table,
    MappingStatus,
    DAXExport,
)
from app.services.semantic_model_service import SemanticModelService

router = APIRouter(prefix="/api/semantic-model", tags=["semantic-model"])


@router.get("/", response_model=SemanticModel)
def get_semantic_model(db: Session = Depends(get_db)):
    """Get the current semantic model."""
    service = SemanticModelService(db)
    return service.get_semantic_model()


@router.get("/tables", response_model=List[Table])
def get_tables(db: Session = Depends(get_db)):
    """Get all tables in the semantic model."""
    service = SemanticModelService(db)
    model = service.get_semantic_model()
    return model.tables


@router.get("/tables/{table_id}", response_model=Table)
def get_table(table_id: str, db: Session = Depends(get_db)):
    """Get a specific table."""
    service = SemanticModelService(db)
    table = service.table_repo.get_by_id(table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.get("/tables/{table_id}/export-dax", response_model=DAXExport)
def export_table_dax(table_id: str, db: Session = Depends(get_db)):
    """Export DAX measures for a table."""
    service = SemanticModelService(db)
    try:
        return service.export_dax_measures(table_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tables/{table_id}/schema")
def get_table_schema(table_id: str, db: Session = Depends(get_db)):
    """Get table schema for Power Query."""
    service = SemanticModelService(db)
    try:
        return service.generate_table_schema(table_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mapping-status", response_model=MappingStatus)
def get_mapping_status(db: Session = Depends(get_db)):
    """Get gap analysis of ontology-to-semantic-model mapping."""
    service = SemanticModelService(db)
    return service.analyze_mapping_gaps()

