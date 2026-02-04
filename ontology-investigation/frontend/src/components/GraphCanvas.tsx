import { useRef, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, ElementDefinition, EventObject } from 'cytoscape';
import { useMetricTrace } from '../hooks/useOntology';

interface GraphCanvasProps {
  metricId?: string;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
}

export function GraphCanvas({ metricId, onNodeClick }: GraphCanvasProps) {
  const cyRef = useRef<Core | null>(null);
  const { data: trace, isLoading } = useMetricTrace(metricId || '');

  const elements = useMemo<ElementDefinition[]>(() => {
    if (!trace) return [];

    const nodes: ElementDefinition[] = [];
    const edges: ElementDefinition[] = [];

    // Add metric node
    nodes.push({
      data: {
        id: `metric-${trace.metric.id}`,
        label: trace.metric.name,
        type: 'metric',
      },
    });

    // Add measure nodes and edges
    trace.measures.forEach((measure) => {
      nodes.push({
        data: {
          id: `measure-${measure.id}`,
          label: measure.name,
          type: 'measure',
        },
      });
      edges.push({
        data: {
          source: `measure-${measure.id}`,
          target: `metric-${trace.metric.id}`,
        },
      });
    });

    // Add observation nodes and edges
    trace.observations.forEach((obs) => {
      nodes.push({
        data: {
          id: `observation-${obs.id}`,
          label: obs.name,
          type: 'observation',
          reliability: obs.reliability,
        },
      });

      // Find which measures use this observation
      trace.measures.forEach((measure) => {
        if (measure.input_observation_ids.includes(obs.id)) {
          edges.push({
            data: {
              source: `observation-${obs.id}`,
              target: `measure-${measure.id}`,
            },
          });
        }
      });
    });

    // Add system nodes and edges
    trace.systems.forEach((system) => {
      nodes.push({
        data: {
          id: `system-${system.id}`,
          label: system.name,
          type: 'system',
          systemType: system.type,
        },
      });

      // Connect observations to their systems
      trace.observations.forEach((obs) => {
        if (obs.system_id === system.id) {
          edges.push({
            data: {
              source: `system-${system.id}`,
              target: `observation-${obs.id}`,
            },
          });
        }
      });
    });

    return [...nodes, ...edges];
  }, [trace]);

  const stylesheet = [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        width: 80,
        height: 80,
        'text-wrap': 'wrap',
        'text-max-width': '70px',
      },
    },
    {
      selector: 'node[type="metric"]',
      style: {
        'background-color': '#3b82f6',
        color: '#fff',
        shape: 'diamond',
        width: 100,
        height: 100,
      },
    },
    {
      selector: 'node[type="measure"]',
      style: {
        'background-color': '#8b5cf6',
        color: '#fff',
        shape: 'round-rectangle',
      },
    },
    {
      selector: 'node[type="observation"]',
      style: {
        'background-color': '#22c55e',
        color: '#fff',
        shape: 'ellipse',
      },
    },
    {
      selector: 'node[type="system"]',
      style: {
        'background-color': '#f59e0b',
        color: '#fff',
        shape: 'rectangle',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
  ];

  const layout = {
    name: 'breadthfirst',
    directed: true,
    padding: 50,
    spacingFactor: 1.5,
    roots: elements.filter((el) => el.data?.type === 'system').map((el) => el.data?.id),
  };

  if (!metricId) {
    return (
      <div className="h-[500px] bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Select a metric to view its data lineage</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[500px] bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="h-[500px] border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-4">
        <h3 className="font-semibold">Data Lineage</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-financial-500 rounded-full" /> Metric
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500 rounded" /> Measure
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-operational-500 rounded-full" /> Observation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-500 rounded" /> System
          </span>
        </div>
      </div>
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet as any}
        layout={layout}
        style={{ width: '100%', height: 'calc(100% - 44px)' }}
        cy={(cy: Core) => {
          cyRef.current = cy;
          cy.on('tap', 'node', (evt: EventObject) => {
            const node = evt.target;
            const id = node.id().split('-').slice(1).join('-');
            const type = node.data('type');
            onNodeClick?.(id, type);
          });
        }}
      />
    </div>
  );
}
