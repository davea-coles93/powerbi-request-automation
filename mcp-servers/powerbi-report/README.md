# Power BI Report MCP Server

MCP server for reading and writing Power BI Report layer files in PBIP format.

## Overview

This MCP server provides tools to programmatically create and modify Power BI report visuals, pages, and filters by working directly with the `.Report/` folder in PBIP (Power BI Project) files.

## Features

### Page Management
- `list_pages` - List all pages in a report
- `get_page` - Get details of a specific page
- `create_page` - Create a new report page
- `delete_page` - Delete a page
- `rename_page` - Rename a page
- `set_active_page` - Set the default active page

### Visual Management
- `list_visuals` - List all visuals on a page
- `get_visual` - Get full details of a specific visual
- `create_visual` - Create a new visual (generic)
- `update_visual` - Update visual properties
- `delete_visual` - Delete a visual
- `move_visual` - Move/resize a visual

### Specialized Visual Creators
- `create_card_visual` - Create a card showing a measure value
- `create_table_visual` - Create a table with specified columns
- `create_bar_chart_visual` - Create a bar chart

### Filter Management
- `get_page_filters` - Get all page-level filters
- `add_page_filter` - Add a filter to a page
- `remove_page_filter` - Remove a specific filter
- `clear_page_filters` - Remove all filters from a page

### Analysis
- `analyze_report` - Comprehensive report structure analysis
- `get_report_summary` - High-level report summary

## Installation

```bash
npm install
npm run build
```

## Usage

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "powerbi-report": {
      "command": "node",
      "args": [
        "C:/path/to/mcp-servers/powerbi-report/build/index.js"
      ]
    }
  }
}
```

## Example: Creating a Card Visual

```typescript
// Create a card visual showing Total Sales
await mcp.callTool('create_card_visual', {
  reportPath: 'models/contoso-corp/sales-returns.Report',
  pageName: 'ReportSection1',
  measureEntity: 'Sales',
  measureProperty: 'Total Sales',
  position: {
    x: 10,
    y: 10,
    width: 200,
    height: 100,
    z: 0
  },
  title: 'Total Sales'
});
```

## Example: Creating a New Page

```typescript
// Create a new page
await mcp.callTool('create_page', {
  reportPath: 'models/contoso-corp/sales-returns.Report',
  pageName: 'ReportSection5',
  displayName: 'Sales Overview',
  insertAtIndex: 0  // Insert as first page
});
```

## Visual Types Supported

- `card` - Single value card
- `textbox` - Text box
- `slicer` - Slicer/filter visual
- `table` - Table
- `matrix` - Matrix
- `barChart` - Bar chart
- `columnChart` - Column chart
- `lineChart` - Line chart
- `pieChart` - Pie chart
- `donutChart` - Donut chart
- `scatterChart` - Scatter chart
- `areaChart` - Area chart
- `gauge` - Gauge
- `kpi` - KPI visual

## Structure

Power BI Report files are organized as:

```
.Report/
├── definition/
│   ├── report.json          # Report-level settings
│   └── pages/
│       ├── pages.json       # Page index (order, active page)
│       └── PageName/
│           ├── page.json    # Page settings, filters
│           └── visuals/
│               └── VisualContainerN/
│                   └── visual.json  # Visual definition
```

## Professional Styling & Best Practices

### 📚 Documentation Resources

This server exposes comprehensive styling documentation as **MCP Resources** that Claude can read on-demand:

**Available Resources (Claude can access these):**
1. `powerbi-report://docs/design-principles` - **[DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md)**
   - Research-based best practices from Microsoft & industry experts
   - Layout hierarchy (Z-pattern, KPI placement)
   - Color strategy (max 6 colors)
   - Visual selection guide
   - Typography & number formatting
   - Accessibility requirements
   - Complete design checklist

2. `powerbi-report://docs/styling-guide` - **[VISUAL_STYLING_GUIDE.md](./VISUAL_STYLING_GUIDE.md)**
   - Professional visual styling techniques
   - Drop shadows, data bars, colors, fonts
   - Object property reference
   - Implementation checklist
   - Quick reference table

3. `powerbi-report://docs/visual-examples` - **[VISUAL_EXAMPLES.md](./VISUAL_EXAMPLES.md)**
   - 10 complete, copy-paste ready JSON templates
   - Area Chart, Map, Matrix/Pivot Table, Slicer
   - Bar Chart, Column Chart, Table, Card
   - Donut Chart, Line Chart
   - Each with full professional styling applied

**How Claude Uses These:**
```typescript
// Claude can read documentation using:
ReadMcpResourceTool({
  uri: 'powerbi-report://docs/design-principles'
})

// This loads the full guide into Claude's context
// No need to manually share files!
```

### Current Limitations

The basic visual creation functions (`create_card_visual`, `create_bar_chart_visual`, etc.) currently create visuals with **minimal styling**. For professional-looking dashboards:

**Option 1**: Manually edit the generated JSON using examples from VISUAL_EXAMPLES.md

**Option 2**: Use the generic `create_visual` tool with complete JSON from examples

**Option 3**: (Future) Enhanced MCP tools with styling parameters:
```typescript
create_bar_chart_visual({
  ...
  styling: {
    dropShadow: true,
    titleFontSize: 16,
    color: "#118DFF",
    enableCrossFilter: true
  }
})
```

### Key Styling Elements for Professional Look

1. **Drop Shadows** - Add depth (`visualContainerObjects.dropShadow`)
2. **Title Font Size** - Use 14-16D for titles
3. **Data Bars** - In tables/matrices for visual comparison
4. **Active Flags** - Enable `"active": true` on query projections
5. **Cross-Filtering** - Set `"drillFilterOtherVisuals": true`
6. **Colors** - Use consistent brand palette (#118DFF, #c4d3e9)

See the guides for complete implementation details.

## Integration with Semantic Model

This server handles the **report layer** only. For semantic model operations (tables, measures, DAX), use the corresponding semantic model MCP server.

## License

MIT
