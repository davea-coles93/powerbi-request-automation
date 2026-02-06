from pydantic import BaseModel, Field
from typing import Optional, Literal


DataType = Literal["string", "number", "date", "datetime", "boolean"]


class CoreAttribute(BaseModel):
    """An attribute shared across all perspectives."""

    name: str = Field(..., description="Attribute name")
    data_type: DataType = Field(..., description="Data type")
    description: Optional[str] = Field(default=None, description="Attribute description")


class DerivedAttribute(BaseModel):
    """An attribute relevant to a specific perspective."""

    name: str = Field(..., description="Attribute name")
    data_type: Optional[str] = Field(default=None, description="Data type")
    description: Optional[str] = Field(default=None, description="Attribute description")
    derivation: Optional[str] = Field(
        default=None, description="How this attribute is calculated/derived"
    )


class EntityLens(BaseModel):
    """A perspective-specific interpretation of an entity."""

    perspective_id: str = Field(..., description="Reference to perspective")
    interpretation: str = Field(
        ..., description="What this entity means in this perspective"
    )
    derived_attributes: list[DerivedAttribute] = Field(
        default_factory=list, description="Attributes relevant to this perspective"
    )


class Entity(BaseModel):
    """A business object that can be viewed through different perspective lenses."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="General description of the entity"
    )
    core_attributes: list[CoreAttribute] = Field(
        default_factory=list, description="Attributes shared across all perspectives"
    )
    lenses: list[EntityLens] = Field(
        default_factory=list, description="Perspective-specific interpretations"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "production_order",
                "name": "Production Order",
                "description": "An order to manufacture products",
                "core_attributes": [
                    {"name": "ID", "data_type": "string", "description": "Unique order ID"},
                    {"name": "Created Date", "data_type": "datetime"},
                    {"name": "Quantity", "data_type": "number"},
                ],
                "lenses": [
                    {
                        "perspective_id": "operational",
                        "interpretation": "Work instruction to be executed",
                        "derived_attributes": [
                            {"name": "BOM", "description": "Bill of Materials"},
                            {"name": "Routing", "description": "Work center sequence"},
                        ],
                    },
                    {
                        "perspective_id": "financial",
                        "interpretation": "Cost collector",
                        "derived_attributes": [
                            {"name": "Planned Cost", "data_type": "number"},
                            {"name": "Actual Cost", "data_type": "number"},
                            {
                                "name": "Variance",
                                "data_type": "number",
                                "derivation": "Planned Cost - Actual Cost",
                            },
                        ],
                    },
                ],
            }
        }
