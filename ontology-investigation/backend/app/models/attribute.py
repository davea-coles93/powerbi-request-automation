from pydantic import BaseModel, Field
from typing import Optional, Literal


ReliabilityLevel = Literal["High", "Medium", "Low"]
Volatility = Literal["Point-in-time", "Accumulating", "Continuous"]
OntologyState = Literal["as-is", "to-be", "both"]


class Attribute(BaseModel):
    """Data attribute captured about an entity - raw data from source systems."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="What this attribute captures"
    )
    entity_id: str = Field(
        ..., description="Reference to the entity this attribute describes"
    )
    system_id: str = Field(
        ..., description="Reference to the system where this attribute is captured"
    )
    source_actor: Optional[str] = Field(
        default=None,
        description="Who or what creates this attribute (role or system component)",
    )
    reliability: Optional[ReliabilityLevel] = Field(
        default=None, description="Data reliability level (can override system default)"
    )
    volatility: Optional[Volatility] = Field(
        default=None, description="How this attribute changes over time"
    )
    notes: Optional[str] = Field(default=None, description="Additional notes")

    # Source binding - where this attribute lives in a source system
    source_table: Optional[str] = Field(
        default=None,
        description="Source table name in the system (e.g., AFKO, dbo.ProductionOrders)",
    )
    source_column: Optional[str] = Field(
        default=None,
        description="Source column name (e.g., GAMNG, ConfirmedQty)",
    )
    source_connection: Optional[str] = Field(
        default=None,
        description="Connection reference (e.g., SAP ECC PRD)",
    )

    # Business rules and constraints
    constraints: Optional[list[dict]] = Field(
        default=None,
        description="Business rules and constraints. Each dict has: type (range|required|format), params (min, max, pattern, etc.), description",
    )

    # Perspective relevance
    perspective_ids: Optional[list[str]] = Field(
        default=None,
        description="Perspectives this attribute is relevant to",
    )
    data_type: str = Field(
        default="string",
        description="Data type: string, number, date, boolean, decimal",
    )
    state: Optional[OntologyState] = Field(
        default="as-is", description="Whether this attribute exists today (as-is), is planned (to-be), or both"
    )

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
                "source_table": "AFKO",
                "source_column": "GAMNG",
                "source_connection": "SAP ECC PRD",
                "constraints": [
                    {
                        "type": "required",
                        "description": "Required for month-end close cutoff",
                    }
                ],
            }
        }
