import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useProcessFlow } from '../hooks/useOntology';

interface ProcessFlowProps {
  processId: string;
}

const perspectiveColors: Record<string, { bg: string; border: string }> = {
  operational: { bg: '#dcfce7', border: '#22c55e' },
  management: { bg: '#fef9c3', border: '#eab308' },
  financial: { bg: '#dbeafe', border: '#3b82f6' },
};

export function ProcessFlow({ processId }: ProcessFlowProps) {
  const { data: flow, isLoading } = useProcessFlow(processId);

  const { nodes, edges } = useMemo(() => {
    if (!flow) return { nodes: [], edges: [] };

    // Create nodes with positions based on sequence
    const nodes: Node[] = flow.nodes.map((node, index) => {
      const colors = perspectiveColors[node.perspective_id] || {
        bg: '#f3f4f6',
        border: '#9ca3af',
      };

      return {
        id: node.id,
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold text-sm">{node.label}</div>
              {node.actor && (
                <div className="text-xs text-gray-500 mt-1">{node.actor}</div>
              )}
            </div>
          ),
        },
        position: {
          x: 50 + (node.sequence - 1) * 200,
          y: 100 + (index % 3) * 100,
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '10px',
          minWidth: '150px',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges
    const edges: Edge[] = flow.edges.map((edge, index) => ({
      id: `e${index}`,
      source: edge.source,
      target: edge.target,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: { strokeWidth: 2 },
      animated: true,
    }));

    return { nodes, edges };
  }, [flow]);

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading process flow...</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">No process selected</div>
      </div>
    );
  }

  return (
    <div className="h-96 border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <h3 className="font-semibold">{flow.process.name}</h3>
        {flow.process.description && (
          <p className="text-sm text-gray-600">{flow.process.description}</p>
        )}
      </div>
      <div className="h-[calc(100%-60px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
