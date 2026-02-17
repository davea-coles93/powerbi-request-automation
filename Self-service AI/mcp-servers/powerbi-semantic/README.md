# Power BI Semantic MCP Server

Model Context Protocol (MCP) server for exploring and analyzing Power BI semantic models (TMDL format).

## Overview

This MCP server provides comprehensive tools for working with Power BI semantic models stored in TMDL (Tabular Model Definition Language) format. It enables AI assistants to understand model structure, analyze DAX expressions, validate data models, and provide insights for creating effective Power BI solutions.

## Installation

```bash
cd mcp-servers/powerbi-semantic
npm install
npm run build
```

## Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "powerbi-semantic": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/mcp-servers/powerbi-semantic/build/index.js"
      ],
      "env": {}
    }
  }
}
```

**Note**: Unlike traditional MCP servers, this server does NOT require a MODEL_PATH environment variable. Instead, each tool accepts a `modelPath` parameter pointing to a specific `.pbip` file. This design supports working with multiple models simultaneously.

## Usage

All tools require a `modelPath` parameter:

```typescript
{
  "modelPath": "C:/path/to/your-model.pbip",
  //... other parameters
}
```

The server caches loaded models to avoid redundant file I/O when making multiple requests to the same model.

## Available Tools

### Basic Model Exploration

- **list_tables** - Get all tables with measure and column counts
- **get_table_info** - Detailed information about a specific table
- **get_table_measures** - All measures from a table
- **get_table_columns** - All columns from a table with metadata
- **read_relationships** - Model relationships with cardinality and cross-filter direction

### Metadata & Structure

- **get_table_hierarchies** - Hierarchies defined in tables
- **list_hierarchies** - All hierarchies across the entire model
- **get_column_details** - Detailed column information including data categories, sort-by columns
- **get_relationship_details** - Enhanced relationship metadata
- **get_model_context** - Read MODEL_CONTEXT.md file if it exists

### DAX Analysis

- **search_measures** - Find measures by name pattern
- **validate_dax** - Basic syntax validation for DAX expressions
- **get_measure_dependencies** - Dependency tree showing what a measure references and what references it
- **find_unused_measures** - Identify measures not referenced by other measures
- **analyze_measure_complexity** - Complexity score with performance recommendations
- **detect_measure_pattern** - Identify common DAX patterns (time intelligence, aggregation, ratio, etc.)
- **check_dax_quality** - Check for anti-patterns and quality issues
- **detect_circular_dependencies** - Find circular reference chains

### Model Quality

- **analyze_model_quality** - Overall quality score with recommendations
- **check_naming_conventions** - Validate naming standards
- **check_name_conflict** - Check if a measure name already exists

### Composite "Power Tools"

- **explore_measure_complete** - Complete measure analysis (dependencies + complexity + pattern + quality)
- **explore_table_complete** - Complete table exploration (info + hierarchies + columns + relationships)
- **analyze_model_health_complete** - Complete model health check (quality + unused + circular + naming)

---

## Design Guidelines for Visually Appealing Power BI Reports

### 1. **Layout & Structure**

#### Page Dimensions
- **Standard**: 1280 x 720 (16:9 aspect ratio) - recommended for most reports
- **Widescreen**: 1920 x 1080 - for detailed dashboards
- **Portrait**: 720 x 1280 - for mobile-first designs

#### Visual Positioning
- Use **z-order** to layer visuals (cards over backgrounds, tooltips on top)
- **Grid alignment**: Position visuals on a 20px or 40px grid for clean alignment
- **Whitespace**: Leave 20-40px margins around page edges
- **Visual spacing**: 10-20px between related visuals, 30-50px between sections

#### Typical Layouts
```
┌────────────────────────────────────────┐
│  Title Bar (80-100px height)          │
├────────────────────────────────────────┤
│  KPI Cards Row (150-200px height)     │
├─────────────┬──────────────────────────┤
│  Filters    │  Main Visual Area       │
│  200-250px  │  (Charts, Tables)       │
│  width      │                          │
└─────────────┴──────────────────────────┘
```

### 2. **Visual Selection**

#### When to Use Each Visual Type

**Card Visuals**
- Single KPI metrics
- Total sales, count of items, averages
- Position: Top of page, horizontally aligned
- Size: 150-200px wide x 100-150px high

**Table Visuals**
- Detailed data with 3-10 columns
- Transaction lists, top N customers
- Include: Sort-by columns for proper ordering
- Size: Fill available width, 300-500px height

**Bar/Column Charts**
- Category comparisons (5-15 categories)
- Sales by product, revenue by region
- Axis labels: Rotate if needed, keep readable
- Size: 400-600px wide x 300-400px high

**Line Charts**
- Time series, trends over time
- Include: Date hierarchies for drill-down
- Always use proper date tables with relationships

**Matrix Visuals**
- Cross-tabulation, pivot tables
- Rows: Dimensional attributes
- Columns: Time periods or categories
- Values: Aggregated measures

### 3. **Color & Theming**

#### Color Palette Best Practices
- **Limit to 3-5 primary colors** plus neutral grays
- Use color consistently: Same measure = same color across visuals
- **Accessibility**: Ensure 4.5:1 contrast ratio (WCAG AA)
- **Categorical data**: Distinct hues (blue, orange, green)
- **Sequential data**: Single hue gradient (light to dark blue)
- **Diverging data**: Two hues meeting at neutral (red-gray-green)

#### Common Palettes
```
Professional Blue Theme:
  Primary: #118DFF, #0F6CBD, #004B87
  Accent: #FFB900, #FF8C00
  Neutral: #EDEBE9, #A19F9D, #323130

