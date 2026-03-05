import { useEffect, type MutableRefObject } from 'react';
import type cytoscape from 'cytoscape';
import { useDataFoundationStore } from './useDataFoundationStore';

/**
 * Cytoscape lifecycle hook for the Schema view.
 *
 * Sets up event handlers on the Cytoscape instance for node selection,
 * hover dimming, background tap, and search query filtering.
 * Cleans up all handlers on unmount.
 */
export function useSchemaCanvas(
  cyRef: MutableRefObject<cytoscape.Core | null>,
  elements: any[],
) {
  // Set up event handlers when cy instance and elements are available
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;

    // ── Node tap: select node, highlight neighbors ────────────────
    const onNodeTap = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const d = node.data();
      const store = useDataFoundationStore.getState();

      // Clear previous selection visuals
      cy.nodes('.selected-node').removeClass('selected-node');
      cy.nodes('.highlighted').removeClass('highlighted');
      cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
      cy.edges('.neighbor-edge').removeClass('neighbor-edge');

      // Apply selection visuals
      node.addClass('selected-node');
      node.connectedEdges().addClass('neighbor-edge');
      node.neighborhood('node').addClass('neighbor-highlight');

      // Update store
      store.selectNode({
        id: d.id,
        type: d.entityType,
        data: d,
      });
    };

    // ── Background tap: close inspector ───────────────────────────
    const onBgTap = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        cy.nodes('.selected-node').removeClass('selected-node');
        cy.nodes('.highlighted').removeClass('highlighted');
        cy.nodes('.neighbor-highlight').removeClass('neighbor-highlight');
        cy.edges('.neighbor-edge').removeClass('neighbor-edge');
        useDataFoundationStore.getState().closeInspector();
      }
    };

    // ── Mouseover node: highlight neighborhood, dim others ────────
    const onMouseover = (evt: cytoscape.EventObject) => {
      const store = useDataFoundationStore.getState();
      if (store.searchQuery) return;

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
    cy.on('tap', onBgTap);
    cy.on('mouseover', 'node', onMouseover);
    cy.on('mouseout', 'node', onMouseout);

    // Fit after first render
    requestAnimationFrame(() => {
      cy.fit(undefined, 50);
    });

    return () => {
      cy.off('tap', 'node', onNodeTap);
      cy.off('tap', onBgTap);
      cy.off('mouseover', 'node', onMouseover);
      cy.off('mouseout', 'node', onMouseout);
    };
  }, [cyRef, elements]);

  // ── Watch searchQuery from store: dim non-matches, focus matches ──
  useEffect(() => {
    let prevQuery = useDataFoundationStore.getState().searchQuery;

    const applySearch = (searchQuery: string) => {
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
    };

    const unsubscribe = useDataFoundationStore.subscribe((state) => {
      if (state.searchQuery !== prevQuery) {
        prevQuery = state.searchQuery;
        applySearch(state.searchQuery);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cyRef]);
}
