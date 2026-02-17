import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

interface OntologyEntity {
  id: string;
  name: string;
  core_attributes: Array<{ name: string; data_type: string }>;
}

interface OntologyAttribute {
  id: string;
  name: string;
  entity_id: string;
  system_id: string;
}

interface OntologyMeasure {
  id: string;
  name: string;
  input_attribute_ids: string[];
  input_measure_ids: string[];
  perspective_ids: string[];
}

interface OntologyMetric {
  id: string;
  name: string;
  calculated_by_measure_ids: string[];
  perspective_ids: string[];
}

interface OntologySystem {
  id: string;
  name: string;
  type?: string;
}

interface OntologyERDProps {
  entities: OntologyEntity[];
  attributes: OntologyAttribute[];
  measures: OntologyMeasure[];
  metrics: OntologyMetric[];
  systems: OntologySystem[];
  onNodeClick?: (type: string, id: string) => void;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;

const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  metric: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
  measure: { bg: '#fef9c3', border: '#ca8a04', text: '#a16207' },
  attribute: { bg: '#e0e7ff', border: '#4f46e5', text: '#4338ca' },
  entity: { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' },
  system: { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce' },
};

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

function buildNodeLabel(type: string, name: string): string {
  const prefix: Record<string, string> = {
    metric: 'Metric',
    measure: 'Measure',
    attribute: 'Attr',
    entity: 'Entity',
    system: 'System',
  };
  return `${prefix[type] || type}: ${name}`;
}

export function OntologyERD({
  entities,
  attributes,
  measures,
  metrics,
  systems,
  onNodeClick,
}: OntologyERDProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Metric nodes (top layer - green)
    metrics.forEach((metric) => {
      nodes.push({
        id: `metric-${metric.id}`,
        data: {
          label: buildNodeLabel('metric', metric.name),
          type: 'metric',
          entityId: metric.id,
        },
        position: { x: 0, y: 0 },
        style: {
          background: nodeColors.metric.bg,
          border: `2px solid ${nodeColors.metric.border}`,
          color: nodeColors.metric.text,
          borderRadius: '12px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          width: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    });

    // Measure nodes (yellow)
    measures.forEach((measure) => {
      nodes.push({
        id: `measure-${measure.id}`,
        data: {
          label: buildNodeLabel('measure', measure.name),
          type: 'measure',
          entityId: measure.id,
        },
        position: { x: 0, y: 0 },
        style: {
          background: nodeColors.measure.bg,
          border: `2px solid ${nodeColors.measure.border}`,
          color: nodeColors.measure.text,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          width: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    });

    // Attribute nodes (indigo)
    attributes.forEach((attr) => {
      nodes.push({
        id: `attr-${attr.id}`,
        data: {
          label: buildNodeLabel('attribute', attr.name),
          type: 'attribute',
          entityId: attr.id,
        },
        position: { x: 0, y: 0 },
        style: {
          background: nodeColors.attribute.bg,
          border: `2px solid ${nodeColors.attribute.border}`,
          color: nodeColors.attribute.text,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 500,
          width: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    });

    // Entity nodes (blue)
    entities.forEach((entity) => {
      nodes.push({
        id: `entity-${entity.id}`,
        data: {
          label: buildNodeLabel('entity', entity.name),
          type: 'entity',
          entityId: entity.id,
        },
        position: { x: 0, y: 0 },
        style: {
          background: nodeColors.entity.bg,
          border: `2px solid ${nodeColors.entity.border}`,
          color: nodeColors.entity.text,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          width: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    });

    // System nodes (purple)
    systems.forEach((system) => {
      nodes.push({
        id: `system-${system.id}`,
        data: {
          label: buildNodeLabel('system', system.name),
          type: 'system',
          entityId: system.id,
        },
        position: { x: 0, y: 0 },
        style: {
          background: nodeColors.system.bg,
          border: `2px solid ${nodeColors.system.border}`,
          color: nodeColors.system.text,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          width: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    });

    // Edges: metric → measure
    metrics.forEach((metric) => {
      metric.calculated_by_measure_ids.forEach((measureId) => {
        edges.push({
          id: `metric-${metric.id}-measure-${measureId}`,
          source: `metric-${metric.id}`,
          target: `measure-${measureId}`,
          animated: true,
          style: { stroke: nodeColors.metric.border, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: nodeColors.metric.border },
        });
      });
    });

    // Edges: measure → attribute
    measures.forEach((measure) => {
      measure.input_attribute_ids.forEach((attrId) => {
        edges.push({
          id: `measure-${measure.id}-attr-${attrId}`,
          source: `measure-${measure.id}`,
          target: `attr-${attrId}`,
          style: { stroke: nodeColors.measure.border, strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: nodeColors.measure.border },
        });
      });

      // Edges: measure → measure (chained)
      (measure.input_measure_ids || []).forEach((inputMeasureId) => {
        edges.push({
          id: `measure-${measure.id}-measure-${inputMeasureId}`,
          source: `measure-${measure.id}`,
          target: `measure-${inputMeasureId}`,
          style: { stroke: nodeColors.measure.border, strokeWidth: 1.5, strokeDasharray: '5 5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: nodeColors.measure.border },
        });
      });
    });

    // Edges: attribute → entity
    attributes.forEach((attr) => {
      edges.push({
        id: `attr-${attr.id}-entity-${attr.entity_id}`,
        source: `attr-${attr.id}`,
        target: `entity-${attr.entity_id}`,
        style: { stroke: nodeColors.attribute.border, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: nodeColors.attribute.border },
      });

      // Edges: attribute → system
      edges.push({
        id: `attr-${attr.id}-system-${attr.system_id}`,
        source: `attr-${attr.id}`,
        target: `system-${attr.system_id}`,
        style: { stroke: nodeColors.system.border, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: nodeColors.system.border },
      });
    });

    // Apply dagre layout
    return getLayoutedElements(nodes, edges);
  }, [entities, attributes, measures, metrics, systems]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data.type && node.data.entityId) {
        onNodeClick(node.data.type, node.data.entityId);
      }
    },
    [onNodeClick]
  );

  const totalNodes = metrics.length + measures.length + attributes.length + entities.length + systems.length;

  if (totalNodes === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">No ontology data to visualize</p>
          <p className="text-gray-400 text-sm mt-1">Load a scenario to see the schema view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-200 rounded-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase">Legend:</span>
        {Object.entries(nodeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ background: colors.bg, border: `2px solid ${colors.border}` }}
            />
            <span className="text-xs text-gray-600 capitalize">{type}s ({
              type === 'metric' ? metrics.length :
              type === 'measure' ? measures.length :
              type === 'attribute' ? attributes.length :
              type === 'entity' ? entities.length :
              systems.length
            })</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="h-[600px] bg-white border border-gray-200 rounded-xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background color="#f1f5f9" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
