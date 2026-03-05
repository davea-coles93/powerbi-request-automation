import type { StylesheetJsonBlock } from 'cytoscape';

/**
 * Cytoscape stylesheet for both Schema and Lineage views.
 */
export const dataFoundationNodeStyles: StylesheetJsonBlock[] = [
  // ── Base node ──────────────────────────────────────────────────
  {
    selector: 'node',
    style: {
      'width': '240px',
      'height': '80px',
      'shape': 'roundrectangle',
      'label': 'data(label)',
      'font-size': '11px',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '220px',
      'font-weight': 'normal',
      'color': '#1f2937',
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#d1d5db',
      'overlay-padding': 4,
      'padding': '6px',
    } as any,
  },

  // ── Per-type border colors ─────────────────────────────────────
  {
    selector: '.metric-node',
    style: {
      'border-color': '#34d399',
      'border-width': 2,
    },
  },
  {
    selector: '.measure-node',
    style: {
      'border-color': '#fbbf24',
      'border-width': 2,
    },
  },
  {
    selector: '.attribute-node',
    style: {
      'border-color': '#818cf8',
      'border-width': 2,
    },
  },
  {
    selector: '.entity-node',
    style: {
      'border-color': '#60a5fa',
      'border-width': 2,
    },
  },
  {
    selector: '.system-node',
    style: {
      'border-color': '#a78bfa',
      'border-width': 2,
    },
  },

  // ── Edge styles ────────────────────────────────────────────────
  {
    selector: '.schema-edge',
    style: {
      'width': 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
    },
  },
  {
    selector: '.lineage-edge',
    style: {
      'width': 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
    },
  },

  // ── State styles ───────────────────────────────────────────────

  // Selected node
  {
    selector: '.selected-node',
    style: {
      'border-width': 3,
      'border-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.05,
    } as any,
  },

  // Dimmed (non-neighbors during hover or search filtering)
  {
    selector: '.dimmed',
    style: {
      'opacity': 0.15,
    },
  },

  // Highlighted (connected neighbors of selection)
  {
    selector: '.highlighted',
    style: {
      'border-width': 3,
      'border-color': '#f59e0b',
    },
  },

  // Search focus (current match when cycling through search results)
  {
    selector: '.search-focus',
    style: {
      'border-width': 4,
      'border-color': '#f59e0b',
      'overlay-color': '#f59e0b',
      'overlay-opacity': 0.08,
    } as any,
  },

  // Hover dimmed (non-neighbors fade during hover)
  {
    selector: '.hover-dimmed',
    style: {
      'opacity': 0.2,
    },
  },

  // Neighbor highlighting for edges
  {
    selector: 'edge.neighbor-edge',
    style: {
      'width': 3,
      'line-color': '#a78bfa',
      'target-arrow-color': '#a78bfa',
    },
  },
];
