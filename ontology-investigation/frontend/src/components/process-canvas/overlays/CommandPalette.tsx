import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, Plus, Link, Lock, Maximize2, LayoutGrid, Shuffle,
  Eye, Pencil, Layers, Image, FileCode, Copy,
} from 'lucide-react';
import { useCanvasStore } from '../hooks/useCanvasStore';
import type cytoscape from 'cytoscape';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'canvas' | 'editing' | 'view';
}

interface CommandPaletteProps {
  onAddStep: () => void;
  onFitToScreen: () => void;
  onSwitchProcess: (processId: string) => void;
  onDuplicateProcess?: () => void;
  processes: Array<{ id: string; name: string }>;
  cyRef?: React.MutableRefObject<cytoscape.Core | null>;
}

export function CommandPalette({
  onAddStep,
  onFitToScreen,
  onSwitchProcess,
  onDuplicateProcess,
  processes,
  cyRef,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const store = useCanvasStore();

  const commands = useMemo<CommandAction[]>(() => {
    const cmds: CommandAction[] = [
      // Navigation
      ...processes.map((p) => ({
        id: `process-${p.id}`,
        label: `Switch to: ${p.name}`,
        description: 'Change active process',
        icon: <Layers className="w-4 h-4" />,
        action: () => { onSwitchProcess(p.id); setOpen(false); },
        category: 'navigation' as const,
      })),
      // Canvas
      {
        id: 'fit-to-screen',
        label: 'Fit to Screen',
        description: 'Reset zoom to fit all nodes',
        icon: <Maximize2 className="w-4 h-4" />,
        action: () => { onFitToScreen(); setOpen(false); },
        category: 'canvas',
      },
      {
        id: 'layout-flow',
        label: 'Layout: Flow (Dagre)',
        description: 'Hierarchical left-to-right layout',
        icon: <LayoutGrid className="w-4 h-4" />,
        action: () => { store.setLayoutType('flow'); setOpen(false); },
        category: 'canvas',
      },
      {
        id: 'layout-free',
        label: 'Layout: Free (Force-directed)',
        description: 'Organic force-directed layout',
        icon: <Shuffle className="w-4 h-4" />,
        action: () => { store.setLayoutType('free'); setOpen(false); },
        category: 'canvas',
      },
      // Editing
      {
        id: 'add-step',
        label: 'Add Step',
        description: 'Create a new process step',
        icon: <Plus className="w-4 h-4" />,
        action: () => { onAddStep(); setOpen(false); },
        category: 'editing',
      },
      {
        id: 'toggle-connection-mode',
        label: store.connectionMode ? 'Exit Connection Mode' : 'Enter Connection Mode',
        description: 'Draw dependency edges between steps',
        icon: <Link className="w-4 h-4" />,
        action: () => { store.toggleConnectionMode(); setOpen(false); },
        category: 'editing',
      },
      ...(onDuplicateProcess ? [{
        id: 'duplicate-process',
        label: 'Duplicate Process',
        description: 'Create a deep copy of the current process',
        icon: <Copy className="w-4 h-4" />,
        action: () => { onDuplicateProcess(); setOpen(false); },
        category: 'editing' as const,
      }] : []),
      // View
      {
        id: 'toggle-crystallization',
        label: store.crystallizationView ? 'Hide Crystallization' : 'Show Crystallization',
        description: 'Highlight data-freezing steps',
        icon: <Lock className="w-4 h-4" />,
        action: () => { store.toggleCrystallizationView(); setOpen(false); },
        category: 'view',
      },
      {
        id: 'focus-search',
        label: 'Search Steps',
        description: 'Find steps by name, actor, or category',
        icon: <Search className="w-4 h-4" />,
        shortcut: 'Ctrl+F',
        action: () => {
          setOpen(false);
          // Focus the search input after palette closes
          setTimeout(() => {
            const searchInput = document.querySelector<HTMLInputElement>(
              'input[placeholder*="Search steps"]',
            );
            searchInput?.focus();
          }, 100);
        },
        category: 'view',
      },
    ];

    // Export
    if (cyRef?.current) {
      cmds.push(
        {
          id: 'export-png',
          label: 'Export PNG',
          description: 'Download process map as PNG image',
          icon: <Image className="w-4 h-4" />,
          action: () => {
            const cy = cyRef.current;
            if (!cy) return;
            const dataUrl = cy.png({ full: true, bg: '#fafafa', scale: 2 });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'process-map.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setOpen(false);
          },
          category: 'canvas',
        },
        {
          id: 'export-svg',
          label: 'Export SVG',
          description: 'Download process map as SVG vector',
          icon: <FileCode className="w-4 h-4" />,
          action: () => {
            const cy = cyRef.current;
            if (!cy) return;
            const svgContent = (cy as any).svg({ full: true, bg: '#fafafa' });
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'process-map.svg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setOpen(false);
          },
          category: 'canvas',
        },
      );
    }

    // Selected step actions
    if (store.selectedStep) {
      cmds.push(
        {
          id: 'edit-selected',
          label: `Edit: ${store.selectedStep.name}`,
          description: 'Open inline editor for this step',
          icon: <Pencil className="w-4 h-4" />,
          action: () => { store.setInspectorEditMode(true); setOpen(false); },
          category: 'editing',
        },
        {
          id: 'lineage-selected',
          label: `Lineage: ${store.selectedStep.name}`,
          description: 'View full data lineage for this step',
          icon: <Eye className="w-4 h-4" />,
          action: () => { store.setLineageStepId(store.selectedStep!.id); setOpen(false); },
          category: 'view',
        },
      );
    }

    return cmds;
  }, [processes, store, onAddStep, onFitToScreen, onSwitchProcess]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.category.includes(q),
    );
  }, [query, commands]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-command-item]');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Ctrl+K / Cmd+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [filtered, selectedIndex],
  );

  if (!open) return null;

  const grouped = {
    navigation: filtered.filter((c) => c.category === 'navigation'),
    canvas: filtered.filter((c) => c.category === 'canvas'),
    editing: filtered.filter((c) => c.category === 'editing'),
    view: filtered.filter((c) => c.category === 'view'),
  };

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command…"
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No commands match "{query}"
            </div>
          )}

          {(['navigation', 'canvas', 'editing', 'view'] as const).map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            const categoryLabel = cat.charAt(0).toUpperCase() + cat.slice(1);

            return (
              <div key={cat}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {categoryLabel}
                </div>
                {items.map((cmd) => {
                  const thisIndex = flatIndex++;
                  return (
                    <button
                      key={cmd.id}
                      data-command-item
                      onClick={() => cmd.action()}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        thisIndex === selectedIndex
                          ? 'bg-purple-50 text-purple-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400 shrink-0">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-xs text-gray-400 truncate">{cmd.description}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  );
}
