import { create } from 'zustand';

export type ActiveView = 'businessQuestions' | 'metrics' | 'measures' | 'attributes' | 'entities' | 'systems';
export type ViewMode = 'table' | 'schema' | 'lineage';

export interface SelectedNode {
  id: string;
  type: 'metric' | 'measure' | 'attribute' | 'entity' | 'system';
  data: any;
}

interface DataFoundationState {
  // Views
  activeView: ActiveView;
  viewMode: ViewMode;

  // Selection
  selectedNode: SelectedNode | null;
  inspectorOpen: boolean;

  // Search & Filter
  searchQuery: string;
  perspectiveFilter: string | null;

  // Command palette
  commandPaletteOpen: boolean;

  // Actions
  setActiveView: (view: ActiveView) => void;
  setViewMode: (mode: ViewMode) => void;
  selectNode: (node: SelectedNode | null) => void;
  closeInspector: () => void;
  setSearchQuery: (query: string) => void;
  setPerspectiveFilter: (perspectiveId: string | null) => void;
  toggleCommandPalette: () => void;
  reset: () => void;
}

export const useDataFoundationStore = create<DataFoundationState>((set) => ({
  // Views
  activeView: 'metrics',
  viewMode: 'table',

  // Selection
  selectedNode: null,
  inspectorOpen: false,

  // Search & Filter
  searchQuery: '',
  perspectiveFilter: null,

  // Command palette
  commandPaletteOpen: false,

  // Actions
  setActiveView: (view) => set({ activeView: view }),

  setViewMode: (mode) => set({ viewMode: mode }),

  selectNode: (node) => set({
    selectedNode: node,
    inspectorOpen: node !== null,
  }),

  closeInspector: () => set({
    selectedNode: null,
    inspectorOpen: false,
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setPerspectiveFilter: (perspectiveId) => set({ perspectiveFilter: perspectiveId }),

  toggleCommandPalette: () => set((s) => ({
    commandPaletteOpen: !s.commandPaletteOpen,
  })),

  reset: () => set({
    activeView: 'metrics',
    viewMode: 'table',
    selectedNode: null,
    inspectorOpen: false,
    searchQuery: '',
    perspectiveFilter: null,
    commandPaletteOpen: false,
  }),
}));
