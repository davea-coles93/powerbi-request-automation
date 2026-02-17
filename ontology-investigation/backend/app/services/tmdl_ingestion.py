"""Maps a parsed TMDL model to ontology seed data format.

Converts TmdlModel (tables, columns, measures, relationships) into the JSON
structure expected by scenarios.py's seed_from_data() function. This enables
auto-generating a business ontology from an existing Power BI semantic model.

Mapping rules:
- Each TMDL table -> one Entity
- Each column -> one Attribute (linked to its entity and the model system)
- Each TMDL measure -> one Measure (with DAX-parsed input attribute references)
- Terminal measures (not used by other measures) -> one Metric each
"""
import re
from typing import Optional
from .tmdl_parser import TmdlModel, TmdlTable, TmdlMeasure, TmdlColumn


def slugify(name: str) -> str:
    """Convert a name to a URL/ID-safe slug."""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def _infer_volatility(column: TmdlColumn) -> str:
    """Infer attribute volatility from column data type and summarization."""
    dtype = column.data_type.lower()
    summarize = (column.summarize_by or "").lower()

    if dtype in ("dateTime", "datetime"):
        return "Point-in-time"
    if dtype in ("int64", "double", "decimal") and summarize == "sum":
        return "Accumulating"
    return "Point-in-time"


def _infer_perspective_from_format(format_string: Optional[str]) -> list[str]:
    """Infer perspective IDs from a measure's format string.

    - Currency formats ($, currency) -> financial
    - Percentage formats (%) -> management
    - Count/number formats -> operational
    """
    if not format_string:
        return ["operational"]

    fmt = format_string.lower()

    if "$" in fmt or "currency" in fmt:
        return ["financial"]
    if "%" in fmt:
        return ["management"]
    if "#,0" in fmt or "0.0" in fmt:
        return ["operational"]

    return ["operational"]


def _parse_dax_column_refs(expression: str) -> list[tuple[str, str]]:
    """Extract Table[Column] references from a DAX expression.

    Handles:
        Sales[Amount] -> ("Sales", "Amount")
        'Analysis DAX'[Net Sales] -> ("Analysis DAX", "Net Sales")
        Table[Column Name] -> ("Table", "Column Name")

    Returns list of (table_name, column_name) tuples.
    """
    refs = []

    # Pattern 1: Quoted table names: 'Table Name'[Column]
    pattern_quoted = r"'([^']+)'\[([^\]]+)\]"
    for match in re.finditer(pattern_quoted, expression):
        refs.append((match.group(1), match.group(2)))

    # Pattern 2: Unquoted table names: Table[Column]
    pattern_unquoted = r"(?<!')(\w[\w\s]*)(?<!')\[([^\]]+)\]"
    for match in re.finditer(pattern_unquoted, expression):
        table_name = match.group(1).strip()
        col_name = match.group(2).strip()
        # Avoid duplicates with quoted matches
        if not any(t == table_name and c == col_name for t, c in refs):
            refs.append((table_name, col_name))

    return refs


def _parse_dax_measure_refs(expression: str) -> list[str]:
    """Extract measure references from a DAX expression.

    Measures are referenced as [Measure Name] (without a table prefix).
    We need to distinguish these from column refs (Table[Column]).

    Returns list of measure names.
    """
    measure_refs = []

    # Find all [Name] that are NOT preceded by a table reference
    # Pattern: standalone [MeasureName] not preceded by a word or quote+]
    # We look for [ that is preceded by a non-word, non-quote character or start of expression
    pattern = r'(?<![.\w\]\'"])\[([^\]]+)\]'
    for match in re.finditer(pattern, expression):
        measure_refs.append(match.group(1))

    return measure_refs


def _is_hidden_or_key_column(column: TmdlColumn) -> bool:
    """Check if a column should be skipped (hidden keys, auto-generated)."""
    if column.is_hidden:
        return True
    name_lower = column.name.lower()
    # Skip common auto-generated key columns
    if name_lower.endswith("key") and column.summarize_by == "none":
        return True
    return False


def _generate_business_question(measure_name: str) -> str:
    """Auto-generate a business question from a measure name."""
    name = measure_name.strip()

    # Clean up common patterns
    if name.lower().startswith("total "):
        return f"What is the {name.lower()}?"
    if "%" in name or "variance" in name.lower():
        return f"What is the {name.lower()}?"
    if "rate" in name.lower():
        return f"What is the {name.lower()}?"
    if name.lower().startswith("net "):
        return f"What are the {name.lower()}?"

    return f"What is the {name}?"


