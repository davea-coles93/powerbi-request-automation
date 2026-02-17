"""TMDL file parser - reads Power BI Tabular Model Definition Language files.

Parses .SemanticModel/definition/ directories containing:
- model.tmdl: Model metadata (culture, table refs)
- tables/*.tmdl: Table definitions with columns, measures, partitions
- relationships.tmdl: Table relationships (foreign keys)

TMDL uses tab-based indentation (like YAML but different syntax).
"""
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import re


@dataclass
class TmdlColumn:
    name: str
    data_type: str = "string"
    source_column: Optional[str] = None
    format_string: Optional[str] = None
    summarize_by: Optional[str] = None
    is_hidden: bool = False
    description: Optional[str] = None


@dataclass
class TmdlMeasure:
    name: str
    expression: str  # DAX formula
    format_string: Optional[str] = None
    description: Optional[str] = None
    display_folder: Optional[str] = None


@dataclass
class TmdlRelationship:
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    cross_filtering: str = "oneDirection"
    is_active: bool = True


@dataclass
class TmdlTable:
    name: str
    columns: list[TmdlColumn] = field(default_factory=list)
    measures: list[TmdlMeasure] = field(default_factory=list)


@dataclass
class TmdlModel:
    tables: list[TmdlTable] = field(default_factory=list)
    relationships: list[TmdlRelationship] = field(default_factory=list)
    culture: str = "en-US"


def _strip_quotes(name: str) -> str:
    """Remove surrounding single quotes from a TMDL name."""
    name = name.strip()
    if name.startswith("'") and name.endswith("'"):
        return name[1:-1]
    return name


def _count_leading_tabs(line: str) -> int:
    """Count the number of leading tab characters."""
    count = 0
    for ch in line:
        if ch == '\t':
            count += 1
        else:
            break
    return count


def _parse_table_file(file_path: Path) -> Optional[TmdlTable]:
    """Parse a single .tmdl table file, extracting columns and measures.

    TMDL table file structure:
        table <TableName>                     (indent 0)
            lineageTag: ...                   (indent 1, table property)
            column <ColumnName>               (indent 1, column definition)
                dataType: ...                 (indent 2, column property)
                sourceColumn: ...             (indent 2, column property)
            measure <MeasureName> = <expr>    (indent 1, measure definition)
                formatString: ...             (indent 2, measure property)
            partition ...                     (indent 1, skip)
            hierarchy ...                     (indent 1, skip)
    """
    try:
        content = file_path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return None

    lines = content.splitlines()
    if not lines:
        return None

    # Parse table name from the first non-empty line
    table_name = None
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("table "):
            table_name = _strip_quotes(stripped[6:].strip())
            break

    if not table_name:
        return None

    table = TmdlTable(name=table_name)

    # State machine for parsing
    current_column: Optional[TmdlColumn] = None
    current_measure: Optional[TmdlMeasure] = None
    in_multiline_expression = False
    expression_lines: list[str] = []
    # Track what top-level block we're in (column, measure, partition, hierarchy, etc.)
    current_block: Optional[str] = None

    i = 0
    while i < len(lines):
        line = lines[i]
        indent = _count_leading_tabs(line)
        stripped = line.strip()

        # Skip empty lines and annotation lines
        if not stripped:
            i += 1
            continue

        # Handle multi-line expression (``` delimited or continuation lines)
        if in_multiline_expression:
            if stripped == '```':
                # End of multi-line expression
                in_multiline_expression = False
                if current_measure:
                    current_measure.expression = '\n'.join(expression_lines).strip()
                expression_lines = []
            else:
                expression_lines.append(stripped)
            i += 1
            continue

        # Indent level 1: column, measure, partition, hierarchy definitions
        if indent == 1:
            # Save any pending column/measure
            if current_column:
                table.columns.append(current_column)
                current_column = None
            if current_measure:
                table.measures.append(current_measure)
                current_measure = None

            if stripped.startswith("column "):
                current_block = "column"
                # Column definition: "column <Name>" or "column <Name> = <calculated expression>"
                col_def = stripped[7:].strip()
                # Check for calculated column (has = sign)
                if ' = ' in col_def:
                    col_name = _strip_quotes(col_def.split(' = ')[0].strip())
                else:
                    col_name = _strip_quotes(col_def)
                current_column = TmdlColumn(name=col_name)

            elif stripped.startswith("measure "):
                current_block = "measure"
                # Measure definition: "measure <Name> = <expression>"
                measure_def = stripped[8:].strip()
                # Split on first " = " to separate name from expression
                eq_idx = measure_def.find(' = ')
                if eq_idx != -1:
                    measure_name = _strip_quotes(measure_def[:eq_idx].strip())
                    expression = measure_def[eq_idx + 3:].strip()

                    # Check for multi-line expression (starts with ```)
                    if expression.startswith('```'):
                        in_multiline_expression = True
                        expression_lines = []
                        # Check if there's content after the opening ```
                        after_backticks = expression[3:].strip()
                        if after_backticks:
                            expression_lines.append(after_backticks)
                        current_measure = TmdlMeasure(name=measure_name, expression="")
                    else:
                        current_measure = TmdlMeasure(name=measure_name, expression=expression)
                else:
                    # Measure without expression (unusual but handle gracefully)
                    measure_name = _strip_quotes(measure_def)
                    current_measure = TmdlMeasure(name=measure_name, expression="")

            elif stripped.startswith("partition "):
                current_block = "partition"
            elif stripped.startswith("hierarchy "):
                current_block = "hierarchy"
            else:
                current_block = "other"

        # Indent level 2+: properties of current column/measure
        elif indent >= 2:
            if current_column and current_block == "column":
                _parse_column_property(current_column, stripped)
            elif current_measure and current_block == "measure":
                _parse_measure_property(current_measure, stripped)

        # Indent level 0: table-level properties or annotations (skip)

        i += 1

    # Save any final pending column/measure
    if current_column:
        table.columns.append(current_column)
    if current_measure:
        table.measures.append(current_measure)

    return table


