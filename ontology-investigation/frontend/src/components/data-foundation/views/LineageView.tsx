import { useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeFcose from 'cytoscape-fcose';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useLineageCanvas } from '../hooks/useLineageCanvas';
import { buildLineageElements } from '../nodes/lineageElementBuilder';
import { dataFoundationNodeStyles } from '../nodes/nodeStyles';
import { CytoscapeContainer } from '../canvas/CytoscapeContainer';
import { ZoomControls } from '../canvas/ZoomControls';
import { Minimap } from '../canvas/Minimap';

// Register fcose layout extension (idempotent -- Cytoscape ignores duplicates)
cytoscape.use(cytoscapeFcose);

/**
 * Lineage view -- force-directed graph showing how metrics trace through
 * measures and attributes down to entities and systems. Uses fcose layout
 * for organic positioning.
 */
export function LineageView() {
  const cyRef = useRef<cytoscape.Core | null>(null);

  const {
    metrics,
    measures,
    attributes,
    entities,
    systems,
    isLoading,
  } = useDataFoundationData();

  const elements = useMemo(
    () =>
      buildLineageElements({
        metrics,
        measures,
        attributes,
        entities,
        systems,
      }),
    [metrics, measures, attributes, entities, systems],
  );

  const layout = useMemo<cytoscape.LayoutOptions>(
    () =>
      ({
        name: 'fcose',
        animate: true,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 200,
        nodeRepulsion: 8000,
      } as any),
    [],
  );

  // Wire up interactivity (selection, hover dimming, search)
  useLineageCanvas(cyRef, elements);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading lineage...
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available for the lineage view.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <CytoscapeContainer
        cyRef={cyRef}
        elements={elements}
        stylesheet={dataFoundationNodeStyles}
        layout={layout}
      />
      <ZoomControls cyRef={cyRef} />
      <Minimap cyRef={cyRef} />
    </div>
  );
}
