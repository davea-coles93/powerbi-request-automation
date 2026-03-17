"""Service to export the ontology as a Microsoft Fabric IQ Ontology definition.

Generates the folder structure:
    .platform
    definition.json
    EntityTypes/{id}/definition.json
    RelationshipTypes/{id}/definition.json

Fabric Ontology uses 64-bit integer IDs. We generate deterministic IDs from
our UUID strings via hashing so the same ontology always produces the same
Fabric export.

Data bindings are NOT generated here because they require Fabric workspace
and lakehouse IDs that the user must supply separately.
"""

import hashlib
import json
import re
from collections import defaultdict
from sqlalchemy.orm import Session

from app.db.repositories import (
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    EntityRelationshipRepository,
    PerspectiveRepository,
    SystemRepository,
)


def _stable_bigint(uuid_str: str) -> str:
    """Convert a UUID/string ID to a positive 64-bit integer string.

    Uses SHA-256 truncated to 63 bits (keeping it positive) for determinism.
    """
    h = hashlib.sha256(uuid_str.encode()).digest()
    val = int.from_bytes(h[:8], "big") & 0x7FFFFFFFFFFFFFFF  # 63-bit positive
    return str(val)


def _sanitize_name(name: str) -> str:
    """Sanitize a name to match Fabric's ^[a-zA-Z][a-zA-Z0-9_-]{0,127}$ rule.

    Replaces spaces with underscores, strips invalid chars, ensures starts with letter.
    """
    # Replace spaces with underscores
    s = name.replace(" ", "_")
    # Remove any chars that aren't alphanumeric, underscore, or hyphen
    s = re.sub(r"[^a-zA-Z0-9_-]", "", s)
    # Ensure starts with a letter
    if not s or not s[0].isalpha():
        s = "E_" + s
    # Truncate to 128 chars
    return s[:128]


def _fabric_value_type(data_type: str | None) -> str:
    """Map ontology data types to Fabric property value types."""
    mapping = {
        "string": "String",
        "number": "Int64",
        "decimal": "Decimal",
        "date": "DateTime",
        "datetime": "DateTime",
        "boolean": "Boolean",
        "int": "BigInt",
        "double": "Double",
    }
    return mapping.get((data_type or "string").lower(), "String")


def _build_entity_type(
    entity,
    entity_attrs: list,
    measures_for_entity: list,
    perspectives: dict,
) -> dict:
    """Build a Fabric EntityType definition from an ontology entity."""
    entity_id = _stable_bigint(entity.id)
    properties = []

    # Property counter for stable IDs within this entity
    prop_seed = f"{entity.id}:DisplayName"
    display_name_prop_id = _stable_bigint(prop_seed)

    # Display name property (always first)
    properties.append({
        "id": display_name_prop_id,
        "name": "DisplayName",
        "redefines": None,
        "baseTypeNamespaceType": None,
        "valueType": "String",
    })

    # Core attributes from entity definition
    for core_attr in entity.core_attributes:
        prop_id = _stable_bigint(f"{entity.id}:core:{core_attr.name}")
        properties.append({
            "id": prop_id,
            "name": _sanitize_name(core_attr.name),
            "redefines": None,
            "baseTypeNamespaceType": None,
            "valueType": _fabric_value_type(core_attr.data_type),
        })

    # Ontology attributes (from attribute library) as properties
    for attr in entity_attrs:
        prop_id = _stable_bigint(f"attr:{attr.id}")
        prop_name = _sanitize_name(attr.name)
        properties.append({
            "id": prop_id,
            "name": prop_name,
            "redefines": None,
            "baseTypeNamespaceType": None,
            "valueType": _fabric_value_type(getattr(attr, "data_type", None)),
        })

    # Perspective-specific derived attributes from entity lenses
    for lens in entity.lenses:
        perspective_name = perspectives.get(lens.perspective_id, lens.perspective_id)
        for da in lens.derived_attributes:
            prop_id = _stable_bigint(f"{entity.id}:lens:{lens.perspective_id}:{da.name}")
            prop_name = _sanitize_name(f"{perspective_name}_{da.name}")
            properties.append({
                "id": prop_id,
                "name": prop_name,
                "redefines": None,
                "baseTypeNamespaceType": None,
                "valueType": _fabric_value_type(da.data_type),
            })

    return {
        "id": entity_id,
        "namespace": "usertypes",
        "baseEntityTypeId": None,
        "name": _sanitize_name(entity.name),
        "entityIdParts": [display_name_prop_id],
        "displayNamePropertyId": display_name_prop_id,
        "namespaceType": "Custom",
        "visibility": "Visible",
        "properties": properties,
        "timeseriesProperties": [],
    }


