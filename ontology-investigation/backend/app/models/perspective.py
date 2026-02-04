from pydantic import BaseModel, Field
from typing import Optional


class Perspective(BaseModel):
    """A mode of thinking about business operations."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    purpose: str = Field(..., description="Why this perspective exists")
    primary_concern: str = Field(..., description="The key question this perspective answers")
    typical_actors: list[str] = Field(
        default_factory=list, description="Roles typically operating in this perspective"
    )
    consumes_from: list[str] = Field(
        default_factory=list, description="Perspective IDs this perspective receives data from"
    )
    feeds: list[str] = Field(
        default_factory=list, description="Perspective IDs this perspective provides data to"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "operational",
                "name": "Operational",
                "purpose": "Execute and record business activities",
                "primary_concern": "What work is being done? What happened?",
                "typical_actors": ["Production Operator", "Warehouse Operative"],
                "consumes_from": [],
                "feeds": ["management", "financial"],
            }
        }
