#!/usr/bin/env python3
"""
Power BI Desktop Automation MCP Server
Provides Windows automation tools for Power BI Desktop
"""

import asyncio
import json
from typing import Any
from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
import mcp.server.stdio

from .automation import PowerBIAutomation


# Global automation instance
automation = PowerBIAutomation()

# Define tools
TOOLS = [
    Tool(
        name="launch_powerbi",
        description="Launch Power BI Desktop with a PBIP file",
        inputSchema={
            "type": "object",
            "properties": {
                "pbipPath": {
                    "type": "string",
                    "description": "Path to the .pbip file to open",
                },
                "timeout": {
                    "type": "number",
                    "description": "Optional timeout in seconds (default: 60)",
                },
            },
            "required": ["pbipPath"],
        },
    ),
    Tool(
        name="is_powerbi_running",
        description="Check if Power BI Desktop instance is running",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="wait_for_ready",
        description="Wait until Power BI Desktop is ready (data loaded)",
        inputSchema={
            "type": "object",
            "properties": {
                "timeout": {
                    "type": "number",
                    "description": "Timeout in seconds (default: 30)",
                },
            },
        },
    ),
    Tool(
        name="save_current_file",
        description="Save the currently open Power BI file (Ctrl+S)",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="close_powerbi",
        description="Close Power BI Desktop",
        inputSchema={
            "type": "object",
            "properties": {
                "save": {
                    "type": "boolean",
                    "description": "Whether to save before closing (default: true)",
                },
            },
        },
    ),
    Tool(
        name="take_screenshot",
        description="Take a screenshot of the Power BI Desktop window",
        inputSchema={
            "type": "object",
            "properties": {
                "pageName": {
                    "type": "string",
                    "description": "Optional page name to switch to before screenshot",
                },
            },
        },
    ),
    Tool(
        name="refresh_data",
        description="Refresh all data in the report",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="get_current_page",
        description="Get the name of the currently active page",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="switch_to_page",
        description="Switch to a specific page by name",
        inputSchema={
            "type": "object",
            "properties": {
                "pageName": {
                    "type": "string",
                    "description": "Display name of the page to switch to",
                },
            },
            "required": ["pageName"],
        },
    ),
]


async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent | ImageContent]:
    """Handle tool calls"""

    try:
        if name == "launch_powerbi":
            result = automation.launch_powerbi(
                arguments["pbipPath"],
                arguments.get("timeout", 60)
            )

        elif name == "is_powerbi_running":
            result = {
                "running": automation.is_powerbi_running()
            }

        elif name == "wait_for_ready":
            ready = automation.wait_for_ready(arguments.get("timeout", 30))
            result = {
                "ready": ready
            }

        elif name == "save_current_file":
            result = automation.save_current_file()

        elif name == "close_powerbi":
            result = automation.close_powerbi(arguments.get("save", True))

        elif name == "take_screenshot":
            result = automation.take_screenshot(arguments.get("pageName"))

            # If screenshot successful, return image content
            if result.get("success") and "image" in result:
                return [
                    ImageContent(
                        type="image",
                        data=result["image"],
                        mimeType="image/png",
                    ),
                    TextContent(
                        type="text",
                        text=json.dumps({
                            "success": True,
                            "width": result["width"],
                            "height": result["height"],
                        }, indent=2)
                    )
                ]

        elif name == "refresh_data":
            result = automation.refresh_data()

        elif name == "get_current_page":
            result = automation.get_current_page()

        elif name == "switch_to_page":
            result = automation.switch_to_page(arguments["pageName"])

        else:
            result = {
                "success": False,
                "error": f"Unknown tool: {name}"
            }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except Exception as e:
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": str(e)
                }, indent=2)
            )
        ]


async def main():
    """Main entry point for the MCP server"""
    server = Server("powerbi-automation-mcp")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def handle_call_tool(name: str, arguments: Any) -> list[TextContent | ImageContent]:
        return await call_tool(name, arguments)

    # Run the server
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
