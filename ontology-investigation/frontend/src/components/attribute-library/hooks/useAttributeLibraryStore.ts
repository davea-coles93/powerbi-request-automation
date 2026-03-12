import { create } from 'zustand';

interface AttributeLibraryState {
  groupBy: 'entity' | 'system';
  selectedAttributeId: string | null;
  searchQuery: string;
  perspectiveFilter: string | null;
  sortBy: 'name' | 'cost' | 'impact' | 'reliability';
  sortDirection: 'asc' | 'desc';
  expandedGroups: Set<string>;

  setGroupBy: (g: 'entity' | 'system') => void;
  selectAttribute: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setPerspectiveFilter: (p: string | null) => void;
  setSortBy: (s: 'name' | 'cost' | 'impact' | 'reliability') => void;
  toggleSortDirection: () => void;
  toggleGroup: (groupId: string, allGroupIds?: string[]) => void;
}

export const useAttributeLibraryStore = create<AttributeLibraryState>((set) => ({
  groupBy: 'entity',
  selectedAttributeId: null,
  searchQuery: '',
  perspectiveFilter: null,
  sortBy: 'name',
  sortDirection: 'asc',
  expandedGroups: new Set<string>(),

  setGroupBy: (g) => set({ groupBy: g }),
  selectAttribute: (id) => set({ selectedAttributeId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPerspectiveFilter: (p) => set({ perspectiveFilter: p }),
  setSortBy: (s) => set({ sortBy: s }),
  toggleSortDirection: () =>
    set((state) => ({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' })),
  toggleGroup: (groupId, allGroupIds) =>
    set((state) => {
      // When expandedGroups is empty it means "all expanded by default".
      // Materialize the full set first so toggling one group doesn't collapse all others.
      let current = state.expandedGroups;
      if (current.size === 0 && allGroupIds) {
        current = new Set(allGroupIds);
      }
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return { expandedGroups: next };
    }),
}));
