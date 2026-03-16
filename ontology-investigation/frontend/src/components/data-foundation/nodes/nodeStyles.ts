import type { StylesheetJsonBlock } from 'cytoscape';

/**
 * Cytoscape stylesheet for both Schema and Lineage views.
 *
 * Matches the Process Builder's visual quality: larger nodes with tinted
 * backgrounds, differentiated edge styles per relationship type, labeled
 * cross-layer edges, and rich interaction states.
 */
export const dataFoundationNodeStyles: StylesheetJsonBlock[] = [
  // ── Base node ──────────────────────────────────────────────────
  {
    selector: 'node',
    style: {
      'width': 'data(width)',
      'height': 'data(height)',
      'shape': 'roundrectangle',
      'label': 'data(label)',
      'font-size': '10px',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '240px',
      'font-weight': 'normal',
      'color': '#1f2937',
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#d1d5db',
      'overlay-padding': 2,
      'padding': '4px',
    } as any,
  },

  // ── Per-type styles (border + light background tint) ─────────
  {
    selector: '.metric-node',
    style: {
      'border-color': '#34d399',
      'border-width': 2,
      'background-color': '#f0fdf9',
    },
  },
  {
    selector: '.measure-node',
    style: {
      'border-color': '#fbbf24',
      'border-width': 2,
      'background-color': '#fefdf0',
    },
  },
  {
    selector: '.attribute-node',
    style: {
      'border-color': '#818cf8',
      'border-width': 2,
      'background-color': '#f5f3ff',
    },
  },
  {
    selector: '.entity-node',
    style: {
      'border-color': '#60a5fa',
      'border-width': 2,
      'background-color': '#f0f7ff',
    },
  },
  {
    selector: '.system-node',
    style: {
      'border-color': '#f472b6',
      'border-width': 2,
      'background-color': '#fdf2f8',
    },
  },

  // ── Layer label nodes (Schema view section headers) ──────────
  {
    selector: '.layer-label',
    style: {
      'width': '180px',
      'height': '44px',
      'background-color': '#1f2937',
      'background-opacity': 0.9,
      'border-width': 3,
      'border-color': 'data(layerColor)',
      'font-size': '12px',
      'font-weight': 'bold' as any,
      'color': '#ffffff',
      'text-halign': 'center',
      'text-valign': 'center',
      'label': 'data(label)',
      'shape': 'roundrectangle',
    } as any,
  },

  // ── Schema-specific node shapes (different per type) ────────
  {
    selector: '.schema-metric',
    style: {
      'shape': 'diamond',
      'border-width': 3,
    },
  },
  {
    selector: '.schema-measure',
    style: {
      'shape': 'hexagon',
      'border-width': 3,
    },
  },
  {
    selector: '.schema-attribute',
    style: {
      'shape': 'roundrectangle',
      'border-width': 3,
    },
  },
  {
    selector: '.schema-entity',
    style: {
      'shape': 'barrel',
      'border-width': 3,
    },
  },
  {
    selector: '.schema-system',
    style: {
      'shape': 'octagon',
      'border-width': 3,
    },
  },

  // ── Schema edges show relationship labels ───────────────────
  {
    selector: '.schema-edge',
    style: {
      'label': 'data(label)',
      'font-size': '9px',
      'text-rotation': 'autorotate' as any,
      'text-margin-y': -10,
      'color': '#6b7280',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px' as any,
      'text-background-shape': 'roundrectangle',
      'width': 2,
      'opacity': 0.85,
    } as any,
  },

  // ── Edge base style ──────────────────────────────────────────
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#cbd5e1',
      'target-arrow-color': '#cbd5e1',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
      'opacity': 0.7,
    },
  },

  // ── Typed edge styles (color-coded, no labels for clarity) ───
  {
    selector: '.edge-metric-measure',
    style: {
      'width': 1.5,
      'line-color': '#34d399',
      'target-arrow-color': '#34d399',
    },
  },
  {
    selector: '.edge-measure-attribute',
    style: {
      'width': 1.5,
      'line-color': '#fbbf24',
      'target-arrow-color': '#fbbf24',
    },
  },
  {
    selector: '.edge-attribute-entity',
    style: {
      'width': 1.5,
      'line-color': '#60a5fa',
      'target-arrow-color': '#60a5fa',
    },
  },
  {
    selector: '.edge-attribute-system',
    style: {
      'width': 1.5,
      'line-color': '#f472b6',
      'target-arrow-color': '#f472b6',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3] as any,
    },
  },

  // ── State styles ─────────────────────────────────────────────

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
      'opacity': 0.35,
    },
  },

  // Hover highlight for connected edges (thicker + colored during hover)
  {
    selector: 'edge.hover-highlight-edge',
    style: {
      'width': 3,
      'opacity': 1,
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
      'z-index': 10,
    } as any,
  },

  // Hover highlight for neighbor nodes (glow during hover)
  {
    selector: 'node.hover-highlight-node',
    style: {
      'border-width': 3,
      'border-color': '#8b5cf6',
      'opacity': 1,
      'z-index': 10,
    } as any,
  },

  // Neighbor highlight (nodes connected to selected node glow)
  {
    selector: '.neighbor-highlight',
    style: {
      'border-width': 3,
      'border-color': '#a78bfa',
      'overlay-color': '#a78bfa',
      'overlay-opacity': 0.06,
    } as any,
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
