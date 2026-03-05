from pydantic import BaseModel, Field
from typing import Optional


class EntityRelationship(BaseModel):
    """A relationship between two entities, typically derived from TMDL foreign keys."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name for the relationship")
    from_entity_id: str = Field(..., description="Source entity ID")
    to_entity_id: str = Field(..., description="Target entity ID")
    from_attribute_id: Optional[str] = Field(
        default=None, description="Source attribute (FK column)"
    )
    to_attribute_id: Optional[str] = Field(
        default=None, description="Target attribute (PK column)"
    )
    relationship_type: str = Field(
        default="many_to_one", description="Relationship cardinality"
    )
    is_active: bool = Field(default=True, description="Whether relationship is active")
    source: str = Field(
        default="tmdl", description="Origin: 'tmdl' (imported) or 'manual' (user-created)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "sales_to_product",
                "name": "Sales -> Product",
                "from_entity_id": "sales",
                "to_entity_id": "product",
                "from_attribute_id": "sales_product_key",
                "to_attribute_id": "product_product_key",
                "relationship_type": "many_to_one",
                "is_active": True,
                "source": "tmdl",
            }
        }
