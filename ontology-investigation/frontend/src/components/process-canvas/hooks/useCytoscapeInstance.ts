import { useRef, useEffect, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import cytoscapeFcose from 'cytoscape-fcose';
import toast from 'react-hot-toast';
import { nodeStyles } from '../nodes/nodeStyles';
import { buildElements, type ProcessFlow } from '../nodes/elementBuilder';
import { useCanvasStore } from './useCanvasStore';

// Register layouts
cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeFcose);

/** Check if adding sourceId → targetId creates a cycle in the dependency graph. */
function wouldCreateCycle(
  flow: ProcessFlow,
  sourceId: string,
  targetId: string,
): boolean {
  // Build adjacency map: step → steps it depends on (i.e., edges point from dep to step)
  // We're adding an edge from sourceId to targetId (meaning targetId depends on sourceId).
  // A cycle exists if targetId can already reach sourceId via existing edges.
  const adj = new Map<string, string[]>();
  for (const node of flow.nodes) {
    const deps = (node as any).depends_on_step_ids || [];
    // For each dep, add an edge dep → node.id (this is the flow direction)
    for (const dep of deps) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(node.id);
    }
  }

  // BFS from targetId: can we reach sourceId?
  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adj.get(current) || []) {
      queue.push(next);
    }
  }
  return false;
}

interface CytoscapeCallbacks {
  onCreateConnection: (targetStepId: string, updatedDeps: string[]) => void;
  onReorderStep?: (stepId: string, newSequence: number) => void;
}

