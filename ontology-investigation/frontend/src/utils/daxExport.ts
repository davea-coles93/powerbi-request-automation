import type { RecommendedTable, RecommendedDAXMeasure } from '../components/semantic-model/hooks/useRecommendedSchema';

/**
 * Generate a formatted DAX script for a table's measures.
 */
export function generateDAXScript(table: RecommendedTable): string {
  const lines: string[] = [
    `-- DAX Measures for ${table.name}`,
    `-- Generated from Business Ontology Framework`,
    '',
  ];

  for (const m of table.measures) {
    if (m.description) {
      lines.push(`-- ${m.description}`);
    }
    const formula = m.formula || `TODO: Implement ${m.name}`;
    lines.push(`[${m.name}] = ${formula}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check whether a measure has a real formula or is a placeholder.
 */
export function hasRealFormula(m: RecommendedDAXMeasure): boolean {
  return !!m.formula && !m.formula.startsWith('TODO:');
}
