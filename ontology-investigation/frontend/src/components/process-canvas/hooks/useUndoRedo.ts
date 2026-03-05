import { create } from 'zustand';

export type UndoAction =
  | { type: 'update_step'; processId: string; stepId: string; before: Record<string, any>; after: Record<string, any> }
  | { type: 'create_step'; processId: string; stepId: string; data: Record<string, any> }
  | { type: 'delete_step'; processId: string; stepId: string; data: Record<string, any> }
  | { type: 'create_connection'; processId: string; targetStepId: string; addedSourceId: string; previousDeps: string[] };

interface UndoRedoState {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  canUndo: boolean;
  canRedo: boolean;
  push: (action: UndoAction) => void;
  undo: () => UndoAction | null;
  redo: () => UndoAction | null;
  clear: () => void;
}

const MAX_STACK = 50;

export const useUndoRedo = create<UndoRedoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  push: (action) =>
    set((s) => {
      const stack = [...s.undoStack, action].slice(-MAX_STACK);
      return {
        undoStack: stack,
        redoStack: [], // clear redo on new action
        canUndo: true,
        canRedo: false,
      };
    }),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const action = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
      canUndo: state.undoStack.length > 1,
      canRedo: true,
    });
    return action;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    const action = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, action],
      canRedo: state.redoStack.length > 1,
      canUndo: true,
    });
    return action;
  },

  clear: () => set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),
}));
