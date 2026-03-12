"""Application configuration constants."""

import os

# AI Provider: "anthropic" (default) or "azure"
AI_PROVIDER = os.getenv("AI_PROVIDER", "anthropic")

# Anthropic settings
AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")
AI_EXTRACTION_MODEL = os.getenv("AI_EXTRACTION_MODEL", "claude-haiku-4-5-20251001")

# Azure AI Foundry settings
AZURE_AI_PROJECT_ENDPOINT = os.getenv("AZURE_AI_PROJECT_ENDPOINT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-05-01-preview")
AZURE_AI_AGENT_ID = os.getenv("AZURE_AI_AGENT_ID", "")
AZURE_AI_SCOPE = os.getenv("AZURE_AI_SCOPE", "https://ai.azure.com/.default")
USE_AZURE_MANAGED_IDENTITY = os.getenv("USE_AZURE_MANAGED_IDENTITY", "false").lower() == "true"
AZURE_AGENT_AUTH_TOKEN = os.getenv("AZURE_AGENT_AUTH_TOKEN", "")

# Power BI Live Connection settings
# Service principal auth for Power BI REST API + XMLA
POWERBI_TENANT_ID = os.getenv("POWERBI_TENANT_ID", "")
POWERBI_CLIENT_ID = os.getenv("POWERBI_CLIENT_ID", "")
POWERBI_CLIENT_SECRET = os.getenv("POWERBI_CLIENT_SECRET", "")
POWERBI_DEFAULT_WORKSPACE_ID = os.getenv("POWERBI_DEFAULT_WORKSPACE_ID", "")
