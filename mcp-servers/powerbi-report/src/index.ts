#!/usr/bin/env node

/**
 * Power BI Report MCP Server
 * Provides tools to read and write Power BI Report files in PBIP format
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Import tool functions
import * as pageTools from './tools/page-tools.js';
import * as visualTools from './tools/visual-tools.js';
import * as filterTools from './tools/filter-tools.js';
import * as analysisTools from './tools/analysis-tools.js';

// Define tools
const tools: Tool[] = [
  // Page management
  {
    name: 'list_pages',
    description: 'List all pages in a Power BI report',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: {
          type: 'string',
          description: 'Path to the .Report folder',
        },
      },
      required: ['reportPath'],
    },
  },
  {
    name: 'get_page',
    description: 'Get details of a specific page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string', description: 'Path to the .Report folder' },
        pageName: { type: 'string', description: 'Name of the page (e.g., ReportSection1)' },
      },
      required: ['reportPath', 'pageName'],
    },
  },
  {
    name: 'create_page',
    description: 'Create a new page in the report. For page layout best practices (Z-pattern, 6-12 visuals, KPI placement), read powerbi-report://docs/design-principles resource.',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string', description: 'Path to the .Report folder' },
        pageName: { type: 'string', description: 'Internal name (e.g., ReportSection5)' },
        displayName: { type: 'string', description: 'Display name shown to users' },
        width: { type: 'number', description: 'Page width in pixels (default: 1280)' },
        height: { type: 'number', description: 'Page height in pixels (default: 720)' },
        insertAtIndex: { type: 'number', description: 'Optional index to insert at' },
      },
      required: ['reportPath', 'pageName', 'displayName'],
    },
  },
  {
    name: 'delete_page',
    description: 'Delete a page from the report',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
      },
      required: ['reportPath', 'pageName'],
    },
  },
  {
    name: 'rename_page',
    description: 'Rename a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        oldName: { type: 'string', description: 'Current page name' },
        newName: { type: 'string', description: 'New page name' },
        newDisplayName: { type: 'string', description: 'Optional new display name' },
      },
      required: ['reportPath', 'oldName', 'newName'],
    },
  },
  {
    name: 'set_active_page',
    description: 'Set which page is active/visible when report opens',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
      },
      required: ['reportPath', 'pageName'],
    },
  },

  // Visual management
  {
    name: 'list_visuals',
    description: 'List all visuals on a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
      },
      required: ['reportPath', 'pageName'],
    },
  },
  {
    name: 'get_visual',
    description: 'Get full details of a specific visual',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        containerName: { type: 'string', description: 'Visual container name (e.g., VisualContainer1)' },
      },
      required: ['reportPath', 'pageName', 'containerName'],
    },
  },
  {
    name: 'create_visual',
    description: 'Create a new visual on a page. NOTE: Creates visuals with minimal styling. For professional formatting (drop shadows, colors, data bars), see powerbi-report://docs/styling-guide and powerbi-report://docs/visual-examples resources.',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        visualType: {
          type: 'string',
          description: 'Visual type: card, table, barChart, columnChart, lineChart, pieChart, donutChart, etc.',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
            z: { type: 'number', description: 'Z-order (layer)' },
          },
          required: ['x', 'y', 'width', 'height'],
        },
        query: { type: 'object', description: 'Optional query configuration' },
        title: { type: 'string', description: 'Optional visual title' },
        containerName: { type: 'string', description: 'Optional container name (auto-generated if omitted)' },
      },
      required: ['reportPath', 'pageName', 'visualType', 'position'],
    },
  },
  {
    name: 'update_visual',
    description: 'Update an existing visual',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        containerName: { type: 'string' },
        position: { type: 'object', description: 'Optional new position' },
        query: { type: 'object', description: 'Optional new query' },
        objects: { type: 'object', description: 'Optional visual objects/formatting' },
        title: { type: 'string', description: 'Optional new title' },
      },
      required: ['reportPath', 'pageName', 'containerName'],
    },
  },
  {
    name: 'delete_visual',
    description: 'Delete a visual from a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        containerName: { type: 'string' },
      },
      required: ['reportPath', 'pageName', 'containerName'],
    },
  },
  {
    name: 'move_visual',
    description: 'Move/resize a visual',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        containerName: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number', description: 'Optional new width' },
        height: { type: 'number', description: 'Optional new height' },
      },
      required: ['reportPath', 'pageName', 'containerName', 'x', 'y'],
    },
  },

  // Specialized visual creators
  {
    name: 'create_card_visual',
    description: 'Create a card visual showing a single measure value. Creates basic card with minimal styling. For professional appearance (drop shadows, larger fonts), read powerbi-report://docs/visual-examples resource for complete template.',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        measureEntity: { type: 'string', description: 'Table containing the measure' },
        measureProperty: { type: 'string', description: 'Measure name' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
            z: { type: 'number', description: 'Z-order (default: 0)' },
          },
          required: ['x', 'y', 'width', 'height'],
        },
        title: { type: 'string', description: 'Optional card title' },
      },
      required: ['reportPath', 'pageName', 'measureEntity', 'measureProperty', 'position'],
    },
  },
  {
    name: 'create_table_visual',
    description: 'Create a table visual with specified columns. Creates basic table. For professional styling (data bars, custom widths, larger fonts), see powerbi-report://docs/visual-examples.',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity: { type: 'string', description: 'Table name' },
              property: { type: 'string', description: 'Column name' },
            },
            required: ['entity', 'property'],
          },
        },
        position: { type: 'object' },
        title: { type: 'string' },
      },
      required: ['reportPath', 'pageName', 'columns', 'position'],
    },
  },
  {
    name: 'create_bar_chart_visual',
    description: 'Create a bar chart visual. Creates basic bar chart. For professional styling (drop shadows, colors, cross-filtering), read powerbi-report://docs/styling-guide resource.',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        categoryEntity: { type: 'string', description: 'Table for category axis' },
        categoryProperty: { type: 'string', description: 'Column for category axis' },
        valueEntity: { type: 'string', description: 'Table for value axis' },
        valueProperty: { type: 'string', description: 'Column/measure for value axis' },
        position: { type: 'object' },
        aggregation: { type: 'number', description: 'Aggregation function: 0=Sum, 1=Avg, 2=Min, 3=Max, 4=Count (default: 0)' },
        title: { type: 'string' },
      },
      required: ['reportPath', 'pageName', 'categoryEntity', 'categoryProperty', 'valueEntity', 'valueProperty', 'position'],
    },
  },

  // Filter management
  {
    name: 'get_page_filters',
    description: 'Get all filters applied to a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
      },
      required: ['reportPath', 'pageName'],
    },
  },
  {
    name: 'add_page_filter',
    description: 'Add a filter to a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        entity: { type: 'string', description: 'Table name' },
        property: { type: 'string', description: 'Column name' },
        filterType: { type: 'string', description: 'Filter type: Categorical, Advanced, TopN, RelativeDate (default: Categorical)' },
      },
      required: ['reportPath', 'pageName', 'entity', 'property'],
    },
  },
  {
    name: 'remove_page_filter',
    description: 'Remove a specific filter from a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
        filterName: { type: 'string', description: 'Name of filter to remove (e.g., Filter1)' },
      },
      required: ['reportPath', 'pageName', 'filterName'],
    },
  },
  {
    name: 'clear_page_filters',
    description: 'Remove all filters from a page',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
        pageName: { type: 'string' },
      },
      required: ['reportPath', 'pageName'],
    },
  },

  // Analysis
  {
    name: 'analyze_report',
    description: 'Get comprehensive analysis of report structure',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
      },
      required: ['reportPath'],
    },
  },
  {
    name: 'get_report_summary',
    description: 'Get high-level summary of report',
    inputSchema: {
      type: 'object',
      properties: {
        reportPath: { type: 'string' },
      },
      required: ['reportPath'],
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'powerbi-report-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Get directory path for resources
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..');

// Handle list_resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'powerbi-report://docs/design-principles',
        name: 'Power BI Design Principles & Best Practices',
        description: 'Research-based guidelines for professional dashboards including layout, colors, typography, accessibility, and visual selection',
        mimeType: 'text/markdown',
      },
      {
        uri: 'powerbi-report://docs/styling-guide',
        name: 'Visual Styling Guide',
        description: 'Complete guide to professional Power BI visual styling with drop shadows, data bars, colors, fonts, and implementation checklist',
        mimeType: 'text/markdown',
      },
      {
        uri: 'powerbi-report://docs/visual-examples',
        name: 'Visual Examples - Copy-Paste Templates',
        description: '10 complete, production-ready JSON templates for all major visual types with professional styling applied',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Handle read_resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  let filePath: string;
  let fileName: string;

  switch (uri) {
    case 'powerbi-report://docs/design-principles':
      fileName = 'DESIGN_PRINCIPLES.md';
      break;
    case 'powerbi-report://docs/styling-guide':
      fileName = 'VISUAL_STYLING_GUIDE.md';
      break;
    case 'powerbi-report://docs/visual-examples':
      fileName = 'VISUAL_EXAMPLES.md';
      break;
    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }

  filePath = path.join(docsDir, fileName);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to read resource ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('Arguments are required');
  }

  try {
    let result: any;
    const a = args as any; // Type assertion for args

    switch (name) {
      // Page tools
      case 'list_pages':
        result = await pageTools.listPages(a.reportPath);
        break;
      case 'get_page':
        result = await pageTools.getPage(a.reportPath, a.pageName);
        break;
      case 'create_page':
        result = await pageTools.createPage(a.reportPath, a.pageName, a.displayName, a.width, a.height, a.insertAtIndex);
        break;
      case 'delete_page':
        result = await pageTools.deletePage(a.reportPath, a.pageName);
        break;
      case 'rename_page':
        result = await pageTools.renamePage(a.reportPath, a.oldName, a.newName, a.newDisplayName);
        break;
      case 'set_active_page':
        result = await pageTools.setActivePage(a.reportPath, a.pageName);
        break;

      // Visual tools
      case 'list_visuals':
        result = await visualTools.listVisuals(a.reportPath, a.pageName);
        break;
      case 'get_visual':
        result = await visualTools.getVisual(a.reportPath, a.pageName, a.containerName);
        break;
      case 'create_visual':
        result = await visualTools.createVisual(
          a.reportPath,
          a.pageName,
          a.visualType,
          a.position,
          a.query,
          a.title,
          a.containerName
        );
        break;
      case 'update_visual':
        result = await visualTools.updateVisual(a.reportPath, a.pageName, a.containerName, {
          position: a.position,
          query: a.query,
          objects: a.objects,
          title: a.title,
        });
        break;
      case 'delete_visual':
        result = await visualTools.deleteVisual(a.reportPath, a.pageName, a.containerName);
        break;
      case 'move_visual':
        result = await visualTools.moveVisual(
          a.reportPath,
          a.pageName,
          a.containerName,
          a.x,
          a.y,
          a.width,
          a.height
        );
        break;
      case 'create_card_visual':
        result = await visualTools.createCardVisual(
          a.reportPath,
          a.pageName,
          a.measureEntity,
          a.measureProperty,
          a.position,
          a.title
        );
        break;
      case 'create_table_visual':
        result = await visualTools.createTableVisual(
          a.reportPath,
          a.pageName,
          a.columns,
          a.position,
          a.title
        );
        break;
      case 'create_bar_chart_visual':
        result = await visualTools.createBarChartVisual(
          a.reportPath,
          a.pageName,
          a.categoryEntity,
          a.categoryProperty,
          a.valueEntity,
          a.valueProperty,
          a.position,
          a.aggregation,
          a.title
        );
        break;

      // Filter tools
      case 'get_page_filters':
        result = await filterTools.getPageFilters(a.reportPath, a.pageName);
        break;
      case 'add_page_filter':
        result = await filterTools.addPageFilter(
          a.reportPath,
          a.pageName,
          a.entity,
          a.property,
          a.filterType
        );
        break;
      case 'remove_page_filter':
        result = await filterTools.removePageFilter(a.reportPath, a.pageName, a.filterName);
        break;
      case 'clear_page_filters':
        result = await filterTools.clearPageFilters(a.reportPath, a.pageName);
        break;

      // Analysis tools
      case 'analyze_report':
        result = await analysisTools.analyzeReport(a.reportPath);
        break;
      case 'get_report_summary':
        result = await analysisTools.getReportSummary(a.reportPath);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Power BI Report MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
