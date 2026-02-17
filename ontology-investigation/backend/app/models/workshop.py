from pydantic import BaseModel, Field
from typing import Optional, Literal


class WorkshopFinding(BaseModel):
    """A discovery finding from a workshop session."""

    id: str = Field(..., description="Unique identifier for the finding")
    category: Literal[
        "missing_supply",
        "unused_supply",
        "shadow_system",
        "high_manual_effort",
        "data_quality",
        "other",
    ] = Field(..., description="Category of the finding")
    description: str = Field(..., description="Description of the finding")
    related_entity_ids: list[str] = Field(
        default_factory=list,
        description="Entity IDs related to this finding",
    )
    related_attribute_ids: list[str] = Field(
        default_factory=list,
        description="Attribute IDs related to this finding",
    )
    priority: Literal["high", "medium", "low"] = Field(
        default="medium", description="Priority level of the finding"
    )


class WorkshopSession(BaseModel):
    """A workshop session for ontology discovery."""

    id: str = Field(..., description="Unique identifier for the session")
    name: str = Field(..., description="Session name")
    date: str = Field(..., description="Session date in ISO format")
    participants: list[str] = Field(
        default_factory=list, description="List of participants"
    )
    session_type: Literal["top_down", "bottom_up", "gap_analysis"] = Field(
        ..., description="Type of workshop session"
    )
    notes: Optional[str] = Field(
        default=None, description="Session notes and observations"
    )
    findings: list[WorkshopFinding] = Field(
        default_factory=list, description="Findings from the session"
    )
