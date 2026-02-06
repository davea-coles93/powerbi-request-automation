from pydantic import BaseModel, Field
from typing import Optional, Literal


OntologyType = Literal["entity", "observation", "measure"]
SemanticType = Literal["table", "column", "measure"]
MappingStatus = Literal["mapped", "partial", "gap"]


class SemanticMapping(BaseModel):
    """Maps ontology elements to Power BI semantic model objects."""

    id: str = Field(..., description="Unique identifier")
    ontology_type: OntologyType = Field(
        ..., description="Type of ontology element being mapped"
    )
    ontology_id: str = Field(..., description="ID of the ontology element")
    semantic_object: Optional[str] = Field(
        default=None,
        description="Name of the semantic model object (table, column, or measure name)",
    )
    semantic_type: Optional[SemanticType] = Field(
        default=None, description="Type of semantic model object"
    )
    status: MappingStatus = Field(default="gap", description="Mapping status")
    notes: Optional[str] = Field(
        default=None, description="Additional notes about the mapping"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "map_production_order",
                "ontology_type": "entity",
                "ontology_id": "production_order",
                "semantic_object": "FactProductionOrders",
                "semantic_type": "table",
                "status": "mapped",
                "notes": "Direct mapping to production fact table",
            }
        }
