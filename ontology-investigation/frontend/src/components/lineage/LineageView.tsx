import { useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { GitBranch, Layers } from 'lucide-react';
import { useLineageData } from './hooks/useLineageData';
import { useLineageCanvas } from './hooks/useLineageCanvas';
import { usePerspectives } from '../../hooks/useOntology';
import { buildLineageElements } from './nodes/lineageElementBuilder';
import { lineageNodeStyles } from './nodes/lineageNodeStyles';
import { CytoscapeContainer } from '../shared/canvas/CytoscapeContainer';
import { ZoomControls } from '../shared/canvas/ZoomControls';
import { Minimap } from '../shared/canvas/Minimap';
import { LineageToolbar } from './toolbar/LineageToolbar';
import { LineageInspectorPanel } from './panel/LineageInspectorPanel';
import { entityTypeConfig } from '../shared/canvas/entityTypeConfig';

// Register dagre layout extension (idempotent -- Cytoscape ignores duplicates)
cytoscape.use(cytoscapeDagre);

/**
 * Enhanced Lineage view -- the primary data-centric view.
 *
 * Extends the base lineage graph with crystallisation cost overlays,
 * perspective filtering, impact highlighting, and an inspector panel
 * for detailed node/edge exploration.
 */
export function LineageView() {
  const cyRef = useRef<cytoscape.Core | null>(null);

  const {
    metrics,
    measures,
    attributes,
    entities,
    systems,
    crystallisationCosts,
    isLoading,
    perspectiveFilter,
    setPerspectiveFilter,
    searchQuery,
    setSearchQuery,
    totalCrystallisationMinutes,
  } = useLineageData();

  const { data: perspectives } = usePerspectives();

  const elements = useMemo(
    () =>
      buildLineageElements(
        { metrics, measures, attributes, entities, systems },
        crystallisationCosts,
      ),
    [metrics, measures, attributes, entities, systems, crystallisationCosts],
  );

  const layout = useMemo<cytoscape.LayoutOptions>(
    () =>
      ({
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 40,
        rankSep: 80,
        edgeSep: 20,
        animate: true,
        animationDuration: 400,
        fit: true,
        padding: 40,
      } as any),
    [],
  );

  // Wire up interactivity (selection, hover dimming, search, impact)
  const { selectedNode, selectedEdge, clearSelections } = useLineageCanvas(
    cyRef,
    elements,
    searchQuery,
  );

  // Count entities for stats
  const totalNodes =
    metrics.length + measures.length + attributes.length + entities.length + systems.length;
  const edgeCount = elements.filter((el: any) => el.data.source).length;
  const counts = [
    { label: 'Metrics', count: metrics.length, color: entityTypeConfig.metric.border },
    { label: 'Measures', count: measures.length, color: entityTypeConfig.measure.border },
    { label: 'Attributes', count: attributes.length, color: entityTypeConfig.attribute.border },
    { label: 'Entities', count: entities.length, color: entityTypeConfig.entity.border },
    { label: 'Systems', count: systems.length, color: entityTypeConfig.system.border },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          <span>Loading lineage...</span>
        </div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <LineageToolbar
          perspectiveFilter={perspectiveFilter}
          onPerspectiveChange={setPerspectiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          perspectives={perspectives?.map(p => ({ id: p.id, name: p.name }))}
          stats={{ nodeCount: 0, edgeCount: 0, totalCrystallisationHours: 0 }}
        />
        <div className="flex flex-col items-center justify-center flex-1 bg-gray-50">
          <GitBranch className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Lineage Data</h3>
          <p className="text-gray-500 text-sm mb-1">
            Create relationships between metrics, measures, and attributes to trace lineage.
          </p>
          <p className="text-gray-500 text-xs">
            Lineage shows the full path from business questions to source systems.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <LineageToolbar
        perspectiveFilter={perspectiveFilter}
        onPerspectiveChange={setPerspectiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        perspectives={perspectives?.map(p => ({ id: p.id, name: p.name }))}
        stats={{
          nodeCount: totalNodes,
          edgeCount,
          totalCrystallisationHours: totalCrystallisationMinutes / 60,
        }}
      />

      <div className="relative flex-1 overflow-hidden">
        <CytoscapeContainer
          cyRef={cyRef}
          elements={elements}
          stylesheet={lineageNodeStyles}
          layout={layout}
        />

        {/* Floating stats bar (top-left) */}
        <div className="absolute top-4 left-4 flex gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-3 py-2 z-10">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-medium">Lineage</span>
          </div>
          <div className="w-px bg-gray-200" />
          {counts.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600">
                {count} <span className="text-gray-500">{label}</span>
              </span>
            </div>
          ))}
          <div className="w-px bg-gray-200" />
          <div className="text-xs text-gray-500">
            {totalNodes} nodes &middot; {edgeCount} edges
          </div>
        </div>

        <ZoomControls cyRef={cyRef} />
        <Minimap cyRef={cyRef} />

        <LineageInspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          crystallisationCosts={crystallisationCosts}
          onClose={clearSelections}
        />
      </div>
    </div>
  );
}
