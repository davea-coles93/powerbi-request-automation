"""Service to export the recommended star schema as TMDL files."""

import uuid
from collections import defaultdict
from sqlalchemy.orm import Session

from app.db.repositories import (
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    EntityRelationshipRepository,
)


def _to_pascal_case(s: str) -> str:
    """Convert a string to PascalCase (split on spaces, underscores, hyphens)."""
    import re
    return "".join(
        w.capitalize() for w in re.split(r"[\s_\-]+", s) if w
    )


def _tmdl_data_type(attr_data_type: str | None) -> str:
    """Map ontology attribute data types to TMDL data types."""
    mapping = {
        "string": "string",
        "number": "int64",
        "decimal": "decimal",
        "date": "dateTime",
        "datetime": "dateTime",
        "boolean": "boolean",
        "int": "int64",
        "double": "double",
    }
    return mapping.get((attr_data_type or "string").lower(), "string")


def _new_tag() -> str:
    return str(uuid.uuid4())


# ── TMDL text generators ────────────────────────────────────────────────


def _generate_definition_tmdl() -> str:
    return (
        "model Model\n"
        "\tculture: en-US\n"
        "\tdefaultPowerBIDataSourceVersion: powerBI_V3\n"
    )


def _generate_table_tmdl(
    table_name: str,
    columns: list[dict],
    measures: list[dict],
    description: str | None = None,
) -> str:
    """Generate a TMDL file for a single table.

    columns: list of {name, data_type, is_key, is_hidden, description}
    measures: list of {name, formula, format_string, description}
    """
    lines = [f"table {table_name}"]
    lines.append(f"\tlineageTag: {_new_tag()}")
    if description:
        lines.append(f"\tannotation Description = \"{description}\"")
    lines.append("")

    for col in columns:
        lines.append(f"\tcolumn {col['name']}")
        lines.append(f"\t\tdataType: {col['data_type']}")
        if col.get("is_key"):
            lines.append("\t\tisKey")
        if col.get("is_hidden"):
            lines.append("\t\tisHidden")
        lines.append("\t\tsummarizeBy: none")
        lines.append(f"\t\tlineageTag: {_new_tag()}")
        if col.get("description"):
            # Escape quotes in description
            desc = col["description"].replace('"', '\\"')
            lines.append(f"\t\tannotation Description = \"{desc}\"")
        lines.append("")

    for m in measures:
        name_str = f"'{m['name']}'" if " " in m["name"] else m["name"]
        formula = m.get("formula") or f"0 /* TODO: {m['name']} */"
        lines.append(f"\tmeasure {name_str}")
        lines.append(f"\t\t= {formula}")
        if m.get("format_string"):
            lines.append(f"\t\tformatString: {m['format_string']}")
        lines.append(f"\t\tlineageTag: {_new_tag()}")
        if m.get("description"):
            desc = m["description"].replace('"', '\\"')
            lines.append(f"\t\tannotation Description = \"{desc}\"")
        lines.append("")

    return "\n".join(lines)


def _generate_relationships_tmdl(relationships: list[dict]) -> str:
    """Generate a relationships.tmdl file.

    relationships: list of {from_table, from_column, to_table, to_column}
    """
    if not relationships:
        return ""

    lines = []
    for rel in relationships:
        lines.append(f"relationship {_new_tag()}")
        lines.append(f"\tfromColumn: {rel['from_table']}.{rel['from_column']}")
        lines.append(f"\ttoColumn: {rel['to_table']}.{rel['to_column']}")
        lines.append("")

    return "\n".join(lines)


# ── Main export function ─────────────────────────────────────────────────


