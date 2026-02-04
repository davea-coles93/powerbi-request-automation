"""Service for semantic model operations and Power BI integration."""
from typing import List, Dict, Any
from app.models.semantic_model import (
    SemanticModel,
    Table,
    Column,
    DAXMeasure,
    MappingStatus,
    DAXExport,
)
from app.db.repositories import SemanticTableRepository


class SemanticModelService:
    """Service for semantic model management and Power BI integration."""

    def __init__(self, db):
        self.db = db
        self.table_repo = SemanticTableRepository(db)

    def get_semantic_model(self) -> SemanticModel:
        """Get semantic model from database."""
        tables = self.table_repo.get_all()

        return SemanticModel(
            id="ontology_model",
            name="Manufacturing Ontology Model",
            description="Semantic model generated from business ontology",
            tables=tables,
            relationships=[],  # TODO: Add relationships support
        )

    def export_dax_measures(self, table_id: str) -> DAXExport:
        """Export DAX measures for a table."""
        table = self.table_repo.get_by_id(table_id)
        if not table:
            raise ValueError(f"Table {table_id} not found")

        dax_lines = []
        dax_lines.append(f"-- DAX Measures for {table.name}")
        dax_lines.append(f"-- Generated from Business Ontology Framework")
        dax_lines.append("")

        for measure in table.measures:
            dax_lines.append(f"-- {measure.description or measure.name}")
            if measure.mapped_measure_id:
                dax_lines.append(f"-- Mapped to: {measure.mapped_measure_id}")

            dax_lines.append(f"[{measure.name}] = {measure.expression}")

            if measure.format_string:
                dax_lines.append(f"-- Format: {measure.format_string}")

            dax_lines.append("")

        return DAXExport(
            dax_script="\n".join(dax_lines),
            table_name=table.name,
            measure_count=len(table.measures),
        )

    def analyze_mapping_gaps(self) -> MappingStatus:
        """Analyze gaps between ontology and semantic model."""
        tables = self.table_repo.get_all()

        total_tables = len(tables)
        mapped_tables = len([t for t in tables if t.mapped_entity_id])

        total_columns = sum(len(t.columns) for t in tables)
        mapped_columns = sum(
            len([c for c in t.columns if c.mapped_observation_id]) for t in tables
        )

        total_measures = sum(len(t.measures) for t in tables)
        mapped_measures = sum(
            len([m for m in t.measures if m.mapped_measure_id]) for t in tables
        )

        orphaned_tables = [t.name for t in tables if not t.mapped_entity_id]

        return MappingStatus(
            total_tables=total_tables,
            mapped_tables=mapped_tables,
            unmapped_tables=total_tables - mapped_tables,
            total_columns=total_columns,
            mapped_columns=mapped_columns,
            total_measures=total_measures,
            mapped_measures=mapped_measures,
            orphaned_observations=[],  # Would query ontology for unmapped
            orphaned_tables=orphaned_tables,
            missing_columns=[],  # Would compare observations to columns
        )

    def generate_table_schema(self, table_id: str) -> Dict[str, Any]:
        """Generate Power Query schema for a table."""
        table = self.table_repo.get_by_id(table_id)
        if not table:
            raise ValueError(f"Table {table_id} not found")

        schema = {
            "table_name": table.name,
            "table_type": table.table_type.value,
            "columns": [
                {
                    "name": col.name,
                    "data_type": col.data_type.value,
                    "is_key": col.is_key,
                    "source": col.source_field or col.name,
                }
                for col in table.columns
            ],
            "source_system": table.source_system_id,
        }

        return schema
