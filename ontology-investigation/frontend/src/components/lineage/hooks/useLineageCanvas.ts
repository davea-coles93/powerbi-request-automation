import { useEffect, useState, useCallback, type MutableRefObject } from 'react';
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

export interface ContextMenuState {
  nodeId: string;
  nodeName: string;
  x: number;
  y: number;
}

/**
 * Cytoscape interaction hook for the enhanced Lineage view.
 *
 * Handles node/edge selection, data journey tracing (full chain from system
 * to metric), hover dimming, and search filtering.
 */
export function useLineageCanvas(
  cyRef: MutableRefObject<cytoscape.Core | null>,
  elements: any[],
  searchQuery: string,
  toggleEntity?: (entityId: string) => void,
) {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeState | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdgeState | null>(null);

  // Trace From state
  const [traceOrigin, setTraceOrigin] = useState<string | null>(null);
  const [traceHops, setTraceHops] = useState<number>(1);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Clear selections helper
  const clearSelections = (cy: cytoscape.Core) => {
    cy.nodes('.selected-node').removeClass('selected-node');
    cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
    cy.nodes('.impact-highlight').removeClass('impact-highlight');
    cy.nodes('.journey-node').removeClass('journey-node');
    cy.edges('.neighbor-edge').removeClass('neighbor-edge');
    cy.edges('.selected-edge').removeClass('selected-edge');
    cy.edges('.journey-edge').removeClass('journey-edge');
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  /**
   * Trace the full data journey chain through a node.
   *
   * BFS upward (outgoing edges): node → measures → metrics
   * BFS downward (incoming edges): node → attributes/entities → systems
   *
   * This traces the complete value chain: "where does data come from and
   * what business questions does it answer?"
   */
  const traceJourney = (_cy: cytoscape.Core, startNode: cytoscape.NodeSingular) => {
    const visited = new Set<string>();
    visited.add(startNode.id());

    // BFS upward: follow outgoing edges (data flows up)
    const upQueue: cytoscape.NodeSingular[] = [startNode];
    while (upQueue.length > 0) {
      const current = upQueue.shift()!;
      current.outgoers('edge').forEach((edge) => {
        const target = edge.target();
        if (!visited.has(target.id())) {
          visited.add(target.id());
          target.addClass('journey-node');
          edge.addClass('journey-edge');
          upQueue.push(target);
        }
      });
    }

    // BFS downward: follow incoming edges (trace back to source)
    const downQueue: cytoscape.NodeSingular[] = [startNode];
    while (downQueue.length > 0) {
      const current = downQueue.shift()!;
      current.incomers('edge').forEach((edge) => {
        const source = edge.source();
        if (!visited.has(source.id())) {
          visited.add(source.id());
          source.addClass('journey-node');
          edge.addClass('journey-edge');
          downQueue.push(source);
        }
      });
    }

    // Include compound parent/child nodes in the trace.
    // When entities are expanded, child attributes are compound children
    // with parent: entityId but no explicit edge between them.
    const compoundExtras = new Set<string>();
    for (const nodeId of visited) {
      const node = _cy.getElementById(nodeId);
      if (node.empty()) continue;

      // If this node has a parent (attribute inside expanded entity), include parent
      const parent = node.parent();
      if (parent && parent.nonempty()) {
        parent.forEach((p: cytoscape.NodeSingular) => {
          compoundExtras.add(p.id());
        });
      }

      // If this node is a parent (expanded entity), include all children
      const children = node.children();
      children.forEach((child: cytoscape.NodeSingular) => {
        compoundExtras.add(child.id());
      });
    }

    for (const extraId of compoundExtras) {
      if (!visited.has(extraId)) {
        visited.add(extraId);
        const node = _cy.getElementById(extraId);
        if (node.nonempty()) {
          node.addClass('journey-node');
        }
      }
    }

    return visited;
  };

  // Set up event handlers
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;

    // ── Node tap: select node, trace data journey ──────────────────
    const onNodeTap = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const d = node.data();

      clearSelections(cy);

      // Apply selection visuals
      node.addClass('selected-node');

      setSelectedNode({
        id: d.id,
        type: d.entityType,
        data: d,
      });

      // Entity click: toggle expand/collapse
      if (d.entityType === 'entity' && toggleEntity) {
        toggleEntity(d.id);
      }

      // Trace full data journey chain through this node
      const journeyNodes = traceJourney(cy, node);

      // Use journey nodes as the trace set (replaces generic N-hop trace)
      setTraceOrigin(d.id);
      setTraceHops(1);

      // Apply trace dimming based on journey, not hop count
      cy.elements().removeClass('trace-dimmed');
      cy.elements().removeClass('trace-highlight');

      cy.nodes().forEach((n: cytoscape.NodeSingular) => {
        if (journeyNodes.has(n.id())) {
          n.addClass('trace-highlight');
        } else {
          n.addClass('trace-dimmed');
        }
      });

      cy.edges().forEach((edge: cytoscape.EdgeSingular) => {
        if (journeyNodes.has(edge.source().id()) && journeyNodes.has(edge.target().id())) {
          edge.addClass('trace-highlight');
        } else {
          edge.addClass('trace-dimmed');
        }
      });
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
      const processIds: string[] = d.process_ids || [];
      // After directionality reversal: system→attribute, so attribute is target
      const attributeId = d.attributeId || d.target;

      if (processIds.length > 0) {
        useNavigationStore.getState().openProcessDetail({
          attributeId,
          attributeName: d.label || attributeId,
          processId: processIds[0],
          processName: processNames[0] || processIds[0],
        });
      }
    };

    // ── Right-click node: show context menu ────────────────────────
    const onNodeCxttap = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const d = node.data();
      const pos = evt.renderedPosition || node.renderedPosition();
      setContextMenu({
        nodeId: d.id,
        nodeName: d.name || d.label || d.id,
        x: pos.x,
        y: pos.y,
      });
    };

    // ── Background tap: clear all selections ──────────────────────
    const onBgTap = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        clearSelections(cy);
        setContextMenu(null);
        setTraceOrigin(null);
        setTraceHops(1);
        // Clear trace dimming
        cy.elements().removeClass('trace-dimmed');
        cy.elements().removeClass('trace-highlight');
        cy.nodes().removeClass('journey-node');
        cy.edges().removeClass('journey-edge');
      }
    };

    // ── Mouseover node: highlight neighborhood, dim others ────────
    const onMouseover = (evt: cytoscape.EventObject) => {
      if (searchQuery || traceOrigin) return;
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('hover-dimmed');
      node.connectedEdges().addClass('hover-highlight-edge');
      node.neighborhood('node').addClass('hover-highlight-node');
    };

    // ── Mouseout node: remove all hover dimming ───────────────────
    const onMouseout = () => {
      cy.elements().removeClass('hover-dimmed');
      cy.edges().removeClass('hover-highlight-edge');
      cy.nodes().removeClass('hover-highlight-node');
    };

    // Bind events
    cy.on('tap', 'node', onNodeTap);
    cy.on('tap', 'edge', onEdgeTap);
    cy.on('dbltap', 'edge', onEdgeDblTap);
    cy.on('tap', onBgTap);
    cy.on('cxttap', 'node', onNodeCxttap);
    cy.on('mouseover', 'node', onMouseover);
    cy.on('mouseout', 'node', onMouseout);

    return () => {
      cy.off('tap', 'node', onNodeTap);
      cy.off('tap', 'edge', onEdgeTap);
      cy.off('dbltap', 'edge', onEdgeDblTap);
      cy.off('tap', onBgTap);
      cy.off('cxttap', 'node', onNodeCxttap);
      cy.off('mouseover', 'node', onMouseover);
      cy.off('mouseout', 'node', onMouseout);
    };
  }, [cyRef, elements, searchQuery, traceOrigin, toggleEntity]);

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

  // ── Watch focusedNodeId from navigation store ──────────────────
  useEffect(() => {
    const cy = cyRef.current;
    const focusedNodeId = useNavigationStore.getState().focusedNodeId;
    if (!cy || !focusedNodeId || elements.length === 0) return;

    const node = cy.getElementById(focusedNodeId);
    if (!node || node.empty()) return;

    // Clear and select
    clearSelections(cy);
    node.addClass('selected-node');

    const d = node.data();
    setSelectedNode({ id: d.id, type: d.entityType, data: d });

    // Trace journey through this node
    const journeyNodes = traceJourney(cy, node);
    setTraceOrigin(d.id);

    cy.elements().removeClass('trace-dimmed trace-highlight');
    cy.nodes().forEach((n: cytoscape.NodeSingular) => {
      if (journeyNodes.has(n.id())) {
        n.addClass('trace-highlight');
      } else {
        n.addClass('trace-dimmed');
      }
    });
    cy.edges().forEach((edge: cytoscape.EdgeSingular) => {
      if (journeyNodes.has(edge.source().id()) && journeyNodes.has(edge.target().id())) {
        edge.addClass('trace-highlight');
      } else {
        edge.addClass('trace-dimmed');
      }
    });

    // Center on the node
    cy.animate({ center: { eles: node }, duration: 300 });

    // Clear the focused node so it doesn't re-trigger
    useNavigationStore.getState().clearFocusedNode();
  }, [cyRef, elements]);

  const startTrace = useCallback((nodeId: string) => {
    setTraceOrigin(nodeId);
    setTraceHops(1);
  }, []);

  const expandTrace = useCallback(() => setTraceHops((h) => h + 1), []);
  const contractTrace = useCallback(() => setTraceHops((h) => Math.max(1, h - 1)), []);
  const clearTrace = useCallback(() => {
    setTraceOrigin(null);
    setTraceHops(1);
  }, []);

  const dismissContextMenu = useCallback(() => setContextMenu(null), []);

  return {
    selectedNode,
    selectedEdge,
    clearSelections: () => {
      const cy = cyRef.current;
      if (cy) clearSelections(cy);
    },
    traceOrigin,
    traceHops,
    startTrace,
    expandTrace,
    contractTrace,
    clearTrace,
    contextMenu,
    dismissContextMenu,
  };
}
