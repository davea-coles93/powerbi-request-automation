"""Generic CRUD router factory.

Eliminates boilerplate for entity types that follow the standard
get_all / get_by_id / create / update / delete pattern.
"""

from typing import Type, Optional, Callable

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..db.repositories import BaseRepository


def make_crud_router(
    prefix: str,
    entity_name: str,
    repo_class: Type[BaseRepository],
    model_class: Type[BaseModel],
    *,
    pre_create: Optional[Callable] = None,
    pre_update: Optional[Callable] = None,
) -> APIRouter:
    """Create a standard CRUD router for an entity type.

    Generates: GET (list), GET /{id}, POST, PUT /{id}, DELETE /{id}.

    For entities needing custom list filters (e.g., ?entity_id=), add those
    endpoints manually to the returned router before including it in the app.

    Args:
        prefix: URL prefix (e.g., "/api/perspectives")
        entity_name: Human-readable name for error messages (e.g., "Perspective")
        repo_class: Repository class to instantiate
        model_class: Pydantic model class for request/response
        pre_create: Optional hook (data, db) -> None, may raise HTTPException
        pre_update: Optional hook (data, db) -> None, may raise HTTPException
    """
    router = APIRouter(prefix=prefix, tags=["ontology"])
    lower = entity_name.lower()

    @router.get("", response_model=list[model_class], name=f"list_{lower}s")
    def list_all(db: Session = Depends(get_db)):
        return repo_class(db).get_all()

    @router.get("/{id}", response_model=model_class, name=f"get_{lower}")
    def get_one(id: str, db: Session = Depends(get_db)):
        result = repo_class(db).get_by_id(id)
        if not result:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        return result

    @router.post("", response_model=model_class, name=f"create_{lower}")
    def create(data: model_class, db: Session = Depends(get_db)):
        if pre_create:
            pre_create(data, db)
        repo = repo_class(db)
        if repo.exists(data.id):
            raise HTTPException(
                status_code=409, detail=f"{entity_name} with id '{data.id}' already exists"
            )
        return repo.create(data)

    @router.put("/{id}", response_model=model_class, name=f"update_{lower}")
    def update(id: str, data: model_class, db: Session = Depends(get_db)):
        if pre_update:
            pre_update(data, db)
        result = repo_class(db).update(id, data)
        if not result:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        return result

    @router.delete("/{id}", name=f"delete_{lower}")
    def delete(id: str, db: Session = Depends(get_db)):
        if not repo_class(db).delete(id):
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        return {"message": f"{entity_name} {id} deleted successfully"}

    return router
