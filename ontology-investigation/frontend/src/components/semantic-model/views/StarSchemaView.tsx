import { useRef, useMemo, useEffect, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { Database, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useRecommendedSchema } from '../hooks/useRecommendedSchema';
import { buildStarSchemaElements } from '../nodes/starSchemaElementBuilder';
import { starSchemaStyles } from '../nodes/starSchemaStyles';
import type { RecommendedTable } from '../hooks/useRecommendedSchema';

interface StarSchemaViewProps {
  onSelectTable?: (table: RecommendedTable | null) => void;
}

export function StarSchemaView({ onSelectTable }: StarSchemaViewProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tables, relationships, isLoading } = useRecommendedSchema();

  const elements = useMemo(
    () => buildStarSchemaElements(tables, relationships),
    [tables, relationships],
  );

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: starSchemaStyles as any,
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Fit to viewport with padding
    cy.fit(undefined, 60);

    // ── Interactivity ──────────────────────────────────────────

    // Click node → select, highlight neighbors
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      cy.elements().removeClass('selected-node neighbor-highlight neighbor-edge dimmed');

      node.addClass('selected-node');
      const neighborhood = node.neighborhood();
      neighborhood.nodes().addClass('neighbor-highlight');
      neighborhood.edges().addClass('neighbor-edge');

      // Dim everything else
      cy.elements()
        .not(node)
        .not(neighborhood)
        .addClass('dimmed');

      // Notify parent of selection
      const tableData = node.data() as RecommendedTable;
      onSelectTable?.(tableData);
    });

    // Click background → clear selection
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('selected-node neighbor-highlight neighbor-edge dimmed');
        onSelectTable?.(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, onSelectTable]);

  // Zoom controls
  const getCenter = useCallback(() => {
    const ext = cyRef.current?.extent();
    if (!ext) return { x: 0, y: 0 };
    return { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 };
  }, []);
  const handleZoomIn = useCallback(() => {
    cyRef.current?.animate({ zoom: { level: (cyRef.current?.zoom() || 1) * 1.3, position: getCenter() }, duration: 200 } as any);
  }, [getCenter]);
  const handleZoomOut = useCallback(() => {
    cyRef.current?.animate({ zoom: { level: (cyRef.current?.zoom() || 1) / 1.3, position: getCenter() }, duration: 200 } as any);
  }, [getCenter]);
  const handleFit = useCallback(() => {
    cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 60 }, duration: 300 } as any);
  }, []);

  const factCount = tables.filter((t) => t.tableType === 'Fact').length;
  const dimCount = tables.filter((t) => t.tableType === 'Dimension').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Generating star schema...</span>
        </div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <Database className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Schema to Show</h3>
        <p className="text-gray-500 text-sm mb-1">
          Add entities and attributes in the Data Foundation to generate a recommended star schema.
        </p>
        <p className="text-gray-400 text-xs">
          Entities become dimension tables, measures become fact table DAX.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Cytoscape canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle, #f8fafc 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Floating stats bar */}
      <div className="absolute top-4 left-4 flex gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-3 py-2 z-10">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Layers className="w-3.5 h-3.5" />
          <span className="font-medium">Star Schema</span>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600">{factCount} <span className="text-gray-400">Fact</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-gray-600">{dimCount} <span className="text-gray-400">Dim</span></span>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-xs text-gray-400">
          {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <button onClick={handleZoomIn} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors" title="Zoom in">
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors" title="Zoom out">
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={handleFit} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors" title="Fit to view">
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
