import { useEffect, useState, type MutableRefObject } from 'react';
import type cytoscape from 'cytoscape';
import { useNavigationStore } from '../../../hooks/useNavigationStore';

export interface SelectedNodeState {
  id: string;
  type: string;
  data: any;
}

export interface SelectedEdgeState {
  id: string;
  data: any;
}

/**
 * Cytoscape interaction hook for the enhanced Lineage view.
 *
 * Handles node/edge selection, impact highlighting (BFS upward from attributes),
 * edge double-click for crystallisation drill-down, hover dimming, and search
 * filtering.
 */
export function useLineageCanvas(
  cyRef: MutableRefObject<cytoscape.Core | null>,
  elements: any[],
  searchQuery: string,
) {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeState | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdgeState | null>(null);

  // Clear selections helper
  const clearSelections = (cy: cytoscape.Core) => {
    cy.nodes('.selected-node').removeClass('selected-node');
    cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
    cy.nodes('.impact-highlight').removeClass('impact-highlight');
    cy.edges('.neighbor-edge').removeClass('neighbor-edge');
    cy.edges('.selected-edge').removeClass('selected-edge');
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // BFS upward from an attribute to highlight connected measures and metrics
  const highlightImpact = (_cy: cytoscape.Core, attributeNode: cytoscape.NodeSingular) => {
    const visited = new Set<string>();
    const queue: cytoscape.NodeSingular[] = [attributeNode];
    visited.add(attributeNode.id());

    while (queue.length > 0) {
      const current = queue.shift()!;
      // Traverse incoming edges (edges where this node is the target)
      current.incomers('edge').forEach((edge) => {
        const source = edge.source();
        if (!visited.has(source.id())) {
          visited.add(source.id());
          const srcType = source.data('entityType');
          if (srcType === 'measure' || srcType === 'metric') {
            source.addClass('impact-highlight');
            edge.addClass('neighbor-edge');
            queue.push(source);
          }
        }
      });
    }
  };

  // Set up event handlers
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;

    // ── Node tap: select node, highlight neighbors ────────────────
    const onNodeTap = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const d = node.data();

      clearSelections(cy);

      // Apply selection visuals
      node.addClass('selected-node');
      node.connectedEdges().addClass('neighbor-edge');
      node.neighborhood('node').addClass('neighbor-highlight');

      setSelectedNode({
        id: d.id,
        type: d.entityType,
        data: d,
      });

      // If attribute node, run impact highlight (BFS upward)
      if (d.entityType === 'attribute') {
        highlightImpact(cy, node);
      }
    };

    // ── Edge tap: select edge ─────────────────────────────────────
    const onEdgeTap = (evt: cytoscape.EventObject) => {
      const edge = evt.target;
      const d = edge.data();

      clearSelections(cy);
      edge.addClass('selected-edge');

      setSelectedEdge({
        id: d.id,
        data: d,
      });
    };

    // ── Edge double-tap: open process detail for crystallisation edges ──
    const onEdgeDblTap = (evt: cytoscape.EventObject) => {
      const edge = evt.target;
      if (!edge.hasClass('crystallisation-edge')) return;

      const d = edge.data();
      const processNames: string[] = d.process_names || [];
      const sourceId = d.source;

      if (processNames.length > 0) {
        useNavigationStore.getState().openProcessDetail({
          attributeId: sourceId,
          attributeName: d.label || sourceId,
          processId: processNames[0].toLowerCase().replace(/\s+/g, '-'),
          processName: processNames[0],
        });
      }
    };

    // ── Background tap: clear all selections ──────────────────────
    const onBgTap = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        clearSelections(cy);
      }
    };

    // ── Mouseover node: highlight neighborhood, dim others ────────
    const onMouseover = (evt: cytoscape.EventObject) => {
      if (searchQuery) return;
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('hover-dimmed');
    };

    // ── Mouseout node: remove all hover dimming ───────────────────
    const onMouseout = () => {
      cy.elements().removeClass('hover-dimmed');
    };

    // Bind events
    cy.on('tap', 'node', onNodeTap);
    cy.on('tap', 'edge', onEdgeTap);
    cy.on('dbltap', 'edge', onEdgeDblTap);
    cy.on('tap', onBgTap);
    cy.on('mouseover', 'node', onMouseover);
    cy.on('mouseout', 'node', onMouseout);

    return () => {
      cy.off('tap', 'node', onNodeTap);
      cy.off('tap', 'edge', onEdgeTap);
      cy.off('dbltap', 'edge', onEdgeDblTap);
      cy.off('tap', onBgTap);
      cy.off('mouseover', 'node', onMouseover);
      cy.off('mouseout', 'node', onMouseout);
    };
  }, [cyRef, elements, searchQuery]);

  // ── Watch searchQuery: dim non-matches, focus matches ──────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Clear previous search state
    cy.elements().removeClass('dimmed');
    cy.elements().removeClass('search-focus');

    if (!searchQuery || searchQuery.trim() === '') return;

    const query = searchQuery.toLowerCase();

    cy.nodes().forEach((node) => {
      const name: string = (node.data('name') || '').toLowerCase();
      const label: string = (node.data('label') || '').toLowerCase();

      if (name.includes(query) || label.includes(query)) {
        node.addClass('search-focus');
      } else {
        node.addClass('dimmed');
      }
    });

    // Dim edges connected to dimmed nodes
    cy.edges().forEach((edge) => {
      const src = edge.source();
      const tgt = edge.target();
      if (src.hasClass('dimmed') || tgt.hasClass('dimmed')) {
        edge.addClass('dimmed');
      }
    });
  }, [cyRef, searchQuery]);

  return {
    selectedNode,
    selectedEdge,
    clearSelections: () => {
      const cy = cyRef.current;
      if (cy) clearSelections(cy);
    },
  };
}
