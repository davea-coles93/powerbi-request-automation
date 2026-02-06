import { useState, useEffect, useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { useProcessFlow, useUpdateProcessStep } from '../hooks/useOntology';
import { ProcessStepEditModal, StepFormData } from './ProcessStepEditModal';

// Register dagre layout
cytoscape.use(cytoscapeDagre);

interface ProcessMapEditorProps {
  processId: string;
  perspectiveLevel?: string;
}

interface StepMetadata {
  id: string;
  name: string;
  actor?: string;
  sequence: number;
  perspective_id?: string;
  estimated_duration_minutes?: number;
  automation_potential?: 'High' | 'Medium' | 'Low' | 'None';
  waste_category?: string;
  manual_effort_percentage?: number;
  produces_observation_ids?: string[];
  consumes_observation_ids?: string[];
  uses_metric_ids?: string[];
  systems_used_ids?: string[];
}

const perspectiveColors: Record<string, { bg: string; border: string }> = {
  operational: { bg: '#dcfce7', border: '#22c55e' },
  management: { bg: '#fef9c3', border: '#eab308' },
  financial: { bg: '#dbeafe', border: '#3b82f6' },
};

const automationColors: Record<string, string> = {
  High: '#ef4444',    // red - needs automation
  Medium: '#f97316',  // orange
  Low: '#eab308',     // yellow
  None: '#22c55e',    // green - good as is
};

export function ProcessMapEditor({ processId, perspectiveLevel }: ProcessMapEditorProps) {
  const [selectedStep, setSelectedStep] = useState<StepMetadata | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: flow, isLoading } = useProcessFlow(processId, perspectiveLevel);
  const updateStepMutation = useUpdateProcessStep();

  // Convert flow data to Cytoscape elements
  const elements = useMemo(() => {
    if (!flow) return [];

    const cyElements: any[] = [];
    const horizontalSpacing = 250;
    const verticalSpacing = 150;

    // Create nodes
    flow.nodes.forEach((node, index) => {
      const colors = perspectiveColors[node.perspective_id] || {
        bg: '#f3f4f6',
        border: '#9ca3af',
      };

      // Get automation color if available
      const automationColor = node.automation_potential
        ? automationColors[node.automation_potential]
        : null;

      // Build rich label with metadata
      let labelText = node.label;

      // Add metadata badges
      const badges: string[] = [];
      if (node.estimated_duration_minutes) {
        badges.push(`⏱️ ${node.estimated_duration_minutes}m`);
      }
      if (node.automation_potential) {
        const automationEmoji = {
          High: '🔴',
          Medium: '🟠',
          Low: '🟡',
          None: '🟢',
        }[node.automation_potential];
        badges.push(`${automationEmoji} ${node.automation_potential}`);
      }
      if (node.waste_category) {
        badges.push(`🗑️ ${node.waste_category.split(' ')[0]}`);
      }

      if (badges.length > 0) {
        labelText += '\n' + badges.join(' | ');
      }

      if (node.actor) {
        labelText += '\n👤 ' + node.actor;
      }

      cyElements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: labelText,
          actor: node.actor,
          sequence: node.sequence,
          perspective_id: node.perspective_id,
          estimated_duration_minutes: node.estimated_duration_minutes,
          automation_potential: node.automation_potential,
          waste_category: node.waste_category,
          manual_effort_percentage: node.manual_effort_percentage,
        },
        position: {
          x: 100 + (node.sequence - 1) * horizontalSpacing,
          y: 100 + (index % 3) * verticalSpacing,
        },
        classes: `step-node ${node.perspective_id}-node`,
        style: {
          'background-color': colors.bg,
          'border-color': automationColor || colors.border,
          'border-width': automationColor ? 4 : 2,
        },
      });
    });

    // Create edges
    flow.edges.forEach((edge, index) => {
      cyElements.push({
        group: 'edges',
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
        },
        classes: 'flow-edge',
      });
    });

    return cyElements;
  }, [flow]);

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
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'width': '240px',
            'height': '120px',
            'shape': 'roundrectangle',
            'text-wrap': 'wrap',
            'text-max-width': '220px',
            'font-weight': 'normal',
            'color': '#000',
            'padding': '8px',
          },
        },
        {
          selector: '.operational-node',
          style: {
            'background-color': '#dcfce7',
            'border-color': '#22c55e',
          },
        },
        {
          selector: '.management-node',
          style: {
            'background-color': '#fef9c3',
            'border-color': '#eab308',
          },
        },
        {
          selector: '.financial-node',
          style: {
            'background-color': '#dbeafe',
            'border-color': '#3b82f6',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#8b5cf6',
          },
        },
      ],
      layout: {
        name: 'preset',
      },
      minZoom: 0.5,
      maxZoom: 2,
    });

    // Handle node clicks
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();

      setSelectedStep({
        id: data.id,
        name: data.label,
        actor: data.actor,
        sequence: data.sequence,
        estimated_duration_minutes: data.estimated_duration_minutes,
        automation_potential: data.automation_potential,
        waste_category: data.waste_category,
        manual_effort_percentage: data.manual_effort_percentage,
      });

      if (editMode) {
        setShowEditModal(true);
      }
    });

    // Handle background clicks
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedStep(null);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, editMode]);

  if (isLoading) {
    return <div className="p-4">Loading process map...</div>;
  }

  if (!flow) {
    return <div className="p-4">No process found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold">{flow.process.name}</h2>
            {flow.process.description && (
              <p className="text-sm text-gray-600">{flow.process.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded font-semibold ${
                editMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {editMode ? '✏️ Edit Mode: ON' : '👁️ View Mode'}
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              onClick={() => {
                // TODO: Add new step
                alert('Add new step - coming soon!');
              }}
            >
              ➕ Add Step
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Automation Priority:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>None</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cytoscape container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Selected step info panel */}
      {selectedStep && !showEditModal && (
        <div className="absolute bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">{selectedStep.name}</h3>
              {selectedStep.actor && (
                <p className="text-sm text-gray-600">👤 {selectedStep.actor}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            {selectedStep.estimated_duration_minutes && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">⏱️ Duration:</span>
                <span>{selectedStep.estimated_duration_minutes} min</span>
              </div>
            )}
            {selectedStep.automation_potential && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">🤖 Automation:</span>
                <span className="px-2 py-1 rounded text-xs font-semibold" style={{
                  backgroundColor: automationColors[selectedStep.automation_potential] + '20',
                  color: automationColors[selectedStep.automation_potential],
                }}>
                  {selectedStep.automation_potential}
                </span>
              </div>
            )}
            {selectedStep.waste_category && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">🗑️ Waste:</span>
                <span>{selectedStep.waste_category}</span>
              </div>
            )}
            {selectedStep.manual_effort_percentage !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">✋ Manual:</span>
                <span>{selectedStep.manual_effort_percentage}%</span>
              </div>
            )}
          </div>

          {editMode && (
            <button
              onClick={() => setShowEditModal(true)}
              className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700"
            >
              ✏️ Edit Step
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStep && (
        <ProcessStepEditModal
          step={{
            ...selectedStep,
            perspective_id: selectedStep.perspective_id || 'operational',
            produces_observation_ids: selectedStep.produces_observation_ids || [],
            consumes_observation_ids: selectedStep.consumes_observation_ids || [],
            uses_metric_ids: selectedStep.uses_metric_ids || [],
            systems_used_ids: selectedStep.systems_used_ids || [],
          } as StepFormData}
          onSave={(updatedStep) => {
            updateStepMutation.mutate(
              {
                processId: processId,
                stepId: updatedStep.id,
                data: updatedStep,
              },
              {
                onSuccess: () => {
                  setShowEditModal(false);
                  setSelectedStep(null);
                  alert('✅ Step updated successfully!');
                },
                onError: (error) => {
                  console.error('Error updating step:', error);
                  alert('❌ Error updating step. Backend endpoint needs to be implemented.');
                },
              }
            );
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
