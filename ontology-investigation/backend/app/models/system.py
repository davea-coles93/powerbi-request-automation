from pydantic import BaseModel, Field
from typing import Optional, Literal


SystemType = Literal["ERP", "MES", "WMS", "CMMS", "QMS", "Spreadsheet", "Manual", "BI", "Other"]
ReliabilityLevel = Literal["High", "Medium", "Low"]
IntegrationStatus = Literal["Connected", "Planned", "Manual Extract", "None"]


class System(BaseModel):
    """A system where observations are captured/stored."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    type: SystemType = Field(..., description="Category of system")
    vendor: Optional[str] = Field(default=None, description="System vendor")
    reliability_default: Optional[ReliabilityLevel] = Field(
        default=None, description="Default reliability level for observations"
    )
    integration_status: Optional[IntegrationStatus] = Field(
        default=None, description="Current integration status"
    )
    notes: Optional[str] = Field(default=None, description="Additional notes")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "erp",
                "name": "ERP System",
                "type": "ERP",
                "vendor": "SAP",
                "reliability_default": "High",
                "integration_status": "Connected",
            }
        }
