import { create } from 'zustand';

export type AppTab = 'lineage' | 'attributeLibrary' | 'gapsROI' | 'semanticModel' | 'processMap';

export interface ProcessDetailContext {
  attributeId: string;
  attributeName: string;
  processId: string;
  processName: string;
}

interface NavigationState {
  activeTab: AppTab;
  processDetailContext: ProcessDetailContext | null;
  focusedNodeId: string | null;

  setActiveTab: (tab: AppTab) => void;
  openProcessDetail: (ctx: ProcessDetailContext) => void;
  closeProcessDetail: () => void;
  focusNodeInLineage: (nodeId: string) => void;
  clearFocusedNode: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'lineage',
  processDetailContext: null,
  focusedNodeId: null,

  setActiveTab: (tab) => set({ activeTab: tab, processDetailContext: null }),
  openProcessDetail: (ctx) => set({ processDetailContext: ctx }),
  closeProcessDetail: () => set({ processDetailContext: null }),
  focusNodeInLineage: (nodeId) => set({ activeTab: 'lineage', processDetailContext: null, focusedNodeId: nodeId }),
  clearFocusedNode: () => set({ focusedNodeId: null }),
}));
