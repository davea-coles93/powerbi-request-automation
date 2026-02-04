"""Semantic Model types for Power BI integration."""
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from enum import Enum


class TableType(str, Enum):
    """Type of table in semantic model."""
    FACT = "Fact"
    DIMENSION = "Dimension"
    BRIDGE = "Bridge"


class DataType(str, Enum):
    """Data type for columns."""
    INTEGER = "Integer"
    DECIMAL = "Decimal"
    STRING = "String"
    DATE = "Date"
    DATETIME = "DateTime"
    BOOLEAN = "Boolean"


class Column(BaseModel):
    """A column in a semantic model table."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Column name")
    data_type: DataType = Field(..., description="Data type")
    is_key: bool = Field(default=False, description="Is this a primary key?")
    is_foreign_key: bool = Field(default=False, description="Is this a foreign key?")
    source_system_id: Optional[str] = Field(default=None, description="Source system")
    source_field: Optional[str] = Field(default=None, description="Source field path")
    mapped_observation_id: Optional[str] = Field(
        default=None, description="Linked observation ID"
    )
    description: Optional[str] = Field(default=None, description="Column description")


class DAXMeasure(BaseModel):
    """A DAX measure in the semantic model."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Measure name")
    expression: str = Field(..., description="DAX expression")
    format_string: Optional[str] = Field(default=None, description="Format string")
    description: Optional[str] = Field(default=None, description="Measure description")
    mapped_measure_id: Optional[str] = Field(
        default=None, description="Linked ontology measure ID"
    )


class Relationship(BaseModel):
    """A relationship between tables."""

    id: str = Field(..., description="Unique identifier")
    from_table_id: str = Field(..., description="Source table ID")
    from_column_id: str = Field(..., description="Source column ID")
    to_table_id: str = Field(..., description="Target table ID")
    to_column_id: str = Field(..., description="Target column ID")
    cardinality: Literal["1:*", "*:1", "1:1", "*:*"] = Field(
        ..., description="Relationship cardinality"
    )
    cross_filter_direction: Literal["Single", "Both"] = Field(
        default="Single", description="Cross filter direction"
    )
    is_active: bool = Field(default=True, description="Is relationship active?")


class Table(BaseModel):
    """A table in the semantic model."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Table name")
    table_type: TableType = Field(..., description="Table type")
    columns: List[Column] = Field(default_factory=list, description="Table columns")
    measures: List[DAXMeasure] = Field(default_factory=list, description="DAX measures")
    mapped_entity_id: Optional[str] = Field(
        default=None, description="Linked ontology entity ID"
    )
    source_system_id: Optional[str] = Field(
        default=None, description="Primary source system"
    )
    description: Optional[str] = Field(default=None, description="Table description")


class SemanticModel(BaseModel):
    """A complete semantic model (Power BI dataset)."""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Model name")
    description: Optional[str] = Field(default=None, description="Model description")
    tables: List[Table] = Field(default_factory=list, description="Tables in model")
    relationships: List[Relationship] = Field(
        default_factory=list, description="Relationships"
    )


class MappingStatus(BaseModel):
    """Gap analysis results."""

    total_tables: int
    mapped_tables: int
    unmapped_tables: int
    total_columns: int
    mapped_columns: int
    total_measures: int
    mapped_measures: int
    orphaned_observations: List[str] = Field(
        default_factory=list, description="Observations not mapped to columns"
    )
    orphaned_tables: List[str] = Field(
        default_factory=list, description="Tables not mapped to entities"
    )
    missing_columns: List[dict] = Field(
        default_factory=list, description="Observations needing columns"
    )


class DAXExport(BaseModel):
    """DAX script export."""

    dax_script: str = Field(..., description="Complete DAX script")
    table_name: str = Field(..., description="Table name for measures")
    measure_count: int = Field(..., description="Number of measures")