def tmdl_to_ontology(model: TmdlModel, model_name: str = "Power BI Model") -> dict:
    """Convert a parsed TMDL model into ontology seed data.

    Args:
        model: Parsed TmdlModel from the TMDL parser.
        model_name: Human-readable name for the model (used for system name).

    Returns:
        Dictionary matching the ontology seed data JSON format,
        ready to be passed to seed_from_data().
    """
    system_id = slugify(model_name)

    # 1. System: one system representing the Power BI model
    systems = [{
        "id": system_id,
        "name": model_name,
        "type": "BI",
        "vendor": "Microsoft Power BI",
        "reliability_default": "High",
        "integration_status": "Connected",
        "notes": f"Auto-imported from TMDL semantic model"
    }]

    # 2. Perspectives: default three perspectives
    perspectives = [
        {
            "id": "operational",
            "name": "Operational",
            "purpose": "Execute and record business activities",
            "primary_concern": "What work is being done? What happened?",
            "typical_actors": ["Data Entry", "Operations Staff"],
            "consumes_from": [],
            "feeds": ["management", "financial"]
        },
        {
            "id": "management",
            "name": "Management",
            "purpose": "Monitor performance against targets and plans",
            "primary_concern": "How are we performing? Are we on track?",
            "typical_actors": ["Managers", "Team Leads"],
            "consumes_from": ["operational"],
            "feeds": ["financial"]
        },
        {
            "id": "financial",
            "name": "Financial",
            "purpose": "Understand business value and financial position",
            "primary_concern": "What is the financial position?",
            "typical_actors": ["Accountants", "Finance Managers", "CFO"],
            "consumes_from": ["operational", "management"],
            "feeds": []
        }
    ]

    # 3. Entities: each table -> one entity
    entities = []
    for table in model.tables:
        entity_id = slugify(table.name)
        entities.append({
            "id": entity_id,
            "name": table.name,
            "description": f"Data entity from Power BI table '{table.name}'",
            "core_attributes": [
                {
                    "name": col.name,
                    "data_type": _map_tmdl_type_to_ontology(col.data_type),
                    "description": col.description or f"Column from {table.name}"
                }
                for col in table.columns
                if not _is_hidden_or_key_column(col)
            ],
            "lenses": []
        })

    # 4. Attributes: each non-hidden column -> one attribute
    attributes = []
    # Build a lookup: (table_name, column_name) -> attribute_id
    attr_id_lookup: dict[tuple[str, str], str] = {}

    for table in model.tables:
        entity_id = slugify(table.name)
        for col in table.columns:
            if _is_hidden_or_key_column(col):
                continue

            attr_id = slugify(f"{table.name}_{col.name}")
            attr_id_lookup[(table.name, col.name)] = attr_id
            # Also map by source_column for DAX references
            if col.source_column and col.source_column != col.name:
                attr_id_lookup[(table.name, col.source_column)] = attr_id

            attributes.append({
                "id": attr_id,
                "name": col.name,
                "description": col.description or f"Column '{col.name}' from table '{table.name}'",
                "entity_id": entity_id,
                "system_id": system_id,
                "source_table": table.name,
                "source_column": col.source_column or col.name,
                "volatility": _infer_volatility(col),
                "reliability": "High",
            })

    # 5. Measures: each TMDL measure -> one ontology measure
    measures = []
    # Build a lookup: measure_name -> measure_id
    measure_id_lookup: dict[str, str] = {}
    # Track which measures reference other measures (for terminal measure detection)
    measure_references: dict[str, list[str]] = {}  # measure_id -> list of referenced measure names
    all_measure_names: set[str] = set()

    for table in model.tables:
        for meas in table.measures:
            all_measure_names.add(meas.name)

    for table in model.tables:
        for meas in table.measures:
            measure_id = slugify(meas.name)
            measure_id_lookup[meas.name] = measure_id

            # Parse DAX to find column references -> input_attribute_ids
            col_refs = _parse_dax_column_refs(meas.expression)
            input_attr_ids = []
            for ref_table, ref_col in col_refs:
                attr_id = attr_id_lookup.get((ref_table, ref_col))
                if attr_id and attr_id not in input_attr_ids:
                    input_attr_ids.append(attr_id)

            # Parse DAX to find measure references -> input_measure_ids
            meas_refs = _parse_dax_measure_refs(meas.expression)
            input_measure_ids = []
            referenced_names = []
            for ref_name in meas_refs:
                if ref_name in all_measure_names and ref_name != meas.name:
                    ref_id = slugify(ref_name)
                    if ref_id not in input_measure_ids:
                        input_measure_ids.append(ref_id)
                        referenced_names.append(ref_name)

            measure_references[measure_id] = referenced_names

            perspective_ids = _infer_perspective_from_format(meas.format_string)

            measures.append({
                "id": measure_id,
                "name": meas.name,
                "description": meas.description or f"DAX measure from table '{table.name}'",
                "logic": f"DAX: {meas.expression}",
                "formula": meas.expression,
                "input_attribute_ids": input_attr_ids,
                "input_measure_ids": input_measure_ids,
                "perspective_ids": perspective_ids,
            })

    # 6. Metrics: auto-generate from terminal measures
    # A terminal measure is one not referenced by any other measure
    referenced_measure_names: set[str] = set()
    for ref_list in measure_references.values():
        referenced_measure_names.update(ref_list)

    metrics = []
    for table in model.tables:
        for meas in table.measures:
            if meas.name not in referenced_measure_names:
                measure_id = slugify(meas.name)
                metric_id = f"metric_{measure_id}"
                perspective_ids = _infer_perspective_from_format(meas.format_string)

                metrics.append({
                    "id": metric_id,
                    "name": meas.name,
                    "description": f"Business metric derived from measure '{meas.name}'",
                    "business_question": _generate_business_question(meas.name),
                    "calculated_by_measure_ids": [measure_id],
                    "perspective_ids": perspective_ids,
                })

    return {
        "scenario_name": f"Imported: {model_name}",
        "scenario_description": f"Auto-generated ontology from Power BI model: {model_name}",
        "perspectives": perspectives,
        "systems": systems,
        "entities": entities,
        "attributes": attributes,
        "measures": measures,
        "metrics": metrics,
        "processes": [],
        "semantic_tables": [],
    }


def _map_tmdl_type_to_ontology(data_type: str) -> str:
    """Map TMDL data types to ontology core attribute types."""
    dt = data_type.lower()
    if dt in ("int64", "int32"):
        return "number"
    if dt in ("double", "decimal"):
        return "number"
    if dt == "datetime":
        return "datetime"
    if dt == "boolean":
        return "boolean"
    if dt == "string":
        return "string"
    return "string"
