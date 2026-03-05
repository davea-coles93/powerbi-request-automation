import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { Lock, ArrowRight, X, ChevronRight, Layers, Users, Calendar, Plus, Trash2 } from 'lucide-react';
import type { WorkshopSession } from '../types/ontology';
import { useProcessFlow, useProcesses, useUpdateProcessStep, useCreateProcessStep, useDeleteProcessStep, useCrystallizationPoints, useCreateProcess, useDeleteProcess } from '../hooks/useOntology';
import { ProcessStepEditModal, StepFormData } from './ProcessStepEditModal';
import { StepLineageDrawer } from './StepLineageDrawer';

// Register dagre layout
cytoscape.use(cytoscapeDagre);

interface ProcessMapEditorProps {
  processId?: string;
  perspectiveLevel?: string;
  workshopSession?: WorkshopSession;
}

interface DrillDownEntry {
  id: string;
  name: string;
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
  produces_attribute_ids?: string[];
  consumes_attribute_ids?: string[];
  uses_metric_ids?: string[];
  systems_used_ids?: string[];
  has_sub_steps?: boolean;
}

interface HandoffInfo {
  sourceStep: { id: string; name: string; perspective_id: string };
  targetStep: { id: string; name: string; perspective_id: string };
}

const perspectiveColors: Record<string, { bg: string; border: string }> = {
  operational: { bg: '#dcfce7', border: '#22c55e' },
  management: { bg: '#fef9c3', border: '#eab308' },
  financial: { bg: '#dbeafe', border: '#3b82f6' },
};

const perspectiveLabels: Record<string, { label: string; concern: string }> = {
  operational: { label: 'Operational', concern: 'What work is being done?' },
  management: { label: 'Management', concern: 'How are we performing?' },
  financial: { label: 'Financial', concern: "What's the financial position?" },
};

const automationColors: Record<string, string> = {
  High: '#ef4444',    // red - needs automation
  Medium: '#f97316',  // orange
  Low: '#eab308',     // yellow
  None: '#22c55e',    // green - good as is
};

// Swim lane Y positions for each perspective
const laneYPositions: Record<string, number> = {
  operational: 120,
  management: 340,
  financial: 560,
};

