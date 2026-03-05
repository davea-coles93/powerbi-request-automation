import type { StylesheetJsonBlock } from 'cytoscape';

/**
 * Cytoscape styles for the star schema diagram.
 * Fact tables are centered, dimension tables radiate outward.
 */
export const starSchemaStyles: StylesheetJsonBlock[] = [
  // ── Base node ──────────────────────────────────────────────────
  {
    selector: 'node',
    style: {
      'width': '280px',
      'height': '140px',
      'shape': 'roundrectangle',
      'label': 'data(label)',
      'font-size': '11px',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '260px',
      'color': '#1f2937',
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#d1d5db',
      'padding': '8px',
    } as any,
  },

  // ── Fact table ─────────────────────────────────────────────────
  {
    selector: '.fact-table',
    style: {
      'border-color': '#3b82f6',
      'border-width': 3,
      'background-color': '#eff6ff',
    },
  },

  // ── Dimension table ────────────────────────────────────────────
  {
    selector: '.dimension-table',
    style: {
      'border-color': '#8b5cf6',
      'border-width': 2,
      'background-color': '#f5f3ff',
    },
  },

  // ── Orphan fact (measures with no entity links) ────────────────
  {
    selector: '.orphan-fact',
    style: {
      'border-color': '#f59e0b',
      'border-width': 2,
      'border-style': 'dashed' as any,
      'background-color': '#fffbeb',
    },
  },

  // ── Relationship edges ─────────────────────────────────────────
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
      'label': 'data(label)',
      'text-rotation': 'autorotate' as any,
      'font-size': '8px',
      'color': '#64748b',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px' as any,
      'text-background-shape': 'roundrectangle',
    } as any,
  },

  {
    selector: '.fk-edge',
    style: {
      'width': 2,
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
    },
  },

  // ── State styles ───────────────────────────────────────────────
  {
    selector: '.selected-node',
    style: {
      'border-width': 4,
      'border-color': '#2563eb',
      'overlay-color': '#2563eb',
      'overlay-opacity': 0.06,
    } as any,
  },

  {
    selector: '.dimmed',
    style: { 'opacity': 0.15 },
  },

  {
    selector: '.neighbor-highlight',
    style: {
      'border-width': 3,
      'border-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.06,
    } as any,
  },

  {
    selector: 'edge.neighbor-edge',
    style: {
      'width': 3,
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
    },
  },
];
