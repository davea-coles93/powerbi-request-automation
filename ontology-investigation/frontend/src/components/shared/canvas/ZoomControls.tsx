import type { MutableRefObject } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type cytoscape from 'cytoscape';

interface ZoomControlsProps {
  cyRef: MutableRefObject<cytoscape.Core | null>;
}

/**
 * Zoom in / out / fit-to-screen buttons positioned at the bottom-right of the
 * canvas. Each action operates directly on the Cytoscape core instance.
 */
export function ZoomControls({ cyRef }: ZoomControlsProps) {
  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const w = cy.width();
    const h = cy.height();
    cy.animate({
      zoom: { level: cy.zoom() * 1.2, renderedPosition: { x: w / 2, y: h / 2 } },
      duration: 200,
      easing: 'ease-in-out-cubic',
    } as any);
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const w = cy.width();
    const h = cy.height();
    cy.animate({
      zoom: { level: cy.zoom() * 0.8, renderedPosition: { x: w / 2, y: h / 2 } },
      duration: 200,
      easing: 'ease-in-out-cubic',
    } as any);
  };

  const handleFit = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      fit: { eles: cy.elements(), padding: 50 },
      duration: 300,
      easing: 'ease-in-out-cubic',
    } as any);
  };

  const btnClass =
    'p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors';

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm p-1 z-10">
      <button onClick={handleZoomIn} className={btnClass} title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={handleZoomOut} className={btnClass} title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="h-px bg-gray-200 mx-1" />
      <button
        onClick={handleFit}
        className="p-2 hover:bg-gray-100 rounded text-blue-600 transition-colors"
        title="Fit to Screen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
