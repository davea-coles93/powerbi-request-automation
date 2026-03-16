import { useState } from 'react';
import { Search, Filter, Clock, GitBranch, Snowflake, Workflow, ChevronDown, ChevronUp } from 'lucide-react';
import { entityTypeConfig } from '../../shared/canvas/entityTypeConfig';
import type { EntityTypeName } from '../hooks/useLineageData';

interface PerspectiveOption {
  id: string;
  name: string;
}

interface TypeCount {
  type: EntityTypeName;
  label: string;
  count: number;
}

interface LineageToolbarProps {
  perspectiveFilter: string;
  onPerspectiveChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  perspectives?: PerspectiveOption[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    totalCrystallisationHours: number;
  };
  typeCounts: TypeCount[];
  hiddenTypes: Set<EntityTypeName>;
  onToggleType: (type: EntityTypeName) => void;
  crystallisationOnly?: boolean;
  onCrystallisationToggle?: (value: boolean) => void;
  costedAttributeCount?: number;
  processes?: { id: string; name: string }[];
  processFilter?: string | null;
  onProcessFilterChange?: (processId: string | null) => void;
}

/**
 * Toolbar for the enhanced Lineage view.
 *
 * Two-row layout with progressive disclosure:
 * - Primary row: view mode, search, stats (always visible)
 * - Filter row: perspective, process, crystallisation, type chips (collapsible)
 */
export function LineageToolbar({
  perspectiveFilter,
  onPerspectiveChange,
  searchQuery,
  onSearchChange,
  perspectives,
  stats,
  typeCounts,
  hiddenTypes,
  onToggleType,
  crystallisationOnly = false,
  onCrystallisationToggle,
  costedAttributeCount = 0,
  processes,
  processFilter = null,
  onProcessFilterChange,
}: LineageToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Count active filters for badge
  const activeFilterCount =
    (perspectiveFilter !== 'all' ? 1 : 0) +
    (processFilter ? 1 : 0) +
    (crystallisationOnly ? 1 : 0) +
    hiddenTypes.size;

  return (
    <div className="bg-white border-b border-gray-200 z-20">
      {/* Primary row — always visible */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
            <GitBranch className="w-4 h-4 text-purple-600" />
            Lineage
          </div>
          <span className="text-[10px] text-gray-400 ml-5.5">What data exists and what does it cost?</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Filter toggle button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
            activeFilterCount > 0
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300'
          }`}
          title={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-purple-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
          {filtersExpanded
            ? <ChevronUp className="w-3 h-3 text-gray-400" />
            : <ChevronDown className="w-3 h-3 text-gray-400" />
          }
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
            {stats.nodeCount} nodes
          </span>
          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
            {stats.edgeCount} edges
          </span>
          {stats.totalCrystallisationHours > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-md border border-amber-200">
              <Clock className="w-3 h-3" />
              {stats.totalCrystallisationHours.toFixed(1)}h transformation cost
            </span>
          )}
        </div>
      </div>

      {/* Filter row — collapsible */}
      {filtersExpanded && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-t border-gray-100">
          {/* Perspective filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={perspectiveFilter}
              onChange={(e) => onPerspectiveChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
            >
              <option value="all">All Perspectives</option>
              {perspectives?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Process focus filter */}
          {onProcessFilterChange && processes && processes.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-2">
                <Workflow className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={processFilter ?? ''}
                  onChange={(e) => onProcessFilterChange(e.target.value || null)}
                  className={`text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 ${
                    processFilter ? 'border-purple-300 text-purple-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="">All Processes</option>
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Crystallisation pathway toggle */}
          {onCrystallisationToggle && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <button
                onClick={() => costedAttributeCount > 0 && onCrystallisationToggle(!crystallisationOnly)}
                disabled={costedAttributeCount === 0}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
                  crystallisationOnly
                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm'
                    : costedAttributeCount === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={costedAttributeCount === 0
                  ? 'No cost data available — define process steps with crystallisation mappings first'
                  : `Show only elements with transformation cost data (${costedAttributeCount} attributes with known operational cost)`
                }
              >
                <Snowflake className="w-3 h-3" />
                Show Costs
                {costedAttributeCount > 0 && (
                  <span className="text-[10px] text-gray-400">({costedAttributeCount})</span>
                )}
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-4 bg-gray-200" />

          {/* Type toggle chips */}
          <div className="flex items-center gap-1">
            {typeCounts.map(({ type, label, count }) => {
              const config = entityTypeConfig[type];
              const isHidden = hiddenTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => onToggleType(type)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${
                    isHidden
                      ? 'bg-gray-50 text-gray-400 border-gray-200 opacity-50'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                  title={`${isHidden ? 'Show' : 'Hide'} ${label}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-opacity ${isHidden ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: config?.border }}
                  />
                  <span className="font-medium">{count}</span>
                  <span className={isHidden ? 'line-through' : ''}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
