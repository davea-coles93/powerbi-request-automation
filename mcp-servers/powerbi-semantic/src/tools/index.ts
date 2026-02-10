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

    // ========== WRITE OPERATIONS ==========

    // Format DAX expression
    {
      name: 'format_dax',
      description: 'Format a DAX expression for consistent style and readability',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The DAX expression to format',
          },
          style: {
            type: 'string',
            enum: ['compact', 'readable'],
            description: 'Formatting style: compact (single line) or readable (multi-line with indentation)',
          },
        },
        required: ['expression'],
      },
      handler: async (args) => {
        const expr = args.expression.trim();
        const style = args.style || 'readable';

        if (style === 'compact') {
          // Compact: remove extra whitespace, single line
          const compact = expr
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ')
            .replace(/\s*\(\s*/g, '(')
            .replace(/\s*\)\s*/g, ')')
            .replace(/\s*=\s*/g, ' = ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' - ')
            .replace(/\s*\*\s*/g, ' * ')
            .replace(/\s*\/\s*/g, ' / ')
            .trim();

          return {
            formatted: compact,
            style: 'compact',
            lineCount: 1,
          };
        } else {
          // Readable: multi-line with proper indentation
          let formatted = expr;
          let depth = 0;
          const lines: string[] = [];
          let currentLine = '';
          let inString = false;
          let stringChar = '';

          for (let i = 0; i < formatted.length; i++) {
            const char = formatted[i];
            const prevChar = i > 0 ? formatted[i - 1] : '';

            // Track string literals to avoid formatting inside them
            if ((char === '"' || char === "'") && prevChar !== '\\') {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
              }
            }

            if (!inString) {
              // Add line breaks after commas in function calls
              if (char === ',' && depth > 0) {
                currentLine += char;
                lines.push('\t'.repeat(depth) + currentLine.trim());
                currentLine = '';
                continue;
              }

              // Increase depth on opening parenthesis
              if (char === '(') {
                currentLine += char;
                depth++;
                // Check if next content should be on new line
                const remaining = formatted.substring(i + 1).trim();
                if (remaining.length > 40 || remaining.includes(',')) {
                  lines.push('\t'.repeat(depth - 1) + currentLine.trim());
                  currentLine = '';
                }
                continue;
              }

              // Decrease depth on closing parenthesis
              if (char === ')') {
                depth--;
                if (currentLine.trim()) {
                  lines.push('\t'.repeat(depth + 1) + currentLine.trim());
                  currentLine = '';
                }
                currentLine += char;
                continue;
              }
            }

            currentLine += char;
          }

          // Add any remaining content
          if (currentLine.trim()) {
            lines.push('\t'.repeat(depth) + currentLine.trim());
          }

          // Join lines and clean up
          formatted = lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n\t');

          // Add consistent spacing around operators
          formatted = formatted
            .replace(/\s*=\s*/g, ' = ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' - ')
            .replace(/\s*\*\s*/g, ' * ')
            .replace(/\s*\/\s*/g, ' / ')
            .replace(/\s*&&\s*/g, ' && ')
            .replace(/\s*\|\|\s*/g, ' || ');

          return {
            formatted,
            style: 'readable',
            lineCount: formatted.split('\n').length,
          };
        }
      },
    },

    // Suggest measure table placement
    {
      name: 'suggest_measure_table',
      description: 'Suggest which table a new measure should be placed in based on model conventions and dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          measureName: {
            type: 'string',
            description: 'Name of the measure to place',
          },
          expression: {
            type: 'string',
            description: 'DAX expression for the measure',
          },
        },
        required: ['measureName', 'expression'],
      },
      handler: async (args) => {
        const tmdlService = await getTmdlService(args.modelPath);
        const project = await tmdlService.getProject();
        const tables = project.model.tables;

        // Extract table references from expression
        const tableRefs = args.expression.match(/([A-Za-z0-9_]+)\[/g) || [];
        const referencedTables = Array.from(new Set(
          tableRefs.map((ref: string) => ref.slice(0, -1))
        ));

        // Check for existing measure tables
        const measureTables = tables
          .filter(t => t.measures.length > 0)
          .map(t => ({
            name: t.name,
            measureCount: t.measures.length,
            columnCount: t.columns.length,
            hasMeasuresOnly: t.columns.length === 0,
          }));

        // Scoring logic
        const scores = tables.map(table => {
          let score = 0;
          const reasons: string[] = [];

          // Check if it's a dedicated measures table
          if (table.measures.length > 0 && table.columns.length === 0) {
            score += 50;
            reasons.push('Dedicated measures table');
          }

          // Check if measure name matches table name pattern
          if (args.measureName.toLowerCase().includes(table.name.toLowerCase())) {
            score += 30;
            reasons.push(`Measure name contains '${table.name}'`);
          }

          // Check if expression references this table
          if (referencedTables.includes(table.name)) {
            score += 25;
            reasons.push(`Expression references ${table.name}`);
          }

          // Check if table already has many measures (convention established)
          if (table.measures.length > 5) {
            score += 15;
            reasons.push(`Already has ${table.measures.length} measures`);
          }

          // Check for "_Measures" or "Measures" table name
          if (table.name.toLowerCase().includes('measure')) {
            score += 40;
            reasons.push('Measures table by convention');
          }

          // Prefer fact tables over dimension tables for business metrics
          if (table.measures.length > 0 && table.columns.length > 10) {
            score += 10;
            reasons.push('Fact table with existing measures');
          }

          return { table: table.name, score, reasons };
        });

        // Sort by score
        scores.sort((a, b) => b.score - a.score);
        const topSuggestion = scores[0];
        const alternatives = scores.slice(1, 4).filter(s => s.score > 0);

        return {
          recommended: topSuggestion.table,
          score: topSuggestion.score,
          reasoning: topSuggestion.reasons,
          referencedTables,
          alternatives: alternatives.map(a => ({
            table: a.table,
            score: a.score,
            reasons: a.reasons,
          })),
          measureTables: measureTables.map(mt => mt.name),
          suggestion: topSuggestion.score > 30
            ? `Place in '${topSuggestion.table}' table`
            : `Consider creating a dedicated Measures table`,
        };
      },
    },

    // Manage calculated column (create/update/delete)
    {
      name: 'manage_calculated_column',
      description: 'Create, update, or delete a calculated column in a TMDL table file',
      inputSchema: {
        type: 'object',
        properties: {
          model_path: {
            type: 'string',
            description: 'Path to the semantic model directory (.SemanticModel)',
          },
          table_name: {
            type: 'string',
            description: 'Name of the table',
          },
          column_name: {
            type: 'string',
            description: 'Name of the calculated column',
          },
          operation: {
            type: 'string',
            enum: ['create', 'update', 'delete'],
            description: 'Operation to perform',
          },
          expression: {
            type: 'string',
            description: 'DAX expression for the column (required for create/update)',
          },
          data_type: {
            type: 'string',
            enum: ['string', 'int64', 'double', 'decimal', 'boolean', 'dateTime'],
            description: 'Data type of the calculated column',
          },
          format_string: {
            type: 'string',
            description: 'Optional format string',
          },
          is_hidden: {
            type: 'boolean',
            description: 'Whether the column should be hidden',
          },
          description: {
            type: 'string',
            description: 'Optional description/documentation',
          },
        },
        required: ['model_path', 'table_name', 'column_name', 'operation'],
      },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');

        const tableFilePath = path.join(
          args.model_path,
          'definition',
          'tables',
          `${args.table_name}.tmdl`
        );

        if (!fs.existsSync(tableFilePath)) {
          throw new Error(`Table file not found: ${tableFilePath}`);
        }

        let content = await fs.promises.readFile(tableFilePath, 'utf-8');
        const lines = content.split('\n');

        if (args.operation === 'create') {
          // Check if column already exists
          const escapedName = args.column_name.replace(/'/g, "\\'");
          const columnPattern = new RegExp(`^\\s*column\\s+'${escapedName}'`, 'm');
          if (columnPattern.test(content)) {
            throw new Error(`Column '${args.column_name}' already exists`);
          }

          if (!args.expression) {
            throw new Error('Expression is required for create operation');
          }

          // Find insertion point (after last column or before first measure)
          let insertIndex = -1;
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].match(/^\s*column\s+/)) {
              insertIndex = i + 1;
              // Skip to end of this column block
              for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].match(/^\s*(column|measure|partition|hierarchy)\s+/) ||
                    (lines[j].trim() && !lines[j].startsWith('\t\t'))) {
                  insertIndex = j;
                  break;
                }
              }
              break;
            }
          }

          // If no columns found, insert before first measure
          if (insertIndex === -1) {
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].match(/^\s*measure\s+/)) {
                insertIndex = i;
                break;
              }
            }
          }

          // If still not found, insert after table declaration
          if (insertIndex === -1) {
            insertIndex = 3;
          }

          // Generate unique lineageTag
          const lineageTag = `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

          // Build column block
          const columnLines = [
            `\tcolumn '${args.column_name}' = ${args.expression}`,
          ];

          if (args.data_type) {
            columnLines.push(`\t\tdataType: ${args.data_type}`);
          }

          if (args.format_string) {
            columnLines.push(`\t\tformatString: ${args.format_string}`);
          }

          if (args.is_hidden) {
            columnLines.push(`\t\tisHidden`);
          }

          if (args.description) {
            columnLines.push(`\t\t/// ${args.description}`);
          }

          columnLines.push(`\t\tlineageTag: ${lineageTag}`);
          columnLines.push(''); // Empty line after column

          // Insert the column
          lines.splice(insertIndex, 0, ...columnLines);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'create',
            column: args.column_name,
            table: args.table_name,
            message: `Created calculated column '${args.column_name}' in table '${args.table_name}'`,
          };
        } else if (args.operation === 'update') {
          // Find the column block
          const escapedName = args.column_name.replace(/'/g, "\\'");
          const columnStartPattern = new RegExp(`^\\s*column\\s+'${escapedName}'`, 'm');

          if (!columnStartPattern.test(content)) {
            throw new Error(`Column '${args.column_name}' not found`);
          }

          // Find start and end of column block
          let columnStart = -1;
          let columnEnd = -1;
          let inColumn = false;
          let baseIndent = '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.match(new RegExp(`^\\s*column\\s+'${escapedName}'`))) {
              columnStart = i;
              inColumn = true;
              baseIndent = line.match(/^\s*/)?.[0] || '';
              continue;
            }

            if (inColumn) {
              if (line.match(/^\s*(measure|column|partition|hierarchy)\s+/) ||
                  (line.trim() && !line.startsWith(baseIndent + '\t'))) {
                columnEnd = i;
                break;
              }
            }
          }

          if (columnStart === -1) {
            throw new Error(`Column '${args.column_name}' not found`);
          }

          if (columnEnd === -1) {
            columnEnd = lines.length;
          }

          // Build updated column block
          const columnLines = [
            `${baseIndent}column '${args.column_name}'${args.expression ? ` = ${args.expression}` : ''}`,
          ];

          if (args.data_type) {
            columnLines.push(`${baseIndent}\t\tdataType: ${args.data_type}`);
          }

          if (args.format_string) {
            columnLines.push(`${baseIndent}\t\tformatString: ${args.format_string}`);
          }

          if (args.is_hidden !== undefined) {
            if (args.is_hidden) {
              columnLines.push(`${baseIndent}\t\tisHidden`);
            }
          }

          if (args.description) {
            columnLines.push(`${baseIndent}\t\t/// ${args.description}`);
          }

          // Preserve existing lineageTag
          const oldContent = lines.slice(columnStart, columnEnd).join('\n');
          const lineageMatch = oldContent.match(/lineageTag:\s*([a-zA-Z0-9]+)/);
          const lineageTag = lineageMatch ? lineageMatch[1] : `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
          columnLines.push(`${baseIndent}\t\tlineageTag: ${lineageTag}`);
          columnLines.push('');

          // Replace the column block
          lines.splice(columnStart, columnEnd - columnStart, ...columnLines);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'update',
            column: args.column_name,
            table: args.table_name,
            message: `Updated calculated column '${args.column_name}' in table '${args.table_name}'`,
          };
        } else if (args.operation === 'delete') {
          // Find and delete the column block
          const escapedName = args.column_name.replace(/'/g, "\\'");
          const columnStartPattern = new RegExp(`^\\s*column\\s+'${escapedName}'`, 'm');

          if (!columnStartPattern.test(content)) {
            throw new Error(`Column '${args.column_name}' not found`);
          }

          // Find start and end of column block
          let columnStart = -1;
          let columnEnd = -1;
          let inColumn = false;
          let baseIndent = '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.match(new RegExp(`^\\s*column\\s+'${escapedName}'`))) {
              columnStart = i;
              inColumn = true;
              baseIndent = line.match(/^\s*/)?.[0] || '';
              continue;
            }

            if (inColumn) {
              if (line.match(/^\s*(measure|column|partition|hierarchy)\s+/) ||
                  (line.trim() && !line.startsWith(baseIndent + '\t'))) {
                columnEnd = i;
                break;
              }
            }
          }

          if (columnStart === -1) {
            throw new Error(`Column '${args.column_name}' not found`);
          }

          if (columnEnd === -1) {
            columnEnd = lines.length;
          }

          // Remove the column block
          if (columnEnd < lines.length && lines[columnEnd].trim() === '') {
            columnEnd++;
          }
          lines.splice(columnStart, columnEnd - columnStart);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'delete',
            column: args.column_name,
            table: args.table_name,
            message: `Deleted calculated column '${args.column_name}' from table '${args.table_name}'`,
          };
        } else {
          throw new Error(`Unknown operation '${args.operation}'`);
        }
      },
    },

    // Manage measure (create/update/delete)
    {
      name: 'manage_measure',
      description: 'Create, update, or delete a measure in a TMDL table file',
      inputSchema: {
        type: 'object',
        properties: {
          model_path: {
            type: 'string',
            description: 'Path to the semantic model directory (.SemanticModel)',
          },
          table_name: {
            type: 'string',
            description: 'Name of the table',
          },
          measure_name: {
            type: 'string',
            description: 'Name of the measure',
          },
          operation: {
            type: 'string',
            enum: ['create', 'update', 'delete'],
            description: 'Operation to perform',
          },
          expression: {
            type: 'string',
            description: 'DAX expression for the measure (required for create/update)',
          },
          format_string: {
            type: 'string',
            description: 'Optional format string (e.g., "$#,##0", "0.00%")',
          },
          description: {
            type: 'string',
            description: 'Optional description/documentation',
          },
        },
        required: ['model_path', 'table_name', 'measure_name', 'operation'],
      },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');

        const tableFilePath = path.join(
          args.model_path,
          'definition',
          'tables',
          `${args.table_name}.tmdl`
        );

        if (!fs.existsSync(tableFilePath)) {
          throw new Error(`Table file not found: ${tableFilePath}`);
        }

        let content = await fs.promises.readFile(tableFilePath, 'utf-8');
        const lines = content.split('\n');

        if (args.operation === 'create') {
          // Check if measure already exists
          const escapedName = args.measure_name.replace(/'/g, "\\'");
          const measurePattern = new RegExp(`^\\s*measure\\s+'${escapedName}'\\s*=`, 'm');
          if (measurePattern.test(content)) {
            throw new Error(`Measure '${args.measure_name}' already exists`);
          }

          // Find the first occurrence of a measure to insert before
          let insertIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^\s*measure\s+/)) {
              insertIndex = i;
              break;
            }
          }

          // If no measures, insert before first column
          if (insertIndex === -1) {
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].match(/^\s*column\s+/)) {
                insertIndex = i;
                break;
              }
            }
          }

          // If still not found, insert after table declaration
          if (insertIndex === -1) {
            insertIndex = 3; // After lineageTag usually
          }

          // Generate unique lineageTag
          const lineageTag = `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

          // Build measure block
          const measureLines = [
            `\tmeasure '${args.measure_name}' = ${args.expression}`,
          ];

          if (args.format_string) {
            measureLines.push(`\t\tformatString: ${args.format_string}`);
          }

          if (args.description) {
            measureLines.push(`\t\t/// ${args.description}`);
          }

          measureLines.push(`\t\tlineageTag: ${lineageTag}`);
          measureLines.push(''); // Empty line after measure

          // Insert the measure
          lines.splice(insertIndex, 0, ...measureLines);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'create',
            measure: args.measure_name,
            table: args.table_name,
            message: `Created measure '${args.measure_name}' in table '${args.table_name}'`,
          };
        } else if (args.operation === 'update') {
          // Find the measure block
          const escapedName = args.measure_name.replace(/'/g, "\\'");
          const measureStartPattern = new RegExp(`^\\s*measure\\s+'${escapedName}'\\s*=`, 'm');

          if (!measureStartPattern.test(content)) {
            throw new Error(`Measure '${args.measure_name}' not found`);
          }

          // Find start and end of measure block
          let measureStart = -1;
          let measureEnd = -1;
          let inMeasure = false;
          let baseIndent = '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.match(new RegExp(`^\\s*measure\\s+'${escapedName}'\\s*=`))) {
              measureStart = i;
              inMeasure = true;
              baseIndent = line.match(/^\s*/)?.[0] || '';
              continue;
            }

            if (inMeasure) {
              // Check if we've reached the next measure, column, or dedented line
              if (line.match(/^\s*(measure|column|partition|hierarchy)\s+/) ||
                  (line.trim() && !line.startsWith(baseIndent + '\t'))) {
                measureEnd = i;
                break;
              }
            }
          }

          if (measureStart === -1) {
            throw new Error(`Measure '${args.measure_name}' not found`);
          }

          // If no end found, measure goes to end of relevant section
          if (measureEnd === -1) {
            measureEnd = lines.length;
          }

          // Build updated measure block
          const measureLines = [
            `${baseIndent}measure '${args.measure_name}' = ${args.expression}`,
          ];

          if (args.format_string) {
            measureLines.push(`${baseIndent}\t\tformatString: ${args.format_string}`);
          }

          if (args.description) {
            measureLines.push(`${baseIndent}\t\t/// ${args.description}`);
          }

          // Preserve existing lineageTag if found
          const oldContent = lines.slice(measureStart, measureEnd).join('\n');
          const lineageMatch = oldContent.match(/lineageTag:\s*([a-zA-Z0-9]+)/);
          const lineageTag = lineageMatch ? lineageMatch[1] : `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
          measureLines.push(`${baseIndent}\t\tlineageTag: ${lineageTag}`);
          measureLines.push(''); // Empty line after measure

          // Replace the measure block
          lines.splice(measureStart, measureEnd - measureStart, ...measureLines);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'update',
            measure: args.measure_name,
            table: args.table_name,
            message: `Updated measure '${args.measure_name}' in table '${args.table_name}'`,
          };
        } else if (args.operation === 'delete') {
          // Find and delete the measure block
          const escapedName = args.measure_name.replace(/'/g, "\\'");
          const measureStartPattern = new RegExp(`^\\s*measure\\s+'${escapedName}'\\s*=`, 'm');

          if (!measureStartPattern.test(content)) {
            throw new Error(`Measure '${args.measure_name}' not found`);
          }

          // Find start and end of measure block
          let measureStart = -1;
          let measureEnd = -1;
          let inMeasure = false;
          let baseIndent = '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.match(new RegExp(`^\\s*measure\\s+'${escapedName}'\\s*=`))) {
              measureStart = i;
              inMeasure = true;
              baseIndent = line.match(/^\s*/)?.[0] || '';
              continue;
            }

            if (inMeasure) {
              // Check if we've reached the next measure, column, or dedented line
              if (line.match(/^\s*(measure|column|partition|hierarchy)\s+/) ||
                  (line.trim() && !line.startsWith(baseIndent + '\t'))) {
                measureEnd = i;
                break;
              }
            }
          }

          if (measureStart === -1) {
            throw new Error(`Measure '${args.measure_name}' not found`);
          }

          // If no end found, measure goes to end of relevant section
          if (measureEnd === -1) {
            measureEnd = lines.length;
          }

          // Remove the measure block (including trailing empty line if present)
          if (measureEnd < lines.length && lines[measureEnd].trim() === '') {
            measureEnd++;
          }
          lines.splice(measureStart, measureEnd - measureStart);

          // Write back
          content = lines.join('\n');
          await fs.promises.writeFile(tableFilePath, content, 'utf-8');

          return {
            success: true,
            operation: 'delete',
            measure: args.measure_name,
            table: args.table_name,
            message: `Deleted measure '${args.measure_name}' from table '${args.table_name}'`,
          };
        } else {
          throw new Error(`Unknown operation '${args.operation}'`);
        }
      },
    },
  ];
}