def _build_relationship_type(rel, entity_id_map: dict[str, str]) -> dict | None:
    """Build a Fabric RelationshipType from an ontology entity relationship."""
    if not rel.is_active:
        return None
    from_fabric_id = entity_id_map.get(rel.from_entity_id)
    to_fabric_id = entity_id_map.get(rel.to_entity_id)
    if not from_fabric_id or not to_fabric_id:
        return None
    # Fabric requires source and target to be distinct
    if from_fabric_id == to_fabric_id:
        return None

    return {
        "id": _stable_bigint(f"rel:{rel.id}"),
        "namespace": "usertypes",
        "name": _sanitize_name(rel.name),
        "namespaceType": "Custom",
        "source": {"entityTypeId": from_fabric_id},
        "target": {"entityTypeId": to_fabric_id},
    }


def _build_metadata_document(
    entity,
    entity_attrs: list,
    measures_for_entity: list,
    metrics_for_entity: list,
    perspectives: dict,
    systems: dict,
) -> dict:
    """Build a supplementary document capturing ontology-specific metadata
    that Fabric's entity type schema cannot represent directly.

    This includes measures, metrics, perspective interpretations, and
    source system lineage.
    """
    doc: dict = {}

    # Perspective interpretations
    if entity.lenses:
        doc["perspectives"] = []
        for lens in entity.lenses:
            doc["perspectives"].append({
                "perspective": perspectives.get(lens.perspective_id, lens.perspective_id),
                "interpretation": lens.interpretation,
            })

    # Source system info per attribute
    if entity_attrs:
        doc["source_lineage"] = []
        for attr in entity_attrs:
            lineage: dict = {"attribute": attr.name}
            system_name = systems.get(attr.system_id)
            if system_name:
                lineage["system"] = system_name
            if attr.source_table:
                lineage["source_table"] = attr.source_table
            if attr.source_column:
                lineage["source_column"] = attr.source_column
            if attr.reliability:
                lineage["reliability"] = attr.reliability
            if attr.volatility:
                lineage["volatility"] = attr.volatility
            doc["source_lineage"].append(lineage)

    # Measures derived from this entity's attributes
    if measures_for_entity:
        doc["measures"] = []
        for m in measures_for_entity:
            measure_info: dict = {"name": m.name}
            if m.description:
                measure_info["description"] = m.description
            if m.formula:
                measure_info["formula"] = m.formula
            if m.logic:
                measure_info["logic"] = m.logic
            doc["measures"].append(measure_info)

    # Metrics reachable from this entity
    if metrics_for_entity:
        doc["metrics"] = []
        for mt in metrics_for_entity:
            metric_info: dict = {"name": mt.name}
            if mt.description:
                metric_info["description"] = mt.description
            if mt.business_question:
                metric_info["business_question"] = mt.business_question
            doc["metrics"].append(metric_info)

    return doc


# ── Main export function ─────────────────────────────────────────────────


