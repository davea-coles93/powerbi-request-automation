import { useEffect } from 'react';
import { useDataFoundationStore, type ActiveView, type ViewMode } from './useDataFoundationStore';

const VIEW_BY_NUMBER: Record<string, ActiveView> = {
  '1': 'businessQuestions',
  '2': 'metrics',
  '3': 'measures',
  '4': 'attributes',
  '5': 'entities',
  '6': 'systems',
};

const MODE_BY_KEY: Record<string, ViewMode> = {
  t: 'table',
  s: 'schema',
  l: 'lineage',
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useDataFoundationKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useDataFoundationStore.getState();

      // Ctrl+K: toggle command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        store.toggleCommandPalette();
        return;
      }

      // Ctrl+F: focus search bar (backup for SearchBar's own handler)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search all elements"]',
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
        return;
      }

      // Escape: cascading close - command palette > inspector > search
      if (e.key === 'Escape') {
        if (store.commandPaletteOpen) {
          store.toggleCommandPalette();
          return;
        }
        if (store.inspectorOpen) {
          store.closeInspector();
          return;
        }
        if (store.searchQuery) {
          store.setSearchQuery('');
          return;
        }
        return;
      }

      // Skip remaining shortcuts when typing in form fields
      if (isTypingTarget(e.target)) return;

      // Number keys 1-6: switch active view
      const viewForNumber = VIEW_BY_NUMBER[e.key];
      if (viewForNumber && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        store.setActiveView(viewForNumber);
        return;
      }

      // T / S / L keys: switch view mode
      const modeForKey = MODE_BY_KEY[e.key.toLowerCase()];
      if (modeForKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        store.setViewMode(modeForKey);
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
