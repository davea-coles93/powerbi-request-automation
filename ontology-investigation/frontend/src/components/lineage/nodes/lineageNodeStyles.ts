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
];
