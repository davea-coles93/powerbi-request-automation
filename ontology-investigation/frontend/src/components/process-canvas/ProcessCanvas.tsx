import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Lock, ArrowRight, X, ChevronRight, Layers, Users, Calendar, Plus, Trash2, Copy, BookOpen, Sparkles, Workflow,
} from 'lucide-react';
import { useState } from 'react';
import type { WorkshopSession } from '../../types/ontology';
import { ProcessStepEditModal, type StepFormData } from '../ProcessStepEditModal';
import { StepLineageDrawer } from '../StepLineageDrawer';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { useCanvasStore } from './hooks/useCanvasStore';
import { useProcessData } from './hooks/useProcessData';
import { useCytoscapeInstance } from './hooks/useCytoscapeInstance';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { useUndoRedo } from './hooks/useUndoRedo';
import { CytoscapeContainer } from './canvas/CytoscapeContainer';
import { PerspectiveRegions } from './canvas/PerspectiveRegions';
import { Minimap } from './canvas/Minimap';
import { SearchFilter } from './toolbar/SearchFilter';
import { LayoutSwitcher } from './toolbar/LayoutSwitcher';
import { ExportMenu } from './toolbar/ExportMenu';
import { CanvasErrorBoundary } from './canvas/CanvasErrorBoundary';
import { CommandPalette } from './overlays/CommandPalette';
import { OnboardingTour } from './overlays/OnboardingTour';
import { InspectorPanel } from './panel/InspectorPanel';
import { ProcessTemplateLibrary } from '../ProcessTemplateLibrary';
import { ProcessAIPanel } from './ProcessAIPanel';
import { StepInspector } from './panel/StepInspector';
import { HandoffInspector } from './panel/HandoffInspector';
import { BulkActionsPanel } from './panel/BulkActionsPanel';

export interface CrystallisationContext {
  attributeId: string;
  attributeName: string;
  processId: string;
  processName: string;
}

interface ProcessCanvasProps {
  processId?: string;
  workshopSession?: WorkshopSession;
  crystallisationContext?: CrystallisationContext;
}

