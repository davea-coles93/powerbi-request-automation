"""Power BI Live Connection Service — extract model schema from a running dataset.

Uses the Power BI REST API with service principal authentication (MSAL).
Extracts the full semantic model schema using DAX DMV queries:
  - $SYSTEM.TMSCHEMA_TABLES       → entities
  - $SYSTEM.TMSCHEMA_COLUMNS      → attributes
  - $SYSTEM.TMSCHEMA_MEASURES     → measures (with DAX expressions)
  - $SYSTEM.TMSCHEMA_RELATIONSHIPS → entity relationships
  - $SYSTEM.TMSCHEMA_PARTITIONS   → data sources (M query expressions)

The extracted schema is converted to the same ontology element format used by
zip-based ingestion, so the same parse→review→load workflow applies.
"""

import logging
import re
import secrets
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── In-memory credential session store ────────────────────────────────────
# Credentials are stored in memory only — never written to disk.
# Sessions expire after SESSION_TTL_SECONDS of inactivity.

SESSION_TTL_SECONDS = 30 * 60  # 30 minutes

_sessions: dict[str, dict] = {}  # token → {tenant_id, client_id, client_secret, created_at, last_used}


def create_credential_session(
    tenant_id: str, client_id: str, client_secret: str
) -> str:
    """Store credentials in memory and return a session token.

    The token is a cryptographically random string. Credentials are held
    only in the process memory and expire after 30 minutes of inactivity.
    """
    _purge_expired_sessions()
    token = secrets.token_urlsafe(32)
    now = time.time()
    _sessions[token] = {
        "tenant_id": tenant_id,
        "client_id": client_id,
        "client_secret": client_secret,
        "created_at": now,
        "last_used": now,
    }
    logger.info("Power BI credential session created (client_id=%s...)", client_id[:8])
    return token


def get_session_service(token: str) -> "PowerBILiveService":
    """Look up a session by token and return a configured service.

    Raises PowerBIAuthError if the session doesn't exist or has expired.
    """
    _purge_expired_sessions()
    session = _sessions.get(token)
    if not session:
        raise PowerBIAuthError(
            "Power BI session not found or expired. Please connect again."
        )
    session["last_used"] = time.time()
    return PowerBILiveService(
        tenant_id=session["tenant_id"],
        client_id=session["client_id"],
        client_secret=session["client_secret"],
    )


def destroy_session(token: str) -> bool:
    """Explicitly destroy a credential session. Returns True if it existed."""
    removed = _sessions.pop(token, None)
    if removed:
        logger.info("Power BI credential session destroyed")
    return removed is not None


def _purge_expired_sessions() -> None:
    """Remove sessions that haven't been used within the TTL."""
    now = time.time()
    expired = [
        tok for tok, s in _sessions.items()
        if now - s["last_used"] > SESSION_TTL_SECONDS
    ]
    for tok in expired:
        _sessions.pop(tok, None)
    if expired:
        logger.info("Purged %d expired Power BI credential sessions", len(expired))

POWERBI_API_BASE = "https://api.powerbi.com/v1.0/myorg"
POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default"


class PowerBIAuthError(Exception):
    """Raised when authentication with Power BI fails."""


class PowerBIQueryError(Exception):
    """Raised when a Power BI API call fails."""


def _slugify(name: str) -> str:
    """Convert a name to a URL/ID-safe slug."""
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


