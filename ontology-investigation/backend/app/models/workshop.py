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


# --- Top-Down Workshop structured data ---

class TopDownAttributeRequirement(BaseModel):
    """An attribute required by a measure (captured during top-down workshop)."""

    id: str
    name: str
    existing_attribute_id: Optional[str] = None
    entity_hint: Optional[str] = None


class TopDownMeasureRequirement(BaseModel):
    """A measure required to calculate a metric (captured during top-down workshop)."""

    id: str
    name: str
    logic: Optional[str] = None
    existing_measure_id: Optional[str] = None
    required_attributes: list[TopDownAttributeRequirement] = Field(default_factory=list)


class TopDownMetricCapture(BaseModel):
    """A business question / metric captured during top-down workshop."""

    id: str
    business_question: str
    metric_name: str
    perspective_ids: list[str] = Field(default_factory=list)
    existing_metric_id: Optional[str] = None
    required_measures: list[TopDownMeasureRequirement] = Field(default_factory=list)


class TopDownData(BaseModel):
    """Structured output of a top-down workshop session — the demand signal."""

    metrics: list[TopDownMetricCapture] = Field(default_factory=list)


# --- Gap Analysis Workshop structured data ---

class GapItem(BaseModel):
    """A single gap identified during gap analysis."""

    id: str
    gap_type: Literal[
        "missing_supply", "unused_supply", "shadow_system", "high_manual_effort"
    ]
    description: str
    priority: Literal["high", "medium", "low"] = "medium"
    related_entity_ids: list[str] = Field(default_factory=list)
    related_attribute_ids: list[str] = Field(default_factory=list)
    related_measure_ids: list[str] = Field(default_factory=list)
    related_process_ids: list[str] = Field(default_factory=list)
    suggested_action: Optional[str] = None
    resolved: bool = False
    resolution_notes: Optional[str] = None


class GapAnalysisData(BaseModel):
    """Structured output of a gap analysis workshop session."""

    top_down_session_ids: list[str] = Field(default_factory=list)
    bottom_up_session_ids: list[str] = Field(default_factory=list)
    gaps: list[GapItem] = Field(default_factory=list)


# --- Workshop Session ---

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
        default=None, description="Session notes and findings"
    )
    findings: list[WorkshopFinding] = Field(
        default_factory=list, description="Findings from the session"
    )
    top_down_data: Optional[TopDownData] = Field(
        default=None, description="Structured data for top-down sessions"
    )
    gap_analysis_data: Optional[GapAnalysisData] = Field(
        default=None, description="Structured data for gap analysis sessions"
    )
    process_id: Optional[str] = Field(
        default=None, description="Linked process ID for bottom-up sessions"
    )
