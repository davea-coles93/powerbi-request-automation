/**
 * DAX Analysis Tools
 * Dependency graphs, complexity scoring, pattern recognition
 */

import {
  TmdlMeasure,
  TmdlTable,
  MeasureDependency,
  DaxComplexity,
  DaxPattern,
  DaxIssue,
} from '../types.js';

/**
 * Extract measure references from a DAX expression
 */
function extractMeasureReferences(expression: string): string[] {
  const measures: string[] = [];

  // Match [MeasureName] patterns
  const bracketPattern = /\[([^\]]+)\]/g;
  let match;

  while ((match = bracketPattern.exec(expression)) !== null) {
    const ref = match[1];
    // Filter out obvious column references (contain periods or special chars)
    if (!ref.includes('.') && !ref.includes('::')) {
      measures.push(ref);
    }
  }

  return Array.from(new Set(measures));
}

/**
 * Extract table references from a DAX expression
 */
function extractTableReferences(expression: string): string[] {
  const tables: string[] = [];

  // Match 'TableName' or TableName patterns before [ or (
  const patterns = [
    /'([^']+)'\[/g,  // 'Table Name'[Column]
    /([A-Za-z_]\w+)\[/g,  // TableName[Column]
    /'([^']+)'\(/g,  // 'Table Name'(
    /([A-Z][A-Za-z_]\w*)\s*\(/g,  // TableName(
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(expression)) !== null) {
      const tableName = match[1];
      if (tableName && !isCommonDaxFunction(tableName)) {
        tables.push(tableName);
      }
    }
  }

  return Array.from(new Set(tables));
}

/**
 * Extract column references from a DAX expression
 */