export function ProcessMapEditor({ processId, workshopSession }: ProcessMapEditorProps) {
  const [selectedStep, setSelectedStep] = useState<StepMetadata | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [firstNodeForConnection, setFirstNodeForConnection] = useState<string | null>(null);
  const [crystallizationView, setCrystallizationView] = useState(false);
  const [lineageStepId, setLineageStepId] = useState<string | null>(null);
  const [activeProcessId, setActiveProcessId] = useState(processId || '');
  const [selectedHandoff, setSelectedHandoff] = useState<HandoffInfo | null>(null);
  const [parentStepId, setParentStepId] = useState<string | null>(null);
  const [drillDownStack, setDrillDownStack] = useState<DrillDownEntry[]>([]);
  const [showCreateProcess, setShowCreateProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessDescription, setNewProcessDescription] = useState('');
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync activeProcessId with prop
  useEffect(() => {
    if (processId) setActiveProcessId(processId);
  }, [processId]);

  // Show all perspectives (no perspectiveLevel filter) for swim-lane view
  // Pass parentStepId to drill into sub-steps
  const { data: flow, isLoading } = useProcessFlow(activeProcessId || '__none__', undefined, parentStepId || undefined);
  const { data: crystallizationData } = useCrystallizationPoints(crystallizationView ? activeProcessId : '');
  const { data: processes } = useProcesses();
  const updateStepMutation = useUpdateProcessStep();
  const createStepMutation = useCreateProcessStep();
  const deleteStepMutation = useDeleteProcessStep();
  const createProcessMutation = useCreateProcess();
  const deleteProcessMutation = useDeleteProcess();

  // Auto-select first process if none set
  useEffect(() => {
    if (!activeProcessId && processes && processes.length > 0) {
      setActiveProcessId(processes[0].id);
    }
  }, [activeProcessId, processes]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!flow) return null;

    const totalSteps = flow.nodes.length;
    const totalDuration = flow.nodes.reduce(
      (sum, node) => sum + (node.estimated_duration_minutes || 0),
      0
    );

    const automationCounts = { High: 0, Medium: 0, Low: 0, None: 0 };
    flow.nodes.forEach((node) => {
      if (node.automation_potential) {
        automationCounts[node.automation_potential]++;
      }
    });

    const manualSteps = flow.nodes.filter(
      (node) => node.manual_effort_percentage && node.manual_effort_percentage > 80
    ).length;

    // Count cross-perspective edges (handoffs)
    const nodeMap = new Map(flow.nodes.map(n => [n.id, n]));
    const handoffCount = flow.edges.filter(e => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      return s && t && s.perspective_id !== t.perspective_id;
    }).length;

    return { totalSteps, totalDuration, automationCounts, manualSteps, handoffCount };
  }, [flow]);

  // Convert flow data to Cytoscape elements with swim-lane positioning
  const elements = useMemo(() => {
    if (!flow) return [];

    const cyElements: any[] = [];
    const horizontalSpacing = 280;
    const xStart = 150;

    // Group nodes by perspective
    const groups: Record<string, typeof flow.nodes> = {};
    for (const node of flow.nodes) {
      const pid = node.perspective_id || 'operational';
      if (!groups[pid]) groups[pid] = [];
      groups[pid].push(node);
    }

    // Sort each group by sequence
    for (const pid of Object.keys(groups)) {
      groups[pid].sort((a, b) => a.sequence - b.sequence);
    }

    // Create lane compound nodes (only for perspectives that have steps)
    const perspectiveOrder = ['operational', 'management', 'financial'];
    for (const pid of perspectiveOrder) {
      if (!groups[pid]?.length) continue;
      const info = perspectiveLabels[pid] || { label: pid, concern: '' };
      const colors = perspectiveColors[pid] || { bg: '#f3f4f6', border: '#9ca3af' };
      cyElements.push({
        group: 'nodes',
        data: {
          id: `lane-${pid}`,
          label: `${info.label.toUpperCase()}  —  ${info.concern}`,
        },
        classes: `lane-node lane-${pid}`,
        style: {
          'background-color': colors.bg,
          'background-opacity': 0.25,
          'border-width': 2,
          'border-color': colors.border,
          'border-style': 'solid',
        },
      });
    }

    // Create step nodes positioned within their lane
    for (const pid of perspectiveOrder) {
      const laneNodes = groups[pid] || [];
      const laneY = laneYPositions[pid] || 120;

      laneNodes.forEach((node, laneIndex) => {
        const colors = perspectiveColors[node.perspective_id] || {
          bg: '#f3f4f6',
          border: '#9ca3af',
        };

        const automationColor = node.automation_potential
          ? automationColors[node.automation_potential]
          : null;

        // Build rich label with metadata
        let labelText = node.label;
        if (node.has_sub_steps) {
          labelText += ' [+]';
        }
        const badges: string[] = [];
        if (node.estimated_duration_minutes) {
          badges.push(`⏱️ ${node.estimated_duration_minutes}m`);
        }
        if (node.automation_potential) {
          const automationEmoji = {
            High: '🔴', Medium: '🟠', Low: '🟡', None: '🟢',
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

        const hasSubSteps = !!node.has_sub_steps;
        cyElements.push({
          group: 'nodes',
          data: {
            id: node.id,
            parent: `lane-${pid}`,
            label: labelText,
            actor: node.actor,
            sequence: node.sequence,
            perspective_id: node.perspective_id,
            estimated_duration_minutes: node.estimated_duration_minutes,
            automation_potential: node.automation_potential,
            waste_category: node.waste_category,
            manual_effort_percentage: node.manual_effort_percentage,
            has_sub_steps: hasSubSteps,
          },
          position: {
            x: xStart + laneIndex * horizontalSpacing,
            y: laneY,
          },
          classes: `step-node ${node.perspective_id}-node${hasSubSteps ? ' has-sub-steps' : ''}`,
          style: {
            'background-color': colors.bg,
            'border-color': automationColor || colors.border,
            'border-width': automationColor ? 4 : 2,
          },
        });
      });
    }

    // Create edges - classify cross-perspective as handoffs
    const nodeMap = new Map(flow.nodes.map(n => [n.id, n]));
    flow.edges.forEach((edge, index) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const isCrossPerspective = sourceNode && targetNode &&
        sourceNode.perspective_id !== targetNode.perspective_id;

      cyElements.push({
        group: 'edges',
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          sourcePerspective: sourceNode?.perspective_id,
          targetPerspective: targetNode?.perspective_id,
        },
        classes: isCrossPerspective ? 'handoff-edge' : 'flow-edge',
      });
    });

    return cyElements;
  }, [flow]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        // Step nodes
        {
          selector: 'node.step-node',
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
        // Lane compound nodes
        {
          selector: 'node.lane-node',
          style: {
            'label': 'data(label)',
            'text-valign': 'top',
            'text-halign': 'left',
            'font-size': '13px',
            'font-weight': 'bold',
            'color': '#374151',
            'text-margin-y': 8,
            'text-margin-x': 8,
            'padding': '30px',
            'shape': 'roundrectangle',
            'text-wrap': 'wrap',
            'text-max-width': '600px',
          },
        },
        {
          selector: '.lane-operational',
          style: {
            'background-color': '#dcfce7',
            'background-opacity': 0.2,
            'border-color': '#86efac',
            'border-width': 2,
          },
        },
        {
          selector: '.lane-management',
          style: {
            'background-color': '#fef9c3',
            'background-opacity': 0.2,
            'border-color': '#fde047',
            'border-width': 2,
          },
        },
        {
          selector: '.lane-financial',
          style: {
            'background-color': '#dbeafe',
            'background-opacity': 0.2,
            'border-color': '#93c5fd',
            'border-width': 2,
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
        // Same-perspective edges
        {
          selector: 'edge.flow-edge',
          style: {
            'width': 3,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
          },
        },
        // Cross-perspective handoff edges
        {
          selector: 'edge.handoff-edge',
          style: {
            'width': 4,
            'line-color': '#8b5cf6',
            'target-arrow-color': '#8b5cf6',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
            'line-style': 'dashed',
            'line-dash-pattern': [8, 4],
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#8b5cf6',
          },
        },
        // Nodes with sub-steps get a double border to indicate drill-down
        {
          selector: '.has-sub-steps',
          style: {
            'border-style': 'double',
            'border-width': 5,
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
        {
          selector: '.crystallization-node',
          style: {
            'border-width': 5,
            'border-color': '#3b82f6',
            'border-style': 'double',
            'background-color': '#dbeafe',
          },
        },
      ],
      layout: {
        name: 'preset',
      },
      minZoom: 0.3,
      maxZoom: 2,
    });

    // Handle node clicks
    cy.on('tap', 'node.step-node', (evt) => {
      const node = evt.target;
      const data = node.data();

      // Clear handoff selection when clicking a node
      setSelectedHandoff(null);

      // Connection mode: create edges between nodes
      if (connectionMode) {
        if (!firstNodeForConnection) {
          setFirstNodeForConnection(data.id);
          node.addClass('connection-source');
        } else if (firstNodeForConnection === data.id) {
          setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        } else {
          const sourceNode = flow?.nodes.find(n => n.id === firstNodeForConnection);
          const targetNode = flow?.nodes.find(n => n.id === data.id);

          if (sourceNode && targetNode) {
            const targetStep = flow?.nodes.find(n => n.id === data.id);
            if (targetStep) {
              const currentDependencies = (targetStep as any).depends_on_step_ids || [];
              if (currentDependencies.includes(firstNodeForConnection)) {
                toast.error('Connection already exists!');
              } else {
                const updatedDependencies = [...currentDependencies, firstNodeForConnection];
                toast.loading('Creating connection...', { id: 'edge-creation' });
                updateStepMutation.mutate(
                  {
                    processId: activeProcessId,
                    stepId: data.id,
                    data: { depends_on_step_ids: updatedDependencies },
                  },
                  {
                    onSuccess: () => {
                      toast.success(`Connected "${sourceNode.label}" to "${targetNode.label}"`, { id: 'edge-creation' });
                      // Turn off connection mode after a successful connection
                      setConnectionMode(false);
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
        perspective_id: data.perspective_id,
        estimated_duration_minutes: data.estimated_duration_minutes,
        automation_potential: data.automation_potential,
        waste_category: data.waste_category,
        manual_effort_percentage: data.manual_effort_percentage,
      });

      if (editMode) {
        setShowEditModal(true);
      }
    });

    // Handle double-click for sub-step drill-down
    cy.on('dbltap', 'node.step-node', (evt) => {
      const node = evt.target;
      const data = node.data();

      if (data.has_sub_steps) {
        // Drill into sub-steps
        setDrillDownStack(prev => [...prev, { id: data.id, name: data.label.split('\n')[0].replace(' [+]', '') }]);
        setParentStepId(data.id);
        setSelectedStep(null);
        setSelectedHandoff(null);
      }
    });

    // Handle edge clicks - show handoff info for cross-perspective edges
    cy.on('tap', 'edge.handoff-edge', (evt) => {
      const edge = evt.target;
      const data = edge.data();
      const sourceNode = flow?.nodes.find(n => n.id === data.source);
      const targetNode = flow?.nodes.find(n => n.id === data.target);

      if (sourceNode && targetNode) {
        setSelectedStep(null);
        setSelectedHandoff({
          sourceStep: {
            id: sourceNode.id,
            name: sourceNode.label,
            perspective_id: sourceNode.perspective_id,
          },
          targetStep: {
            id: targetNode.id,
            name: targetNode.label,
            perspective_id: targetNode.perspective_id,
          },
        });
      }
    });

    // Handle background clicks
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedStep(null);
        setSelectedHandoff(null);
      }
    });

    cyRef.current = cy;

    // Escape key handler: cancel connection mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectionMode) {
          setConnectionMode(false);
          setFirstNodeForConnection(null);
          cy.$('.connection-source').removeClass('connection-source');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, editMode, connectionMode, firstNodeForConnection, flow, activeProcessId]);

  // Apply crystallization view overlay
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.$('.crystallization-node').removeClass('crystallization-node');

    if (crystallizationView && crystallizationData?.crystallization_points) {
      const crystStepIds = new Set(
        crystallizationData.crystallization_points.map((cp: any) => cp.step_id)
      );
      cy.nodes('.step-node').forEach((node) => {
        if (crystStepIds.has(node.id())) {
          node.addClass('crystallization-node');
        }
      });
    }
  }, [crystallizationView, crystallizationData]);

  if (isLoading && activeProcessId) {
    return <div className="p-4">Loading process map...</div>;
  }

  // Empty state - no processes exist
  if (!processes || processes.length === 0 || !activeProcessId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">🔄</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Build Your First Process</h2>
          <p className="text-gray-600 mb-2">
            Map out your business processes with swim lanes across Operational, Management, and Financial perspectives.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Each step captures who does what, in which system, producing which data — revealing waste, manual effort, and automation opportunities.
          </p>
          {showCreateProcess ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-left shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Create Process</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Process Name *</label>
                  <input
                    type="text"
                    value={newProcessName}
                    onChange={(e) => setNewProcessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Month-End Close, Order-to-Cash"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newProcessDescription}
                    onChange={(e) => setNewProcessDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Brief description of the process..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCreateProcess(false); setNewProcessName(''); setNewProcessDescription(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newProcessName.trim()) return;
                      createProcessMutation.mutate(
                        { name: newProcessName.trim(), description: newProcessDescription.trim(), steps: [] },
                        {
                          onSuccess: (result: any) => {
                            setActiveProcessId(result.id);
                            setShowCreateProcess(false);
                            setNewProcessName('');
                            setNewProcessDescription('');
                            toast.success('Process created!');
                          },
                          onError: () => toast.error('Failed to create process'),
                        },
                      );
                    }}
                    disabled={!newProcessName.trim() || createProcessMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {createProcessMutation.isPending ? 'Creating...' : 'Create Process'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateProcess(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Process
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!flow) {
    return <div className="p-4">Loading process...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workshop Banner */}
      {workshopSession && (
        <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              Workshop: {workshopSession.name}
            </span>
          </div>
          <span className="text-xs text-purple-600 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {workshopSession.date}
          </span>
          {workshopSession.participants.length > 0 && (
            <div className="flex items-center gap-1">
              {workshopSession.participants.slice(0, 3).map((p) => (
                <span key={p} className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                  {p}
                </span>
              ))}
              {workshopSession.participants.length > 3 && (
                <span className="text-xs text-purple-600">
                  +{workshopSession.participants.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {/* Header with controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Process Selector */}
            {processes && processes.length > 1 ? (
              <select
                value={activeProcessId}
                onChange={(e) => {
                  setActiveProcessId(e.target.value);
                  setSelectedStep(null);
                  setSelectedHandoff(null);
                }}
                className="text-xl font-bold bg-white border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {processes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <h2 className="text-xl font-bold">{flow.process.name}</h2>
            )}
            {flow.process.description && (
              <p className="text-sm text-gray-600 hidden lg:block">{flow.process.description}</p>
            )}
            {/* Process management buttons */}
            {showCreateProcess ? (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
                <input
                  type="text"
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-48 focus:ring-2 focus:ring-blue-500"
                  placeholder="Process name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProcessName.trim()) {
                      createProcessMutation.mutate(
                        { name: newProcessName.trim(), description: '', steps: [] },
                        {
                          onSuccess: (result: any) => {
                            setActiveProcessId(result.id);
                            setShowCreateProcess(false);
                            setNewProcessName('');
                            toast.success('Process created!');
                          },
                          onError: () => toast.error('Failed to create process'),
                        },
                      );
                    } else if (e.key === 'Escape') {
                      setShowCreateProcess(false);
                      setNewProcessName('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!newProcessName.trim()) return;
                    createProcessMutation.mutate(
                      { name: newProcessName.trim(), description: '', steps: [] },
                      {
                        onSuccess: (result: any) => {
                          setActiveProcessId(result.id);
                          setShowCreateProcess(false);
                          setNewProcessName('');
                          toast.success('Process created!');
                        },
                        onError: () => toast.error('Failed to create process'),
                      },
                    );
                  }}
                  disabled={!newProcessName.trim()}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreateProcess(false); setNewProcessName(''); }}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCreateProcess(true)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Create new process"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {processes && processes.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete process "${flow.process.name}"? This cannot be undone.`)) {
                        deleteProcessMutation.mutate(activeProcessId, {
                          onSuccess: () => {
                            const remaining = processes.filter(p => p.id !== activeProcessId);
                            setActiveProcessId(remaining.length > 0 ? remaining[0].id : '');
                            toast.success('Process deleted');
                          },
                          onError: () => toast.error('Failed to delete process'),
                        });
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete this process"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              onClick={() => setCrystallizationView(!crystallizationView)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-1 ${
                crystallizationView
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              {crystallizationView ? 'Crystallization: ON' : 'Crystallization'}
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
            {stats.handoffCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">↕️ Handoffs:</span>
                <span className="text-lg font-bold text-purple-600">{stats.handoffCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Connection mode indicator */}
        {connectionMode && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-lg p-2 mb-2">
            <span className="text-green-700 font-semibold text-sm">
              {firstNodeForConnection
                ? '🎯 Now click a target step to create the connection (or press Escape to cancel)'
                : '👆 Click a source step to start connecting'}
            </span>
            {firstNodeForConnection && (
              <button
                onClick={() => {
                  setFirstNodeForConnection(null);
                  if (cyRef.current) {
                    cyRef.current.$('.connection-source').removeClass('connection-source');
                  }
                }}
                className="px-2 py-1 bg-gray-200 rounded text-xs font-semibold hover:bg-gray-300"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Swim Lanes:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-green-400 bg-green-50"></div>
              <span>Operational</span>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-yellow-400 bg-yellow-50"></div>
              <span>Management</span>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50"></div>
              <span>Financial</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <span className="font-semibold">Edges:</span>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-gray-400"></div>
              <span>Within lane</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-purple-500 border-dashed border-t-2 border-purple-500" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-purple-600 font-medium">Handoff</span>
            </div>
          </div>
          {crystallizationView && (
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="font-semibold">Crystallization:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-100"></div>
                <span>Freezes data</span>
              </div>
              {crystallizationData?.crystallization_points && (
                <span className="text-blue-600 font-semibold">
                  ({crystallizationData.crystallization_points.length} step{crystallizationData.crystallization_points.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb for sub-step navigation */}
      {drillDownStack.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center gap-1 text-sm">
          <Layers className="w-4 h-4 text-indigo-600 mr-1" />
          <button
            onClick={() => {
              setParentStepId(null);
              setDrillDownStack([]);
              setSelectedStep(null);
            }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
          >
            {flow?.process.name || 'Process'}
          </button>
          {drillDownStack.map((entry, index) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {index === drillDownStack.length - 1 ? (
                <span className="font-semibold text-gray-800">{entry.name}</span>
              ) : (
                <button
                  onClick={() => {
                    // Navigate to this level
                    const newStack = drillDownStack.slice(0, index + 1);
                    setDrillDownStack(newStack);
                    setParentStepId(entry.id);
                    setSelectedStep(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                >
                  {entry.name}
                </button>
              )}
            </span>
          ))}
          <button
            onClick={() => {
              if (drillDownStack.length <= 1) {
                setParentStepId(null);
                setDrillDownStack([]);
              } else {
                const newStack = drillDownStack.slice(0, -1);
                setDrillDownStack(newStack);
                setParentStepId(newStack[newStack.length - 1].id);
              }
              setSelectedStep(null);
            }}
            className="ml-auto px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold"
          >
            Back Up
          </button>
        </div>
      )}

      {/* Cytoscape container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2 z-10">
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
      {!selectedStep && !selectedHandoff && !showEditModal && !showAddModal && !welcomeDismissed && (
        <div className="absolute bottom-4 right-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg shadow-lg p-6 w-96">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg text-blue-900">👋 Process Map with Swim Lanes</h3>
            <button
              onClick={() => setWelcomeDismissed(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close welcome message"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-green-600">↕️</span>
              <p>Steps are grouped into <strong>perspective lanes</strong>: Operational (top), Management (middle), Financial (bottom)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">↗️</span>
              <p><strong>Purple dashed edges</strong> are handoffs — data crossing between perspectives. Click them for details.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">👆</span>
              <p><strong>Click any step</strong> to view details, connections, and full lineage</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">✏️</span>
              <p><strong>Enable Edit Mode</strong> to modify step properties</p>
            </div>
          </div>
        </div>
      )}

      {/* Handoff annotation panel */}
      {selectedHandoff && (
        <div className="absolute bottom-4 right-4 bg-white border-2 border-purple-300 rounded-lg shadow-lg p-4 w-96">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg text-purple-900">↕️ Perspective Handoff</h3>
            <button
              onClick={() => setSelectedHandoff(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Source */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                selectedHandoff.sourceStep.perspective_id === 'operational' ? 'bg-green-100 text-green-800' :
                selectedHandoff.sourceStep.perspective_id === 'management' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {perspectiveLabels[selectedHandoff.sourceStep.perspective_id]?.label || selectedHandoff.sourceStep.perspective_id}
              </span>
              <span className="text-sm font-medium">{selectedHandoff.sourceStep.name}</span>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-2 pl-4">
              <div className="w-0.5 h-4 bg-purple-400"></div>
              <span className="text-xs text-purple-600 font-medium">Data flows across boundary</span>
            </div>

            {/* Target */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                selectedHandoff.targetStep.perspective_id === 'operational' ? 'bg-green-100 text-green-800' :
                selectedHandoff.targetStep.perspective_id === 'management' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {perspectiveLabels[selectedHandoff.targetStep.perspective_id]?.label || selectedHandoff.targetStep.perspective_id}
              </span>
              <span className="text-sm font-medium">{selectedHandoff.targetStep.name}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
            <p className="text-xs text-purple-700">
              This is a <strong>perspective handoff</strong> — where work transitions from{' '}
              <em>{perspectiveLabels[selectedHandoff.sourceStep.perspective_id]?.concern}</em> to{' '}
              <em>{perspectiveLabels[selectedHandoff.targetStep.perspective_id]?.concern}</em>.
              These boundaries are where data quality risks and manual effort tend to concentrate.
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setLineageStepId(selectedHandoff.sourceStep.id);
                setSelectedHandoff(null);
              }}
              className="flex-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded font-semibold text-sm"
            >
              Lineage: Source
            </button>
            <button
              onClick={() => {
                setLineageStepId(selectedHandoff.targetStep.id);
                setSelectedHandoff(null);
              }}
              className="flex-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded font-semibold text-sm"
            >
              Lineage: Target
            </button>
          </div>
        </div>
      )}

      {/* Selected step info panel */}
      {selectedStep && !showEditModal && flow && (
        <div className="absolute bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-96 max-h-[600px] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">{selectedStep.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {selectedStep.actor && (
                  <span className="text-sm text-gray-600">👤 {selectedStep.actor}</span>
                )}
                {selectedStep.perspective_id && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedStep.perspective_id === 'operational' ? 'bg-green-100 text-green-800' :
                    selectedStep.perspective_id === 'management' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {perspectiveLabels[selectedStep.perspective_id]?.label || selectedStep.perspective_id}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
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
                          <div key={i} className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
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
                            {sourceNode.perspective_id !== selectedStep.perspective_id && (
                              <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">handoff</span>
                            )}
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
                          <div key={i} className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
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
                            {targetNode.perspective_id !== selectedStep.perspective_id && (
                              <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">handoff</span>
                            )}
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

          {/* Crystallization info */}
          {crystallizationView && crystallizationData?.crystallization_points && (() => {
            const cp = crystallizationData.crystallization_points.find(
              (p: any) => p.step_id === selectedStep.id
            );
            if (!cp) return null;
            return (
              <div className="border-t pt-3 mb-3">
                <h4 className="font-semibold text-sm text-blue-700 mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Crystallizes Attributes
                </h4>
                <div className="flex flex-wrap gap-1">
                  {cp.crystallized_attributes.map((obs: any) => (
                    <span key={obs.id || obs.name} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {obs.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Quick Actions */}
          <div className="border-t pt-3 space-y-2">
            <button
              onClick={() => setLineageStepId(selectedStep.id)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700"
            >
              View Full Lineage
            </button>
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
                        processId: activeProcessId,
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
                    deleteStepMutation.mutate(
                      {
                        processId: activeProcessId,
                        stepId: selectedStep.id,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Step deleted successfully!');
                          setSelectedStep(null);
                        },
                        onError: (error) => {
                          console.error('Error deleting step:', error);
                          toast.error('Failed to delete step.');
                        },
                      }
                    );
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
            produces_attribute_ids: selectedStep.produces_attribute_ids || [],
            consumes_attribute_ids: selectedStep.consumes_attribute_ids || [],
            uses_metric_ids: selectedStep.uses_metric_ids || [],
            systems_used_ids: selectedStep.systems_used_ids || [],
          } as StepFormData}
          onSave={(updatedStep) => {
            updateStepMutation.mutate(
              {
                processId: activeProcessId,
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
                  toast.error('Error updating step.');
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
            perspective_id: 'operational',
            produces_attribute_ids: [],
            consumes_attribute_ids: [],
            uses_metric_ids: [],
            systems_used_ids: [],
          }}
          onSave={(newStep) => {
            createStepMutation.mutate(
              {
                processId: activeProcessId,
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

      {/* Step Lineage Drawer */}
      {lineageStepId && (
        <StepLineageDrawer
          stepId={lineageStepId}
          onClose={() => setLineageStepId(null)}
        />
      )}
    </div>
  );
}
