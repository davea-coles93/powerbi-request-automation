import { useMemo, useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import {
  usePerspectiveView,
  useMeasures,
  useAttributes,
  useSystems,
  useSemanticTables,
  useProcesses,
} from '../hooks/useOntology';

// Register dagre layout
cytoscape.use(cytoscapeDagre);

interface FullGraphViewProps {
  perspective: string;
}

type LayerVisibility = {
  processes: boolean;
  metrics: boolean;
  measures: boolean;
  attributes: boolean;
  systems: boolean;
  semanticTables: boolean;
};

export function FullGraphView({ perspective }: FullGraphViewProps) {
  const [visibleLayers, setVisibleLayers] = useState<LayerVisibility>({
    processes: true,
    metrics: true,
    measures: true,
    attributes: true,
    systems: true,
    semanticTables: true,
  });
  const [_selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: perspectiveView, isLoading: perspectiveLoading } = usePerspectiveView(perspective);
  const { data: allMeasures, isLoading: measuresLoading } = useMeasures();
  const { data: attributes, isLoading: attributesLoading } = useAttributes();
  const { data: systems, isLoading: systemsLoading } = useSystems();
  const { data: semanticTables, isLoading: tablesLoading } = useSemanticTables();
  const { data: processes, isLoading: processesLoading } = useProcesses();

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const { elements, stats } = useMemo(() => {
    if (
      !perspectiveView ||
      !allMeasures ||
      !attributes ||
      !systems ||
      !semanticTables ||
      !processes
    ) {
      return { elements: [], stats: { nodes: 0, edges: 0 } };
    }

    const cyElements: any[] = [];
    const validNodeIds = new Set<string>();
    let edgeCount = 0;

    // Helper to add edge only if both nodes exist
    const addEdge = (source: string, target: string, label: string, className: string) => {
      if (validNodeIds.has(source) && validNodeIds.has(target)) {
        cyElements.push({
          group: 'edges',
          data: {
            id: `edge-${edgeCount++}`,
            source,
            target,
            label,
          },
          classes: className,
        });
      } else {
        console.warn(`Skipping edge ${label}: source=${source} (${validNodeIds.has(source)}), target=${target} (${validNodeIds.has(target)})`);
      }
    };

    // ===== PHASE 1: CREATE ALL NODES =====

    // Layer configuration
    const layerHeight = 200;
    const horizontalSpacing = 250;
    const layers = {
      processes: 0,
      metrics: layerHeight,
      measures: layerHeight * 2,
      attributes: layerHeight * 3,
      systems: layerHeight * 4,
      semanticTables: layerHeight * 5,
    };

    const getXPosition = (index: number, total: number) => {
      const totalWidth = total * horizontalSpacing;
      const startX = -totalWidth / 2;
      return startX + index * horizontalSpacing;
    };

    // 1. Process Steps
    const allSteps = processes.flatMap(process =>
      process.steps.map(step => ({ ...step, process_name: process.name, process_id: process.id }))
    );

    allSteps.forEach((step, index) => {
      const nodeId = `step-${step.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: step.name,
          subtitle: step.actor ? `👤 ${step.actor}` : step.process_name,
          layer: 'processes',
          type: 'process',
        },
        position: {
          x: getXPosition(index, allSteps.length),
          y: layers.processes,
        },
        classes: 'process-node',
      });
    });

    // 2. Metrics
    perspectiveView.metrics.forEach((metric, index) => {
      const nodeId = `metric-${metric.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: metric.name,
          subtitle: 'Metric',
          layer: 'metrics',
          type: 'metric',
        },
        position: {
          x: getXPosition(index, perspectiveView.metrics.length),
          y: layers.metrics,
        },
        classes: 'metric-node',
      });
    });

    // 3. Measures
    allMeasures.forEach((measure, index) => {
      const nodeId = `measure-${measure.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: measure.name,
          subtitle: 'Measure',
          layer: 'measures',
          type: 'measure',
        },
        position: {
          x: getXPosition(index, allMeasures.length),
          y: layers.measures,
        },
        classes: 'measure-node',
      });
    });

    // 4. Attributes
    attributes.forEach((attr, index) => {
      const nodeId = `attribute-${attr.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: attr.name,
          subtitle: 'Attribute',
          layer: 'attributes',
          type: 'attribute',
        },
        position: {
          x: getXPosition(index, attributes.length),
          y: layers.attributes,
        },
        classes: 'attribute-node',
      });
    });

    // 5. Systems
    systems.forEach((system, index) => {
      const nodeId = `system-${system.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: system.name,
          subtitle: system.type,
          layer: 'systems',
          type: 'system',
        },
        position: {
          x: getXPosition(index, systems.length),
          y: layers.systems,
        },
        classes: 'system-node',
      });
    });

    // 6. Semantic Tables
    semanticTables.forEach((table, index) => {
      const nodeId = `table-${table.id}`;
      validNodeIds.add(nodeId);
      cyElements.push({
        group: 'nodes',
        data: {
          id: nodeId,
          label: table.name,
          subtitle: `${table.table_type} Table (${table.measures?.length || 0} DAX)`,
          layer: 'semanticTables',
          type: 'table',
        },
        position: {
          x: getXPosition(index, semanticTables.length),
          y: layers.semanticTables,
        },
        classes: 'table-node',
      });
    });

    // ===== PHASE 2: CREATE ALL EDGES (WITH VALIDATION) =====

    // Process Steps edges
    allSteps.forEach((step) => {
      step.consumes_attribute_ids?.forEach((attrId) => {
        addEdge(`step-${step.id}`, `attribute-${attrId}`, 'consumes', 'process-consume-edge');
      });

      step.produces_attribute_ids?.forEach((attrId) => {
        addEdge(`attribute-${attrId}`, `step-${step.id}`, 'produced by', 'process-produce-edge');
      });

      step.uses_metric_ids?.forEach((metricId) => {
        addEdge(`step-${step.id}`, `metric-${metricId}`, 'uses', 'process-metric-edge');
      });
    });

    // Metrics edges
    perspectiveView.metrics.forEach((metric) => {
      metric.calculated_by_measure_ids?.forEach((measureId) => {
        addEdge(`metric-${metric.id}`, `measure-${measureId}`, 'calculated by', 'metric-edge');
      });
    });

    // Measures edges
    allMeasures.forEach((measure) => {
      measure.input_attribute_ids?.forEach((attrId) => {
        addEdge(`measure-${measure.id}`, `attribute-${attrId}`, 'uses', 'measure-edge');
      });

      measure.input_measure_ids?.forEach((otherId) => {
        addEdge(`measure-${measure.id}`, `measure-${otherId}`, 'derives from', 'measure-derive-edge');
      });
    });

    // Attributes edges
    attributes.forEach((attr) => {
      addEdge(`attribute-${attr.id}`, `system-${attr.system_id}`, 'captured in', 'system-edge');
    });

    // Semantic Tables edges
    semanticTables.forEach((table) => {
      if (table.source_system_id) {
        addEdge(`table-${table.id}`, `system-${table.source_system_id}`, 'sources from', 'table-edge');
      }

      table.measures?.forEach((daxMeasure) => {
        if (daxMeasure.mapped_measure_id) {
          addEdge(`measure-${daxMeasure.mapped_measure_id}`, `table-${table.id}`, 'implemented as DAX', 'dax-edge');
        }
      });

      table.columns?.forEach((column) => {
        if (column.mapped_attribute_id) {
          addEdge(`attribute-${column.mapped_attribute_id}`, `table-${table.id}`, 'mapped to column', 'column-edge');
        }
      });
    });

    const nodeCount = cyElements.filter(el => el.group === 'nodes').length;

    return {
      elements: cyElements,
      stats: { nodes: nodeCount, edges: edgeCount },
    };
  }, [perspectiveView, allMeasures, attributes, systems, semanticTables, processes]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Create new instance
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#ddd',
            'border-width': 2,
            'border-color': '#999',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'width': '200px',
            'height': '70px',
            'shape': 'roundrectangle',
            'text-wrap': 'wrap',
            'text-max-width': '180px',
            'font-weight': 'bold',
            'color': '#000',
          },
        },
        {
          selector: '.metric-node',
          style: {
            'background-color': '#dbeafe',
            'border-color': '#3b82f6',
          },
        },
        {
          selector: '.measure-node',
          style: {
            'background-color': '#fef3c7',
            'border-color': '#eab308',
          },
        },
        {
          selector: '.attribute-node',
          style: {
            'background-color': '#dcfce7',
            'border-color': '#22c55e',
          },
        },
        {
          selector: '.system-node',
          style: {
            'background-color': '#ddd6fe',
            'border-color': '#7c3aed',
          },
        },
        {
          selector: '.table-node',
          style: {
            'background-color': '#f3e8ff',
            'border-color': '#a855f7',
          },
        },
        {
          selector: '.process-node',
          style: {
            'background-color': '#ccfbf1',
            'border-color': '#14b8a6',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '9px',
            'text-rotation': 'autorotate',
            'color': '#666',
          },
        },
        {
          selector: '.metric-edge',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
          },
        },
        {
          selector: '.measure-edge',
          style: {
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
          },
        },
        {
          selector: '.measure-derive-edge',
          style: {
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.attribute-edge',
          style: {
            'line-color': '#22c55e',
            'target-arrow-color': '#22c55e',
          },
        },
        {
          selector: '.system-edge',
          style: {
            'line-color': '#10b981',
            'target-arrow-color': '#10b981',
          },
        },
        {
          selector: '.table-edge',
          style: {
            'line-color': '#a855f7',
            'target-arrow-color': '#a855f7',
          },
        },
        {
          selector: '.dax-edge',
          style: {
            'line-color': '#9333ea',
            'target-arrow-color': '#9333ea',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.column-edge',
          style: {
            'line-color': '#7c3aed',
            'target-arrow-color': '#7c3aed',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.process-consume-edge',
          style: {
            'line-color': '#ca8a04',
            'target-arrow-color': '#ca8a04',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.process-produce-edge',
          style: {
            'line-color': '#84cc16',
            'target-arrow-color': '#84cc16',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.process-metric-edge',
          style: {
            'line-color': '#eab308',
            'target-arrow-color': '#eab308',
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#f00',
          },
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#f59e0b',
          },
        },
      ],
      layout: {
        name: 'preset',
      },
      minZoom: 0.1,
      maxZoom: 2,
    });

    // Handle node clicks for focus mode
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.id();
      setSelectedNodeId(nodeId);
      setFocusedNodeId(nodeId);

      // Get all connected nodes and edges
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      // Dim everything
      cy.elements().addClass('dimmed');

      // Highlight the clicked node, connected nodes, and edges
      node.removeClass('dimmed').addClass('highlighted');
      connectedNodes.removeClass('dimmed');
      connectedEdges.removeClass('dimmed');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNodeId(null);
        setFocusedNodeId(null);
        // Remove all dimming and highlighting
        cy.elements().removeClass('dimmed highlighted');
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements]);

  // Handle layer visibility
  useEffect(() => {
    if (!cyRef.current) return;

    Object.entries(visibleLayers).forEach(([layer, visible]) => {
      const nodes = cyRef.current!.nodes(`[layer = "${layer}"]`);
      if (visible) {
        nodes.style('display', 'element');
      } else {
        nodes.style('display', 'none');
      }
    });
  }, [visibleLayers]);

  if (
    perspectiveLoading ||
    measuresLoading ||
    attributesLoading ||
    systemsLoading ||
    tablesLoading ||
    processesLoading
  ) {
    return <div className="p-4">Loading graph data...</div>;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Complete Data Lineage Graph</h2>
        <p className="text-gray-600 mb-2">
          End-to-end traceability: Processes → Metrics → Measures → Attributes → Systems → Semantic Model
        </p>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{stats.nodes} nodes</span>
          <span>{stats.edges} relationships</span>
          <span>1 processes</span>
          <span>14 actors</span>
          <span>Perspective: {perspective}</span>
        </div>
      </div>

      {/* Layer toggles and focus controls */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <span className="font-semibold">Show Layers:</span>
        {Object.entries(visibleLayers).map(([layer, visible]) => (
          <label key={layer} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visible}
              onChange={() => toggleLayer(layer as keyof LayerVisibility)}
              className="w-4 h-4"
            />
            <span className="capitalize">{layer.replace(/([A-Z])/g, ' $1').trim()}</span>
          </label>
        ))}
        {focusedNodeId && (
          <>
            <span className="mx-2 text-gray-300">|</span>
            <button
              onClick={() => {
                setFocusedNodeId(null);
                setSelectedNodeId(null);
                if (cyRef.current) {
                  cyRef.current.elements().removeClass('dimmed highlighted');
                }
              }}
              className="px-4 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 font-semibold"
            >
              Clear Focus
            </button>
          </>
        )}
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '800px',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      />

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ccfbf1', border: '2px solid #14b8a6' }}></div>
            <span>Process Steps (👤 Actors)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dbeafe', border: '2px solid #3b82f6' }}></div>
            <span>Metrics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '2px solid #eab308' }}></div>
            <span>Measures</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dcfce7', border: '2px solid #22c55e' }}></div>
            <span>Attributes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ddd6fe', border: '2px solid #7c3aed' }}></div>
            <span>Systems</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f3e8ff', border: '2px solid #a855f7' }}></div>
            <span>Semantic Tables</span>
          </div>
        </div>
      </div>
    </div>
  );
}
