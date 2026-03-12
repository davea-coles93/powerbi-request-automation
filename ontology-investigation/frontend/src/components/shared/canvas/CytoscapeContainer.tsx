import { useEffect, useRef, type MutableRefObject } from 'react';
import cytoscape from 'cytoscape';
import type { LayoutOptions, StylesheetJsonBlock } from 'cytoscape';

interface CytoscapeContainerProps {
  cyRef: MutableRefObject<cytoscape.Core | null>;
  elements: any[];
  stylesheet: StylesheetJsonBlock[];
  layout: LayoutOptions;
  onReady?: (cy: cytoscape.Core) => void;
}

/**
 * Reusable Cytoscape canvas wrapper.
 *
 * Creates a Cytoscape instance on mount and destroys it on unmount.
 * When elements change the graph is updated via cy.json({ elements }).
 */
export function CytoscapeContainer({
  cyRef,
  elements,
  stylesheet,
  layout,
  onReady,
}: CytoscapeContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Create Cytoscape instance on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: stylesheet as any,
      layout,
      minZoom: 0.1,
      maxZoom: 3.0,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;
    initializedRef.current = true;

    if (onReady) {
      onReady(cy);
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
      initializedRef.current = false;
    };
    // Only run on mount/unmount -- element updates are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update elements when they change (after initial mount)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !initializedRef.current) return;

    cy.json({ elements });

    // Re-run layout after element update
    cy.layout(layout).run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  return (
    <>
      {/* Dot-grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage:
            'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Cytoscape canvas */}
      <div ref={containerRef} className="absolute inset-0" />
    </>
  );
}
