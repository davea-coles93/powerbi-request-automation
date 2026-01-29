# Power BI Desktop Automation MCP Server

MCP server for Windows automation of Power BI Desktop using pywinauto.

## Overview

This MCP server provides tools to programmatically control Power BI Desktop on Windows, enabling automated testing and validation of report changes.

## Features

### File Operations
- `launch_powerbi` - Launch Power BI Desktop with a specific PBIP file
- `save_current_file` - Save the current file (Ctrl+S)
- `close_powerbi` - Close Power BI Desktop (with optional save)

### State Management
- `is_powerbi_running` - Check if instance is running
- `wait_for_ready` - Wait until data is loaded and ready

### Visual Verification
- `take_screenshot` - Capture screenshot of Power BI window (returns PNG image)

### Data Operations
- `refresh_data` - Refresh all data in the report

### Navigation (Coming Soon)
- `get_current_page` - Get active page name
- `switch_to_page` - Switch to a specific page

## Installation

### Prerequisites

- Windows OS
- Python 3.10+
- Power BI Desktop installed

### Install

```bash
cd mcp-servers/powerbi-automation
pip install -e .
```

This will install:
- `mcp` - MCP SDK
- `pywinauto` - Windows UI automation
- `psutil` - Process management
- `Pillow` - Image handling
- `pywin32` - Windows APIs

## Usage

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "powerbi-automation": {
      "command": "python",
      "args": [
        "-m",
        "powerbi_automation_mcp.server"
      ]
    }
  }
}
```

## Example Workflow

```python
# 1. Launch Power BI with a file
await mcp.callTool('launch_powerbi', {
    'pbipPath': 'C:/models/contoso/sales.pbip',
    'timeout': 60
})

# 2. Wait for ready
await mcp.callTool('wait_for_ready', {'timeout': 30})

# 3. Take screenshot for verification
screenshot = await mcp.callTool('take_screenshot')
# Returns PNG image that Claude can analyze

# 4. Save and close
await mcp.callTool('save_current_file')
await mcp.callTool('close_powerbi', {'save': True})
```

## Integration with powerbi-report MCP

Use together with the `powerbi-report` MCP server for full automation:

1. **powerbi-report**: Make changes to report JSON files
2. **powerbi-automation**: Open in Power BI Desktop
3. **powerbi-automation**: Take screenshot
4. **Claude**: Analyze screenshot to verify changes
5. **powerbi-automation**: Save and close if correct

## Limitations

- **Windows Only**: Requires Windows OS and Power BI Desktop
- **UI Automation**: Some operations depend on UI stability
- **Page Navigation**: Page switching requires accessibility API access (future enhancement)

## Troubleshooting

### Power BI Not Found

If Power BI executable is not in standard locations, it will attempt to find it in:
- `C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe`
- `C:\Program Files (x86)\Microsoft Power BI Desktop\bin\PBIDesktop.exe`
- `%LOCALAPPDATA%\Microsoft\WindowsApps\PBIDesktop.exe`

### Window Not Found

If Power BI window cannot be found after launch:
- Increase timeout in `launch_powerbi`
- Ensure Power BI Desktop is properly installed
- Check no other Power BI instances are running

### Screenshot Fails

Screenshots require:
- Power BI window to be visible (not minimized)
- Adequate Windows permissions
- pywin32 properly installed

## License

MIT