function extractColumnReferences(expression: string): Array<{ table: string; column: string }> {
  const columns: Array<{ table: string; column: string }> = [];

  // Match Table[Column] or 'Table Name'[Column]
  const patterns = [
    /'([^']+)'\[([^\]]+)\]/g,  // 'Table Name'[Column]
    /([A-Za-z_]\w+)\[([^\]]+)\]/g,  // TableName[Column]
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(expression)) !== null) {
      const table = match[1];
      const column = match[2];
      if (table && column) {
        columns.push({ table, column });
      }
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return columns.filter(c => {
    const key = `${c.table}.${c.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check if a name is a common DAX function
 */
function isCommonDaxFunction(name: string): boolean {
  const commonFunctions = new Set([
    'SUM', 'SUMX', 'CALCULATE', 'FILTER', 'ALL', 'ALLEXCEPT', 'VALUES', 'DISTINCT',
    'COUNT', 'COUNTROWS', 'AVERAGE', 'AVERAGEX', 'MIN', 'MAX', 'IF', 'SWITCH',
    'DIVIDE', 'RELATED', 'RELATEDTABLE', 'DATEADD', 'DATESYTD', 'TOTALYTD',
    'SAMEPERIODLASTYEAR', 'PARALLELPERIOD', 'FORMAT', 'CONCATENATE', 'BLANK',
    'HASONEVALUE', 'SELECTEDVALUE', 'ISBLANK', 'IFERROR', 'AND', 'OR', 'NOT',
  ]);

  return commonFunctions.has(name.toUpperCase());
}

/**
 * Build dependency graph for all measures
 */
export function buildMeasureDependencyGraph(tables: TmdlTable[]): Map<string, MeasureDependency> {
  const graph = new Map<string, MeasureDependency>();
  const allMeasures = new Map<string, { table: string; measure: TmdlMeasure }>();

  // First pass: collect all measures
  for (const table of tables) {
    for (const measure of table.measures) {
      allMeasures.set(measure.name, { table: table.name, measure });
    }
  }

  // Second pass: analyze dependencies
  for (const [measureName, { table, measure }] of allMeasures) {
    const referencedMeasures = extractMeasureReferences(measure.expression);
    const referencedColumns = extractColumnReferences(measure.expression);
    const referencedTables = extractTableReferences(measure.expression);

    // Filter to only measures that actually exist
    const validMeasures = referencedMeasures.filter(m => allMeasures.has(m));

    graph.set(measureName, {
      measureName,
      table,
      dependencies: {
        measures: validMeasures,
        columns: referencedColumns,
        tables: Array.from(new Set(referencedTables)),
      },
      dependents: [], // Will be populated in third pass
    });
  }

  // Third pass: populate dependents (reverse dependencies)
  for (const [measureName, dep] of graph) {
    for (const referencedMeasure of dep.dependencies.measures) {
      const referencedDep = graph.get(referencedMeasure);
      if (referencedDep) {
        referencedDep.dependents.push(measureName);
      }
    }
  }

  return graph;
}

/**
 * Find unused measures (not referenced by any other measure)
 */
export function findUnusedMeasures(tables: TmdlTable[]): Array<{ table: string; measure: string }> {
  const graph = buildMeasureDependencyGraph(tables);
  const unused: Array<{ table: string; measure: string }> = [];

  for (const [measureName, dep] of graph) {
    if (dep.dependents.length === 0) {
      unused.push({ table: dep.table, measure: measureName });
    }
  }

  return unused;
}

/**
 * Calculate DAX complexity score for a measure
 */
export function analyzeMeasureComplexity(measure: TmdlMeasure, tables: TmdlTable[]): DaxComplexity {
  const expression = measure.expression;

  // Count nesting depth
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of expression) {
    if (char === '(') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === ')') {
      currentDepth--;
    }
  }

  // Count functions (approximate by counting opening parentheses after words)
  const functionPattern = /\b[A-Z][A-Z0-9_]*\s*\(/g;
  const functions = expression.match(functionPattern) || [];
  const functionCount = functions.length;

  // Count table references
  const tableRefs = extractTableReferences(expression);
  const tableRefCount = tableRefs.length;

  // Count measure references
  const measureRefs = extractMeasureReferences(expression);
  const measureRefCount = measureRefs.length;

  // Check for iterators
  const iteratorPattern = /\b(SUMX|AVERAGEX|COUNTX|FILTER|ADDCOLUMNS|SELECTCOLUMNS|GENERATE)\b/i;
  const hasIterators = iteratorPattern.test(expression);

  // Check for context transition
  const contextTransitionPattern = /\bCALCULATE\s*\(/i;
  const hasContextTransition = contextTransitionPattern.test(expression);

  // Calculate score (0-100)
  let score = 0;
  score += Math.min(maxDepth * 10, 30);  // Max 30 points for depth
  score += Math.min(functionCount * 2, 20);  // Max 20 points for function count
  score += Math.min(tableRefCount * 5, 20);  // Max 20 points for table refs
  score += Math.min(measureRefCount * 3, 15);  // Max 15 points for measure refs
  if (hasIterators) score += 10;
  if (hasContextTransition) score += 5;

  // Determine recommendation
  let recommendation = 'Simple measure';
  if (score < 30) {
    recommendation = 'Simple measure - easy to maintain';
  } else if (score < 60) {
    recommendation = 'Moderate complexity - consider adding comments';
  } else if (score < 80) {
    recommendation = 'Complex measure - strongly recommend documentation';
  } else {
    recommendation = 'Very complex - consider breaking into smaller measures';
  }

  return {
    measureName: measure.name,
    score,
    factors: {
      nestingDepth: maxDepth,
      functionCount,
      tableReferences: tableRefCount,
      measureReferences: measureRefCount,
      hasIterators,
      hasContextTransition,
    },
    recommendation,
  };
}

/**
 * Detect common DAX patterns
 */
export function detectMeasurePattern(measure: TmdlMeasure): DaxPattern {
  const expr = measure.expression.toUpperCase();

  // Time intelligence patterns
  if (expr.includes('DATESYTD') || expr.includes('TOTALYTD')) {
    return {
      type: 'time_intelligence',
      subtype: 'ytd',
      confidence: 0.9,
      description: 'Year-to-date calculation',
    };
  }

  if (expr.includes('SAMEPERIODLASTYEAR') || expr.includes('DATEADD')) {
    return {
      type: 'time_intelligence',
      subtype: 'yoy',
      confidence: 0.9,
      description: 'Year-over-year comparison',
    };
  }

  // Aggregation patterns
  if (expr.match(/^\s*SUM\s*\(/)) {
    return {
      type: 'aggregation',
      subtype: 'sum',
      confidence: 1.0,
      description: 'Simple sum aggregation',
    };
  }

  if (expr.match(/^\s*SUMX\s*\(/)) {
    return {
      type: 'aggregation',
      subtype: 'iterator_sum',
      confidence: 1.0,
      description: 'Iterator-based sum',
    };
  }

  // Ratio patterns
  if (expr.includes('DIVIDE(')) {
    return {
      type: 'ratio',
      subtype: 'safe_division',
      confidence: 0.8,
      description: 'Ratio calculation with DIVIDE',
    };
  }

  if (expr.match(/\]\s*\/\s*\[/)) {
    return {
      type: 'ratio',
      subtype: 'division',
      confidence: 0.7,
      description: 'Simple division (consider using DIVIDE)',
    };
  }

  // Conditional patterns
  if (expr.includes('SWITCH(') || expr.includes('IF(')) {
    return {
      type: 'conditional',
      subtype: expr.includes('SWITCH(') ? 'switch' : 'if',
      confidence: 0.9,
      description: 'Conditional logic',
    };
  }

  // Text patterns
  if (expr.includes('FORMAT(') || expr.includes('CONCATENATE(')) {
    return {
      type: 'text',
      subtype: 'formatting',
      confidence: 0.9,
      description: 'Text formatting or concatenation',
    };
  }

  // Unknown
  return {
    type: 'unknown',
    confidence: 0.5,
    description: 'Pattern not recognized',
  };
}

/**
 * Check for common DAX anti-patterns and issues
 */
export function checkDaxQuality(measure: TmdlMeasure): DaxIssue[] {
  const issues: DaxIssue[] = [];
  const expr = measure.expression;

  // Check for division without DIVIDE
  if (expr.match(/\]\s*\/\s*\[/) && !expr.includes('DIVIDE(')) {
    issues.push({
      severity: 'warning',
      message: 'Direct division used instead of DIVIDE function',
      suggestion: 'Use DIVIDE([numerator], [denominator]) to handle division by zero gracefully',
    });
  }

  // Check for nested CALCULATE
  if (expr.match(/CALCULATE\s*\([^)]*CALCULATE\s*\(/i)) {
    issues.push({
      severity: 'warning',
      message: 'Nested CALCULATE detected',
      suggestion: 'Consider simplifying by combining filters in a single CALCULATE',
    });
  }

  // Check for FILTER without table iteration
  if (expr.match(/FILTER\s*\(\s*ALL\s*\(/i)) {
    issues.push({
      severity: 'info',
      message: 'FILTER with ALL pattern detected',
      suggestion: 'Verify if this is the intended filter context modification',
    });
  }

  // Check for expensive SUMX patterns
  if (expr.match(/SUMX\s*\([^,]+,\s*CALCULATE\s*\(/i)) {
    issues.push({
      severity: 'warning',
      message: 'SUMX with CALCULATE pattern may be expensive',
      suggestion: 'Consider if this can be optimized or if a calculated column would be more efficient',
    });
  }

  // Check for missing BLANK() in IF statements with division
  if (expr.match(/IF\s*\([^)]+\/[^)]+\)/i) && !expr.includes('BLANK()')) {
    issues.push({
      severity: 'info',
      message: 'IF statement with division may need BLANK() handling',
      suggestion: 'Consider returning BLANK() for empty results instead of 0',
    });
  }

  // Check for very long expressions (potential readability issue)
  if (expr.length > 500) {
    issues.push({
      severity: 'info',
      message: 'Very long expression detected',
      suggestion: 'Consider breaking into multiple smaller measures for maintainability',
    });
  }

  // Check for missing format string
  if (!measure.formatString && expr.match(/SUM|AVERAGE|DIVIDE/i)) {
    issues.push({
      severity: 'info',
      message: 'No format string defined for numeric measure',
      suggestion: 'Add a format string like "#,##0.00" or "0.0%" for better display',
    });
  }

  return issues;
}

/**
 * Detect circular dependencies
 */
export function detectCircularDependencies(tables: TmdlTable[]): Array<{ cycle: string[]; description: string }> {
  const graph = buildMeasureDependencyGraph(tables);
  const cycles: Array<{ cycle: string[]; description: string }> = [];

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(measureName: string, path: string[]): boolean {
    visited.add(measureName);
    recursionStack.add(measureName);
    path.push(measureName);

    const dep = graph.get(measureName);
    if (dep) {
      for (const refMeasure of dep.dependencies.measures) {
        if (!visited.has(refMeasure)) {
          if (dfs(refMeasure, [...path])) {
            return true;
          }
        } else if (recursionStack.has(refMeasure)) {
          // Cycle detected
          const cycleStart = path.indexOf(refMeasure);
          const cycle = [...path.slice(cycleStart), refMeasure];
          cycles.push({
            cycle,
            description: `Circular dependency: ${cycle.join(' → ')}`,
          });
          return true;
        }
      }
    }

    recursionStack.delete(measureName);
    return false;
  }

  for (const measureName of graph.keys()) {
    if (!visited.has(measureName)) {
      dfs(measureName, []);
    }
  }

  return cycles;
}
