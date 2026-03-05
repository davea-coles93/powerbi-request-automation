import { useCallback } from 'react';
import type cytoscape from 'cytoscape';
import { useCanvasStore, type LayoutType } from '../hooks/useCanvasStore';

interface LayoutSwitcherProps {
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

export function LayoutSwitcher({ cyRef }: LayoutSwitcherProps) {
  const layoutType = useCanvasStore((s) => s.layoutType);
  const setLayoutType = useCanvasStore((s) => s.setLayoutType);

  const applyLayout = useCallback(
    (type: LayoutType) => {
      const cy = cyRef.current;
      if (!cy) return;

      setLayoutType(type);

      const layoutOptions: cytoscape.LayoutOptions =
        type === 'flow'
          ? {
              name: 'dagre',
              rankDir: 'LR',
              nodeSep: 80,
              rankSep: 120,
              animate: true,
              animationDuration: 500,
              animationEasing: 'ease-in-out-cubic' as any,
            } as any
          : {
              name: 'fcose',
              animate: true,
              animationDuration: 500,
              animationEasing: 'ease-in-out-cubic' as any,
              nodeRepulsion: () => 8000,
              idealEdgeLength: () => 200,
              edgeElasticity: () => 0.1,
              gravity: 0.25,
              gravityRange: 3.8,
              numIter: 2500,
            } as any;

      cy.layout(layoutOptions).run();
    },
    [cyRef, setLayoutType],
  );

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
      <button
        onClick={() => applyLayout('flow')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          layoutType === 'flow'
            ? 'bg-purple-600 text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Flow
      </button>
      <button
        onClick={() => applyLayout('free')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${
          layoutType === 'free'
            ? 'bg-purple-600 text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Free
      </button>
    </div>
  );
}
