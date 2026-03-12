"""PowerApp Solution Parser — deterministic extraction of ontology elements.

Pass 1 of the two-pass ingestion architecture. Parses a Power Platform solution
zip file and extracts structured ontology elements:
  - Entities (from Dataverse table definitions in customizations.xml)
  - Attributes (from column definitions within each entity)
  - Processes (from Power Automate workflow JSON files)
  - Measures (from calculated field XAML formulas)
  - Systems (from connection references and environment variables)

All extracted elements are tagged state="as-is" since they represent the
current state of the solution.
"""

import json
import logging
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Optional
from xml.etree import ElementTree as ET

logger = logging.getLogger(__name__)


# ── Dataverse type code → friendly type mapping ──────────────────────────

_DATAVERSE_TYPES = {
    "nvarchar": "string",
    "ntext": "string",
    "varchar": "string",
    "int": "number",
    "bigint": "number",
    "decimal": "number",
    "float": "number",
    "money": "number",
    "bit": "boolean",
    "datetime": "datetime",
    "uniqueidentifier": "string",
    "lookup": "string",
    "picklist": "string",
    "state": "string",
    "status": "string",
    "owner": "string",
    "customer": "string",
    "memo": "string",
}

# Environment variable type codes
_ENV_VAR_TYPES = {
    "100000000": "string",
    "100000001": "number",
    "100000002": "boolean",
    "100000003": "json",
    "100000004": "connection_reference",
}

# Attribute names to skip (Dataverse system fields)
_SYSTEM_ATTRIBUTES = {
    "createdby", "createdon", "createdonbehalfby",
    "modifiedby", "modifiedon", "modifiedonbehalfby",
    "ownerid", "owningbusinessunit", "owningteam", "owninguser",
    "statecode", "statuscode", "versionnumber", "importsequencenumber",
    "overriddencreatedon", "timezoneruleversionnumber", "utcconversiontimezonecode",
    "organizationid",
}


def _strip_prefix(name: str) -> str:
    """Strip Dataverse publisher prefixes (e.g., 'datanomy_', 'cr4de_', 'crb7c_')."""
    return re.sub(r"^[a-z0-9]+_", "", name, count=1)


def _to_display_name(raw: str) -> str:
    """Convert snake_case to Title Case display name."""
    stripped = _strip_prefix(raw)
    return stripped.replace("_", " ").strip().title()