def _parse_column_property(column: TmdlColumn, line: str):
    """Parse a property line for a column."""
    if line.startswith("dataType:"):
        column.data_type = line.split(":", 1)[1].strip()
    elif line.startswith("sourceColumn:"):
        column.source_column = line.split(":", 1)[1].strip()
    elif line.startswith("formatString:"):
        column.format_string = line.split(":", 1)[1].strip()
    elif line.startswith("summarizeBy:"):
        column.summarize_by = line.split(":", 1)[1].strip()
    elif line.startswith("description:"):
        column.description = line.split(":", 1)[1].strip()
    elif line == "isHidden":
        column.is_hidden = True


def _parse_measure_property(measure: TmdlMeasure, line: str):
    """Parse a property line for a measure."""
    if line.startswith("formatString:"):
        measure.format_string = line.split(":", 1)[1].strip()
    elif line.startswith("description:"):
        measure.description = line.split(":", 1)[1].strip()
    elif line.startswith("displayFolder:"):
        measure.display_folder = line.split(":", 1)[1].strip()


def _parse_relationships_file(file_path: Path) -> list[TmdlRelationship]:
    """Parse relationships.tmdl file.

    Format:
        relationship <GUID>
            fromColumn: <Table>.<Column>
            toColumn: <Table>.<Column>
            crossFilteringBehavior: bothDirections  (optional)
            isActive: false                         (optional)
    """
    try:
        content = file_path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return []

    relationships = []
    current_rel: Optional[dict] = None

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        indent = _count_leading_tabs(line)

        if indent == 0 and stripped.startswith("relationship "):
            # Save previous relationship if any
            if current_rel:
                rel = _build_relationship(current_rel)
                if rel:
                    relationships.append(rel)
            current_rel = {}

        elif indent >= 1 and current_rel is not None:
            if stripped.startswith("fromColumn:"):
                current_rel["from"] = stripped.split(":", 1)[1].strip()
            elif stripped.startswith("toColumn:"):
                current_rel["to"] = stripped.split(":", 1)[1].strip()
            elif stripped.startswith("crossFilteringBehavior:"):
                current_rel["cross_filtering"] = stripped.split(":", 1)[1].strip()
            elif stripped.startswith("isActive:"):
                current_rel["is_active"] = stripped.split(":", 1)[1].strip().lower() != "false"

    # Save the last relationship
    if current_rel:
        rel = _build_relationship(current_rel)
        if rel:
            relationships.append(rel)

    return relationships


