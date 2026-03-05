/**
 * Builds Cytoscape elements for the star schema diagram.
 *
 * Layout: Fact tables at center, dimension tables in a ring around them.
 * Uses preset positions; the component can re-layout with fcose if needed.
 */

import type { RecommendedTable, RecommendedRelationship } from '../hooks/useRecommendedSchema';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function buildTableLabel(table: RecommendedTable): string {
  const icon = table.tableType === 'Fact' ? '⚡' : '📊';
  const type = table.tableType;
  const colCount = table.columns.length;
  const measureCount = table.measures.length;

  const lines = [`${icon}  ${table.name}`];
  lines.push(`${type} Table`);

  const stats: string[] = [];
  if (colCount > 0) stats.push(`${colCount} col${colCount !== 1 ? 's' : ''}`);
  if (measureCount > 0) stats.push(`${measureCount} measure${measureCount !== 1 ? 's' : ''}`);
  if (stats.length > 0) lines.push(stats.join(' · '));

  if (table.sourceEntityName) {
    lines.push(`Entity: ${truncate(table.sourceEntityName, 30)}`);
  }

  return lines.join('\n');
}

export function buildStarSchemaElements(
  tables: RecommendedTable[],
  relationships: RecommendedRelationship[],
): any[] {
  const elements: any[] = [];

  const factTables = tables.filter((t) => t.tableType === 'Fact');
  const dimTables = tables.filter((t) => t.tableType === 'Dimension');

  // ── Position fact tables in a vertical column at center ────────

  const CENTER_X = 0;
  const FACT_Y_SPACING = 200;
  const factStartY = -((factTables.length - 1) * FACT_Y_SPACING) / 2;

  for (let i = 0; i < factTables.length; i++) {
    const fact = factTables[i];
    const isOrphan = fact.relatedDimensionIds.length === 0;

    elements.push({
      data: {
        ...fact,
        id: fact.id,
        label: buildTableLabel(fact),
        tableType: fact.tableType,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      position: {
        x: CENTER_X,
        y: factStartY + i * FACT_Y_SPACING,
      },
      classes: isOrphan ? 'fact-table orphan-fact' : 'fact-table',
    });
  }

  // ── Position dimension tables in a ring around the center ──────

  const RING_RADIUS = 500;
  const angleStep = dimTables.length > 0 ? (2 * Math.PI) / dimTables.length : 0;
  // Start from top (-π/2) for a pleasing layout
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < dimTables.length; i++) {
    const dim = dimTables[i];
    const angle = startAngle + i * angleStep;

    elements.push({
      data: {
        ...dim,
        id: dim.id,
        label: buildTableLabel(dim),
        tableType: dim.tableType,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      position: {
        x: CENTER_X + RING_RADIUS * Math.cos(angle),
        y: RING_RADIUS * Math.sin(angle),
      },
      classes: 'dimension-table',
    });
  }

  // ── Edges (relationships) ──────────────────────────────────────

  for (const rel of relationships) {
    elements.push({
      data: {
        id: rel.id,
        source: rel.fromTableId,
        target: rel.toTableId,
        label: 'FK',
      },
      classes: 'fk-edge',
    });
  }

  return elements;
}
