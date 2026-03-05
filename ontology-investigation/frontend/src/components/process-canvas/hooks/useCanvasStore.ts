import { create } from 'zustand';

export interface StepMetadata {
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

export interface HandoffInfo {
  sourceStep: { id: string; name: string; perspective_id: string };
  targetStep: { id: string; name: string; perspective_id: string };
}

export interface DrillDownEntry {
  id: string;
  name: string;
}

export type LayoutType = 'flow' | 'free';

interface CanvasState {
  // Selection
  selectedStep: StepMetadata | null;
  selectedHandoff: HandoffInfo | null;
  selectedStepIds: Set<string>;

  // Modes
  connectionMode: boolean;
  firstNodeForConnection: string | null;
  crystallizationView: boolean;

  // Layout
  layoutType: LayoutType;
  layoutPerProcess: Record<string, LayoutType>;

  // Search
  searchQuery: string;

  // Inspector
  inspectorOpen: boolean;
  inspectorEditMode: boolean;

  // Process
  activeProcessId: string;
  showCreateProcess: boolean;
  newProcessName: string;
  newProcessDescription: string;

  // Drill-down
  parentStepId: string | null;
  drillDownStack: DrillDownEntry[];

  // Lineage drawer
  lineageStepId: string | null;

  // Full editor modal
  showFullEditor: boolean;
  showAddModal: boolean;

  // Welcome
  welcomeDismissed: boolean;

  // Actions
  selectStep: (step: StepMetadata | null) => void;
  selectHandoff: (handoff: HandoffInfo | null) => void;
  toggleConnectionMode: () => void;
  setFirstNodeForConnection: (id: string | null) => void;
  toggleCrystallizationView: () => void;
  setLayoutType: (type: LayoutType) => void;
  setSearchQuery: (query: string) => void;
  openInspector: () => void;
  closeInspector: () => void;
  setInspectorEditMode: (editing: boolean) => void;
  setActiveProcessId: (id: string) => void;
  setShowCreateProcess: (show: boolean) => void;
  setNewProcessName: (name: string) => void;
  setNewProcessDescription: (desc: string) => void;
  drillDown: (entry: DrillDownEntry) => void;
  drillUp: () => void;
  drillToLevel: (index: number) => void;
  drillToRoot: () => void;
  setLineageStepId: (id: string | null) => void;
  setShowFullEditor: (show: boolean) => void;
  setShowAddModal: (show: boolean) => void;
  dismissWelcome: () => void;
  toggleInSelection: (id: string) => void;
  clearMultiSelection: () => void;
  reset: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  // Selection
  selectedStep: null,
  selectedHandoff: null,
  selectedStepIds: new Set<string>(),

  // Modes
  connectionMode: false,
  firstNodeForConnection: null,
  crystallizationView: false,

  // Layout
  layoutType: 'flow',
  layoutPerProcess: {},

  // Search
  searchQuery: '',

  // Inspector
  inspectorOpen: false,
  inspectorEditMode: false,

  // Process
  activeProcessId: '',
  showCreateProcess: false,
  newProcessName: '',
  newProcessDescription: '',

  // Drill-down
  parentStepId: null,
  drillDownStack: [],

  // Lineage
  lineageStepId: null,

  // Modals
  showFullEditor: false,
  showAddModal: false,

  // Welcome
  welcomeDismissed: false,

  // Actions
  selectStep: (step) => set({
    selectedStep: step,
    selectedHandoff: null,
    selectedStepIds: new Set<string>(),
    inspectorOpen: step !== null,
    inspectorEditMode: false,
  }),

  selectHandoff: (handoff) => set({
    selectedHandoff: handoff,
    selectedStep: null,
    inspectorOpen: handoff !== null,
    inspectorEditMode: false,
  }),

  toggleConnectionMode: () => set((s) => ({
    connectionMode: !s.connectionMode,
    firstNodeForConnection: null,
  })),

  setFirstNodeForConnection: (id) => set({ firstNodeForConnection: id }),

  toggleCrystallizationView: () => set((s) => ({
    crystallizationView: !s.crystallizationView,
  })),

  setLayoutType: (type) => set((s) => ({
    layoutType: type,
    layoutPerProcess: { ...s.layoutPerProcess, [s.activeProcessId]: type },
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  openInspector: () => set({ inspectorOpen: true }),
  closeInspector: () => set({
    inspectorOpen: false,
    selectedStep: null,
    selectedHandoff: null,
    inspectorEditMode: false,
  }),

  setInspectorEditMode: (editing) => set({ inspectorEditMode: editing }),

  setActiveProcessId: (id) => set((s) => ({
    activeProcessId: id,
    layoutType: s.layoutPerProcess[id] || 'flow',
    selectedStep: null,
    selectedHandoff: null,
    inspectorOpen: false,
    parentStepId: null,
    drillDownStack: [],
  })),

  setShowCreateProcess: (show) => set({ showCreateProcess: show }),
  setNewProcessName: (name) => set({ newProcessName: name }),
  setNewProcessDescription: (desc) => set({ newProcessDescription: desc }),

  drillDown: (entry) => set((s) => ({
    drillDownStack: [...s.drillDownStack, entry],
    parentStepId: entry.id,
    selectedStep: null,
    selectedHandoff: null,
    inspectorOpen: false,
  })),

  drillUp: () => set((s) => {
    if (s.drillDownStack.length <= 1) {
      return { parentStepId: null, drillDownStack: [], selectedStep: null };
    }
    const newStack = s.drillDownStack.slice(0, -1);
    return {
      drillDownStack: newStack,
      parentStepId: newStack[newStack.length - 1].id,
      selectedStep: null,
    };
  }),

  drillToLevel: (index) => set((s) => {
    const newStack = s.drillDownStack.slice(0, index + 1);
    return {
      drillDownStack: newStack,
      parentStepId: newStack[newStack.length - 1].id,
      selectedStep: null,
    };
  }),

  drillToRoot: () => set({
    parentStepId: null,
    drillDownStack: [],
    selectedStep: null,
  }),

  setLineageStepId: (id) => set({ lineageStepId: id }),
  setShowFullEditor: (show) => set({ showFullEditor: show }),
  setShowAddModal: (show) => set({ showAddModal: show }),
  dismissWelcome: () => set({ welcomeDismissed: true }),

  toggleInSelection: (id) => set((s) => {
    const newSet = new Set(s.selectedStepIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedStepIds: newSet, selectedStep: null, inspectorOpen: newSet.size > 0 };
  }),

  clearMultiSelection: () => set({ selectedStepIds: new Set<string>() }),

  reset: () => set({
    selectedStep: null,
    selectedHandoff: null,
    selectedStepIds: new Set<string>(),
    connectionMode: false,
    firstNodeForConnection: null,
    inspectorOpen: false,
    inspectorEditMode: false,
    searchQuery: '',
  }),
}));