class PowerBILiveService:
    """Connect to a Power BI dataset and extract its schema as ontology elements."""

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
    ):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: Optional[str] = None

    # ── Authentication ────────────────────────────────────────────────

    def _acquire_token(self) -> str:
        """Acquire an access token using MSAL client credentials flow."""
        try:
            import msal
        except ImportError:
            raise PowerBIAuthError(
                "msal package is not installed. Run: pip install msal"
            )

        app = msal.ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=f"https://login.microsoftonline.com/{self.tenant_id}",
        )

        result = app.acquire_token_for_client(scopes=[POWERBI_SCOPE])

        if "access_token" not in result:
            error = result.get("error", "unknown")
            error_desc = result.get("error_description", "No description")
            raise PowerBIAuthError(
                f"Failed to acquire Power BI token: {error} — {error_desc}"
            )

        self._access_token = result["access_token"]
        return self._access_token

    @property
    def _token(self) -> str:
        if not self._access_token:
            return self._acquire_token()
        return self._access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    # ── REST API Helpers ──────────────────────────────────────────────

    def _get(self, path: str) -> dict:
        """Make an authenticated GET request to the Power BI REST API."""
        url = f"{POWERBI_API_BASE}/{path}"
        with httpx.Client(timeout=30) as client:
            resp = client.get(url, headers=self._headers())

        if resp.status_code == 401:
            # Token may have expired — try once more
            self._acquire_token()
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, headers=self._headers())

        if resp.status_code != 200:
            raise PowerBIQueryError(
                f"GET {path} failed ({resp.status_code}): {resp.text[:500]}"
            )
        return resp.json()

    def _execute_query(
        self, workspace_id: str, dataset_id: str, query: str
    ) -> list[dict]:
        """Execute a DAX query against a dataset and return rows.

        Uses POST /groups/{groupId}/datasets/{datasetId}/executeQueries
        """
        url = (
            f"{POWERBI_API_BASE}/groups/{workspace_id}"
            f"/datasets/{dataset_id}/executeQueries"
        )
        body = {
            "queries": [{"query": query}],
            "serializerSettings": {"includeNulls": True},
        }

        with httpx.Client(timeout=60) as client:
            resp = client.post(url, headers=self._headers(), json=body)

        if resp.status_code == 401:
            self._acquire_token()
            with httpx.Client(timeout=60) as client:
                resp = client.post(url, headers=self._headers(), json=body)

        if resp.status_code != 200:
            raise PowerBIQueryError(
                f"executeQueries failed ({resp.status_code}): {resp.text[:500]}"
            )

        data = resp.json()
        results = data.get("results", [])
        if not results:
            return []

        tables = results[0].get("tables", [])
        if not tables:
            return []

        return tables[0].get("rows", [])

    # ── Discovery ─────────────────────────────────────────────────────

    def list_workspaces(self) -> list[dict]:
        """List workspaces the service principal has access to."""
        data = self._get("groups")
        return [
            {"id": g["id"], "name": g["name"]}
            for g in data.get("value", [])
        ]

    def list_datasets(self, workspace_id: str) -> list[dict]:
        """List datasets in a workspace."""
        data = self._get(f"groups/{workspace_id}/datasets")
        return [
            {
                "id": d["id"],
                "name": d["name"],
                "configured_by": d.get("configuredBy", ""),
                "is_refreshable": d.get("isRefreshable", False),
            }
            for d in data.get("value", [])
        ]

    # ── Schema Extraction via DMV Queries ─────────────────────────────

    def extract_schema(
        self, workspace_id: str, dataset_id: str
    ) -> dict:
        """Extract the full semantic model schema from a live dataset.

        Returns the same format as /powerbi/parse and /powerapp/parse
        so the frontend can use the same review→load flow.
        """
        # Get dataset metadata
        dataset_info = self._get(
            f"groups/{workspace_id}/datasets/{dataset_id}"
        )
        model_name = dataset_info.get("name", "Live Model")

        # Run DMV queries in parallel-ish (sequential but fast)
        raw_tables = self._query_tables(workspace_id, dataset_id)
        raw_columns = self._query_columns(workspace_id, dataset_id)
        raw_measures = self._query_measures(workspace_id, dataset_id)
        raw_relationships = self._query_relationships(workspace_id, dataset_id)
        raw_partitions = self._query_partitions(workspace_id, dataset_id)

        # Convert to ontology format
        return self._to_ontology_format(
            model_name=model_name,
            raw_tables=raw_tables,
            raw_columns=raw_columns,
            raw_measures=raw_measures,
            raw_relationships=raw_relationships,
            raw_partitions=raw_partitions,
        )

    def _query_tables(self, workspace_id: str, dataset_id: str) -> list[dict]:
        query = (
            "EVALUATE SELECTCOLUMNS("
            "    FILTER($SYSTEM.TMSCHEMA_TABLES, [IsHidden] = FALSE),"
            "    \"ID\", [ID],"
            "    \"Name\", [Name],"
            "    \"Description\", [Description],"
            "    \"TableType\", [SystemFlags]"
            ")"
        )
        return self._execute_query(workspace_id, dataset_id, query)

    def _query_columns(self, workspace_id: str, dataset_id: str) -> list[dict]:
        query = (
            "EVALUATE SELECTCOLUMNS("
            "    FILTER($SYSTEM.TMSCHEMA_COLUMNS, [IsHidden] = FALSE),"
            "    \"TableID\", [TableID],"
            "    \"Name\", [ExplicitName],"
            "    \"DataType\", [ExplicitDataType],"
            "    \"Description\", [Description],"
            "    \"IsKey\", [IsKey],"
            "    \"SourceColumn\", [SourceColumn],"
            "    \"SummarizeBy\", [SummarizeBy],"
            "    \"FormatString\", [FormatString],"
            "    \"ColumnType\", [Type]"
            ")"
        )
        return self._execute_query(workspace_id, dataset_id, query)

    def _query_measures(self, workspace_id: str, dataset_id: str) -> list[dict]:
        query = (
            "EVALUATE SELECTCOLUMNS("
            "    $SYSTEM.TMSCHEMA_MEASURES,"
            "    \"TableID\", [TableID],"
            "    \"Name\", [Name],"
            "    \"Description\", [Description],"
            "    \"Expression\", [Expression],"
            "    \"FormatString\", [FormatString],"
            "    \"DisplayFolder\", [DisplayFolder],"
            "    \"IsHidden\", [IsHidden]"
            ")"
        )
        return self._execute_query(workspace_id, dataset_id, query)

    def _query_relationships(
        self, workspace_id: str, dataset_id: str
    ) -> list[dict]:
        query = (
            "EVALUATE SELECTCOLUMNS("
            "    $SYSTEM.TMSCHEMA_RELATIONSHIPS,"
            "    \"ID\", [ID],"
            "    \"FromTableID\", [FromTableID],"
            "    \"FromColumnID\", [FromColumnID],"
            "    \"ToTableID\", [ToTableID],"
            "    \"ToColumnID\", [ToColumnID],"
            "    \"CrossFilteringBehavior\", [CrossFilteringBehavior],"
            "    \"IsActive\", [IsActive],"
            "    \"FromCardinality\", [FromCardinality],"
            "    \"ToCardinality\", [ToCardinality]"
            ")"
        )
        return self._execute_query(workspace_id, dataset_id, query)

    def _query_partitions(
        self, workspace_id: str, dataset_id: str
    ) -> list[dict]:
        """Query partitions to extract M query expressions (data sources)."""
        query = (
            "EVALUATE SELECTCOLUMNS("
            "    $SYSTEM.TMSCHEMA_PARTITIONS,"
            "    \"TableID\", [TableID],"
            "    \"Name\", [Name],"
            "    \"SourceType\", [SourceType],"
            "    \"QueryDefinition\", [QueryDefinition],"
            "    \"Mode\", [Mode]"
            ")"
        )
        return self._execute_query(workspace_id, dataset_id, query)

    # ── Conversion to Ontology Format ────────────────────────────────

    def _to_ontology_format(
        self,
        model_name: str,
        raw_tables: list[dict],
        raw_columns: list[dict],
        raw_measures: list[dict],
        raw_relationships: list[dict],
        raw_partitions: list[dict],
    ) -> dict:
        """Convert DMV query results to the standard ontology element format."""

        # Build table ID → name lookup
        table_id_to_name: dict[int, str] = {}
        entities: list[dict] = []

        for t in raw_tables:
            table_id = t.get("[ID]")
            table_name = t.get("[Name]", "")
            if not table_name:
                continue

            # Skip auto-generated date tables
            if table_name.startswith("DateTableTemplate_") or table_name.startswith(
                "LocalDateTable_"
            ):
                continue

            table_id_to_name[table_id] = table_name
            entity_id = _slugify(table_name)

            entities.append(
                {
                    "id": entity_id,
                    "name": table_name,
                    "description": t.get("[Description]") or "",
                    "core_attributes": [],
                    "lenses": [],
                    "state": "as-is",
                }
            )

        # Build column ID → (table_name, column_name) lookup for relationships
        column_id_to_ref: dict[int, tuple[str, str]] = {}

        # Columns → attributes
        attributes: list[dict] = []
        for c in raw_columns:
            table_id = c.get("[TableID]")
            table_name = table_id_to_name.get(table_id)
            if not table_name:
                continue

            col_name = c.get("[Name]") or c.get("[SourceColumn]") or ""
            if not col_name:
                continue

            entity_id = _slugify(table_name)
            attr_id = _slugify(f"{table_name}_{col_name}")

            # Track for relationship resolution
            col_type = c.get("[ColumnType]")
            # ColumnType 1 = data column, 2 = calculated, skip RowNumber (type 5)
            if col_type == 5:
                continue

            attributes.append(
                {
                    "id": attr_id,
                    "name": col_name,
                    "description": c.get("[Description]") or "",
                    "entity_id": entity_id,
                    "system_id": _slugify(model_name),
                    "source_table": table_name,
                    "source_column": c.get("[SourceColumn]") or col_name,
                    "state": "as-is",
                }
            )

        # Measures → measures + terminal measures become metrics
        measures: list[dict] = []
        measure_ids_used_by_others: set[str] = set()

        for m in raw_measures:
            table_id = m.get("[TableID]")
            table_name = table_id_to_name.get(table_id, "")
            measure_name = m.get("[Name]", "")
            if not measure_name:
                continue

            expression = m.get("[Expression]") or ""
            measure_id = _slugify(measure_name)

            # Parse DAX references to find input measures and attributes
            input_measure_ids = []
            input_attribute_ids = []
            # Match [MeasureName] references in DAX
            for ref in re.findall(r"\[([^\]]+)\]", expression):
                ref_id = _slugify(ref)
                if ref_id != measure_id:
                    input_measure_ids.append(ref_id)
                    measure_ids_used_by_others.add(ref_id)
            # Match 'TableName'[ColumnName] references
            for tbl, col in re.findall(
                r"'([^']+)'\[([^\]]+)\]", expression
            ):
                input_attribute_ids.append(_slugify(f"{tbl}_{col}"))
            # Match TableName[ColumnName] (unquoted)
            for tbl, col in re.findall(
                r"(?<!')(\w+)\[([^\]]+)\]", expression
            ):
                input_attribute_ids.append(_slugify(f"{tbl}_{col}"))

            # Infer perspective from format string
            fmt = (m.get("[FormatString]") or "").lower()
            if "$" in fmt or "currency" in fmt:
                perspective_ids = ["financial"]
            elif "%" in fmt:
                perspective_ids = ["management"]
            else:
                perspective_ids = ["operational"]

            measures.append(
                {
                    "id": measure_id,
                    "name": measure_name,
                    "description": m.get("[Description]") or "",
                    "logic": expression,
                    "formula": expression,
                    "input_attribute_ids": list(set(input_attribute_ids)),
                    "input_measure_ids": list(set(input_measure_ids)),
                    "perspective_ids": perspective_ids,
                    "state": "as-is",
                }
            )

        # Terminal measures (not referenced by others) → metrics
        metrics: list[dict] = []
        for meas in measures:
            if meas["id"] not in measure_ids_used_by_others:
                metrics.append(
                    {
                        "id": f"metric_{meas['id']}",
                        "name": meas["name"],
                        "description": meas["description"],
                        "business_question": f"What is the {meas['name']}?",
                        "calculated_by_measure_ids": [meas["id"]],
                        "perspective_ids": meas["perspective_ids"],
                        "state": "as-is",
                    }
                )

        # Relationships
        # We need column-level resolution which requires a second lookup.
        # The DMV gives us FromColumnID/ToColumnID but we need to resolve
        # them to table.column names. Build from the columns data.
        col_id_lookup: dict[tuple[int, int], tuple[str, str]] = {}
        for c in raw_columns:
            table_id = c.get("[TableID]")
            table_name = table_id_to_name.get(table_id)
            col_name = c.get("[Name]") or c.get("[SourceColumn]") or ""
            if table_name and col_name:
                # Column IDs are per-table ordinals in some versions,
                # but DMV gives us the global column ID. We store by
                # (TableID, ordinal) but also need to handle the case
                # where the DMV doesn't give explicit column IDs.
                pass  # We'll use a simpler approach below

        relationships: list[dict] = []
        # For now, build relationships from the raw data.
        # The DMV FromColumnID/ToColumnID reference $SYSTEM.TMSCHEMA_COLUMNS[ID]
        # which we don't query separately. We'll extract relationships using
        # a separate DMV that gives us the resolved names directly.
        # This is a known limitation — the relationship names need column ID
        # resolution. We include what we can.
        for idx, r in enumerate(raw_relationships):
            from_table_id = r.get("[FromTableID]")
            to_table_id = r.get("[ToTableID]")
            from_table = table_id_to_name.get(from_table_id, "")
            to_table = table_id_to_name.get(to_table_id, "")

            if not from_table or not to_table:
                continue

            is_active = r.get("[IsActive]", True)
            cross_filter = r.get("[CrossFilteringBehavior]", 1)

            relationships.append(
                {
                    "id": f"rel_{_slugify(from_table)}_{_slugify(to_table)}_{idx}",
                    "name": f"{from_table} → {to_table}",
                    "from_entity_id": _slugify(from_table),
                    "to_entity_id": _slugify(to_table),
                    "relationship_type": "many_to_one",
                    "is_active": bool(is_active),
                    "source": "powerbi_live",
                }
            )

        # Infer data sources from partition M queries
        systems: list[dict] = [
            {
                "id": _slugify(model_name),
                "name": f"Power BI - {model_name}",
                "type": "BI",
                "vendor": "Microsoft",
                "integration_status": "Connected",
                "state": "as-is",
                "notes": "Live Power BI semantic model",
            }
        ]
        seen_systems = {_slugify(model_name)}

        for p in raw_partitions:
            query_def = p.get("[QueryDefinition]") or ""
            source_type = p.get("[SourceType]")

            # Detect data sources from M query expressions
            if "Sql.Database" in query_def and "sql_server" not in seen_systems:
                systems.append(
                    {
                        "id": "sql_server",
                        "name": "SQL Server",
                        "type": "Database",
                        "vendor": "Microsoft",
                        "integration_status": "Connected",
                        "state": "as-is",
                        "notes": "Data source detected from M query",
                    }
                )
                seen_systems.add("sql_server")

            if "Excel.Workbook" in query_def and "excel_source" not in seen_systems:
                systems.append(
                    {
                        "id": "excel_source",
                        "name": "Excel Workbook (Manual Data Source)",
                        "type": "Spreadsheet",
                        "vendor": "Microsoft",
                        "reliability_default": "Low",
                        "integration_status": "Manual Extract",
                        "state": "as-is",
                        "notes": "Excel file used as data source — likely a manual bridge",
                    }
                )
                seen_systems.add("excel_source")

            if "Oracle.Database" in query_def and "oracle" not in seen_systems:
                systems.append(
                    {
                        "id": "oracle",
                        "name": "Oracle Database",
                        "type": "Database",
                        "vendor": "Oracle",
                        "integration_status": "Connected",
                        "state": "as-is",
                    }
                )
                seen_systems.add("oracle")

            if "Csv.Document" in query_def and "csv_source" not in seen_systems:
                systems.append(
                    {
                        "id": "csv_source",
                        "name": "CSV File (Manual Data Source)",
                        "type": "File",
                        "vendor": "",
                        "reliability_default": "Low",
                        "integration_status": "Manual Extract",
                        "state": "as-is",
                        "notes": "CSV file used as data source — likely a manual bridge",
                    }
                )
                seen_systems.add("csv_source")

            if "SharePoint" in query_def and "sharepoint" not in seen_systems:
                systems.append(
                    {
                        "id": "sharepoint",
                        "name": "SharePoint Online",
                        "type": "Other",
                        "vendor": "Microsoft",
                        "integration_status": "Connected",
                        "state": "as-is",
                    }
                )
                seen_systems.add("sharepoint")

            if "Dataflows" in query_def and "dataflows" not in seen_systems:
                systems.append(
                    {
                        "id": "dataflows",
                        "name": "Power BI Dataflows",
                        "type": "ETL",
                        "vendor": "Microsoft",
                        "integration_status": "Connected",
                        "state": "as-is",
                    }
                )
                seen_systems.add("dataflows")

            if (
                "Lakehouse" in query_def or "Warehouse" in query_def
            ) and "fabric_lakehouse" not in seen_systems:
                systems.append(
                    {
                        "id": "fabric_lakehouse",
                        "name": "Microsoft Fabric Lakehouse/Warehouse",
                        "type": "Database",
                        "vendor": "Microsoft",
                        "integration_status": "Connected",
                        "state": "as-is",
                    }
                )
                seen_systems.add("fabric_lakehouse")

        # Standard perspectives
        perspectives = [
            {"id": "operational", "name": "Operational", "purpose": "What work is being done?"},
            {"id": "management", "name": "Management", "purpose": "How are we performing?"},
            {"id": "financial", "name": "Financial", "purpose": "What's the financial position?"},
        ]

        return {
            "source_type": "powerbi_live",
            "model_name": model_name,
            "entities": entities,
            "attributes": attributes,
            "measures": measures,
            "metrics": metrics,
            "relationships": relationships,
            "systems": systems,
            "perspectives": perspectives,
            "warnings": [],
        }


def get_powerbi_live_service(session_token: Optional[str] = None) -> PowerBILiveService:
    """Get a configured PowerBILiveService.

    Priority:
      1. If session_token is provided, use credentials from the in-memory session
      2. Otherwise, fall back to environment variables
    """
    if session_token:
        return get_session_service(session_token)

    from ..config import POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET

    if not all([POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET]):
        raise PowerBIAuthError(
            "Power BI live connection is not configured. "
            "Either connect with credentials or set POWERBI_TENANT_ID, "
            "POWERBI_CLIENT_ID, and POWERBI_CLIENT_SECRET environment variables."
        )

    return PowerBILiveService(
        tenant_id=POWERBI_TENANT_ID,
        client_id=POWERBI_CLIENT_ID,
        client_secret=POWERBI_CLIENT_SECRET,
    )
