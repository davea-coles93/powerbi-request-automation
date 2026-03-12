"""Base class for AI-powered services with shared client management and SSE streaming.

Supports two providers:
- Anthropic (default): Uses the anthropic SDK with streaming
- Azure AI Foundry: Uses the Responses API via httpx with streaming
"""

import json
import logging
import os
import threading
import time
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from ..config import (
    AI_MODEL,
    AI_PROVIDER,
    AZURE_AI_AGENT_ID,
    AZURE_AI_PROJECT_ENDPOINT,
    AZURE_AI_SCOPE,
    AZURE_AGENT_AUTH_TOKEN,
    AZURE_OPENAI_API_VERSION,
    USE_AZURE_MANAGED_IDENTITY,
)

logger = logging.getLogger(__name__)

# --- Anthropic client ---

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


def get_anthropic_client():
    """Create an Anthropic async client if available and configured."""
    if not ANTHROPIC_AVAILABLE:
        return None
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return anthropic.AsyncAnthropic(api_key=api_key)


# --- Azure AI Foundry token management ---

_azure_token_cache: dict = {"token": None, "expires_at": 0}
_azure_token_lock = threading.Lock()


def _get_azure_credential():
    """Get Azure credential using DefaultAzureCredential."""
    try:
        from azure.identity import DefaultAzureCredential

        return DefaultAzureCredential()
    except ImportError:
        logger.warning("azure-identity not installed, Azure AI Foundry unavailable")
        return None
    except Exception as e:
        logger.error(f"Failed to create Azure credential: {e}")
        return None


def get_azure_token() -> str | None:
    """Get a Bearer token for Azure AI Foundry.

    Uses cached token if valid (with 5-min refresh buffer).
    Falls back to AZURE_AGENT_AUTH_TOKEN env var for local dev.
    Thread-safe via _azure_token_lock.
    """
    now = time.time()

    with _azure_token_lock:
        # Return cached token if still valid (5 min buffer)
        if _azure_token_cache["token"] and _azure_token_cache["expires_at"] > now + 300:
            return _azure_token_cache["token"]

    # Try DefaultAzureCredential (Managed Identity in Azure, az login locally)
    credential = _get_azure_credential()
    if credential:
        try:
            token_response = credential.get_token(AZURE_AI_SCOPE)
            with _azure_token_lock:
                _azure_token_cache["token"] = token_response.token
                _azure_token_cache["expires_at"] = token_response.expires_on
            return token_response.token
        except Exception as e:
            logger.warning(f"Azure credential token fetch failed: {e}")

    # Fallback: static token from env (local dev)
    static_token = AZURE_AGENT_AUTH_TOKEN
    if static_token:
        return static_token

    return None


def clear_azure_token_cache():
    """Clear cached Azure token (call on 401)."""
    with _azure_token_lock:
        _azure_token_cache["token"] = None
        _azure_token_cache["expires_at"] = 0


