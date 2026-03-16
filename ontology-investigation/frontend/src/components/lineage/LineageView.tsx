import { useRef, useMemo, useEffect } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { GitBranch, Crosshair, Eye, FilterX } from 'lucide-react';
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
import type { EntityTypeName } from './hooks/useLineageData';

// Register dagre layout extension (idempotent -- Cytoscape ignores duplicates)
cytoscape.use(cytoscapeDagre);

/**
 * Enhanced Lineage view -- the primary data-centric view.
 *
 * Supports two view modes:
 * - Lineage: dagre-based DAG showing full traceability with crystallisation costs
 * - Schema: layered horizontal graph (Metrics → Measures → Attributes → Entities → Systems)
 *
 * Both views support perspective filtering, type visibility toggles, and search.
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
    measureCosts,
    metricCosts,
    isLoading,
    perspectiveFilter,
    setPerspectiveFilter,
    searchQuery,
    setSearchQuery,
    totalCrystallisationMinutes,
    hiddenTypes,
    toggleType,
    crystallisationOnly,
    setCrystallisationOnly,
    processFilter,
    setProcessFilter,
    processes,
    expandedEntities,
    toggleEntity,
  } = useLineageData();

  const { data: perspectives } = usePerspectives();

  const elements = useMemo(() => {
    const data = { metrics, measures, attributes, entities, systems };
    return buildLineageElements(data, crystallisationCosts, expandedEntities, measureCosts, metricCosts);
  }, [metrics, measures, attributes, entities, systems, crystallisationCosts, expandedEntities, measureCosts, metricCosts]);

  const layout = useMemo<cytoscape.LayoutOptions>(() => ({
    name: 'dagre',
    rankDir: 'BT',
    nodeSep: 40,
    rankSep: 80,
    edgeSep: 20,
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 40,
  } as any), []);

  // Wire up interactivity (selection, hover dimming, search, impact)
  const {
    selectedNode,
    selectedEdge,
    clearSelections,
    traceOrigin,
    traceHops,
    startTrace,
    expandTrace,
    contractTrace,
    clearTrace,
    contextMenu,
    dismissContextMenu,
  } = useLineageCanvas(
    cyRef,
    elements,
    searchQuery,
    toggleEntity,
  );

  // Dismiss context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => dismissContextMenu();
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [contextMenu, dismissContextMenu]);

  // Unfiltered counts (before type toggle) for the chips
  const typeCounts: { type: EntityTypeName; label: string; count: number }[] = [
    { type: 'metric', label: 'Metrics', count: metrics.length },
    { type: 'measure', label: 'Measures', count: measures.length },
    { type: 'attribute', label: 'Attributes', count: attributes.length },
    { type: 'entity', label: 'Entities', count: entities.length },
    { type: 'system', label: 'Systems', count: systems.length },
  ];

  // Count actual graph elements (respects collapsed entities)
  const totalNodes = elements.filter((el: any) => !el.data.source).length;
  const edgeCount = elements.filter((el: any) => el.data.source).length;
  const costedAttributeCount = Object.keys(crystallisationCosts).length;

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

  const hasActiveFilters = perspectiveFilter !== 'all' || crystallisationOnly || processFilter !== null;

  if (elements.length === 0) {
    const clearAllFilters = () => {
      setPerspectiveFilter('all');
      setCrystallisationOnly(false);
      setProcessFilter(null);
    };

    return (
      <div className="flex flex-col h-full">
        <LineageToolbar
          perspectiveFilter={perspectiveFilter}
          onPerspectiveChange={setPerspectiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          perspectives={perspectives?.map(p => ({ id: p.id, name: p.name }))}
          stats={{ nodeCount: 0, edgeCount: 0, totalCrystallisationHours: 0 }}
          typeCounts={typeCounts}
          hiddenTypes={hiddenTypes}
          onToggleType={toggleType}
          crystallisationOnly={crystallisationOnly}
          onCrystallisationToggle={setCrystallisationOnly}
          costedAttributeCount={costedAttributeCount}
          processes={processes?.map(p => ({ id: p.id, name: p.name }))}
          processFilter={processFilter}
          onProcessFilterChange={setProcessFilter}
        />
        <div className="flex flex-col items-center justify-center flex-1 bg-gray-50">
          {hasActiveFilters ? (
            <>
              <FilterX className="w-16 h-16 text-amber-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Elements</h3>
              <p className="text-gray-500 text-sm mb-1">
                Your active filters don't match any elements in this scenario.
              </p>
              <p className="text-gray-500 text-xs mb-4">
                {processFilter && crystallisationOnly
                  ? 'The selected process may not have data journey pathways.'
                  : processFilter
                    ? 'The selected process may not touch any ontology elements.'
                    : 'Try adjusting your perspective or data journey filter.'}
              </p>
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
              >
                <FilterX className="w-4 h-4" />
                Clear All Filters
              </button>
            </>
          ) : (
            <>
              <GitBranch className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Lineage Data</h3>
              <p className="text-gray-500 text-sm mb-1">
                Create relationships between metrics, measures, and attributes to trace lineage.
              </p>
              <p className="text-gray-500 text-xs">
                Lineage shows the full path from business questions to source systems.
              </p>
            </>
          )}
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
        typeCounts={typeCounts}
        hiddenTypes={hiddenTypes}
        onToggleType={toggleType}
        crystallisationOnly={crystallisationOnly}
        onCrystallisationToggle={setCrystallisationOnly}
          costedAttributeCount={costedAttributeCount}
        processes={processes?.map(p => ({ id: p.id, name: p.name }))}
        processFilter={processFilter}
        onProcessFilterChange={setProcessFilter}
      />

      <div className="relative flex-1 overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
        <CytoscapeContainer
          cyRef={cyRef}
          elements={elements}
          stylesheet={lineageNodeStyles}
          layout={layout}
        />

        <ZoomControls cyRef={cyRef} />
        <Minimap cyRef={cyRef} />

        {/* Right-click context menu */}
        {contextMenu && (
          <div
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-in fade-in duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
              {contextMenu.nodeName}
            </div>
            <button
              onClick={() => {
                startTrace(contextMenu.nodeId);
                dismissContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Trace From Here
            </button>
            <button
              onClick={() => {
                // Select the node programmatically
                const cy = cyRef.current;
                if (cy) {
                  const node = cy.getElementById(contextMenu.nodeId);
                  if (node && !node.empty()) {
                    node.emit('tap');
                  }
                }
                dismissContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Inspect
            </button>
          </div>
        )}

        <LineageInspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          crystallisationCosts={crystallisationCosts}
          onClose={clearSelections}
        />

        {/* Trace From floating controls */}
        {traceOrigin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2">
            <span className="text-xs text-gray-600 font-medium">Trace From</span>
            <button
              onClick={contractTrace}
              disabled={traceHops <= 1}
              className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[3ch] text-center">
              {traceHops}
            </span>
            <button
              onClick={expandTrace}
              className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              +
            </button>
            <span className="text-xs text-gray-500">hops</span>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={clearTrace}
              className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
