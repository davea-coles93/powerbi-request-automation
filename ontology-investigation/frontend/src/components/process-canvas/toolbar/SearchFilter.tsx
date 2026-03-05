import { useRef, useEffect, useCallback, useState } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import type cytoscape from 'cytoscape';
import { useCanvasStore } from '../hooks/useCanvasStore';

interface SearchFilterProps {
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

function selectNodeInStore(node: cytoscape.NodeSingular) {
  const data = node.data();
  useCanvasStore.getState().selectStep({
    id: data.id,
    name: data.name,
    actor: data.actor,
    sequence: data.sequence,
    perspective_id: data.perspective_id,
    estimated_duration_minutes: data.estimated_duration_minutes,
    automation_potential: data.automation_potential,
    waste_category: data.waste_category,
    manual_effort_percentage: data.manual_effort_percentage,
  });
}

export function SearchFilter({ cyRef }: SearchFilterProps) {
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matchIndex, setMatchIndex] = useState(-1);
  const [matchCount, setMatchCount] = useState(0);

  // Apply dimming to non-matching nodes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('dimmed highlighted search-focus');

    if (!searchQuery.trim()) {
      setMatchCount(0);
      setMatchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase();
    let count = 0;
    cy.nodes('.step-node').forEach((node) => {
      const data = node.data();
      const searchable = [
        data.name,
        data.actor,
        data.perspective_id,
        data.waste_category,
        data.automation_potential,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchable.includes(query)) {
        node.addClass('highlighted');
        count++;
      } else {
        node.addClass('dimmed');
        node.connectedEdges().addClass('dimmed');
      }
    });

    // Un-dim edges connected to highlighted nodes
    cy.nodes('.highlighted').connectedEdges().removeClass('dimmed');
    setMatchCount(count);
    setMatchIndex(count > 0 ? 0 : -1);
  }, [searchQuery, cyRef]);

  // Navigate to match by index
  const navigateToMatch = useCallback(
    (index: number) => {
      const cy = cyRef.current;
      if (!cy) return;
      const highlighted = cy.nodes('.highlighted');
      if (highlighted.length === 0 || index < 0) return;

      const wrappedIndex = ((index % highlighted.length) + highlighted.length) % highlighted.length;
      setMatchIndex(wrappedIndex);

      const node = highlighted[wrappedIndex];

      // Visual focus indicator
      cy.nodes('.search-focus').removeClass('search-focus');
      node.addClass('search-focus');

      cy.animate({ center: { eles: node }, zoom: 1.2 }, { duration: 400 });
      selectNodeInStore(node);
    },
    [cyRef],
  );

  // Ctrl+F global shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setMatchIndex(-1);
    setMatchCount(0);
    const cy = cyRef.current;
    if (cy) cy.nodes('.search-focus').removeClass('search-focus');
    inputRef.current?.focus();
  }, [setSearchQuery, cyRef]);

  // Navigate matches on Enter (next) / Shift+Enter (previous)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          navigateToMatch(matchIndex - 1);
        } else {
          navigateToMatch(matchIndex === -1 ? 0 : matchIndex + 1);
        }
      } else if (e.key === 'Escape') {
        handleClear();
        inputRef.current?.blur();
      }
    },
    [matchIndex, navigateToMatch, handleClear],
  );

  return (
    <div className="relative flex items-center gap-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search steps… (Ctrl+F)"
          className="pl-8 pr-7 py-1.5 w-52 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Match counter + navigation */}
      {searchQuery && (
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-gray-500 tabular-nums min-w-[3ch] text-center">
            {matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : '0'}
          </span>
          <button
            onClick={() => navigateToMatch(matchIndex - 1)}
            disabled={matchCount === 0}
            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Previous (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateToMatch(matchIndex + 1)}
            disabled={matchCount === 0}
            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Next (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
