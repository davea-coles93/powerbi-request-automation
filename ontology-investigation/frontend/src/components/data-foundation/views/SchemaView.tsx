import { useRef, useMemo } from 'react';
import type cytoscape from 'cytoscape';
import { Database, Layers } from 'lucide-react';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useSchemaCanvas } from '../hooks/useSchemaCanvas';
import { buildSchemaElements } from '../nodes/schemaElementBuilder';
import { dataFoundationNodeStyles } from '../nodes/nodeStyles';
import { CytoscapeContainer } from '../canvas/CytoscapeContainer';
import { ZoomControls } from '../canvas/ZoomControls';
import { Minimap } from '../canvas/Minimap';
import { entityTypeConfig } from '../nodes/entityTypeConfig';

/**
 * Schema view -- layered graph with Metrics at the top, down through
 * Measures, Attributes, Entities, and Systems.
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

  // Count entities for stats overlay
  const counts = [
    { label: 'Metrics', count: metrics.length, color: entityTypeConfig.metric.border },
    { label: 'Measures', count: measures.length, color: entityTypeConfig.measure.border },
    { label: 'Attributes', count: attributes.length, color: entityTypeConfig.attribute.border },
    { label: 'Entities', count: entities.length, color: entityTypeConfig.entity.border },
    { label: 'Systems', count: systems.length, color: entityTypeConfig.system.border },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          <span>Loading schema...</span>
        </div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <Database className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Schema Data</h3>
        <p className="text-gray-500 text-sm mb-1">
          Add metrics, measures, and attributes to see the schema graph.
        </p>
        <p className="text-gray-400 text-xs">
          Use the sidebar to navigate between entity types, or import data from Power BI.
        </p>
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

      {/* Floating stats bar (top-left) */}
      <div className="absolute top-4 left-4 flex gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-3 py-2 z-10">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Layers className="w-3.5 h-3.5" />
          <span className="font-medium">Schema</span>
        </div>
        <div className="w-px bg-gray-200" />
        {counts.map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600">
              {count} <span className="text-gray-400">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <ZoomControls cyRef={cyRef} />
      <Minimap cyRef={cyRef} />
    </div>
  );
}
