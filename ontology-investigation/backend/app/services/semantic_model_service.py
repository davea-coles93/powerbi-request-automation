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
from app.db.repositories import SemanticTableRepository, AttributeRepository, MeasureRepository


class SemanticModelService:
    """Service for semantic model management and Power BI integration."""

    def __init__(self, db):
        self.db = db
        self.table_repo = SemanticTableRepository(db)
        self.attribute_repo = AttributeRepository(db)
        self.measure_repo = MeasureRepository(db)

    def get_semantic_model(self) -> SemanticModel:
        """Get semantic model from database."""
        tables = self.table_repo.get_all()

        return SemanticModel(
            id="ontology_model",
            name="Manufacturing Ontology Model",
            description="Semantic model generated from business ontology",
            tables=tables,
            relationships=[],
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
            len([c for c in t.columns if c.mapped_attribute_id]) for t in tables
        )

        total_dax_measures = sum(len(t.measures) for t in tables)
        mapped_dax_measures = sum(
            len([m for m in t.measures if m.mapped_measure_id]) for t in tables
        )

        orphaned_tables = [t.name for t in tables if not t.mapped_entity_id]

        # --- Ontology-level gap analysis ---
        all_attributes = self.attribute_repo.get_all()
        all_measures = self.measure_repo.get_all()

        # Build set of attribute IDs used by any measure
        used_attr_ids = set()
        for measure in all_measures:
            used_attr_ids.update(measure.input_attribute_ids)

        # Build set of ontology measure IDs that have a DAX implementation
        implemented_measure_ids = set()
        for table in tables:
            for dax_m in table.measures:
                if dax_m.mapped_measure_id:
                    implemented_measure_ids.add(dax_m.mapped_measure_id)

        # Attributes with complete flow: used by a measure that has DAX
        measures_with_dax = [m for m in all_measures if m.id in implemented_measure_ids]
        attrs_with_complete_flow_ids = set()
        for measure in measures_with_dax:
            attrs_with_complete_flow_ids.update(measure.input_attribute_ids)

        # Broken flow: attributes used by measures but none of those measures have DAX
        attrs_with_broken_flow = []
        for attr in all_attributes:
            if attr.id in used_attr_ids and attr.id not in attrs_with_complete_flow_ids:
                attrs_with_broken_flow.append(attr.name)

        # Unimplemented measures: ontology measures without DAX
        unimplemented = [m.name for m in all_measures if m.id not in implemented_measure_ids]

        # Measures without any input attributes
        measures_no_attrs = [m.name for m in all_measures if not m.input_attribute_ids and not m.input_measure_ids]

        # Semantic tables with/without DAX measures
        tables_with_measures = [t for t in tables if t.measures]
        tables_without_measures = [t.name for t in tables if not t.measures]

        return MappingStatus(
            total_tables=total_tables,
            mapped_tables=mapped_tables,
            unmapped_tables=total_tables - mapped_tables,
            total_columns=total_columns,
            mapped_columns=mapped_columns,
            total_measures=total_dax_measures,
            mapped_measures=mapped_dax_measures,
            orphaned_attributes=[],
            orphaned_tables=orphaned_tables,
            missing_columns=[],
            # Ontology-level fields
            total_attributes=len(all_attributes),
            attributes_used_by_measures=len(used_attr_ids),
            attributes_with_complete_flow=len(attrs_with_complete_flow_ids),
            attributes_with_broken_flow=attrs_with_broken_flow,
            total_business_measures=len(all_measures),
            implemented_measures=len(implemented_measure_ids),
            unimplemented_measures=unimplemented,
            measures_without_attributes=measures_no_attrs,
            semantic_tables_with_measures=len(tables_with_measures),
            semantic_tables_without_measures=tables_without_measures,
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
