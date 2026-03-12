from pydantic import BaseModel, Field
from typing import Optional, Literal

OntologyState = Literal["as-is", "to-be", "both"]


class Measure(BaseModel):
    """A calculation applied to attributes and other measures to derive insight."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="What this measure calculates"
    )
    logic: Optional[str] = Field(
        default=None, description="Description of the calculation logic"
    )
    formula: Optional[str] = Field(
        default=None, description="Optional formula representation"
    )
    input_attribute_ids: list[str] = Field(
        default_factory=list, description="Attributes that feed into this measure"
    )
    input_measure_ids: list[str] = Field(
        default_factory=list, description="Other measures that feed into this measure"
    )
    perspective_ids: list[str] = Field(
        default_factory=list, description="Perspectives this measure is relevant to"
    )
    state: Optional[OntologyState] = Field(
        default="as-is", description="Whether this measure exists today (as-is), is planned (to-be), or both"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "material_cost_consumed",
                "name": "Material Cost Consumed",
                "description": "Total material cost for production",
                "logic": "Sum of material quantities issued multiplied by standard cost",
                "formula": "SUM(qty × std_cost)",
                "input_attribute_ids": ["goods_issues", "standard_costs"],
                "input_measure_ids": [],
                "perspective_ids": ["financial"],
            }
        }
