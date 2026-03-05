import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Layers,
  Table,
  GitBranch,
  Filter,
  Maximize2,
  Image,
  FileCode,
  MessageCircleQuestion,
  BarChart3,
  Calculator,
  Database,
  Box,
  Server,
  X,
} from 'lucide-react';
import { useDataFoundationStore, type ActiveView, type ViewMode } from '../hooks/useDataFoundationStore';
import type cytoscape from 'cytoscape';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'viewmode' | 'view' | 'canvas';
}

interface CommandPaletteProps {
  cyRef?: React.MutableRefObject<cytoscape.Core | null>;
}

const VIEW_ICONS: Record<ActiveView, React.ReactNode> = {
  businessQuestions: <MessageCircleQuestion className="w-4 h-4" />,
  metrics: <BarChart3 className="w-4 h-4" />,
  measures: <Calculator className="w-4 h-4" />,
  attributes: <Database className="w-4 h-4" />,
  entities: <Box className="w-4 h-4" />,
  systems: <Server className="w-4 h-4" />,
};

const VIEW_LABELS: Record<ActiveView, string> = {
  businessQuestions: 'Business Questions',
  metrics: 'Metrics',
  measures: 'Measures',
  attributes: 'Attributes',
  entities: 'Entities',
  systems: 'Systems',
};

const VIEW_SHORTCUTS: Record<ActiveView, string> = {
  businessQuestions: '1',
  metrics: '2',
  measures: '3',
  attributes: '4',
  entities: '5',
  systems: '6',
};

const MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  table: <Table className="w-4 h-4" />,
  schema: <Layers className="w-4 h-4" />,
  lineage: <GitBranch className="w-4 h-4" />,
};

const MODE_LABELS: Record<ViewMode, string> = {
  table: 'Table View',
  schema: 'Schema View',
  lineage: 'Lineage View',
};

const MODE_SHORTCUTS: Record<ViewMode, string> = {
  table: 'T',
  schema: 'S',
  lineage: 'L',
};

export function CommandPalette({ cyRef }: CommandPaletteProps) {
  const commandPaletteOpen = useDataFoundationStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useDataFoundationStore((s) => s.toggleCommandPalette);
  const viewMode = useDataFoundationStore((s) => s.viewMode);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    toggleCommandPalette();
    setQuery('');
    setSelectedIndex(0);
  }, [toggleCommandPalette]);

  const commands = useMemo<CommandAction[]>(() => {
    const store = useDataFoundationStore.getState();
    const cmds: CommandAction[] = [];

    // Navigation commands - switch active view
    const views: ActiveView[] = ['businessQuestions', 'metrics', 'measures', 'attributes', 'entities', 'systems'];
    for (const view of views) {
      cmds.push({
        id: `nav-${view}`,
        label: `Switch to: ${VIEW_LABELS[view]}`,
        description: `Navigate to the ${VIEW_LABELS[view].toLowerCase()} view`,
        icon: VIEW_ICONS[view],
        shortcut: VIEW_SHORTCUTS[view],
        action: () => {
          store.setActiveView(view);
          close();
        },
        category: 'navigation',
      });
    }

    // View mode commands
    const modes: ViewMode[] = ['table', 'schema', 'lineage'];
    for (const mode of modes) {
      cmds.push({
        id: `mode-${mode}`,
        label: MODE_LABELS[mode],
        description: `Switch to ${mode} display mode`,
        icon: MODE_ICONS[mode],
        shortcut: MODE_SHORTCUTS[mode],
        action: () => {
          store.setViewMode(mode);
          close();
        },
        category: 'viewmode',
      });
    }

    // View commands
    cmds.push({
      id: 'focus-search',
      label: 'Search Elements',
      description: 'Focus the search bar to filter elements',
      icon: <Search className="w-4 h-4" />,
      shortcut: 'Ctrl+F',
      action: () => {
        close();
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search all elements"]',
          );
          searchInput?.focus();
        }, 100);
      },
      category: 'view',
    });

    cmds.push({
      id: 'clear-search',
      label: 'Clear Search',
      description: 'Reset the search filter',
      icon: <X className="w-4 h-4" />,
      action: () => {
        store.setSearchQuery('');
        close();
      },
      category: 'view',
    });

    // Perspective filter commands
    const perspectives = [
      { id: null, label: 'All' },
      { id: 'operational', label: 'Operational' },
      { id: 'management', label: 'Management' },
      { id: 'financial', label: 'Financial' },
    ];

    for (const p of perspectives) {
      cmds.push({
        id: `filter-${p.id ?? 'all'}`,
        label: `Filter: ${p.label}`,
        description: `Show ${p.label === 'All' ? 'all perspectives' : `${p.label.toLowerCase()} perspective only`}`,
        icon: <Filter className="w-4 h-4" />,
        action: () => {
          store.setPerspectiveFilter(p.id);
          close();
        },
        category: 'view',
      });
    }

    // Canvas commands (only available in schema or lineage mode)
    if (viewMode === 'schema' || viewMode === 'lineage') {
      cmds.push({
        id: 'fit-to-screen',
        label: 'Fit to Screen',
        description: 'Reset zoom to fit all elements in view',
        icon: <Maximize2 className="w-4 h-4" />,
        action: () => {
          if (cyRef?.current) {
            cyRef.current.fit(undefined, 50);
          }
          close();
        },
        category: 'canvas',
      });

      if (cyRef?.current) {
        cmds.push(
          {
            id: 'export-png',
            label: 'Export PNG',
            description: 'Download diagram as PNG image',
            icon: <Image className="w-4 h-4" />,
            action: () => {
              const cy = cyRef.current;
              if (!cy) return;
              const dataUrl = cy.png({ full: true, bg: '#fafafa', scale: 2 });
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = 'data-foundation.png';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              close();
            },
            category: 'canvas',
          },
          {
            id: 'export-svg',
            label: 'Export SVG',
            description: 'Download diagram as SVG vector',
            icon: <FileCode className="w-4 h-4" />,
            action: () => {
              const cy = cyRef.current;
              if (!cy) return;
              const svgContent = (cy as any).svg({ full: true, bg: '#fafafa' });
              const blob = new Blob([svgContent], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'data-foundation.svg';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              close();
            },
            category: 'canvas',
          },
        );
      }
    }

    return cmds;
  }, [viewMode, cyRef, close]);

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
        toggleCommandPalette();
        setQuery('');
        setSelectedIndex(0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

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
        close();
      }
    },
    [filtered, selectedIndex, close],
  );

  if (!commandPaletteOpen) return null;

  const categoryOrder = ['navigation', 'viewmode', 'view', 'canvas'] as const;
  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    viewmode: 'View Mode',
    view: 'View',
    canvas: 'Canvas',
  };

  const grouped: Record<string, CommandAction[]> = {};
  for (const cat of categoryOrder) {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) {
      grouped[cat] = items;
    }
  }

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={close}
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
            placeholder="Type a command..."
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

          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            if (!items) return null;

            return (
              <div key={cat}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {categoryLabels[cat]}
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
            <kbd className="bg-gray-100 px-1 rounded font-mono">up/down</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">Enter</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">Esc</kbd> Close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="bg-gray-100 px-1 rounded font-mono">Ctrl+K</kbd> Toggle
          </span>
        </div>
      </div>
    </>
  );
}