def _build_relationship(data: dict) -> Optional[TmdlRelationship]:
    """Build a TmdlRelationship from parsed data."""
    from_ref = data.get("from", "")
    to_ref = data.get("to", "")

    # Parse "Table.Column" or "'Table Name'.Column" format
    from_table, from_col = _parse_table_column_ref(from_ref)
    to_table, to_col = _parse_table_column_ref(to_ref)

    if not from_table or not to_table:
        return None

    return TmdlRelationship(
        from_table=from_table,
        from_column=from_col,
        to_table=to_table,
        to_column=to_col,
        cross_filtering=data.get("cross_filtering", "oneDirection"),
        is_active=data.get("is_active", True),
    )


def _parse_table_column_ref(ref: str) -> tuple[str, str]:
    """Parse a 'Table.Column' or \"'Table Name'.Column\" reference.

    Handles:
        Sales.ProductID -> ("Sales", "ProductID")
        'Sales Order'.SalesOrderLineKey -> ("Sales Order", "SalesOrderLineKey")
        'Sales Territory'.SalesTerritoryKey -> ("Sales Territory", "SalesTerritoryKey")
    """
    ref = ref.strip()
    if not ref:
        return ("", "")

    if ref.startswith("'"):
        # Quoted table name: find closing quote
        end_quote = ref.find("'", 1)
        if end_quote == -1:
            return ("", "")
        table = ref[1:end_quote]
        # After the closing quote, expect ".<column>"
        rest = ref[end_quote + 1:]
        if rest.startswith("."):
            column = _strip_quotes(rest[1:])
        else:
            column = ""
        return (table, column)
    else:
        # Unquoted: split on first dot
        parts = ref.split(".", 1)
        if len(parts) == 2:
            return (parts[0].strip(), _strip_quotes(parts[1].strip()))
        return (ref, "")


def _parse_model_file(file_path: Path) -> str:
    """Parse model.tmdl to extract the culture."""
    try:
        content = file_path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return "en-US"

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("culture:"):
            return stripped.split(":", 1)[1].strip()

    return "en-US"


def _is_auto_generated_table(table_name: str) -> bool:
    """Check if a table is auto-generated by Power BI and should be skipped."""
    return (
        table_name.startswith("DateTableTemplate_")
        or table_name.startswith("LocalDateTable_")
    )


def parse_tmdl_directory(definition_path: str) -> TmdlModel:
    """Parse a complete TMDL model from a .SemanticModel/definition/ directory.

    Args:
        definition_path: Path to the 'definition' directory within a .SemanticModel folder.
                        e.g., "models/adventure-works/sales-sample.SemanticModel/definition"

    Returns:
        TmdlModel with all parsed tables, relationships, and metadata.

    Raises:
        FileNotFoundError: If the definition path doesn't exist.
        ValueError: If no valid tables are found.
    """
    def_path = Path(definition_path)

    if not def_path.exists():
        raise FileNotFoundError(f"TMDL definition directory not found: {def_path}")

    if not def_path.is_dir():
        raise ValueError(f"Path is not a directory: {def_path}")

    model = TmdlModel()

    # Parse model metadata
    model_file = def_path / "model.tmdl"
    if model_file.exists():
        model.culture = _parse_model_file(model_file)

    # Parse all table files
    tables_dir = def_path / "tables"
    if tables_dir.exists() and tables_dir.is_dir():
        for tmdl_file in sorted(tables_dir.glob("*.tmdl")):
            table = _parse_table_file(tmdl_file)
            if table and not _is_auto_generated_table(table.name):
                model.tables.append(table)

    # Parse relationships
    rel_file = def_path / "relationships.tmdl"
    if rel_file.exists():
        model.relationships = _parse_relationships_file(rel_file)

    # Filter out relationships that reference auto-generated tables
    auto_tables = set()
    for tmdl_file in (tables_dir.glob("*.tmdl") if tables_dir.exists() else []):
        table = _parse_table_file(tmdl_file)
        if table and _is_auto_generated_table(table.name):
            auto_tables.add(table.name)

    model.relationships = [
        r for r in model.relationships
        if r.from_table not in auto_tables and r.to_table not in auto_tables
    ]

    return model
