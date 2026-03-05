import { useRef, useMemo } from 'react';
import type cytoscape from 'cytoscape';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useSchemaCanvas } from '../hooks/useSchemaCanvas';
import { buildSchemaElements } from '../nodes/schemaElementBuilder';
import { dataFoundationNodeStyles } from '../nodes/nodeStyles';
import { CytoscapeContainer } from '../canvas/CytoscapeContainer';
import { ZoomControls } from '../canvas/ZoomControls';
import { Minimap } from '../canvas/Minimap';

/**
 * Schema view -- layered graph with Metrics at the top, down through
 * Measures, Attributes, Entities, and Systems. Uses a preset layout
 * (positions are baked into the element builder).
 */
export function SchemaView() {
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
      buildSchemaElements({
        metrics,
        measures,
        attributes,
        entities,
        systems,
      }),
    [metrics, measures, attributes, entities, systems],
  );

  const layout = useMemo<cytoscape.LayoutOptions>(
    () => ({ name: 'preset' }),
    [],
  );

  // Wire up interactivity (selection, hover dimming, search)
  useSchemaCanvas(cyRef, elements);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading schema...
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No data available for the schema view.
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
