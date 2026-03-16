import { create } from 'zustand';
import type { OntologyState } from '../types/ontology';

export type AppTab = 'lineage' | 'attributeLibrary' | 'gapsROI' | 'semanticModel' | 'processMap';

export type StateFilter = OntologyState; // 'as-is' | 'to-be' | 'both'

export interface ProcessDetailContext {
  attributeId: string;
  attributeName: string;
  processId: string;
  processName: string;
}

interface NavigationState {
  activeTab: AppTab;
  stateFilter: StateFilter;
  processDetailContext: ProcessDetailContext | null;
  focusedNodeId: string | null;

  setActiveTab: (tab: AppTab) => void;
  setStateFilter: (filter: StateFilter) => void;
  openProcessDetail: (ctx: ProcessDetailContext) => void;
  closeProcessDetail: () => void;
  focusNodeInLineage: (nodeId: string) => void;
  clearFocusedNode: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'lineage',
  stateFilter: 'both',
  processDetailContext: null,
  focusedNodeId: null,

  setActiveTab: (tab) => set({ activeTab: tab, processDetailContext: null }),
  setStateFilter: (filter) => set({ stateFilter: filter }),
  openProcessDetail: (ctx) => set({ processDetailContext: ctx }),
  closeProcessDetail: () => set({ processDetailContext: null }),
  focusNodeInLineage: (nodeId) => set({ activeTab: 'lineage', processDetailContext: null, focusedNodeId: nodeId }),
  clearFocusedNode: () => set({ focusedNodeId: null }),
}));
