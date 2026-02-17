/**
 * Model Quality Analysis
 * Overall model quality scoring and recommendations
 */

import { TmdlTable, TmdlRelationship, ModelQuality } from '../types.js';
import { buildMeasureDependencyGraph } from './dax-analyzer.js';

/**
 * Analyze overall model quality
 */
export function analyzeModelQuality(
  tables: TmdlTable[],
  relationships: TmdlRelationship[]
): ModelQuality {
  const metrics = calculateMetrics(tables, relationships);
  const overallScore = calculateOverallScore(metrics);
  const recommendations = generateRecommendations(metrics);

  return {
    overallScore,
    metrics,
    recommendations,
  };
}

/**
 * Calculate quality metrics
 */
function calculateMetrics(tables: TmdlTable[], relationships: TmdlRelationship[]) {
  let totalMeasures = 0;
  let measuresWithoutDescriptions = 0;
  let measuresWithoutDisplayFolders = 0;
  let hierarchyCount = 0;
  let calculationGroupCount = 0;

  for (const table of tables) {
    totalMeasures += table.measures.length;
    hierarchyCount += table.hierarchies?.length || 0;

    for (const measure of table.measures) {
      if (!measure.description) {
        measuresWithoutDescriptions++;
      }
      if (!measure.displayFolder) {
        measuresWithoutDisplayFolders++;
      }
    }
  }

  // Find unused measures
  const graph = buildMeasureDependencyGraph(tables);
  let unusedMeasures = 0;
  for (const [, dep] of graph) {
    if (dep.dependents.length === 0) {
      unusedMeasures++;
    }
  }

  // Naming consistency score
  const namingScore = calculateNamingConsistency(tables);

  // Relationship quality score
  const relationshipScore = calculateRelationshipQuality(relationships);

  return {
    measuresWithoutDescriptions,
    measuresWithoutDisplayFolders,
    unusedMeasures,
    namingConsistencyScore: namingScore,
    relationshipQualityScore: relationshipScore,
    hierarchyCount,
    calculationGroupCount,
  };
}

/**
 * Calculate naming consistency score (0-100)
 */
function calculateNamingConsistency(tables: TmdlTable[]): number {
  let totalItems = 0;
  let consistentItems = 0;

  // Check table names
  for (const table of tables) {
    totalItems++;

    // Tables should be PascalCase or Title Case
    if (isPascalCaseOrTitleCase(table.name)) {
      consistentItems++;
    }

    // Check measure names
    for (const measure of table.measures) {
      totalItems++;

      // Measures should have spaces and proper casing
      if (hasProperMeasureNaming(measure.name)) {
        consistentItems++;
      }
    }

    // Check column names
    for (const column of table.columns) {
      totalItems++;

      // Columns should be PascalCase or Title Case
      if (isPascalCaseOrTitleCase(column.name)) {
        consistentItems++;
      }
    }
  }

  return totalItems > 0 ? Math.round((consistentItems / totalItems) * 100) : 100;
}

/**
 * Check if a name is PascalCase or Title Case
 */
function isPascalCaseOrTitleCase(name: string): boolean {
  // PascalCase: ProductName, CustomerID
  // Title Case: Product Name, Customer ID

  // Should start with uppercase
  if (!/^[A-Z]/.test(name)) return false;

  // Should not have underscores or hyphens at start/end
  if (/^[_-]|[_-]$/.test(name)) return false;

  // Should not be all uppercase (unless acronym <= 4 chars)
  if (name === name.toUpperCase() && name.length > 4) return false;

  return true;
}

/**
 * Check if measure name follows conventions
 */
function hasProperMeasureNaming(name: string): boolean {
  // Measures typically have spaces: "Total Sales", "YoY Growth %"
  // Or are single words: "Revenue", "Profit"

  // Should not use camelCase or snake_case
  if (/^[a-z]/.test(name)) return false;  // camelCase starts with lowercase
  if (/_/.test(name)) return false;  // snake_case has underscores

  // Should start with uppercase
  if (!/^[A-Z]/.test(name)) return false;

  return true;
}

/**
 * Calculate relationship quality score (0-100)
 */