Financial Green Theme:
  Primary: #00CC6A, #00A854, #00713C
  Accent: #0078D4, #FFB900
  Neutral: #F3F2F1, #8A8886, #201F1E
```

### 4. **Typography**

- **Title**: Segoe UI Bold, 18-24pt
- **Subtitle**: Segoe UI Semibold, 14-16pt
- **Body/Data**: Segoe UI, 10-12pt
- **Small labels**: Segoe UI, 8-9pt

**Hierarchy**: Use size and weight to create visual hierarchy, not just color.

### 5. **Data Aggregation**

#### Proper queryRef Format
When creating visuals with aggregated measures:
```json
{
  "queryRef": "Sum(Sales.Sales Amount)",  // ✓ Correct
  "queryRef": "Sales.Sales Amount"         // ✗ Wrong - missing aggregation
}
```

Aggregation functions:
- `0`: Sum
- `1`: Avg
- `2`: Min
- `3`: Max
- `4`: Count
- `5`: CountNonNull

### 6. **Relationships & Filters**

#### Model Best Practices
- **Star schema**: Fact tables connected to dimension tables
- **Date table**: Always use a dedicated date table with calendar hierarchy
- **One-to-many relationships**: Dimension (one) → Fact (many)
- **Active relationships**: One active path between any two tables
- **Cross-filter direction**: Usually "Single" except for specific scenarios

#### Filter Context
- **Page-level filters**: Apply to all visuals on the page
- **Visual-level filters**: Override page filters for specific visuals
- **Report-level filters**: Apply across all pages

### 7. **Performance Optimization**

#### DAX Best Practices
- **Use variables** to avoid recalculation: `VAR TotalSales = SUM(Sales[Amount])`
- **Prefer CALCULATE over IF**: More efficient filter context manipulation
- **Avoid row-by-row iteration**: Use aggregation functions instead
- **Measure dependencies**: Keep dependency chains shallow (max 3-4 levels)

#### Visual Performance
- **Limit visuals per page**: 10-15 maximum
- **Reduce cardinality**: Don't show 10,000 rows in a table
- **Use aggregations**: Pre-aggregate at appropriate grain
- **Minimize calculated columns**: Use measures when possible

### 8. **User Experience**

#### Interactive Elements
- **Slicers**: Position on left side or top, 200-250px wide
- **Drill-through**: Enable for detailed analysis
- **Tooltips**: Add custom tooltips for additional context
- **Bookmarks**: Create states for different views

#### Mobile Optimization
- Create dedicated mobile layouts (720 x 1280)
- Stack visuals vertically
- Larger touch targets (minimum 44x44px)
- Simplified visuals (fewer data points)

---

## Lessons Learned

### Bug Fixes & Discoveries

1. **Page Height/Width Required**
   - **Issue**: Pages without `height` and `width` properties cause Power BI error: "Invalid height and width"
   - **Solution**: Always include `width: 1280, height: 720` (or your chosen dimensions)
   - **Location**: page.json in `.Report/definition/pages/{pageName}/`

2. **QueryRef Format for Aggregations**
   - **Issue**: queryRef was `"Sales.Sales Amount"` instead of `"Sum(Sales.Sales Amount)"`
   - **Solution**: Include aggregation function name in queryRef when Function property is set
   - **Pattern**: `{AggregationName}({Table}.{Column})`

3. **Multi-Model Support**
   - **Issue**: Original design with MODEL_PATH environment variable only supported one model
   - **Solution**: Accept `modelPath` as a parameter in each tool call
   - **Benefit**: Can analyze multiple client models in a single session

4. **Service Caching**
   - **Discovery**: Loading TMDL projects is I/O intensive
   - **Solution**: Cache TmdlService instances by model path
   - **Result**: 10-100x faster for repeated operations on the same model

5. **Visual Container Naming**
   - **Pattern**: First visual is "VisualContainer", subsequent are "VisualContainer1", "VisualContainer2", etc.
   - **Z-order**: Controls layering (higher z = on top)
   - **TabOrder**: Controls keyboard navigation order

### Architecture Insights

1. **TMDL Structure**: Semantic models use hierarchical folders (`.SemanticModel/definition/tables/`, etc.)
2. **Report Structure**: Reports use separate folders (`.Report/definition/pages/`, etc.)
3. **Separation of Concerns**: Model (data) and Report (visuals) are independent
4. **Version Control**: TMDL format is JSON-based, perfect for git diffs and PRs

### Common Pitfalls

1. **Don't forget to save**: Changes to JSON files require saving before Power BI sees them
2. **Watch for duplicates**: Creating visuals/pages multiple times creates duplicates, not updates
3. **Test aggregations**: Always verify Sum vs Avg vs Count - wrong aggregation = wrong insights
4. **Check relationships**: Missing or incorrect relationships break cross-filtering
5. **Validate DAX**: Use `validate_dax` tool before creating measures

---

## Contributing

When adding new tools or analyzers:

1. Add the tool definition to `src/tools/index.ts`
2. Include `modelPath` parameter in inputSchema
3. Use `getTmdlService(args.modelPath)` in the handler
4. Add comprehensive JSDoc comments
5. Update this README with the new tool
6. Include examples of when to use the tool

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [your-repo/issues]
- Documentation: This README
- Examples: See `models/` directory for sample TMDL structures