export function useCytoscapeInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  flow: ProcessFlow | null | undefined,
  callbacks: CytoscapeCallbacks,
) {
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Stable refs so event handlers always see latest values
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const flowRef = useRef(flow);
  flowRef.current = flow;

  const elements = useMemo(() => {
    if (!flow) return [];
    return buildElements(flow);
  }, [flow]);

  // Initialize / reinitialize Cytoscape when elements change
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: nodeStyles as any,
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3.0,
      wheelSensitivity: 0.3,
    });

    // ── Node tap ──────────────────────────────────────────────
    cy.on('tap', 'node.step-node', (evt) => {
      const node = evt.target;
      const data = node.data();
      const store = useCanvasStore.getState();

      // Connection mode: create edges between nodes
      if (store.connectionMode) {
        if (!store.firstNodeForConnection) {
          store.setFirstNodeForConnection(data.id);
          node.addClass('connection-source');
        } else if (store.firstNodeForConnection === data.id) {
          store.setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        } else {
          const sourceId = store.firstNodeForConnection;
          const currentFlow = flowRef.current;
          const targetStep = currentFlow?.nodes.find((n) => n.id === data.id);
          if (targetStep) {
            const currentDeps = (targetStep as any).depends_on_step_ids || [];
            if (currentDeps.includes(sourceId)) {
              toast.error('Connection already exists!');
            } else if (currentFlow && wouldCreateCycle(currentFlow, sourceId, data.id)) {
              toast.error('Cannot create connection — would cause a circular dependency!');
            } else {
              callbacksRef.current.onCreateConnection(data.id, [
                ...currentDeps,
                sourceId,
              ]);
            }
          }
          store.setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        }
        return;
      }

      // Ctrl+click: multi-select toggle
      if (evt.originalEvent.ctrlKey || evt.originalEvent.metaKey) {
        store.toggleInSelection(data.id);
        node.toggleClass('multi-selected');
        return;
      }

      // Normal mode: single select step — apply visual selection on canvas
      cy.nodes('.selected-node').removeClass('selected-node');
      cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
      cy.edges('.neighbor-edge').removeClass('neighbor-edge');
      cy.nodes('.multi-selected').removeClass('multi-selected');
      node.addClass('selected-node');

      // Highlight connected neighbors
      node.connectedEdges().addClass('neighbor-edge');
      node.neighborhood('node').addClass('neighbor-highlight');

      store.selectStep({
        id: data.id,
        name: data.name,
        actor: data.actor,
        sequence: data.sequence,
        perspective_id: data.perspective_id,
        estimated_duration_minutes: data.estimated_duration_minutes,
        automation_potential: data.automation_potential,
        waste_category: data.waste_category,
        manual_effort_percentage: data.manual_effort_percentage,
        produces_attribute_ids: data.produces_attribute_ids,
        consumes_attribute_ids: data.consumes_attribute_ids,
        crystallizes_attribute_ids: data.crystallizes_attribute_ids,
        produces_measure_ids: data.produces_measure_ids,
        produces_metric_ids: data.produces_metric_ids,
        uses_metric_ids: data.uses_metric_ids,
        systems_used_ids: data.systems_used_ids,
        has_sub_steps: data.has_sub_steps,
      });
    });

    // ── Double-click for drill-down ───────────────────────────
    cy.on('dbltap', 'node.step-node', (evt) => {
      const data = evt.target.data();
      if (data.has_sub_steps) {
        useCanvasStore.getState().drillDown({
          id: data.id,
          name: data.name,
        });
      }
    });

    // ── Handoff edge tap ──────────────────────────────────────
    cy.on('tap', 'edge.handoff-edge', (evt) => {
      cy.nodes('.selected-node').removeClass('selected-node');
      cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
      cy.edges('.neighbor-edge').removeClass('neighbor-edge');
      const edgeData = evt.target.data();
      const sourceEl = cy.getElementById(edgeData.source);
      const targetEl = cy.getElementById(edgeData.target);

      if (sourceEl.length && targetEl.length) {
        const sData = sourceEl.data();
        const tData = targetEl.data();
        useCanvasStore.getState().selectHandoff({
          sourceStep: {
            id: sData.id,
            name: sData.name,
            perspective_id: sData.perspective_id,
          },
          targetStep: {
            id: tData.id,
            name: tData.name,
            perspective_id: tData.perspective_id,
          },
        });
      }
    });

    // ── Background tap ────────────────────────────────────────
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.nodes('.selected-node').removeClass('selected-node');
        cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
        cy.edges('.neighbor-edge').removeClass('neighbor-edge');
        cy.nodes('.multi-selected').removeClass('multi-selected');
        const store = useCanvasStore.getState();
        store.selectStep(null);
        store.selectHandoff(null);
        store.clearMultiSelection();
      }
    });

    // ── Hover: dim non-neighbors ──────────────────────────────
    cy.on('mouseover', 'node.step-node', (evt) => {
      const store = useCanvasStore.getState();
      // Don't apply hover dimming if search is active or connection mode
      if (store.searchQuery || store.connectionMode) return;

      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('hover-dimmed');
    });

    cy.on('mouseout', 'node.step-node', () => {
      cy.elements().removeClass('hover-dimmed');
    });

    // ── Drag-end: recalculate sequence from X position ─────────
    let reorderTimeout: ReturnType<typeof setTimeout> | null = null;
    cy.on('dragfree', 'node.step-node', (evt) => {
      const node = evt.target;
      const data = node.data();
      const pid = data.perspective_id;

      // Get all nodes in the same perspective, sorted by X position
      const samePersp = cy.nodes('.step-node').filter((n: any) => n.data('perspective_id') === pid);
      const sorted = samePersp.sort((a: any, b: any) => a.position('x') - b.position('x'));

      // Find the new sequence position (1-based)
      let newSeq = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].id() === data.id) {
          newSeq = i + 1;
          break;
        }
      }

      // Only fire if sequence actually changed
      if (newSeq !== data.sequence) {
        if (reorderTimeout) clearTimeout(reorderTimeout);
        reorderTimeout = setTimeout(() => {
          callbacksRef.current.onReorderStep?.(data.id, newSeq);
        }, 300);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, containerRef]);

  // Zoom helpers
  const zoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      const w = cy.width();
      const h = cy.height();
      cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: w / 2, y: h / 2 } });
    }
  }, []);

  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      const w = cy.width();
      const h = cy.height();
      cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: w / 2, y: h / 2 } });
    }
  }, []);

  const fitToScreen = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 50);
  }, []);

  return { cyRef, elements, zoomIn, zoomOut, fitToScreen };
}