function calculateRelationshipQuality(relationships: TmdlRelationship[]): number {
  if (relationships.length === 0) return 100;

  let score = 100;
  let issueCount = 0;

  for (const rel of relationships) {
    // Check if cardinality is defined
    if (!rel.fromCardinality || !rel.toCardinality) {
      issueCount++;
    }

    // Check if cross-filter direction is defined
    if (!rel.crossFilterDirection) {
      issueCount++;
    }

    // Warn about bidirectional relationships (not necessarily wrong, but noteworthy)
    if (rel.crossFilterDirection === 'bothDirections') {
      issueCount += 0.5;  // Half penalty since it's not always wrong
    }

    // Check if relationship has a name
    if (!rel.name) {
      issueCount += 0.5;
    }
  }

  // Deduct points based on issues
  const deduction = (issueCount / (relationships.length * 2)) * 50;  // Max 50 point deduction
  score -= Math.min(deduction, 50);

  return Math.round(score);
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateOverallScore(metrics: ModelQuality['metrics']): number {
  let score = 100;

  // Deduct for missing descriptions (important for maintainability)
  const descriptionPenalty = metrics.measuresWithoutDescriptions * 2;  // 2 points per measure
  score -= Math.min(descriptionPenalty, 30);

  // Deduct for missing display folders (organization)
  const folderPenalty = metrics.measuresWithoutDisplayFolders * 1;  // 1 point per measure
  score -= Math.min(folderPenalty, 20);

  // Deduct for unused measures (clutter)
  const unusedPenalty = metrics.unusedMeasures * 3;  // 3 points per unused measure
  score -= Math.min(unusedPenalty, 20);

  // Add naming consistency component (weighted)
  score = score * 0.7 + metrics.namingConsistencyScore * 0.15;

  // Add relationship quality component (weighted)
  score = score * 0.85 + metrics.relationshipQualityScore * 0.15;

  // Bonus for having hierarchies (good practice)
  if (metrics.hierarchyCount > 0) {
    score += Math.min(metrics.hierarchyCount * 2, 10);
  }

  // Bonus for calculation groups (advanced feature)
  if (metrics.calculationGroupCount > 0) {
    score += Math.min(metrics.calculationGroupCount * 5, 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: ModelQuality['metrics']): string[] {
  const recommendations: string[] = [];

  if (metrics.measuresWithoutDescriptions > 0) {
    recommendations.push(
      `Add descriptions to ${metrics.measuresWithoutDescriptions} measure(s) for better documentation`
    );
  }

  if (metrics.measuresWithoutDisplayFolders > 5) {
    recommendations.push(
      `Organize ${metrics.measuresWithoutDisplayFolders} measure(s) into display folders for better navigation`
    );
  }

  if (metrics.unusedMeasures > 0) {
    recommendations.push(
      `Review ${metrics.unusedMeasures} unused measure(s) - consider removing or documenting their purpose`
    );
  }

  if (metrics.namingConsistencyScore < 70) {
    recommendations.push(
      'Improve naming consistency - use PascalCase or Title Case for tables/columns, spaces for measures'
    );
  }

  if (metrics.relationshipQualityScore < 70) {
    recommendations.push(
      'Review relationship metadata - ensure cardinality and cross-filter direction are properly defined'
    );
  }

  if (metrics.hierarchyCount === 0) {
    recommendations.push(
      'Consider adding hierarchies for date tables and dimensional tables to improve drill-down capabilities'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Model quality is excellent! Consider documenting design patterns for team reference.');
  }

  return recommendations;
}

/**
 * Check naming conventions against MODEL_CONTEXT.md rules
 */
export function checkNamingConventions(
  tables: TmdlTable[],
  conventionRules?: string
): Array<{ type: string; object: string; issue: string; suggestion: string }> {
  const issues: Array<{ type: string; object: string; issue: string; suggestion: string }> = [];

  for (const table of tables) {
    // Check table naming
    if (!isPascalCaseOrTitleCase(table.name)) {
      issues.push({
        type: 'Table',
        object: table.name,
        issue: 'Does not follow PascalCase or Title Case convention',
        suggestion: 'Rename to use PascalCase (e.g., "SalesOrders") or Title Case (e.g., "Sales Orders")',
      });
    }

    // Check for prefixes (common anti-pattern)
    if (/^(tbl|dim|fact)_/i.test(table.name)) {
      issues.push({
        type: 'Table',
        object: table.name,
        issue: 'Contains database-style prefix',
        suggestion: `Remove prefix - use "${table.name.replace(/^(tbl|dim|fact)_/i, '')}"`,
      });
    }

    // Check measures
    for (const measure of table.measures) {
      if (!hasProperMeasureNaming(measure.name)) {
        let suggestion = '';

        if (/^[a-z]/.test(measure.name)) {
          suggestion = 'Use PascalCase with spaces (e.g., "Total Sales" not "totalSales")';
        } else if (/_/.test(measure.name)) {
          suggestion = `Use spaces instead of underscores: "${measure.name.replace(/_/g, ' ')}"`;
        } else {
          suggestion = 'Ensure measure name starts with uppercase and uses proper spacing';
        }

        issues.push({
          type: 'Measure',
          object: `${table.name}[${measure.name}]`,
          issue: 'Does not follow measure naming convention',
          suggestion,
        });
      }
    }

    // Check columns
    for (const column of table.columns) {
      if (!isPascalCaseOrTitleCase(column.name) && !column.sourceColumn) {
        issues.push({
          type: 'Column',
          object: `${table.name}[${column.name}]`,
          issue: 'Does not follow column naming convention',
          suggestion: 'Use PascalCase or Title Case for calculated columns',
        });
      }
    }
  }

  return issues;
}