export function ProcessCanvas({ processId, workshopSession, crystallisationContext }: ProcessCanvasProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showProcessAI, setShowProcessAI] = useState(false);

  // ── Store ──────────────────────────────────────────────────
  const {
    activeProcessId, setActiveProcessId,
    selectedStep, selectStep,
    selectedHandoff,
    connectionMode, toggleConnectionMode,
    firstNodeForConnection, setFirstNodeForConnection,
    crystallizationView, toggleCrystallizationView,
    lineageStepId, setLineageStepId,
    showFullEditor, setShowFullEditor,
    showAddModal, setShowAddModal,
    showCreateProcess, setShowCreateProcess,
    newProcessName, setNewProcessName,
    newProcessDescription, setNewProcessDescription,
    welcomeDismissed, dismissWelcome,
    drillDownStack, drillToRoot, drillToLevel, drillUp,
    inspectorEditMode,
    inspectorOpen,
    selectedStepIds,
  } = useCanvasStore();

  // ── Data ───────────────────────────────────────────────────
  const {
    flow, isLoading, crystallizationData, processes, stats,
    updateStepMutation, createStepMutation, deleteStepMutation,
    createProcessMutation, deleteProcessMutation,
    duplicateProcessMutation, reorderStepMutation,
  } = useProcessData();

  // ── Sync processId prop → store ────────────────────────────
  useEffect(() => {
    const pid = crystallisationContext?.processId || processId;
    if (pid) setActiveProcessId(pid);
  }, [processId, crystallisationContext?.processId, setActiveProcessId]);

  // ── Auto-select first process (only when no prop overrides) ─
  useEffect(() => {
    const hasPropOverride = crystallisationContext?.processId || processId;
    if (!activeProcessId && !hasPropOverride && processes && processes.length > 0) {
      setActiveProcessId(processes[0].id);
    }
  }, [activeProcessId, processes, setActiveProcessId, crystallisationContext?.processId, processId]);

  // ── Connection creation callback ───────────────────────────
  const handleCreateConnection = useCallback(
    (targetStepId: string, updatedDeps: string[]) => {
      const store = useCanvasStore.getState();
      const previousDeps = updatedDeps.slice(0, -1); // all except the new one
      const addedSourceId = updatedDeps[updatedDeps.length - 1];

      toast.loading('Creating connection...', { id: 'edge-creation' });
      updateStepMutation.mutate(
        {
          processId: store.activeProcessId,
          stepId: targetStepId,
          data: { depends_on_step_ids: updatedDeps },
        },
        {
          onSuccess: () => {
            toast.success('Connection created!', { id: 'edge-creation' });
            store.toggleConnectionMode();
            useUndoRedo.getState().push({
              type: 'create_connection',
              processId: store.activeProcessId,
              targetStepId,
              addedSourceId,
              previousDeps,
            });
          },
          onError: () => {
            toast.error('Failed to create connection', { id: 'edge-creation' });
          },
        },
      );
    },
    [updateStepMutation],
  );

  // ── Step reorder handler ───────────────────────────────────
  const handleReorderStep = useCallback(
    (stepId: string, newSequence: number) => {
      if (!activeProcessId) return;
      reorderStepMutation.mutate(
        { processId: activeProcessId, stepId, newSequence },
        {
          onSuccess: () => toast.success('Step reordered'),
          onError: () => toast.error('Failed to reorder step'),
        },
      );
    },
    [activeProcessId, reorderStepMutation],
  );

  // ── Cytoscape ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const { cyRef, zoomIn, zoomOut, fitToScreen } = useCytoscapeInstance(
    containerRef,
    flow,
    { onCreateConnection: handleCreateConnection, onReorderStep: handleReorderStep },
  );

  // ── Delete step handler (for keyboard shortcut) ────────────
  const handleDeleteStep = useCallback(
    (processId: string, stepId: string) => {
      deleteStepMutation.mutate(
        { processId, stepId },
        {
          onSuccess: () => {
            toast.success('Step deleted!');
            selectStep(null);
          },
          onError: () => toast.error('Failed to delete step.'),
        },
      );
    },
    [deleteStepMutation, selectStep],
  );

  // ── Undo / Redo ────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const action = useUndoRedo.getState().undo();
    if (!action) return;

    if (action.type === 'update_step') {
      updateStepMutation.mutate(
        { processId: action.processId, stepId: action.stepId, data: action.before },
        { onSuccess: () => toast.success('Undone!'), onError: () => toast.error('Undo failed') },
      );
    } else if (action.type === 'create_connection') {
      updateStepMutation.mutate(
        { processId: action.processId, stepId: action.targetStepId, data: { depends_on_step_ids: action.previousDeps } },
        { onSuccess: () => toast.success('Connection undone!'), onError: () => toast.error('Undo failed') },
      );
    }
  }, [updateStepMutation]);

  const handleRedo = useCallback(() => {
    const action = useUndoRedo.getState().redo();
    if (!action) return;

    if (action.type === 'update_step') {
      updateStepMutation.mutate(
        { processId: action.processId, stepId: action.stepId, data: action.after },
        { onSuccess: () => toast.success('Redone!'), onError: () => toast.error('Redo failed') },
      );
    } else if (action.type === 'create_connection') {
      updateStepMutation.mutate(
        { processId: action.processId, stepId: action.targetStepId, data: { depends_on_step_ids: [...action.previousDeps, action.addedSourceId] } },
        { onSuccess: () => toast.success('Connection redone!'), onError: () => toast.error('Redo failed') },
      );
    }
  }, [updateStepMutation]);

  // ── Quick-create step via N key ────────────────────────────
  const handleQuickCreate = useCallback(() => {
    if (!flow || !activeProcessId) return;

    // Determine perspective from viewport center Y position
    const cy = cyRef.current;
    let perspectiveId = 'operational';
    if (cy) {
      const centerY = (-cy.pan().y + cy.height() / 2) / cy.zoom();
      if (centerY > 600) perspectiveId = 'financial';
      else if (centerY > 300) perspectiveId = 'management';
    }

    const newStep = {
      id: `step_${Date.now()}`,
      name: 'New Step',
      sequence: flow.nodes.length + 1,
      perspective_id: perspectiveId,
    };

    createStepMutation.mutate(
      { processId: activeProcessId, data: newStep },
      {
        onSuccess: () => {
          toast.success('Step created! Edit it in the inspector.');
          selectStep({
            ...newStep,
            actor: undefined,
            estimated_duration_minutes: undefined,
            automation_potential: undefined,
            waste_category: undefined,
            manual_effort_percentage: undefined,
          });
          useCanvasStore.getState().setInspectorEditMode(true);
        },
        onError: () => toast.error('Failed to create step.'),
      },
    );
  }, [flow, activeProcessId, cyRef, createStepMutation, selectStep]);

  // ── Keyboard ───────────────────────────────────────────────
  useCanvasKeyboard(cyRef, handleDeleteStep, handleUndo, handleRedo, handleQuickCreate);

  // ── Crystallization overlay ────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.$('.crystallization-node').removeClass('crystallization-node');
    if (crystallizationView && crystallizationData?.crystallization_points) {
      const ids = new Set(
        crystallizationData.crystallization_points.map((cp: any) => cp.step_id),
      );
      cy.nodes('.step-node').forEach((node) => {
        if (ids.has(node.id())) node.addClass('crystallization-node');
      });
    }
  }, [crystallizationView, crystallizationData, cyRef]);

  // ── Loading state ──────────────────────────────────────────
  if (isLoading && activeProcessId) {
    return <div className="p-4">Loading process map...</div>;
  }

  // ── Empty state (no processes) ─────────────────────────────
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
                          onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create process'),
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
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateProcess(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Process
              </button>
              <button
                onClick={() => setShowLibrary(true)}
                className="px-6 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-medium hover:bg-purple-100 transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Import from Library
              </button>
            </div>
          )}
        </div>
        {showLibrary && (
          <ProcessTemplateLibrary
            onClose={() => setShowLibrary(false)}
          />
        )}
      </div>
    );
  }

  if (!flow) {
    return <div className="p-4">Loading process...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Workshop Banner ─────────────────────────────────── */}
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

      {/* ── Header / Toolbar ────────────────────────────────── */}
      <div className="border-b bg-white">
        {/* Row 1: Process selector + controls */}
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          {/* View identity */}
          <div className="flex flex-col mr-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
              <Workflow className="w-4 h-4 text-blue-600" />
              Process Builder
            </div>
            <span className="text-[10px] text-gray-400 ml-5.5">What work happens and where is effort wasted?</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          {/* Process Selector */}
          {processes && processes.length > 1 ? (
            <select
              value={activeProcessId}
              onChange={(e) => setActiveProcessId(e.target.value)}
              className="text-sm font-bold bg-white border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-w-xs truncate"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <h2 className="text-sm font-bold text-gray-900 truncate max-w-xs">{flow.process.name}</h2>
          )}

          {/* Process management */}
          {showCreateProcess ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1.5">
              <input
                type="text"
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs w-40 focus:ring-1 focus:ring-blue-500"
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
                        onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create process'),
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
                      onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create process'),
                    },
                  );
                }}
                disabled={!newProcessName.trim()}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreateProcess(false); setNewProcessName(''); }}
                className="p-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowCreateProcess(true)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Create new process"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  duplicateProcessMutation.mutate(activeProcessId, {
                    onSuccess: (result: any) => {
                      setActiveProcessId(result.id);
                      toast.success('Process duplicated!');
                    },
                    onError: () => toast.error('Failed to duplicate process'),
                  });
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Duplicate this process"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowLibrary(true)}
                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="Import from template library"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              {processes && processes.length > 1 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete this process"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* Search + Layout + Export */}
          <SearchFilter cyRef={cyRef} />
          <div className="hidden md:flex items-center gap-0.5">
            <LayoutSwitcher cyRef={cyRef} />
            <ExportMenu cyRef={cyRef} />
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* Mode toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleConnectionMode}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
                connectionMode
                  ? 'bg-green-50 text-green-700 border-green-300 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔗 Connect
            </button>
            <button
              onClick={toggleCrystallizationView}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
                crystallizationView
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              Crystal
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Stats badges */}
          {stats && (
            <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
              <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md whitespace-nowrap">
                {stats.totalSteps} steps
              </span>
              <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md whitespace-nowrap">
                {stats.totalDuration}m
              </span>
              {stats.manualSteps > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded-md border border-orange-200 whitespace-nowrap">
                  {stats.manualSteps} manual
                </span>
              )}
            </div>
          )}

          {/* AI Process Builder — prominent */}
          <button
            onClick={() => setShowProcessAI(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
              showProcessAI
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title="AI Process Builder — describe a process and AI will generate it"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Builder</span>
          </button>

          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1 flex-shrink-0"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>

        {/* Row 2: Connection mode banner OR legend (compact) */}
        {connectionMode ? (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-green-50 border-t border-green-200">
            <span className="text-green-700 font-medium text-xs">
              {firstNodeForConnection
                ? 'Now click a target step to create the connection (or press Escape to cancel)'
                : 'Click a source step to start connecting'}
            </span>
            {firstNodeForConnection && (
              <button
                onClick={() => {
                  setFirstNodeForConnection(null);
                  cyRef.current?.$('.connection-source').removeClass('connection-source');
                }}
                className="px-2 py-0.5 bg-gray-200 rounded text-xs font-semibold hover:bg-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-1 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded border-2 border-green-400 bg-green-50" />
              <span>Operational</span>
              <ArrowRight className="w-2.5 h-2.5 text-gray-300" />
              <div className="w-2.5 h-2.5 rounded border-2 border-yellow-400 bg-yellow-50" />
              <span>Management</span>
              <ArrowRight className="w-2.5 h-2.5 text-gray-300" />
              <div className="w-2.5 h-2.5 rounded border-2 border-blue-400 bg-blue-50" />
              <span>Financial</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-gray-400" />
              <span>Within</span>
              <div className="w-4 h-0.5 bg-purple-500" style={{ borderTop: '2px dashed #a855f7', height: 0 }} />
              <span className="text-purple-500">Handoff</span>
            </div>
            {crystallizationView && crystallizationData?.crystallization_points && (
              <>
                <div className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded border-2 border-blue-500 bg-blue-100" />
                  <span className="text-blue-600 font-medium">
                    {crystallizationData.crystallization_points.length} data journey point{crystallizationData.crystallization_points.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Drill-down Breadcrumb ────────────────────────────── */}
      {drillDownStack.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center gap-1 text-sm">
          <Layers className="w-4 h-4 text-indigo-600 mr-1" />
          <button
            onClick={drillToRoot}
            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
          >
            {flow.process.name}
          </button>
          {drillDownStack.map((entry, index) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {index === drillDownStack.length - 1 ? (
                <span className="font-semibold text-gray-800">{entry.name}</span>
              ) : (
                <button
                  onClick={() => drillToLevel(index)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                >
                  {entry.name}
                </button>
              )}
            </span>
          ))}
          <button
            onClick={drillUp}
            className="ml-auto px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold"
          >
            Back Up
          </button>
        </div>
      )}

      {/* ── Canvas Area ──────────────────────────────────────── */}
      <CanvasErrorBoundary>
      <div className="flex-1 relative">
        <CytoscapeContainer
          ref={containerRef}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitToScreen={fitToScreen}
          inspectorOpen={inspectorOpen}
        />

        {/* Perspective region backgrounds */}
        <PerspectiveRegions cyRef={cyRef} />

        {/* Minimap */}
        <Minimap cyRef={cyRef} />

        {/* ── Welcome overlay (above minimap) ──────────────── */}
        {!selectedStep && !selectedHandoff && !showFullEditor && !showAddModal && !welcomeDismissed && (
          <div className="absolute bottom-[188px] left-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-md p-4 w-80 z-10">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm text-blue-900">Process Canvas</h3>
              <button
                onClick={dismissWelcome}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p><strong>Click</strong> a step to inspect it</p>
              <p><strong>Double-click</strong> to drill into sub-steps</p>
              <p><strong>Purple dashed edges</strong> are cross-perspective handoffs</p>
              <p><strong>N</strong> to quick-create a new step</p>
              <p><strong>Ctrl+K</strong> to open the command palette</p>
              <p><strong>Escape</strong> to close the inspector</p>
            </div>
          </div>
        )}

        {/* ── Inspector Panel (right slide-in) ─────────────── */}
        <InspectorPanel title={
          selectedStepIds.size > 0 ? 'Bulk Actions' :
          selectedHandoff ? 'Handoff' :
          selectedStep ? (inspectorEditMode ? 'Edit Step' : 'Step') :
          'Inspector'
        }>
          {selectedStepIds.size > 0 && <BulkActionsPanel />}
          {selectedStepIds.size === 0 && selectedStep && <StepInspector />}
          {selectedStepIds.size === 0 && selectedHandoff && <HandoffInspector />}
        </InspectorPanel>
      </div>
      </CanvasErrorBoundary>

      {/* ── Full Edit Modal ──────────────────────────────────── */}
      {showFullEditor && selectedStep && (
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
                  setShowFullEditor(false);
                  selectStep(null);
                  toast.success('Step updated!');
                },
                onError: () => toast.error('Error updating step.'),
              },
            );
          }}
          onCancel={() => setShowFullEditor(false)}
        />
      )}

      {/* ── Add Step Modal ───────────────────────────────────── */}
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
                  toast.success('Step created!');
                },
                onError: () => toast.error('Error creating step.'),
              },
            );
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* ── Step Lineage Drawer ──────────────────────────────── */}
      {lineageStepId && (
        <StepLineageDrawer
          stepId={lineageStepId}
          onClose={() => setLineageStepId(null)}
        />
      )}

      {/* ── Command Palette (Ctrl+K) ──────────────────────────── */}
      <CommandPalette
        onAddStep={() => setShowAddModal(true)}
        onFitToScreen={fitToScreen}
        onSwitchProcess={setActiveProcessId}
        onDuplicateProcess={() => {
          duplicateProcessMutation.mutate(activeProcessId, {
            onSuccess: (result: any) => {
              setActiveProcessId(result.id);
              toast.success('Process duplicated!');
            },
            onError: () => toast.error('Failed to duplicate process'),
          });
        }}
        processes={processes || []}
        cyRef={cyRef}
      />

      {/* ── Onboarding Tour ──────────────────────────────────── */}
      <OnboardingTour />

      {/* ── Delete Process Confirmation ─────────────────────── */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        itemName={`${flow.process.name} (${flow.nodes.length} steps)`}
        itemType="Process"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteProcessMutation.mutate(activeProcessId, {
            onSuccess: () => {
              const remaining = (processes || []).filter((p) => p.id !== activeProcessId);
              setActiveProcessId(remaining.length > 0 ? remaining[0].id : '');
              toast.success('Process deleted');
            },
            onError: () => toast.error('Failed to delete process'),
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showLibrary && (
        <ProcessTemplateLibrary
          onClose={() => setShowLibrary(false)}
          onImported={() => {
            // Refetch processes to pick up the imported one
          }}
        />
      )}

      {showProcessAI && (
        <ProcessAIPanel
          onClose={() => setShowProcessAI(false)}
          onProcessCreated={(id) => {
            setActiveProcessId(id);
            setShowProcessAI(false);
          }}
        />
      )}
    </div>
  );
}
