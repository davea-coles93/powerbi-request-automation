/**
 * Tool definitions and handlers for TMDL MCP Server
 * Enhanced with DAX analysis and quality tools
 */

import { TmdlService } from '../tmdl-service.js';
import {
  buildMeasureDependencyGraph,
  findUnusedMeasures,
  analyzeMeasureComplexity,
  detectMeasurePattern,
  checkDaxQuality,
  detectCircularDependencies,
} from '../analyzers/dax-analyzer.js';
import {
  analyzeModelQuality,
  checkNamingConventions,
} from '../analyzers/quality-analyzer.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

// Cache TmdlService instances to avoid reloading the same model
const serviceCache = new Map<string, TmdlService>();

/**
 * Get or create a TmdlService instance for the given model path
 */
async function getTmdlService(modelPath: string): Promise<TmdlService> {
  if (!serviceCache.has(modelPath)) {
    const service = new TmdlService(modelPath);
    await service.loadProject(); // Pre-load the project
    serviceCache.set(modelPath, service);
  }
  return serviceCache.get(modelPath)!;
}

// Standard modelPath property for all tools
const MODEL_PATH_PROPERTY = {
  modelPath: {
    type: 'string',
    description: 'Path to the .pbip file (e.g., C:/path/to/model.pbip)',
  },
};

