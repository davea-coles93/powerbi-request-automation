from pydantic import BaseModel, Field
from typing import Optional


class Metric(BaseModel):
    """A business KPI that answers a business question - the anchor point for requirements."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="Detailed description of the metric"
    )
    business_question: str = Field(
        ..., description="The business question this metric answers"
    )
    calculated_by_measure_ids: list[str] = Field(
        default_factory=list, description="Measures that calculate this metric"
    )
    perspective_ids: list[str] = Field(
        default_factory=list, description="Perspectives this metric is relevant to"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "cogs",
                "name": "Cost of Goods Sold",
                "description": "Total cost incurred to produce goods that were sold",
                "business_question": "What did it cost to produce what we sold?",
                "calculated_by_measure_ids": [
                    "material_cost_consumed",
                    "labor_cost_applied",
                    "overhead_absorbed",
                ],
                "perspective_ids": ["financial"],
            }
        }
