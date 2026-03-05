import { useEffect } from 'react';
import type cytoscape from 'cytoscape';
import { useCanvasStore } from './useCanvasStore';

export function useCanvasKeyboard(
  cyRef: React.MutableRefObject<cytoscape.Core | null>,
  onDeleteStep?: (processId: string, stepId: string) => void,
  onUndo?: () => void,
  onRedo?: () => void,
  onQuickCreate?: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const store = useCanvasStore.getState();

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      if (e.key === 'Escape') {
        if (store.inspectorEditMode) {
          store.setInspectorEditMode(false);
        } else if (store.connectionMode) {
          store.toggleConnectionMode();
          store.setFirstNodeForConnection(null);
          cyRef.current?.$('.connection-source').removeClass('connection-source');
        } else if (store.searchQuery) {
          store.setSearchQuery('');
        } else if (store.selectedStep || store.selectedHandoff) {
          store.selectStep(null);
          store.selectHandoff(null);
        }
      }

      // N key: quick-create a new step
      if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onQuickCreate?.();
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedStep && onDeleteStep) {
        onDeleteStep(store.activeProcessId, store.selectedStep.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cyRef, onDeleteStep, onUndo, onRedo, onQuickCreate]);
}
