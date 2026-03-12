"""Application configuration constants."""

import os

# AI Provider: "anthropic" (default) or "azure"
AI_PROVIDER = os.getenv("AI_PROVIDER", "anthropic")

# Anthropic settings
AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")

# Azure AI Foundry settings
AZURE_AI_PROJECT_ENDPOINT = os.getenv("AZURE_AI_PROJECT_ENDPOINT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-05-01-preview")
AZURE_AI_AGENT_ID = os.getenv("AZURE_AI_AGENT_ID", "")
AZURE_AI_SCOPE = os.getenv("AZURE_AI_SCOPE", "https://ai.azure.com/.default")
USE_AZURE_MANAGED_IDENTITY = os.getenv("USE_AZURE_MANAGED_IDENTITY", "false").lower() == "true"
AZURE_AGENT_AUTH_TOKEN = os.getenv("AZURE_AGENT_AUTH_TOKEN", "")