def generate_tmdl_export(db: Session) -> dict[str, str]:
    """Generate TMDL files from the ontology, reproducing the recommended
    star schema logic from the frontend useRecommendedSchema hook.

    Returns dict mapping file paths to file contents.
    """
    # Fetch all data
    entity_repo = EntityRepository(db)
    attr_repo = AttributeRepository(db)
    measure_repo = MeasureRepository(db)
    metric_repo = MetricRepository(db)
    rel_repo = EntityRelationshipRepository(db)

    entities = entity_repo.get_all()
    attributes = attr_repo.get_all()
    measures = measure_repo.get_all()
    metrics = metric_repo.get_all()
    entity_relationships = rel_repo.get_all()

    if not entities:
        return {"definition.tmdl": _generate_definition_tmdl()}

    # Build lookups
    entity_map = {e.id: e for e in entities}

    # Group attributes by entity
    attrs_by_entity: dict[str, list] = defaultdict(list)
    for attr in attributes:
        if attr.entity_id:
            attrs_by_entity[attr.entity_id].append(attr)

    # attribute -> entity lookup
    attr_to_entity: dict[str, str] = {}
    for attr in attributes:
        if attr.entity_id:
            attr_to_entity[attr.id] = attr.entity_id

    # metric -> measure lookup (measure_id -> list of metric_ids)
    measure_to_metrics: dict[str, list[str]] = defaultdict(list)
    for metric in metrics:
        for mid in metric.calculated_by_measure_ids:
            measure_to_metrics[mid].append(metric.id)

    # ── Step 1: Build Dimension tables (one per entity) ──────────────

    files: dict[str, str] = {}
    dim_table_names: dict[str, str] = {}  # entity_id -> table name
    dim_pk_names: dict[str, str] = {}  # entity_id -> PK column name

    for entity in entities:
        table_name = f"Dim_{_to_pascal_case(entity.name)}"
        pk_name = f"{_to_pascal_case(entity.name)}Key"
        dim_table_names[entity.id] = table_name
        dim_pk_names[entity.id] = pk_name

    # Pre-compute FK columns needed on each dimension for dim-to-dim relationships
    # Key: from_entity_id -> list of FK column dicts to add
    dim_fk_columns: dict[str, list[dict]] = defaultdict(list)
    for rel in entity_relationships:
        if not rel.is_active:
            continue
        from_eid = rel.from_entity_id
        to_eid = rel.to_entity_id
        if from_eid in dim_table_names and to_eid in dim_table_names:
            to_entity = entity_map.get(to_eid)
            to_name = _to_pascal_case(to_entity.name) if to_entity else to_eid
            fk_col_name = f"{to_name}Key"
            dim_fk_columns[from_eid].append({
                "name": fk_col_name,
                "data_type": "int64",
                "is_key": False,
                "is_hidden": True,
                "description": f"Foreign key to Dim_{to_name}",
            })

    for entity in entities:
        table_name = dim_table_names[entity.id]
        pk_name = dim_pk_names[entity.id]

        entity_attrs = attrs_by_entity.get(entity.id, [])

        columns = [
            {
                "name": pk_name,
                "data_type": "int64",
                "is_key": True,
                "is_hidden": True,
                "description": f"Surrogate key for {entity.name}",
            }
        ]

        # Add FK columns for dim-to-dim relationships
        columns.extend(dim_fk_columns.get(entity.id, []))

        for attr in entity_attrs:
            columns.append({
                "name": _to_pascal_case(attr.name),
                "data_type": _tmdl_data_type(getattr(attr, "data_type", None)),
                "is_key": False,
                "is_hidden": False,
                "description": attr.description,
            })

        files[f"tables/{table_name}.tmdl"] = _generate_table_tmdl(
            table_name=table_name,
            columns=columns,
            measures=[],
            description=entity.description,
        )

    # ── Step 2: Build Fact tables from measures ──────────────────────

    # Group measures by their entity combination
    fact_groups: dict[str, dict] = {}
    for measure in measures:
        entity_ids = sorted(set(
            attr_to_entity[aid]
            for aid in measure.input_attribute_ids
            if aid in attr_to_entity
        ))
        if not entity_ids:
            continue  # orphaned - handled later

        key = "|".join(entity_ids)
        if key not in fact_groups:
            fact_groups[key] = {"entity_ids": entity_ids, "measures": []}
        fact_groups[key]["measures"].append(measure)

    fact_table_names: dict[int, str] = {}  # fact_idx -> table name
    fact_relationships: list[dict] = []
    fact_idx = 0

    for key, group in fact_groups.items():
        fact_idx += 1
        entity_names = [
            _to_pascal_case(entity_map[eid].name) if eid in entity_map else eid
            for eid in group["entity_ids"]
        ]

        if len(entity_names) <= 2:
            fact_name = f"Fact_{''.join(entity_names)}"
        else:
            fact_name = f"Fact_{entity_names[0]}Mix"

        fact_table_names[fact_idx] = fact_name

        # FK columns
        columns = []
        for eid in group["entity_ids"]:
            entity = entity_map.get(eid)
            name = _to_pascal_case(entity.name) if entity else eid
            fk_col_name = f"{name}Key"
            columns.append({
                "name": fk_col_name,
                "data_type": "int64",
                "is_key": False,
                "is_hidden": True,
                "description": f"Foreign key to Dim_{name}",
            })

            # Relationship from this fact table FK to the dimension PK
            if eid in dim_table_names:
                fact_relationships.append({
                    "from_table": fact_name,
                    "from_column": fk_col_name,
                    "to_table": dim_table_names[eid],
                    "to_column": dim_pk_names[eid],
                })

        # DAX measures
        dax_measures = []
        for m in group["measures"]:
            dax_measures.append({
                "name": m.name,
                "formula": m.formula if m.formula else None,
                "format_string": None,
                "description": m.description,
            })

        files[f"tables/{fact_name}.tmdl"] = _generate_table_tmdl(
            table_name=fact_name,
            columns=columns,
            measures=dax_measures,
        )

    # ── Step 3: Orphaned measures → Fact_General ─────────────────────

    mapped_measure_ids = set()
    for group in fact_groups.values():
        for m in group["measures"]:
            mapped_measure_ids.add(m.id)

    orphaned_measures = [m for m in measures if m.id not in mapped_measure_ids]

    if orphaned_measures:
        fact_name = "Fact_General"
        dax_measures = []
        for m in orphaned_measures:
            dax_measures.append({
                "name": m.name,
                "formula": m.formula if m.formula else None,
                "format_string": None,
                "description": m.description,
            })

        files[f"tables/{fact_name}.tmdl"] = _generate_table_tmdl(
            table_name=fact_name,
            columns=[],
            measures=dax_measures,
        )

    # ── Step 4: Entity relationships (dimension-to-dimension) ────────

    dim_to_dim_relationships: list[dict] = []
    for rel in entity_relationships:
        if not rel.is_active:
            continue
        from_eid = rel.from_entity_id
        to_eid = rel.to_entity_id
        if from_eid in dim_table_names and to_eid in dim_table_names:
            from_table = dim_table_names[from_eid]
            to_table = dim_table_names[to_eid]
            to_entity = entity_map.get(to_eid)
            to_name = _to_pascal_case(to_entity.name) if to_entity else to_eid
            # FK column on the "from" dimension named after the target entity
            fk_col_name = f"{to_name}Key"
            # PK column on the "to" dimension
            pk_col_name = dim_pk_names[to_eid]
            dim_to_dim_relationships.append({
                "from_table": from_table,
                "from_column": fk_col_name,
                "to_table": to_table,
                "to_column": pk_col_name,
            })

    all_relationships = fact_relationships + dim_to_dim_relationships

    # ── Generate definition.tmdl and relationships.tmdl ──────────────

    files["definition.tmdl"] = _generate_definition_tmdl()

    if all_relationships:
        files["relationships.tmdl"] = _generate_relationships_tmdl(all_relationships)

    return files