def _slug(name: str) -> str:
    """Generate a clean snake_case ID from a name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9_\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "_", slug)
    slug = re.sub(r"_+", "_", slug)
    return slug.strip("_")


class PowerAppParseResult:
    """Container for all extracted ontology elements from a PowerApp solution."""

    def __init__(self):
        self.solution_name: str = ""
        self.solution_version: str = ""
        self.publisher: str = ""
        self.entities: list[dict] = []
        self.attributes: list[dict] = []
        self.processes: list[dict] = []
        self.measures: list[dict] = []
        self.systems: list[dict] = []
        self.environment_variables: list[dict] = []
        self.warnings: list[str] = []

    def summary(self) -> dict:
        return {
            "solution_name": self.solution_name,
            "solution_version": self.solution_version,
            "publisher": self.publisher,
            "counts": {
                "entities": len(self.entities),
                "attributes": len(self.attributes),
                "processes": len(self.processes),
                "measures": len(self.measures),
                "systems": len(self.systems),
                "environment_variables": len(self.environment_variables),
            },
            "warnings": self.warnings,
        }

    def to_dict(self) -> dict:
        return {
            "solution_name": self.solution_name,
            "solution_version": self.solution_version,
            "publisher": self.publisher,
            "entities": self.entities,
            "attributes": self.attributes,
            "processes": self.processes,
            "measures": self.measures,
            "systems": self.systems,
            "environment_variables": self.environment_variables,
            "warnings": self.warnings,
        }


class PowerAppSolutionParser:
    """Parse a Power Platform solution zip into ontology elements.

    Usage:
        parser = PowerAppSolutionParser()
        result = parser.parse_zip("/path/to/solution.zip")
        # result.entities, result.attributes, etc.
    """

    def parse_zip(self, zip_path: str) -> PowerAppParseResult:
        """Parse a solution zip file and extract all ontology elements."""
        result = PowerAppParseResult()

        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                with zipfile.ZipFile(zip_path, "r") as zf:
                    zf.extractall(tmpdir)
            except (zipfile.BadZipFile, OSError) as e:
                result.warnings.append(f"Failed to extract zip: {e}")
                return result

            root = Path(tmpdir)

            # 1. Solution metadata
            self._parse_solution_xml(root / "solution.xml", result)

            # 2. Entities and attributes from customizations.xml
            self._parse_customizations(root / "customizations.xml", result)

            # 3. Workflows → processes
            self._parse_workflows(root / "Workflows", result)

            # 4. Formulas → measures
            self._parse_formulas(root / "Formulas", result)

            # 5. Environment variables → configuration + systems
            self._parse_environment_variables(root / "environmentvariabledefinitions", result)

            # 6. Infer systems from workflow connection references
            self._infer_systems(result)

        return result

    def parse_bytes(self, data: bytes) -> PowerAppParseResult:
        """Parse solution from in-memory bytes (for upload endpoints)."""
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            return self.parse_zip(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    # ── Solution Metadata ────────────────────────────────────────────

    def _parse_solution_xml(self, path: Path, result: PowerAppParseResult) -> None:
        if not path.exists():
            result.warnings.append("solution.xml not found")
            return

        try:
            tree = ET.parse(path)
            root = tree.getroot()

            manifest = root.find("SolutionManifest")
            if manifest is not None:
                unique_name = manifest.findtext("UniqueName", "")
                version = manifest.findtext("Version", "")

                # Localized name
                loc_name = manifest.find(".//LocalizedNames/LocalizedName")
                display_name = loc_name.get("description", unique_name) if loc_name is not None else unique_name

                result.solution_name = display_name
                result.solution_version = version

                # Publisher
                pub = manifest.find("Publisher")
                if pub is not None:
                    pub_name = pub.find(".//LocalizedNames/LocalizedName")
                    result.publisher = pub_name.get("description", "") if pub_name is not None else ""

        except ET.ParseError as e:
            result.warnings.append(f"Failed to parse solution.xml: {e}")

    # ── Entities & Attributes from customizations.xml ────────────────

    def _parse_customizations(self, path: Path, result: PowerAppParseResult) -> None:
        if not path.exists():
            result.warnings.append("customizations.xml not found")
            return

        try:
            tree = ET.iterparse(str(path), events=("end",))
            current_entity_name = None
            current_entity_display = None

            for event, elem in tree:
                # Match <entity Name="..."> elements
                if elem.tag == "entity" and elem.get("Name"):
                    entity_raw = elem.get("Name", "")

                    # Get display name
                    loc_names = elem.find(".//LocalizedNames/LocalizedName")
                    display_name = loc_names.get("description", "") if loc_names is not None else ""
                    if not display_name:
                        display_name = _to_display_name(entity_raw)

                    entity_id = _slug(display_name or entity_raw)

                    # Skip system/test tables
                    stripped = _strip_prefix(entity_raw).lower()
                    if stripped in ("testtable",) or stripped.startswith("zzdonotuse"):
                        elem.clear()
                        continue

                    entity = {
                        "id": entity_id,
                        "name": display_name,
                        "description": "",
                        "source_table_name": entity_raw,
                        "core_attributes": [],
                        "lenses": [],
                        "state": "as-is",
                    }

                    # Extract description
                    desc_elem = elem.find(".//Descriptions/Description")
                    if desc_elem is not None:
                        entity["description"] = desc_elem.get("description", "")

                    result.entities.append(entity)

                    # Extract attributes
                    attrs_elem = elem.find(".//attributes")
                    if attrs_elem is not None:
                        for attr_elem in attrs_elem.findall("attribute"):
                            self._parse_attribute(attr_elem, entity_id, entity_raw, result)

                    # Free memory for large XML
                    elem.clear()

        except ET.ParseError as e:
            result.warnings.append(f"Failed to parse customizations.xml: {e}")

    def _parse_attribute(
        self, attr_elem: ET.Element, entity_id: str, entity_raw: str,
        result: PowerAppParseResult,
    ) -> None:
        """Parse a single attribute element from customizations.xml."""
        logical_name = attr_elem.findtext("LogicalName", "")
        if not logical_name:
            return

        # Skip system attributes
        stripped_name = _strip_prefix(logical_name)
        if stripped_name.lower() in _SYSTEM_ATTRIBUTES:
            return
        # Skip internal Dataverse fields (no publisher prefix = system field)
        if "_" not in logical_name:
            return
        # Skip the entity's own primary key (usually <prefix>_<entity>id)
        if logical_name.endswith("id") and entity_raw.lower().endswith(
            logical_name.replace("id", "").split("_", 1)[-1] if "_" in logical_name else ""
        ):
            pass  # Allow — some IDs are meaningful

        is_custom = attr_elem.findtext("IsCustomField", "0") == "1"
        if not is_custom:
            return

        # Get display name
        disp_elem = attr_elem.find(".//displaynames/displayname")
        display_name = disp_elem.get("description", "") if disp_elem is not None else ""
        if not display_name:
            display_name = _to_display_name(logical_name)

        # Type mapping
        raw_type = attr_elem.findtext("Type", "nvarchar").lower()
        data_type = _DATAVERSE_TYPES.get(raw_type, "string")

        # Format info
        max_length = attr_elem.findtext("MaxLength", "")
        format_str = attr_elem.findtext("Format", "")

        attr_id = _slug(f"{entity_id}_{display_name}")

        attribute = {
            "id": attr_id,
            "name": display_name,
            "description": "",
            "entity_id": entity_id,
            "system_id": "dataverse",
            "source_table": entity_raw,
            "source_column": logical_name,
            "data_type": data_type,
            "state": "as-is",
        }

        # Add metadata where useful
        if max_length:
            attribute["max_length"] = max_length
        if format_str and format_str != "text":
            attribute["format"] = format_str

        # Description from attribute element
        desc_elem = attr_elem.find(".//Descriptions/Description")
        if desc_elem is not None:
            attribute["description"] = desc_elem.get("description", "")

        result.attributes.append(attribute)

    # ── Workflows → Processes ────────────────────────────────────────

    def _parse_workflows(self, workflows_dir: Path, result: PowerAppParseResult) -> None:
        if not workflows_dir.exists():
            result.warnings.append("Workflows directory not found")
            return

        for wf_dir in sorted(workflows_dir.iterdir()):
            if not wf_dir.is_dir():
                continue

            json_files = list(wf_dir.glob("*.json"))
            if not json_files:
                continue

            for json_file in json_files:
                try:
                    wf_data = json.loads(json_file.read_text(encoding="utf-8"))
                    self._parse_single_workflow(wf_dir.name, wf_data, result)
                except (json.JSONDecodeError, OSError) as e:
                    result.warnings.append(f"Failed to parse workflow {wf_dir.name}: {e}")

    def _parse_single_workflow(
        self, workflow_id: str, wf_data: dict, result: PowerAppParseResult,
    ) -> None:
        """Extract a process skeleton from a Power Automate workflow."""
        props = wf_data.get("properties", {})
        definition = props.get("definition", {})
        triggers = definition.get("triggers", {})
        actions = definition.get("actions", {})
        connections = props.get("connectionReferences", {})

        if not actions:
            return

        # Infer workflow name from the directory name or trigger
        wf_name = _to_display_name(workflow_id)

        # Determine trigger type
        trigger_type = "manual"
        trigger_description = ""
        for trig_name, trig_data in triggers.items():
            trig_type = trig_data.get("type", "")
            trig_kind = trig_data.get("kind", "")
            if trig_type == "OpenApiConnectionWebhook":
                trigger_type = "automated"
                entity_name = (
                    trig_data.get("inputs", {})
                    .get("parameters", {})
                    .get("subscriptionRequest/entityname", "")
                )
                if entity_name:
                    trigger_description = f"Triggered when {entity_name} is modified"
            elif trig_type == "Recurrence":
                trigger_type = "scheduled"
                trigger_description = "Runs on a schedule"
            elif trig_kind == "PowerAppV2":
                trigger_type = "manual"
                trigger_description = "Triggered from PowerApp"
            else:
                trigger_description = f"Trigger: {trig_name}"

        # Extract steps from actions
        steps = []
        sequence = 1
        systems_referenced = set()

        for action_name, action_data in actions.items():
            action_type = action_data.get("type", "")
            host = action_data.get("inputs", {}).get("host", {})
            connection_name = host.get("connectionName", "")
            operation_id = host.get("operationId", "")

            # Track systems
            if connection_name:
                systems_referenced.add(connection_name)

            # Extract entity references
            params = action_data.get("inputs", {}).get("parameters", {})
            entity_name = params.get("entityName", "")

            step = {
                "id": _slug(action_name),
                "sequence": sequence,
                "name": _to_display_name(action_name),
                "description": "",
                "perspective_id": "operational",
                "state": "as-is",
            }

            # Enrich description based on operation
            if operation_id == "CreateRecord" and entity_name:
                step["description"] = f"Create record in {entity_name}"
                step["produces_attribute_ids"] = []
            elif operation_id == "GetItem" and entity_name:
                step["description"] = f"Read record from {entity_name}"
                step["consumes_attribute_ids"] = []
            elif operation_id == "UpdateRecord" and entity_name:
                step["description"] = f"Update record in {entity_name}"
            elif operation_id == "DeleteRecord" and entity_name:
                step["description"] = f"Delete record from {entity_name}"
            elif operation_id in ("SendEmailV2", "SendEmail"):
                step["description"] = "Send email notification"
                step["waste_category"] = "Waiting Time"
                step["perspective_id"] = "operational"
            elif operation_id == "SubscribeWebhookTrigger":
                continue  # This is a trigger, not a step
            elif action_type == "Response":
                step["description"] = "Return response"
            else:
                step["description"] = f"{_to_display_name(operation_id or action_type)}"

            # Dependencies
            run_after = action_data.get("runAfter", {})
            step["depends_on_step_ids"] = [_slug(dep) for dep in run_after.keys()]

            # Systems used
            if connection_name:
                step["systems_used_ids"] = [_slug(connection_name)]

            steps.append(step)
            sequence += 1

        if not steps:
            return

        process = {
            "id": _slug(wf_name),
            "name": wf_name,
            "description": trigger_description,
            "trigger_type": trigger_type,
            "steps": steps,
            "systems_referenced": list(systems_referenced),
            "state": "as-is",
        }
        result.processes.append(process)

    # ── Formulas → Measures ──────────────────────────────────────────

    def _parse_formulas(self, formulas_dir: Path, result: PowerAppParseResult) -> None:
        if not formulas_dir.exists():
            return  # Optional — not all solutions have formulas

        for xaml_file in sorted(formulas_dir.glob("*.xaml")):
            try:
                self._parse_formula_xaml(xaml_file, result)
            except (ET.ParseError, OSError) as e:
                result.warnings.append(f"Failed to parse formula {xaml_file.name}: {e}")

    def _parse_formula_xaml(self, xaml_path: Path, result: PowerAppParseResult) -> None:
        """Extract measure info from a Dataverse calculated field XAML."""
        # Parse entity and field from filename: entity-field.xaml
        filename = xaml_path.stem
        parts = filename.split("-", 1)
        if len(parts) != 2:
            return

        entity_raw, field_raw = parts
        entity_display = _to_display_name(entity_raw)
        field_display = _to_display_name(field_raw)

        # Read XAML to extract value assignments
        content = xaml_path.read_text(encoding="utf-8")

        # Extract assigned values from SetEntityProperty elements
        logic_parts = []
        for match in re.finditer(
            r'Attribute="([^"]+)".*?EntityName="([^"]+)"', content, re.DOTALL
        ):
            attr_name = match.group(1)
            logic_parts.append(f"Sets {_to_display_name(attr_name)}")

        # Extract hardcoded values (e.g., "GBP", formula strings)
        for match in re.finditer(
            r'WorkflowPropertyType\.\w+,\s*"([^"]+)"', content
        ):
            val = match.group(1)
            if val and len(val) < 100:
                logic_parts.append(f'Value: "{val}"')

        measure = {
            "id": _slug(f"{entity_display}_{field_display}"),
            "name": f"{entity_display} - {field_display}",
            "description": f"Calculated field on {entity_display}",
            "logic": "; ".join(logic_parts) if logic_parts else "Calculated field (XAML)",
            "formula": "",
            "source_entity": entity_raw,
            "source_field": field_raw,
            "input_attribute_ids": [],
            "input_measure_ids": [],
            "perspective_ids": [],
            "state": "as-is",
        }
        result.measures.append(measure)

    # ── Environment Variables ────────────────────────────────────────

    def _parse_environment_variables(
        self, env_dir: Path, result: PowerAppParseResult,
    ) -> None:
        if not env_dir.exists():
            return

        for var_dir in sorted(env_dir.iterdir()):
            if not var_dir.is_dir():
                continue

            def_file = var_dir / "environmentvariabledefinition.xml"
            if not def_file.exists():
                continue

            try:
                tree = ET.parse(def_file)
                root = tree.getroot()

                schema_name = root.get("schemaname", var_dir.name)
                display_elem = root.find(".//displayname/label")
                display_name = display_elem.get("description", "") if display_elem is not None else ""
                if not display_name:
                    display_name = _to_display_name(schema_name)

                default_value = root.findtext("defaultvalue", "")
                type_code = root.findtext("type", "100000000")
                var_type = _ENV_VAR_TYPES.get(type_code, "string")

                # Check for runtime value override
                val_file = var_dir / "environmentvariablevalues.json"
                runtime_value = None
                if val_file.exists():
                    try:
                        val_data = json.loads(val_file.read_text(encoding="utf-8"))
                        runtime_value = (
                            val_data.get("environmentvariablevalues", {})
                            .get("environmentvariablevalue", {})
                            .get("value")
                        )
                    except (json.JSONDecodeError, OSError):
                        pass

                env_var = {
                    "id": _slug(schema_name),
                    "schema_name": schema_name,
                    "name": display_name,
                    "type": var_type,
                    "default_value": default_value,
                    "runtime_value": runtime_value,
                }
                result.environment_variables.append(env_var)

            except ET.ParseError as e:
                result.warnings.append(f"Failed to parse env var {var_dir.name}: {e}")

    # ── System Inference ─────────────────────────────────────────────

    def _infer_systems(self, result: PowerAppParseResult) -> None:
        """Infer systems from connection references and environment variables."""
        # Always add Dataverse as a system (it's the backbone)
        result.systems.append({
            "id": "dataverse",
            "name": "Microsoft Dataverse",
            "type": "Other",
            "vendor": "Microsoft",
            "integration_status": "Connected",
            "state": "as-is",
            "notes": "Primary data store for the PowerApp solution",
        })

        # Detect systems from workflow connections
        connection_names = set()
        for process in result.processes:
            for sys_ref in process.get("systems_referenced", []):
                connection_names.add(sys_ref)

        connection_system_map = {
            "shared_commondataserviceforapps": None,  # Already covered by Dataverse
            "shared_office365": {
                "id": "office_365",
                "name": "Office 365",
                "type": "Other",
                "vendor": "Microsoft",
                "integration_status": "Connected",
                "notes": "Email notifications and calendar",
            },
            "shared_sharepointonline": {
                "id": "sharepoint",
                "name": "SharePoint Online",
                "type": "Other",
                "vendor": "Microsoft",
                "integration_status": "Connected",
                "notes": "Document management and file storage",
            },
            "shared_teams": {
                "id": "microsoft_teams",
                "name": "Microsoft Teams",
                "type": "Other",
                "vendor": "Microsoft",
                "integration_status": "Connected",
                "notes": "Team communication and approvals",
            },
            "shared_powerplatformforadmins": {
                "id": "power_platform_admin",
                "name": "Power Platform Admin",
                "type": "Other",
                "vendor": "Microsoft",
                "integration_status": "Connected",
                "notes": "Platform administration and user sync",
            },
        }

        seen_system_ids = {"dataverse"}
        for conn_name in connection_names:
            system_def = connection_system_map.get(conn_name)
            if system_def and system_def["id"] not in seen_system_ids:
                system_def["state"] = "as-is"
                result.systems.append(system_def)
                seen_system_ids.add(system_def["id"])

        # Detect data sources from environment variables (URLs, connections)
        for env_var in result.environment_variables:
            name_lower = env_var["name"].lower()
            value = env_var.get("runtime_value") or env_var.get("default_value", "")

            if "powerbi" in name_lower and "power_bi" not in seen_system_ids:
                result.systems.append({
                    "id": "power_bi",
                    "name": "Power BI",
                    "type": "BI",
                    "vendor": "Microsoft",
                    "integration_status": "Connected",
                    "state": "as-is",
                    "notes": "Business intelligence reporting",
                })
                seen_system_ids.add("power_bi")

            if "sharepoint" in name_lower and "sharepoint" not in seen_system_ids:
                result.systems.append({
                    "id": "sharepoint",
                    "name": "SharePoint Online",
                    "type": "Other",
                    "vendor": "Microsoft",
                    "integration_status": "Connected",
                    "state": "as-is",
                    "notes": "Document management",
                })
                seen_system_ids.add("sharepoint")

            # Detect Excel-based data sources (smell: manual bridge)
            if value and (".xlsx" in value.lower() or ".xls" in value.lower()):
                if "excel_data_source" not in seen_system_ids:
                    result.systems.append({
                        "id": "excel_data_source",
                        "name": "Excel Workbook (Manual Data Source)",
                        "type": "Spreadsheet",
                        "vendor": "Microsoft",
                        "reliability_default": "Low",
                        "integration_status": "Manual Extract",
                        "state": "as-is",
                        "notes": f"Excel file used as data source — likely a manual bridge. Ref: {env_var['name']}",
                    })
                    seen_system_ids.add("excel_data_source")