def generate_fabric_ontology_export(db: Session, ontology_name: str = "BusinessOntology") -> dict[str, str]:
    """Generate a Fabric IQ Ontology definition from the ontology.

    Returns dict mapping file paths to JSON string contents, ready to be
    zipped or uploaded to Fabric.
    """
    # Fetch all data
    entity_repo = EntityRepository(db)
    attr_repo = AttributeRepository(db)
    measure_repo = MeasureRepository(db)
    metric_repo = MetricRepository(db)
    rel_repo = EntityRelationshipRepository(db)
    perspective_repo = PerspectiveRepository(db)
    system_repo = SystemRepository(db)

    entities = entity_repo.get_all()
    attributes = attr_repo.get_all()
    measures = measure_repo.get_all()
    metrics = metric_repo.get_all()
    entity_relationships = rel_repo.get_all()
    all_perspectives = perspective_repo.get_all()
    all_systems = system_repo.get_all()

    if not entities:
        return {}

    # Build lookups
    perspective_names = {p.id: p.name for p in all_perspectives}
    system_names = {s.id: s.name for s in all_systems}

    attrs_by_entity: dict[str, list] = defaultdict(list)
    for attr in attributes:
        if attr.entity_id:
            attrs_by_entity[attr.entity_id].append(attr)

    # attribute -> entity lookup
    attr_to_entity: dict[str, str] = {}
    for attr in attributes:
        if attr.entity_id:
            attr_to_entity[attr.id] = attr.entity_id

    # measures that touch each entity (via input_attribute_ids)
    measures_by_entity: dict[str, list] = defaultdict(list)
    for m in measures:
        touched_entities = set()
        for aid in m.input_attribute_ids:
            eid = attr_to_entity.get(aid)
            if eid:
                touched_entities.add(eid)
        for eid in touched_entities:
            measures_by_entity[eid].append(m)

    # metrics reachable per entity (metric -> measures -> attributes -> entity)
    measure_ids_by_entity: dict[str, set] = defaultdict(set)
    for eid, ms in measures_by_entity.items():
        for m in ms:
            measure_ids_by_entity[eid].add(m.id)

    metrics_by_entity: dict[str, list] = defaultdict(list)
    for mt in metrics:
        for mid in mt.calculated_by_measure_ids:
            for eid, mids in measure_ids_by_entity.items():
                if mid in mids:
                    metrics_by_entity[eid].append(mt)
                    break

    # ── Generate files ───────────────────────────────────────────────

    files: dict[str, str] = {}

    # .platform
    files[".platform"] = json.dumps({
        "metadata": {
            "type": "Ontology",
            "displayName": _sanitize_name(ontology_name),
        }
    }, indent=2)

    # Root definition.json (always empty)
    files["definition.json"] = "{}"

    # Entity type ID mapping for relationship generation
    entity_id_map: dict[str, str] = {}  # our entity.id -> Fabric BigInt ID

    for entity in entities:
        entity_attrs = attrs_by_entity.get(entity.id, [])
        entity_measures = measures_by_entity.get(entity.id, [])
        entity_metrics = metrics_by_entity.get(entity.id, [])

        entity_type = _build_entity_type(
            entity, entity_attrs, entity_measures, perspective_names
        )
        fabric_id = entity_type["id"]
        entity_id_map[entity.id] = fabric_id

        # EntityTypes/{id}/definition.json
        files[f"EntityTypes/{fabric_id}/definition.json"] = json.dumps(
            entity_type, indent=2
        )

        # Supplementary metadata document
        metadata_doc = _build_metadata_document(
            entity, entity_attrs, entity_measures, entity_metrics,
            perspective_names, system_names,
        )
        if metadata_doc:
            files[f"EntityTypes/{fabric_id}/Documents/document1.json"] = json.dumps(
                {
                    "displayText": f"{entity.name} - Ontology Metadata",
                    "url": f"ontology://entities/{entity.id}",
                    "metadata": metadata_doc,
                },
                indent=2,
            )

    # Relationship types
    for rel in entity_relationships:
        rel_type = _build_relationship_type(rel, entity_id_map)
        if rel_type:
            files[f"RelationshipTypes/{rel_type['id']}/definition.json"] = json.dumps(
                rel_type, indent=2
            )

    return files
