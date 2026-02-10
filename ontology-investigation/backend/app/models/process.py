from pydantic import BaseModel, Field
from typing import Optional, Literal


PerspectiveLevel = Literal["financial", "management", "operational"]


class ProcessStep(BaseModel):
    """A single step within a business process."""

    id: str = Field(..., description="Unique step identifier")
    sequence: int = Field(..., description="Order in the process")
    name: str = Field(..., description="Step name")
    description: Optional[str] = Field(
        default=None, description="What happens in this step"
    )
    perspective_id: str = Field(
        ..., description="Which perspective this step executes in"
    )
    actor: Optional[str] = Field(
        default=None, description="Who or what performs this step"
    )
    consumes_attribute_ids: list[str] = Field(
        default_factory=list, description="Attributes read/used by this step"
    )
    produces_attribute_ids: list[str] = Field(
        default_factory=list, description="Attributes created by this step"
    )
    uses_metric_ids: list[str] = Field(
        default_factory=list, description="Metrics reviewed/used in this step"
    )
    crystallizes_attribute_ids: list[str] = Field(
        default_factory=list,
        description="Attributes that become frozen after this step",
    )
    depends_on_step_ids: list[str] = Field(
        default_factory=list, description="Steps that must complete before this one"
    )

    # Hierarchical drill-down support
    parent_step_id: Optional[str] = Field(
        default=None, description="Parent step ID if this is a sub-step"
    )
    has_sub_steps: Optional[bool] = Field(
        default=False, description="Whether this step has operational sub-steps"
    )
    perspective_level: Optional[PerspectiveLevel] = Field(
        default="financial", description="Which perspective level this step represents"
    )

    # Time and efficiency metadata
    estimated_duration_minutes: Optional[int] = Field(
        default=None, description="Expected time to complete this step"
    )
    automation_potential: Optional[Literal["High", "Medium", "Low", "None"]] = Field(
        default=None, description="Potential for automation"
    )
    systems_used_ids: list[str] = Field(
        default_factory=list, description="Systems accessed during this step"
    )
    waste_category: Optional[str] = Field(
        default=None,
        description="Type of waste: Manual Data Entry, Physical Media, System Switching, Waiting Time, Manual Verification, Manual Tracking"
    )
    manual_effort_percentage: Optional[int] = Field(
        default=None,
        description="Percentage of task that is manual (0-100), vs automated"
    )


class Process(BaseModel):
    """A cross-perspective business process with sequential steps."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(
        default=None, description="What this process accomplishes"
    )
    steps: list[ProcessStep] = Field(
        default_factory=list, description="Ordered steps in the process"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "month_end_close",
                "name": "Month-End Close",
                "description": "Close financial period and report accurate position",
                "steps": [
                    {
                        "id": "production_cutoff",
                        "sequence": 1,
                        "name": "Production Cutoff",
                        "description": "Confirm all completed production orders",
                        "perspective_id": "operational",
                        "actor": "Production Manager",
                        "consumes_attribute_ids": ["production_confirmations"],
                        "produces_attribute_ids": [],
                        "uses_metric_ids": [],
                        "crystallizes_attribute_ids": [
                            "production_confirmations",
                            "production_goods_movements",
                        ],
                        "depends_on_step_ids": [],
                    }
                ],
            }
        }
