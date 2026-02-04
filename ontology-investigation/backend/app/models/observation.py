from pydantic import BaseModel, Field
from typing import Optional, Literal


ReliabilityLevel = Literal["High", "Medium", "Low"]
Volatility = Literal["Point-in-time", "Accumulating", "Continuous"]


class Observation(BaseModel):
    """Raw data captured at a point of activity - where data is born."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="What this observation captures"
    )
    entity_id: str = Field(
        ..., description="Reference to the entity this observation describes"
    )
    system_id: str = Field(
        ..., description="Reference to the system where this observation is captured"
    )
    source_actor: Optional[str] = Field(
        default=None,
        description="Who or what creates this observation (role or system component)",
    )
    reliability: Optional[ReliabilityLevel] = Field(
        default=None, description="Data reliability level (can override system default)"
    )
    volatility: Optional[Volatility] = Field(
        default=None, description="How this observation changes over time"
    )
    notes: Optional[str] = Field(default=None, description="Additional notes")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "production_confirmations",
                "name": "Production Confirmations",
                "description": "Records of completed production quantities",
                "entity_id": "production_order",
                "system_id": "mes",
                "source_actor": "Floor Operator / Auto",
                "reliability": "High",
                "volatility": "Accumulating",
            }
        }
