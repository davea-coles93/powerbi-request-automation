import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { useProcessFlow, useUpdateProcessStep, useCreateProcessStep } from '../hooks/useOntology';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [firstNodeForConnection, setFirstNodeForConnection] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: flow, isLoading } = useProcessFlow(processId, perspectiveLevel);
  const updateStepMutation = useUpdateProcessStep();
  const createStepMutation = useCreateProcessStep();

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!flow) return null;

    const totalSteps = flow.nodes.length;
    const totalDuration = flow.nodes.reduce(
      (sum, node) => sum + (node.estimated_duration_minutes || 0),
      0
    );

    const automationCounts = {
      High: 0,
      Medium: 0,
      Low: 0,
      None: 0,
    };

    flow.nodes.forEach((node) => {
      if (node.automation_potential) {
        automationCounts[node.automation_potential]++;
      }
    });

    const manualSteps = flow.nodes.filter(
      (node) => node.manual_effort_percentage && node.manual_effort_percentage > 80
    ).length;

    return {
      totalSteps,
      totalDuration,
      automationCounts,
      manualSteps,
    };
  }, [flow]);

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
        {
          selector: '.connection-source',
          style: {
            'border-width': 6,
            'border-color': '#10b981',
            'border-style': 'dashed',
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

      // Connection mode: create edges between nodes
      if (connectionMode) {
        if (!firstNodeForConnection) {
          // First click: select source node
          setFirstNodeForConnection(data.id);
          node.addClass('connection-source');
        } else if (firstNodeForConnection === data.id) {
          // Clicked same node: deselect
          setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        } else {
          // Second click: create edge
          const sourceNode = flow?.nodes.find(n => n.id === firstNodeForConnection);
          const targetNode = flow?.nodes.find(n => n.id === data.id);

          if (sourceNode && targetNode) {
            // Persist edge to backend by updating target step's depends_on_step_ids
            const targetStep = flow?.nodes.find(n => n.id === data.id);
            if (targetStep) {
              // Check if dependency already exists
              const currentDependencies = (targetStep as any).depends_on_step_ids || [];
              if (currentDependencies.includes(firstNodeForConnection)) {
                toast.error('Connection already exists!');
              } else {
                const updatedDependencies = [...currentDependencies, firstNodeForConnection];

                toast.loading('Creating connection...', { id: 'edge-creation' });

                updateStepMutation.mutate(
                  {
                    processId: processId,
                    stepId: data.id,
                    data: {
                      depends_on_step_ids: updatedDependencies,
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success(`Connected "${sourceNode.label}" to "${targetNode.label}"`, { id: 'edge-creation' });
                    },
                    onError: (error) => {
                      console.error('Error creating edge:', error);
                      toast.error('Failed to create connection', { id: 'edge-creation' });
                    },
                  }
                );
              }
            }
          }

          // Clear selection
          setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        }
        return;
      }

      // Normal mode: show step details
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
  }, [elements, editMode, connectionMode, firstNodeForConnection, flow]);

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
              onClick={() => {
                setEditMode(!editMode);
                if (connectionMode) setConnectionMode(false);
              }}
              className={`px-4 py-2 rounded font-semibold ${
                editMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {editMode ? '✏️ Edit Mode: ON' : '👁️ View Mode'}
            </button>
            <button
              onClick={() => {
                setConnectionMode(!connectionMode);
                setFirstNodeForConnection(null);
                if (editMode) setEditMode(false);
              }}
              className={`px-4 py-2 rounded font-semibold ${
                connectionMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {connectionMode ? '🔗 Connect Mode: ON' : '🔗 Connect Steps'}
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              onClick={() => setShowAddModal(true)}
            >
              ➕ Add Step
            </button>
          </div>
        </div>

        {/* Summary Stats Bar */}
        {stats && (
          <div className="flex gap-6 text-sm bg-white border rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">📊 Total Steps:</span>
              <span className="text-lg font-bold text-blue-600">{stats.totalSteps}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">⏱️ Total Time:</span>
              <span className="text-lg font-bold text-purple-600">{stats.totalDuration}m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">🤖 Automation:</span>
              <div className="flex gap-2">
                {stats.automationCounts.High > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                    🔴 {stats.automationCounts.High}
                  </span>
                )}
                {stats.automationCounts.Medium > 0 && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                    🟠 {stats.automationCounts.Medium}
                  </span>
                )}
                {stats.automationCounts.Low > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                    🟡 {stats.automationCounts.Low}
                  </span>
                )}
                {stats.automationCounts.None > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                    🟢 {stats.automationCounts.None}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">✋ High Manual:</span>
              <span className="text-lg font-bold text-orange-600">{stats.manualSteps}</span>
            </div>
          </div>
        )}

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

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2">
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.zoom(cyRef.current.zoom() * 1.2);
                cyRef.current.center();
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-semibold text-gray-700"
            title="Zoom In"
          >
            🔍+
          </button>
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.zoom(cyRef.current.zoom() * 0.8);
                cyRef.current.center();
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-semibold text-gray-700"
            title="Zoom Out"
          >
            🔍-
          </button>
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.fit(undefined, 50);
              }
            }}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded font-semibold text-blue-700"
            title="Fit to Screen"
          >
            ⬜
          </button>
        </div>
      </div>

      {/* Instructions overlay when no step selected */}
      {!selectedStep && !showEditModal && !showAddModal && (
        <div className="absolute bottom-4 right-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg shadow-lg p-6 w-96">
          <h3 className="font-bold text-lg text-blue-900 mb-3">👋 Welcome to Process Map Editor</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">👆</span>
              <p><strong>Click any step</strong> to view details and connections</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">✏️</span>
              <p><strong>Enable Edit Mode</strong> to modify step properties, time estimates, and automation potential</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">➕</span>
              <p><strong>Add Step</strong> to create new process steps</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-600">🔍</span>
              <p><strong>Use zoom controls</strong> (top right) to navigate large process maps</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <p className="text-xs text-gray-600">
              <strong>Tip:</strong> Steps with red borders have <span className="text-red-600 font-semibold">High</span> automation potential and should be prioritized for improvement.
            </p>
          </div>
        </div>
      )}

      {/* Selected step info panel */}
      {selectedStep && !showEditModal && flow && (
        <div className="absolute bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-96 max-h-[600px] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
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

          <div className="space-y-2 text-sm mb-3">
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

          {/* Connections */}
          <div className="border-t pt-3 mb-3">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">🔗 Connections</h4>
            <div className="space-y-2 text-xs">
              {/* Incoming edges */}
              {(() => {
                const incoming = flow.edges.filter(e => e.target === selectedStep.id);
                return incoming.length > 0 ? (
                  <div>
                    <span className="font-semibold text-gray-600">← Depends on:</span>
                    <div className="ml-4 mt-1">
                      {incoming.map((edge, i) => {
                        const sourceNode = flow.nodes.find(n => n.id === edge.source);
                        return sourceNode ? (
                          <div key={i} className="text-blue-600 hover:underline cursor-pointer"
                            onClick={() => {
                              const node = flow.nodes.find(n => n.id === edge.source);
                              if (node) {
                                setSelectedStep({
                                  id: node.id,
                                  name: node.label,
                                  actor: node.actor,
                                  sequence: node.sequence,
                                  perspective_id: node.perspective_id,
                                  estimated_duration_minutes: node.estimated_duration_minutes,
                                  automation_potential: node.automation_potential,
                                  waste_category: node.waste_category,
                                  manual_effort_percentage: node.manual_effort_percentage,
                                });
                              }
                            }}
                          >
                            • {sourceNode.label}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">← No dependencies</div>
                );
              })()}

              {/* Outgoing edges */}
              {(() => {
                const outgoing = flow.edges.filter(e => e.source === selectedStep.id);
                return outgoing.length > 0 ? (
                  <div>
                    <span className="font-semibold text-gray-600">→ Feeds into:</span>
                    <div className="ml-4 mt-1">
                      {outgoing.map((edge, i) => {
                        const targetNode = flow.nodes.find(n => n.id === edge.target);
                        return targetNode ? (
                          <div key={i} className="text-blue-600 hover:underline cursor-pointer"
                            onClick={() => {
                              const node = flow.nodes.find(n => n.id === edge.target);
                              if (node) {
                                setSelectedStep({
                                  id: node.id,
                                  name: node.label,
                                  actor: node.actor,
                                  sequence: node.sequence,
                                  perspective_id: node.perspective_id,
                                  estimated_duration_minutes: node.estimated_duration_minutes,
                                  automation_potential: node.automation_potential,
                                  waste_category: node.waste_category,
                                  manual_effort_percentage: node.manual_effort_percentage,
                                });
                              }
                            }}
                          >
                            • {targetNode.label}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">→ No downstream steps</div>
                );
              })()}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-3 space-y-2">
            {editMode && (
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700"
              >
                ✏️ Edit Step
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (confirm(`Duplicate step "${selectedStep.name}"?`)) {
                    const duplicatedStep = {
                      ...selectedStep,
                      id: `step_${Date.now()}`,
                      name: `${selectedStep.name} (Copy)`,
                      sequence: flow.nodes.length + 1,
                    };
                    createStepMutation.mutate(
                      {
                        processId: processId,
                        data: duplicatedStep,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Step duplicated successfully!');
                          setSelectedStep(null);
                        },
                        onError: (error) => {
                          console.error('Error duplicating step:', error);
                          toast.error('Error duplicating step.');
                        },
                      }
                    );
                  }
                }}
                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-semibold text-sm"
                title="Duplicate this step"
              >
                📋 Duplicate
              </button>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${selectedStep.name}"? This cannot be undone.`)) {
                    // TODO: Implement delete functionality
                    toast('Delete functionality - API endpoint needed');
                  }
                }}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded font-semibold text-sm"
                title="Delete this step"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
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
                  toast.success('Step updated successfully!');
                },
                onError: (error) => {
                  console.error('Error updating step:', error);
                  toast.error('Error updating step. Backend endpoint needs to be implemented.');
                },
              }
            );
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Add Step Modal */}
      {showAddModal && flow && (
        <ProcessStepEditModal
          step={{
            id: `step_${Date.now()}`,
            name: 'New Step',
            sequence: flow.nodes.length + 1,
            perspective_id: perspectiveLevel || 'operational',
            produces_observation_ids: [],
            consumes_observation_ids: [],
            uses_metric_ids: [],
            systems_used_ids: [],
          }}
          onSave={(newStep) => {
            createStepMutation.mutate(
              {
                processId: processId,
                data: newStep,
              },
              {
                onSuccess: () => {
                  setShowAddModal(false);
                  toast.success('Step created successfully!');
                },
                onError: (error) => {
                  console.error('Error creating step:', error);
                  toast.error('Error creating step. Please try again.');
                },
              }
            );
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