export function createTools(): Tool[] {
  return [
    // List all tables
    {
      name: 'list_tables',
      description: 'List all tables in the TMDL model',
      inputSchema: {
        type: 'object',
        properties: MODEL_PATH_PROPERTY,
        required: ['modelPath'],
      },
      handler: async (args) => {
        const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        return {
          tables: project.model.tables.map(t => ({
            name: t.name,
            measureCount: t.measures.length,
            columnCount: t.columns.length,
          })),
        };
      },
    },

    // Get measures from a table
    {
      name: 'get_table_measures',
      description: 'Get all measures from a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
          },
        },
        required: ['tableName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const table = project.model.tables.find(t => t.name === args.tableName);

        if (!table) {
          throw new Error(`Table '${args.tableName}' not found`);
        }

        return {
          tableName: table.name,
          measures: table.measures.map(m => ({
            name: m.name,
            expression: m.expression,
            formatString: m.formatString,
            displayFolder: m.displayFolder,
            description: m.description,
          })),
        };
      },
    },

    // Get columns from a table
    {
      name: 'get_table_columns',
      description: 'Get all columns from a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
          },
        },
        required: ['tableName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const table = project.model.tables.find(t => t.name === args.tableName);

        if (!table) {
          throw new Error(`Table '${args.tableName}' not found`);
        }

        return {
          tableName: table.name,
          columns: table.columns.map(c => ({
            name: c.name,
            dataType: c.dataType,
            sourceColumn: c.sourceColumn,
            isHidden: c.isHidden,
            formatString: c.formatString,
          })),
        };
      },
    },

    // Read relationships
    {
      name: 'read_relationships',
      description: 'Get all relationships in the model',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Optional: Filter relationships for a specific table',
          },
        },
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        let relationships = project.model.relationships;

        if (args.tableName) {
          relationships = relationships.filter(
            r => r.fromTable === args.tableName || r.toTable === args.tableName
          );
        }

        return {
          relationships: relationships.map(r => ({
            from: `${r.fromTable}[${r.fromColumn}]`,
            to: `${r.toTable}[${r.toColumn}]`,
            isActive: r.isActive,
            crossFilterDirection: r.crossFilterDirection,
          })),
        };
      },
    },

    // Search measures
    {
      name: 'search_measures',
      description: 'Search for measures by name pattern (case-insensitive)',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Search pattern (case-insensitive substring match)',
          },
        },
        required: ['pattern'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const measures = tmdlService.getMeasures();
        const pattern = args.pattern.toLowerCase();

        const matches = measures.filter(m =>
          m.measure.name.toLowerCase().includes(pattern)
        );

        return {
          matches: matches.map(m => ({
            table: m.table,
            name: m.measure.name,
            expression: m.measure.expression,
            formatString: m.measure.formatString,
            displayFolder: m.measure.displayFolder,
          })),
          count: matches.length,
        };
      },
    },

    // Validate DAX expression (basic syntax check)
    {
      name: 'validate_dax',
      description: 'Perform basic validation on a DAX expression',
      inputSchema: {
        type: 'object',
        properties: {
          modelPath: { type: 'string', description: 'Path to the .pbip file' },
          expression: {
            type: 'string',
            description: 'The DAX expression to validate',
          },
        },
        required: ['modelPath', 'expression'],
      },
      handler: async (args) => {
        const tmdlService = await getTmdlService(args.modelPath);
        const expression = args.expression;

        // Basic validation checks
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check balanced parentheses
        let parenCount = 0;
        for (const char of expression) {
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (parenCount < 0) {
            errors.push('Unbalanced parentheses: too many closing parentheses');
            break;
          }
        }
        if (parenCount > 0) {
          errors.push('Unbalanced parentheses: missing closing parentheses');
        }

        // Check for common DAX functions
        const project = await tmdlService.getProject();
        const measureRefs = expression.match(/\[([^\]]+)\]/g) || [];
        const referencedMeasures = measureRefs.map((ref: string) => ref.slice(1, -1));

        // Check if referenced measures exist
        const allMeasures = tmdlService.getMeasures();
        const existingMeasureNames = new Set(allMeasures.map(m => m.measure.name));

        for (const refMeasure of referencedMeasures) {
          if (!existingMeasureNames.has(refMeasure)) {
            // Could be a column reference, not necessarily an error
            warnings.push(`Reference [${refMeasure}] not found in existing measures (might be a column)`);
          }
        }

        // Extract table references
        const tableRefs = expression.match(/([A-Za-z0-9_]+)\[/g) || [];
        const tableNames = tableRefs.map((ref: string) => ref.slice(0, -1));
        const referencedTables: string[] = Array.from(new Set(tableNames));

        // Check if tables exist
        const existingTableNames = new Set(project.model.tables.map(t => t.name));
        for (const refTable of referencedTables) {
          if (!existingTableNames.has(refTable)) {
            errors.push(`Table '${refTable}' not found in model`);
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          referencedMeasures,
          referencedTables,
        };
      },
    },

    // Check if measure name already exists
    {
      name: 'check_name_conflict',
      description: 'Check if a measure name already exists in the model',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'The measure name to check',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const measures = tmdlService.getMeasures();
        const existing = measures.find(m => m.measure.name === args.measureName);

        return {
          exists: !!existing,
          conflict: existing
            ? {
                table: existing.table,
                expression: existing.measure.expression,
              }
            : null,
        };
      },
    },

    // Get model context documentation
    {
      name: 'get_model_context',
      description: 'Read the MODEL_CONTEXT.md file if it exists',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const fs = await import('fs');
        const path = await import('path');

        const modelDir = path.dirname(project.projectPath);
        const contextPath = path.join(modelDir, 'MODEL_CONTEXT.md');

        if (fs.existsSync(contextPath as string)) {
          const content = await fs.promises.readFile(contextPath as string, 'utf-8');
          return { found: true, content };
        }

        return { found: false, content: null };
      },
    },

    // Get all measure tables
    {
      name: 'get_measure_tables',
      description: 'Get list of tables that contain measures',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const tables = tmdlService.getMeasureTables();
        return { tables };
      },
    },

    // Get table info (summary)
    {
      name: 'get_table_info',
      description: 'Get detailed information about a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
          },
        },
        required: ['tableName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const table = project.model.tables.find(t => t.name === args.tableName);

        if (!table) {
          throw new Error(`Table '${args.tableName}' not found`);
        }

        // Get relationships involving this table
        const relationships = project.model.relationships.filter(
          r => r.fromTable === table.name || r.toTable === table.name
        );

        return {
          name: table.name,
          measureCount: table.measures.length,
          columnCount: table.columns.length,
          relationshipCount: relationships.length,
          measures: table.measures.map(m => m.name),
          columns: table.columns.map(c => ({
            name: c.name,
            dataType: c.dataType,
            isHidden: c.isHidden,
          })),
          relationships: relationships.map(r => ({
            from: `${r.fromTable}[${r.fromColumn}]`,
            to: `${r.toTable}[${r.toColumn}]`,
            isActive: r.isActive,
          })),
        };
      },
    },

    // ========== ENHANCED METADATA TOOLS ==========

    // Get hierarchies from a table
    {
      name: 'get_table_hierarchies',
      description: 'Get all hierarchies defined in a table',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
          },
        },
        required: ['tableName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const hierarchies = tmdlService.getTableHierarchies(args.tableName);
        return {
          tableName: args.tableName,
          hierarchies: hierarchies.map(h => ({
            name: h.name,
            isHidden: h.isHidden,
            displayFolder: h.displayFolder,
            levels: h.levels.map(l => ({
              name: l.name,
              column: l.column,
              ordinal: l.ordinal,
            })),
          })),
          count: hierarchies.length,
        };
      },
    },

    // Get detailed column information
    {
      name: 'get_column_details',
      description: 'Get detailed information about a specific column including data category, sort-by, annotations',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
          },
          columnName: {
            type: 'string',
            description: 'Name of the column',
          },
        },
        required: ['tableName', 'columnName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const column = tmdlService.getColumnDetails(args.tableName, args.columnName);
        if (!column) {
          throw new Error(`Column '${args.columnName}' not found in table '${args.tableName}'`);
        }
        return {
          name: column.name,
          dataType: column.dataType,
          sourceColumn: column.sourceColumn,
          isHidden: column.isHidden,
          formatString: column.formatString,
          dataCategory: column.dataCategory,
          summarizeBy: column.summarizeBy,
          sortByColumn: column.sortByColumn,
          displayFolder: column.displayFolder,
          annotations: column.annotations,
          variation: column.variation,
        };
      },
    },

    // Get detailed relationship information
    {
      name: 'get_relationship_details',
      description: 'Get detailed relationship information including cardinality and cross-filter direction',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Optional: Filter by table name',
          },
        },
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const relationships = tmdlService.getDetailedRelationships();
        let filtered = relationships;

        if (args.tableName) {
          filtered = relationships.filter(
            r => r.fromTable === args.tableName || r.toTable === args.tableName
          );
        }

        return {
          relationships: filtered.map(r => ({
            name: r.name,
            from: `${r.fromTable}[${r.fromColumn}]`,
            to: `${r.toTable}[${r.toColumn}]`,
            fromCardinality: r.fromCardinality,
            toCardinality: r.toCardinality,
            isActive: r.isActive,
            crossFilterDirection: r.crossFilterDirection,
            securityFilteringBehavior: r.securityFilteringBehavior,
          })),
          count: filtered.length,
        };
      },
    },

    // List all tables with hierarchies
    {
      name: 'list_hierarchies',
      description: 'Get all hierarchies across all tables in the model',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const tablesWithHierarchies = tmdlService.getTablesWithHierarchies();
        return {
          tables: tablesWithHierarchies.map(t => ({
            table: t.table,
            hierarchies: t.hierarchies.map(h => ({
              name: h.name,
              levelCount: h.levels.length,
              levels: h.levels.map(l => l.name),
            })),
          })),
          totalHierarchies: tablesWithHierarchies.reduce((sum, t) => sum + t.hierarchies.length, 0),
        };
      },
    },

    // ========== DAX ANALYSIS TOOLS ==========

    // Get measure dependencies
    {
      name: 'get_measure_dependencies',
      description: 'Get dependency tree for a measure showing what it references and what references it',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to analyze',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const graph = buildMeasureDependencyGraph(project.model.tables);
        const dep = graph.get(args.measureName);

        if (!dep) {
          throw new Error(`Measure '${args.measureName}' not found`);
        }

        return {
          measureName: dep.measureName,
          table: dep.table,
          dependencies: {
            measures: dep.dependencies.measures,
            columns: dep.dependencies.columns,
            tables: dep.dependencies.tables,
          },
          dependents: dep.dependents,
          isLeaf: dep.dependents.length === 0,
          isRoot: dep.dependencies.measures.length === 0,
        };
      },
    },

    // Find unused measures
    {
      name: 'find_unused_measures',
      description: 'Find measures that are not referenced by any other measure',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const unused = findUnusedMeasures(project.model.tables);
        return {
          unusedMeasures: unused,
          count: unused.length,
        };
      },
    },

    // Analyze measure complexity
    {
      name: 'analyze_measure_complexity',
      description: 'Calculate complexity score for a measure with performance recommendations',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to analyze',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const measures = tmdlService.getMeasures();
        const measureData = measures.find(m => m.measure.name === args.measureName);

        if (!measureData) {
          throw new Error(`Measure '${args.measureName}' not found`);
        }

        const complexity = analyzeMeasureComplexity(measureData.measure, project.model.tables);
        return complexity;
      },
    },

    // Detect measure pattern
    {
      name: 'detect_measure_pattern',
      description: 'Identify common DAX patterns in a measure (e.g., time intelligence, aggregation, ratio)',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to analyze',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const measures = tmdlService.getMeasures();
        const measureData = measures.find(m => m.measure.name === args.measureName);

        if (!measureData) {
          throw new Error(`Measure '${args.measureName}' not found`);
        }

        const pattern = detectMeasurePattern(measureData.measure);
        return {
          measureName: args.measureName,
          pattern,
        };
      },
    },

    // Check DAX quality
    {
      name: 'check_dax_quality',
      description: 'Check for common DAX anti-patterns and quality issues in a measure',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to check',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const measures = tmdlService.getMeasures();
        const measureData = measures.find(m => m.measure.name === args.measureName);

        if (!measureData) {
          throw new Error(`Measure '${args.measureName}' not found`);
        }

        const issues = checkDaxQuality(measureData.measure);
        return {
          measureName: args.measureName,
          issues,
          issueCount: issues.length,
          hasErrors: issues.some(i => i.severity === 'error'),
          hasWarnings: issues.some(i => i.severity === 'warning'),
        };
      },
    },

    // Detect circular dependencies
    {
      name: 'detect_circular_dependencies',
      description: 'Detect circular dependencies in measure references',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const cycles = detectCircularDependencies(project.model.tables);
        return {
          circularDependencies: cycles,
          count: cycles.length,
          hasCircularDeps: cycles.length > 0,
        };
      },
    },

    // ========== MODEL QUALITY TOOLS ==========

    // Analyze model quality
    {
      name: 'analyze_model_quality',
      description: 'Analyze overall model quality with scoring and recommendations',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const quality = analyzeModelQuality(
          project.model.tables,
          project.model.relationships
        );
        return quality;
      },
    },

    // Check naming conventions
    {
      name: 'check_naming_conventions',
      description: 'Check if tables, measures, and columns follow naming conventions',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const issues = checkNamingConventions(project.model.tables);
        return {
          issues,
          count: issues.length,
          hasissues: issues.length > 0,
        };
      },
    },

    // ========== COMPOSITE "POWER TOOLS" ==========

    // Explore measure complete (combines multiple analyses)
    {
      name: 'explore_measure_complete',
      description: 'Complete analysis of a measure: dependencies, complexity, pattern, and quality - all in one call',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to analyze',
          },
        },
        required: ['measureName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const measures = tmdlService.getMeasures();
        const measureData = measures.find(m => m.measure.name === args.measureName);

        if (!measureData) {
          throw new Error(`Measure '${args.measureName}' not found`);
        }

        // Get all analyses in parallel
        const graph = buildMeasureDependencyGraph(project.model.tables);
        const dep = graph.get(args.measureName);
        const complexity = analyzeMeasureComplexity(measureData.measure, project.model.tables);
        const pattern = detectMeasurePattern(measureData.measure);
        const quality = checkDaxQuality(measureData.measure);

        // Build comprehensive summary
        const summaryParts = [];

        if (complexity.score > 70) {
          summaryParts.push(`Complex measure (${complexity.score}/100)`);
        } else if (complexity.score > 40) {
          summaryParts.push(`Moderate complexity (${complexity.score}/100)`);
        } else {
          summaryParts.push(`Simple measure (${complexity.score}/100)`);
        }

        if (pattern.type !== 'unknown') {
          summaryParts.push(`${pattern.type} pattern`);
        }

        if (quality.length > 0) {
          const errors = quality.filter(i => i.severity === 'error').length;
          const warnings = quality.filter(i => i.severity === 'warning').length;
          if (errors > 0) summaryParts.push(`${errors} error(s)`);
          if (warnings > 0) summaryParts.push(`${warnings} warning(s)`);
        }

        return {
          measureName: args.measureName,
          table: measureData.table,
          expression: measureData.measure.expression,
          formatString: measureData.measure.formatString,
          description: measureData.measure.description,
          displayFolder: measureData.measure.displayFolder,

          dependencies: dep ? {
            measures: dep.dependencies.measures,
            columns: dep.dependencies.columns,
            tables: dep.dependencies.tables,
            dependents: dep.dependents,
            isLeaf: dep.dependents.length === 0,
            isRoot: dep.dependencies.measures.length === 0,
          } : null,

          complexity: {
            score: complexity.score,
            factors: complexity.factors,
            recommendation: complexity.recommendation,
          },

          pattern: {
            type: pattern.type,
            subtype: pattern.subtype,
            confidence: pattern.confidence,
            description: pattern.description,
          },

          quality: {
            issues: quality,
            issueCount: quality.length,
            hasErrors: quality.some(i => i.severity === 'error'),
            hasWarnings: quality.some(i => i.severity === 'warning'),
          },

          summary: summaryParts.join(', '),
        };
      },
    },

    // Analyze model health complete (combines all health checks)
    {
      name: 'analyze_model_health_complete',
      description: 'Complete model health analysis: quality score, unused measures, circular dependencies, and naming issues - all in one call',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();

        // Run all analyses
        const quality = analyzeModelQuality(
          project.model.tables,
          project.model.relationships
        );
        const unused = findUnusedMeasures(project.model.tables);
        const circular = detectCircularDependencies(project.model.tables);
        const naming = checkNamingConventions(project.model.tables);

        // Build comprehensive summary
        const issueCount = unused.length + circular.length + naming.length;
        const summaryParts = [`Model health: ${quality.overallScore}/100`];

        if (unused.length > 0) {
          summaryParts.push(`${unused.length} unused measure(s)`);
        }
        if (circular.length > 0) {
          summaryParts.push(`${circular.length} circular dependency(ies)`);
        }
        if (naming.length > 0) {
          summaryParts.push(`${naming.length} naming issue(s)`);
        }
        if (issueCount === 0) {
          summaryParts.push('No issues found');
        }

        // Combine all recommendations
        const allRecommendations = [...quality.recommendations];

        if (unused.length > 0 && unused.length <= 5) {
          allRecommendations.push(
            `Remove or document unused measures: ${unused.map(m => m.measure).join(', ')}`
          );
        }

        if (circular.length > 0) {
          allRecommendations.push(
            `Fix circular dependencies: ${circular.map(c => c.description).join('; ')}`
          );
        }

        if (naming.length > 0 && naming.length <= 5) {
          naming.forEach(issue => {
            allRecommendations.push(`${issue.object}: ${issue.suggestion}`);
          });
        }

        return {
          overallScore: quality.overallScore,

          metrics: quality.metrics,

          issues: {
            unusedMeasures: unused,
            circularDependencies: circular,
            namingIssues: naming,
          },

          counts: {
            unused: unused.length,
            circular: circular.length,
            naming: naming.length,
            total: issueCount,
          },

          recommendations: allRecommendations,

          summary: summaryParts.join('. '),
        };
      },
    },

    // Explore table complete (combines all table information)
    {
      name: 'explore_table_complete',
      description: 'Complete table exploration: basic info, hierarchies, enhanced column details, and relationships - all in one call',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table to explore',
          },
        },
        required: ['tableName'],
      },
      handler: async (args) => {
              const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const table = project.model.tables.find(t => t.name === args.tableName);

        if (!table) {
          throw new Error(`Table '${args.tableName}' not found`);
        }

        // Get hierarchies
        const hierarchies = tmdlService.getTableHierarchies(args.tableName);

        // Get enhanced column details
        const enhancedColumns = table.columns.map(col => {
          const details = tmdlService.getColumnDetails(args.tableName, col.name);
          return details || col;
        });

        // Get relationships
        const relationships = project.model.relationships.filter(
          r => r.fromTable === args.tableName || r.toTable === args.tableName
        );

        // Analyze if it's a date table
        const hasDateColumns = enhancedColumns.some(c =>
          c.dataType === 'dateTime' ||
          c.dataCategory === 'Date' ||
          c.name.toLowerCase().includes('date')
        );
        const hasHierarchies = hierarchies.length > 0;
        const isLikelyDateTable = hasDateColumns && (hasHierarchies || args.tableName.toLowerCase().includes('date'));

        // Check for special column types
        const specialColumns = {
          dates: enhancedColumns.filter(c => c.dataCategory === 'Date' || c.dataType === 'dateTime').length,
          cities: enhancedColumns.filter(c => c.dataCategory === 'City').length,
          urls: enhancedColumns.filter(c => c.dataCategory === 'WebUrl' || c.dataCategory === 'ImageUrl').length,
          sortByColumns: enhancedColumns.filter(c => c.sortByColumn).length,
          hidden: enhancedColumns.filter(c => c.isHidden).length,
        };

        // Build summary
        const summaryParts = [];
        if (isLikelyDateTable) summaryParts.push('Date table');
        if (table.measures.length > 0) summaryParts.push(`${table.measures.length} measure(s)`);
        summaryParts.push(`${enhancedColumns.length} column(s)`);
        if (hierarchies.length > 0) summaryParts.push(`${hierarchies.length} hierarchy(ies)`);
        summaryParts.push(`${relationships.length} relationship(s)`);

        return {
          name: table.name,
          isHidden: table.isHidden,
          lineageTag: table.lineageTag,

          counts: {
            measures: table.measures.length,
            columns: enhancedColumns.length,
            hierarchies: hierarchies.length,
            relationships: relationships.length,
          },

          measures: table.measures.map(m => ({
            name: m.name,
            expression: m.expression,
            formatString: m.formatString,
            description: m.description,
            displayFolder: m.displayFolder,
          })),

          columns: enhancedColumns.map(c => ({
            name: c.name,
            dataType: c.dataType,
            sourceColumn: c.sourceColumn,
            isHidden: c.isHidden,
            formatString: c.formatString,
            dataCategory: c.dataCategory,
            sortByColumn: c.sortByColumn,
            summarizeBy: c.summarizeBy,
            displayFolder: c.displayFolder,
            hasVariation: !!c.variation,
            hasAnnotations: c.annotations && c.annotations.length > 0,
          })),

          hierarchies: hierarchies.map(h => ({
            name: h.name,
            isHidden: h.isHidden,
            displayFolder: h.displayFolder,
            levels: h.levels.map(l => ({
              name: l.name,
              column: l.column,
              ordinal: l.ordinal,
            })),
            levelCount: h.levels.length,
          })),

          relationships: relationships.map(r => ({
            name: r.name,
            direction: r.fromTable === args.tableName ? 'from' : 'to',
            from: `${r.fromTable}[${r.fromColumn}]`,
            to: `${r.toTable}[${r.toColumn}]`,
            fromCardinality: r.fromCardinality,
            toCardinality: r.toCardinality,
            isActive: r.isActive,
            crossFilterDirection: r.crossFilterDirection,
          })),

          specialColumns,

          characteristics: {
            isLikelyDateTable,
            hasHierarchies,
            hasMeasures: table.measures.length > 0,
            hasSpecialCategories: specialColumns.cities > 0 || specialColumns.urls > 0,
          },

          summary: summaryParts.join(', '),
        };
      },
    },
  ];
}