class BaseAIService:
    """Base class providing shared AI client initialization and SSE streaming.

    Supports Anthropic and Azure AI Foundry providers via AI_PROVIDER config.
    """

    def __init__(self, db: Session):
        self.db = db
        self.provider = AI_PROVIDER
        self.client = get_anthropic_client() if self.provider == "anthropic" else None

    def is_configured(self) -> bool:
        """Check if AI service is properly configured."""
        if self.provider == "anthropic":
            return self.client is not None
        elif self.provider == "azure":
            return bool(AZURE_AI_PROJECT_ENDPOINT) and (
                get_azure_token() is not None
            )
        return False

    async def _stream_sse(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int = 2000,
    ) -> AsyncGenerator[str, None]:
        """Stream an AI response as Server-Sent Events.

        Yields SSE-formatted strings: "data: {json}\\n\\n"
        Routes to the appropriate provider based on AI_PROVIDER config.
        """
        if self.provider == "azure":
            async for chunk in self._stream_sse_azure(system, messages, max_tokens):
                yield chunk
        else:
            async for chunk in self._stream_sse_anthropic(system, messages, max_tokens):
                yield chunk

    async def _stream_sse_anthropic(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int = 2000,
    ) -> AsyncGenerator[str, None]:
        """Stream via Anthropic SDK."""
        if not self.client:
            yield 'data: {"type":"error","content":"AI service not configured. Set ANTHROPIC_API_KEY."}\n\n'
            return

        try:
            async with self.client.messages.stream(
                model=AI_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    payload = json.dumps({"type": "text", "content": text})
                    yield f"data: {payload}\n\n"

            yield 'data: {"type":"done"}\n\n'

        except Exception as e:
            logger.error(f"Anthropic streaming error: {e}")
            payload = json.dumps({"type": "error", "content": "AI service encountered an error. Please try again."})
            yield f"data: {payload}\n\n"

    async def _stream_sse_azure(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int = 2000,
        _retry: bool = False,
    ) -> AsyncGenerator[str, None]:
        """Stream via Azure AI Foundry Responses API.

        Combines system prompt + messages into the input format expected by
        the Responses API. Streams the response using server-sent events.
        """
        import httpx

        token = get_azure_token()
        if not token:
            yield 'data: {"type":"error","content":"Azure AI Foundry not configured. Check credentials and AZURE_AI_PROJECT_ENDPOINT."}\n\n'
            return

        # Build input: system message + conversation messages
        api_input = []
        if system:
            api_input.append({"role": "system", "content": system})
        for msg in messages:
            api_input.append({"role": msg["role"], "content": msg["content"]})

        endpoint = AZURE_AI_PROJECT_ENDPOINT.rstrip("/")
        url = f"{endpoint}/openai/responses?api-version={AZURE_OPENAI_API_VERSION}"

        payload = {
            "input": api_input,
            "stream": True,
            "max_output_tokens": max_tokens,
        }

        # Include agent ID if configured (for pre-configured agents in the portal)
        if AZURE_AI_AGENT_ID:
            payload["model"] = AZURE_AI_AGENT_ID

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as http_client:
                async with http_client.stream(
                    "POST", url, json=payload, headers=headers
                ) as response:
                    if response.status_code == 401 and not _retry:
                        # Token expired — clear cache and retry once
                        clear_azure_token_cache()
                        logger.info("Azure 401 — refreshing token and retrying")
                        async for chunk in self._stream_sse_azure(
                            system, messages, max_tokens, _retry=True
                        ):
                            yield chunk
                        return

                    if response.status_code != 200:
                        body = await response.aread()
                        error_msg = f"Azure API error {response.status_code}: {body.decode('utf-8', errors='replace')[:500]}"
                        logger.error(error_msg)
                        payload = json.dumps({"type": "error", "content": error_msg})
                        yield f"data: {payload}\n\n"
                        return

                    # Parse SSE stream from Azure Responses API
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue

                        data_str = line[6:]  # strip "data: " prefix
                        if data_str == "[DONE]":
                            break

                        try:
                            event = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        event_type = event.get("type", "")

                        # Extract text deltas from the streaming response
                        if event_type == "response.output_text.delta":
                            delta = event.get("delta", "")
                            if delta:
                                out = json.dumps({"type": "text", "content": delta})
                                yield f"data: {out}\n\n"
                        elif event_type == "response.completed":
                            break
                        elif event_type == "error":
                            error = event.get("error", {})
                            err_msg = error.get("message", str(error))
                            out = json.dumps({"type": "error", "content": err_msg})
                            yield f"data: {out}\n\n"
                            return

            yield 'data: {"type":"done"}\n\n'

        except httpx.TimeoutException:
            payload = json.dumps(
                {"type": "error", "content": "Azure AI request timed out"}
            )
            yield f"data: {payload}\n\n"
        except Exception as e:
            logger.error(f"Azure streaming error: {e}")
            payload = json.dumps({"type": "error", "content": "AI service encountered an error. Please try again."})
            yield f"data: {payload}\n\n"
