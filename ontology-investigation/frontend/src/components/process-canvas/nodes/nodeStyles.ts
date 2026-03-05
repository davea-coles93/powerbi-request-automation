import type { StylesheetJsonBlock } from 'cytoscape';

export const nodeStyles: StylesheetJsonBlock[] = [
  // Step nodes — white background with colored top bar
  {
    selector: 'node.step-node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '11px',
      'width': '260px',
      'height': '140px',
      'shape': 'roundrectangle',
      'text-wrap': 'wrap',
      'text-max-width': '240px',
      'font-weight': 'normal',
      'color': '#1f2937',
      'padding': '8px',
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#d1d5db',
      'overlay-padding': 4,
    } as any,
  },
  // Perspective-specific colors (border + tinted background)
  {
    selector: '.operational-node',
    style: {
      'background-color': '#dcfce7',
      'border-color': '#22c55e',
      'border-width': 2,
    },
  },
  {
    selector: '.management-node',
    style: {
      'background-color': '#fef9c3',
      'border-color': '#eab308',
      'border-width': 2,
    },
  },
  {
    selector: '.financial-node',
    style: {
      'background-color': '#dbeafe',
      'border-color': '#3b82f6',
      'border-width': 2,
    },
  },
  // Same-perspective flow edges
  {
    selector: 'edge.flow-edge',
    style: {
      'width': 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
    },
  },
  // Cross-perspective handoff edges
  {
    selector: 'edge.handoff-edge',
    style: {
      'width': 3,
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
      'line-style': 'dashed',
      'line-dash-pattern': [8, 4] as any,
      'label': 'data(label)',
      'text-rotation': 'autorotate' as any,
      'font-size': '9px',
      'color': '#7c3aed',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px' as any,
      'text-background-shape': 'roundrectangle',
    },
  },
  // Selected state
  {
    selector: '.selected-node',
    style: {
      'border-width': 3,
      'border-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.05,
    } as any,
  },
  // Sub-steps indicator
  {
    selector: '.has-sub-steps',
    style: {
      'border-style': 'double',
      'border-width': 5,
    },
  },
  // Connection mode source
  {
    selector: '.connection-source',
    style: {
      'border-width': 4,
      'border-color': '#10b981',
      'border-style': 'dashed',
    },
  },
  // Crystallization
  {
    selector: '.crystallization-node',
    style: {
      'border-width': 4,
      'border-color': '#3b82f6',
      'border-style': 'double',
    },
  },
  // Search dimming
  {
    selector: '.dimmed',
    style: {
      'opacity': 0.15,
    },
  },
  {
    selector: '.highlighted',
    style: {
      'border-width': 3,
      'border-color': '#f59e0b',
    },
  },
  // Current search-focus (active match in cycling)
  {
    selector: '.search-focus',
    style: {
      'border-width': 4,
      'border-color': '#f59e0b',
      'overlay-color': '#f59e0b',
      'overlay-opacity': 0.08,
    } as any,
  },
  // Neighbor highlighting (connected nodes glow when step is selected)
  {
    selector: '.neighbor-highlight',
    style: {
      'border-width': 3,
      'border-color': '#a78bfa',
      'overlay-color': '#a78bfa',
      'overlay-opacity': 0.06,
    } as any,
  },
  {
    selector: 'edge.neighbor-edge',
    style: {
      'width': 3,
      'line-color': '#a78bfa',
      'target-arrow-color': '#a78bfa',
    },
  },
  // Hover dimming (non-neighbors fade)
  {
    selector: '.hover-dimmed',
    style: {
      'opacity': 0.2,
    },
  },
  // Automation potential border overrides
  {
    selector: '.automation-high',
    style: {
      'border-color': '#ef4444',
      'border-width': 3,
    },
  },
  {
    selector: '.automation-medium',
    style: {
      'border-color': '#f97316',
      'border-width': 3,
    },
  },
  // Multi-selected nodes
  {
    selector: '.multi-selected',
    style: {
      'border-width': 3,
      'border-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.1,
    } as any,
  },
];
