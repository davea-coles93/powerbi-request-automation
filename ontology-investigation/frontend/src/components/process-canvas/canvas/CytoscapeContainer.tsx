import { forwardRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CytoscapeContainerProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  inspectorOpen?: boolean;
}

export const CytoscapeContainer = forwardRef<HTMLDivElement, CytoscapeContainerProps>(
  ({ onZoomIn, onZoomOut, onFitToScreen, inspectorOpen }, ref) => {
    return (
      <>
        {/* Dot-grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#fafafa',
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Cytoscape canvas */}
        <div ref={ref} className="absolute inset-0" />

        {/* Zoom Controls — bottom-right, shifts left when inspector is open */}
        <div
          className="absolute bottom-4 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm p-1 z-10 transition-[right] duration-200"
          style={{ right: inspectorOpen ? 416 : 16 }}
        >
          <button
            onClick={onZoomIn}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-gray-200 mx-1" />
          <button
            onClick={onFitToScreen}
            className="p-2 hover:bg-gray-100 rounded text-blue-600 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  }
);

CytoscapeContainer.displayName = 'CytoscapeContainer';
