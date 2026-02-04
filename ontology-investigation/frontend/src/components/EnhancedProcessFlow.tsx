import { useState, useMemo, useEffect } from 'react';
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
import { ProcessBreadcrumb, BreadcrumbItem } from './ProcessBreadcrumb';
import { PerspectiveLevel } from '../types/ontology';

interface EnhancedProcessFlowProps {
  processId: string;
  perspectiveLevel?: PerspectiveLevel;
  onViewStepData?: (stepData: any) => void;
  onMapStepToModel?: (stepData: any) => void;
}

const perspectiveColors: Record<string, { bg: string; border: string }> = {
  operational: { bg: '#dcfce7', border: '#22c55e' },
  management: { bg: '#fef9c3', border: '#eab308' },
  financial: { bg: '#dbeafe', border: '#3b82f6' },
};

export function EnhancedProcessFlow({
  processId,
  perspectiveLevel,
  onViewStepData,
  onMapStepToModel
}: EnhancedProcessFlowProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentParentStepId, setCurrentParentStepId] = useState<string | undefined>(undefined);

  const { data: flow, isLoading } = useProcessFlow(processId, perspectiveLevel, currentParentStepId);

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
              <div className="font-semibold text-sm flex items-center justify-center gap-1">
                {node.label}
                {node.has_sub_steps && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">🔍</span>
                )}
              </div>
              {node.actor && (
                <div className="text-xs text-gray-500 mt-1">{node.actor}</div>
              )}
              {perspectiveLevel === 'management' && (
                <div className="text-xs text-blue-600 mt-1 font-medium">📊 KPIs tracked</div>
              )}
              {perspectiveLevel === 'financial' && (
                <div className="text-xs text-gray-400 mt-1">{node.perspective_id}</div>
              )}
              {perspectiveLevel === 'operational' && node.has_sub_steps && (
                <div className="text-xs text-purple-600 mt-1 font-medium">View tasks →</div>
              )}
            </div>
          ),
          has_sub_steps: node.has_sub_steps,
        },
        position: {
          x: 50 + (node.sequence - 1) * 220,
          y: 100 + (index % 3) * 120,
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          minWidth: '180px',
          cursor: 'pointer',
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

  // Initialize breadcrumbs when flow loads
  useEffect(() => {
    if (flow && breadcrumbs.length === 0) {
      setBreadcrumbs([{
        id: flow.process.id,
        label: flow.process.name,
        level: 'process',
      }]);
    }
  }, [flow, breadcrumbs.length]);

  const handleDrillDown = (stepId: string, stepName: string) => {
    setCurrentParentStepId(stepId);
    setBreadcrumbs([...breadcrumbs, {
      id: stepId,
      label: stepName,
      level: 'step',
    }]);
    setSelectedStep(null);
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === breadcrumbs.length - 1) return;

    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);

    if (index === 0) {
      // Navigate back to top level
      setCurrentParentStepId(undefined);
    } else {
      // Navigate to a parent step
      setCurrentParentStepId(newBreadcrumbs[index].id);
    }
    setSelectedStep(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6 text-center text-gray-500">
        No process flow found
      </div>
    );
  }

  const selectedStepData = flow?.nodes.find(node => node.id === selectedStep);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Breadcrumb Navigation */}
      <ProcessBreadcrumb items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />

      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{flow.process.name}</h3>
              {perspectiveLevel && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  perspectiveLevel === 'financial'
                    ? 'bg-blue-100 text-blue-800'
                    : perspectiveLevel === 'management'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {perspectiveLevel === 'financial' && '💰 Financial View'}
                  {perspectiveLevel === 'management' && '📊 Management View'}
                  {perspectiveLevel === 'operational' && '⚙️ Operational View'}
                </span>
              )}
            </div>
            {flow.process.description && (
              <p className="text-sm text-gray-600 mt-1">{flow.process.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-gray-600">
                {flow.nodes.length} steps
              </span>
              <span className="text-gray-600">
                {flow.edges.length} dependencies
              </span>
              {perspectiveLevel === 'financial' && (
                <span className="text-blue-600 font-medium">Control points & milestones</span>
              )}
              {perspectiveLevel === 'management' && (
                <span className="text-yellow-600 font-medium">Process KPIs & metrics</span>
              )}
              {perspectiveLevel === 'operational' && (
                <span className="text-green-600 font-medium">Detailed task execution</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* ReactFlow Diagram */}
        <div className="flex-1" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => setSelectedStep(node.id)}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Detail Panel */}
        {selectedStep && selectedStepData && (
          <div className="w-80 border-l bg-gray-50 p-6">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Step Details</h4>
                <button
                  onClick={() => setSelectedStep(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Step Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedStepData.label}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Sequence</label>
                  <p className="text-sm text-gray-900 mt-1">Step {selectedStepData.sequence}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Perspective</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedStepData.perspective_id}</p>
                </div>

                {selectedStepData.actor && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Actor</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedStepData.actor}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Actions</label>
                  <div className="mt-2 space-y-2">
                    {selectedStepData.has_sub_steps && (
                      <button
                        onClick={() => handleDrillDown(selectedStepData.id, selectedStepData.label)}
                        className="w-full text-left px-3 py-2 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 text-sm text-purple-700 font-medium"
                      >
                        🔍 Drill Down to Sub-Steps →
                      </button>
                    )}
                    <button
                      onClick={() => onViewStepData?.(selectedStepData)}
                      className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm"
                    >
                      View Systems & Data
                    </button>
                    <button
                      onClick={() => onMapStepToModel?.(selectedStepData)}
                      className="w-full text-left px-3 py-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-sm text-blue-700 font-medium"
                    >
                      Map to Semantic Model →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
