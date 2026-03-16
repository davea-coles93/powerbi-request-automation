import type { StylesheetJsonBlock } from 'cytoscape';
import { dataFoundationNodeStyles } from '../../data-foundation/nodes/nodeStyles';

/**
 * Extended Cytoscape stylesheet for the enhanced Lineage view.
 *
 * Spreads the base data-foundation styles and adds crystallisation-specific
 * edge styles, cost severity colouring, and impact highlighting.
 */
export const lineageNodeStyles: StylesheetJsonBlock[] = [
  ...dataFoundationNodeStyles,

  // ── Crystallisation edge (attribute -> system with cost data) ───
  {
    selector: '.crystallisation-edge',
    style: {
      'width': 2.5,
      'label': 'data(label)',
      'font-size': '8px',
      'text-rotation': 'autorotate' as any,
      'text-margin-y': -8,
      'color': '#4b5563',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px' as any,
      'text-background-shape': 'roundrectangle',
    } as any,
  },

  // ── Cost severity colours ──────────────────────────────────────
  {
    selector: '.cost-low',
    style: {
      'line-color': '#34d399',
      'target-arrow-color': '#34d399',
    },
  },
  {
    selector: '.cost-medium',
    style: {
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
    },
  },
  {
    selector: '.cost-high',
    style: {
      'line-color': '#ef4444',
      'target-arrow-color': '#ef4444',
    },
  },

  // ── Selected edge ──────────────────────────────────────────────
  {
    selector: '.selected-edge',
    style: {
      'width': 4,
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.08,
    } as any,
  },

  // ── Impact highlight (upstream nodes affected by an attribute) ─
  {
    selector: '.impact-highlight',
    style: {
      'border-width': 3,
      'border-color': '#f59e0b',
      'overlay-color': '#f59e0b',
      'overlay-opacity': 0.06,
    } as any,
  },

  // ── Entity-centric: expanded entity compound node ─────────────
  {
    selector: '.entity-node-expanded',
    style: {
      'background-color': '#eff6ff',
      'background-opacity': 0.3,
      'border-color': '#60a5fa',
      'border-width': 2,
      'border-style': 'dashed',
      'padding': '20px' as any,
      'text-valign': 'top',
      'text-halign': 'center',
      'font-size': '9px',
      'color': '#2563eb',
    } as any,
  },
  {
    selector: '.entity-node-collapsed',
    style: {
      'font-weight': 'bold' as any,
    } as any,
  },

  // ── Data journey trace: full chain highlight ─────────────────
  {
    selector: '.journey-node',
    style: {
      'border-width': 3,
      'border-color': '#7c3aed',
      'overlay-color': '#7c3aed',
      'overlay-opacity': 0.06,
    } as any,
  },
  {
    selector: '.journey-edge',
    style: {
      'width': 3,
      'line-color': '#7c3aed',
      'target-arrow-color': '#7c3aed',
      'opacity': 1,
      'z-index': 10,
    } as any,
  },
  // Journey edge + crystallisation cost: keep cost color but thicken
  {
    selector: '.journey-edge.crystallisation-edge',
    style: {
      'width': 4,
      'z-index': 11,
    } as any,
  },

  // ── Trace: dimmed elements outside the data journey chain ───
  {
    selector: '.trace-dimmed',
    style: {
      'opacity': 0.15,
    },
  },
  {
    selector: '.trace-highlight',
    style: {
      'opacity': 1,
      'border-width': 2,
      'border-color': '#8b5cf6',
      'overlay-color': '#8b5cf6',
      'overlay-opacity': 0.04,
    } as any,
  },
];
