import { useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowUpDown,
  Database,
  Server,
  Filter,
  ChevronsUpDown,
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { useAttributeLibraryStore } from './hooks/useAttributeLibraryStore';
import { AttributeDetailPanel } from './panel/AttributeDetailPanel';
import { useLineageWithCosts, usePerspectives } from '../../hooks/useOntology';
import type {
  Attribute,
  Measure,
  Metric,
  Entity,
  System,
  CrystallisationCostSummary,
} from '../../types/ontology';

// ── Helpers ──────────────────────────────────────────────────────

const RELIABILITY_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
};

const RELIABILITY_ORDER: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};


// ── Enriched attribute row type ──────────────────────────────────

interface AttributeRow {
  attribute: Attribute;
  entityName: string;
  systemName: string;
  reliability: string;
  consumers: number;
  impact: number;
  cost: CrystallisationCostSummary | undefined;
  crystallisationLabel: string;
}

function buildRows(
  attributes: Attribute[],
  entities: Entity[],
  systems: System[],
  measures: Measure[],
  metrics: Metric[],
  costs: Record<string, CrystallisationCostSummary>,
): AttributeRow[] {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const systemMap = new Map(systems.map((s) => [s.id, s]));

  return attributes.map((attr) => {
    const consumingMeasures = measures.filter((m) =>
      m.input_attribute_ids.includes(attr.id),
    );
    const consumingMeasureIds = new Set(consumingMeasures.map((m) => m.id));
    const reachableMetrics = metrics.filter((mt) =>
      mt.calculated_by_measure_ids.some((mid) => consumingMeasureIds.has(mid)),
    );
    const cost = costs[attr.id];
    const crystallisationLabel = cost
      ? cost.process_names.join(', ')
      : '-';

    return {
      attribute: attr,
      entityName: entityMap.get(attr.entity_id)?.name ?? 'Unknown',
      systemName: systemMap.get(attr.system_id)?.name ?? 'Unknown',
      reliability: attr.reliability ?? '-',
      consumers: consumingMeasures.length,
      impact: reachableMetrics.length,
      cost,
      crystallisationLabel,
    };
  });
}

// ── Sort comparator ──────────────────────────────────────────────

function comparator(
  sortBy: 'name' | 'cost' | 'impact' | 'reliability',
  direction: 'asc' | 'desc',
) {
  const dir = direction === 'asc' ? 1 : -1;
  return (a: AttributeRow, b: AttributeRow) => {
    switch (sortBy) {
      case 'name':
        return dir * a.attribute.name.localeCompare(b.attribute.name);
      case 'cost': {
        const ca = a.cost?.total_duration_minutes ?? 0;
        const cb = b.cost?.total_duration_minutes ?? 0;
        return dir * (ca - cb);
      }
      case 'impact':
        return dir * (a.impact - b.impact);
      case 'reliability': {
        const ra = RELIABILITY_ORDER[a.reliability] ?? 0;
        const rb = RELIABILITY_ORDER[b.reliability] ?? 0;
        return dir * (ra - rb);
      }
      default:
        return 0;
    }
  };
}

// ── Group helpers ────────────────────────────────────────────────

interface Group {
  id: string;
  label: string;
  rows: AttributeRow[];
}

function groupRows(rows: AttributeRow[], groupBy: 'entity' | 'system'): Group[] {
  const map = new Map<string, AttributeRow[]>();
  for (const row of rows) {
    const key = groupBy === 'entity' ? row.attribute.entity_id : row.attribute.system_id;
    const label = groupBy === 'entity' ? row.entityName : row.systemName;
    const groupKey = `${key}::${label}`;
    if (!map.has(groupKey)) map.set(groupKey, []);
    map.get(groupKey)!.push(row);
  }

  return Array.from(map.entries())
    .map(([key, items]) => {
      const [id, label] = key.split('::');
      return { id, label, rows: items };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Group color dots ─────────────────────────────────────────────

const GROUP_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-indigo-400',
  'bg-red-400',
];

// ── Sortable column header ───────────────────────────────────────

type SortKey = 'name' | 'cost' | 'impact' | 'reliability';

function SortableHeader({
  column,
  label,
  currentSort,
  direction,
  onSort,
  onToggle,
  align = 'left',
}: {
  column: SortKey;
  label: string;
  currentSort: SortKey;
  direction: 'asc' | 'desc';
  onSort: (s: SortKey) => void;
  onToggle: () => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === column;
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} py-2 px-3 font-medium cursor-pointer select-none hover:text-gray-800 transition-colors ${isActive ? 'text-blue-600' : ''}`}
      onClick={() => {
        if (isActive) {
          onToggle();
        } else {
          onSort(column);
        }
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40" />
        )}
      </span>
    </th>
  );
}

// ── Main component ───────────────────────────────────────────────

export function AttributeLibrary() {
  const {
    groupBy,
    setGroupBy,
    selectedAttributeId,
    selectAttribute,
    searchQuery,
    setSearchQuery,
    perspectiveFilter,
    setPerspectiveFilter,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    expandedGroups,
    toggleGroup,
    collapseAll,
    expandAll,
  } = useAttributeLibraryStore();

  const { data: lineageData, isLoading } = useLineageWithCosts();
  const { data: perspectives } = usePerspectives();

  // Build enriched rows
  const allRows = useMemo(() => {
    if (!lineageData) return [];
    return buildRows(
      lineageData.attributes,
      lineageData.entities,
      lineageData.systems,
      lineageData.measures,
      lineageData.metrics,
      lineageData.crystallisation_costs,
    );
  }, [lineageData]);

  // Filter
  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) => r.attribute.name.toLowerCase().includes(q));
    }

    if (perspectiveFilter) {
      rows = rows.filter(
        (r) =>
          r.attribute.perspective_ids &&
          r.attribute.perspective_ids.includes(perspectiveFilter),
      );
    }

    return rows;
  }, [allRows, searchQuery, perspectiveFilter]);

  // Sort & group
  const groups = useMemo(() => {
    const sorted = [...filteredRows].sort(comparator(sortBy, sortDirection));
    return groupRows(sorted, groupBy);
  }, [filteredRows, sortBy, sortDirection, groupBy]);

  // Expand all groups by default on first render
  const effectiveExpanded = expandedGroups.size > 0 ? expandedGroups : new Set(groups.map((g) => g.id));

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-gray-500 animate-pulse">Loading attribute library...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Group toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mr-1">
                Group by
              </span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setGroupBy('entity')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupBy === 'entity'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  By Entity
                </button>
                <button
                  onClick={() => setGroupBy('system')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupBy === 'system'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  By System
                </button>
              </div>

              {/* Collapse/Expand all */}
              <button
                onClick={() => {
                  const allExpanded = effectiveExpanded.size >= groups.length && groups.length > 0;
                  if (allExpanded) {
                    collapseAll();
                  } else {
                    expandAll();
                  }
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={effectiveExpanded.size >= groups.length ? 'Collapse all groups' : 'Expand all groups'}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                {effectiveExpanded.size >= groups.length && groups.length > 0 ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Right: Perspective filter, search, sort */}
            <div className="flex items-center gap-3">
              {/* Perspective filter */}
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={perspectiveFilter ?? ''}
                  onChange={(e) => setPerspectiveFilter(e.target.value || null)}
                  className="pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">All perspectives</option>
                  {perspectives?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search attributes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="cost">Cost</option>
                  <option value="impact">Impact</option>
                  <option value="reliability">Reliability</option>
                </select>
                <button
                  onClick={toggleSortDirection}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {groups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {searchQuery || perspectiveFilter
                ? 'No attributes match the current filters.'
                : 'No attributes in the workspace.'}
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group, groupIdx) => {
                const isExpanded = effectiveExpanded.has(group.id);
                const dotColor = GROUP_COLORS[groupIdx % GROUP_COLORS.length];

                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <button
                      onClick={() => toggleGroup(group.id, groups.map(g => g.id))}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
                        {group.rows.length}
                      </span>
                    </button>

                    {/* Table rows */}
                    {isExpanded && (
                      <div className="ml-4 mb-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                              <SortableHeader column="name" label="Name" currentSort={sortBy} direction={sortDirection} onSort={setSortBy} onToggle={toggleSortDirection} />
                              <th className="text-left py-2 px-3 font-medium">Entity</th>
                              <th className="text-left py-2 px-3 font-medium">System</th>
                              <SortableHeader column="reliability" label="Reliability" currentSort={sortBy} direction={sortDirection} onSort={setSortBy} onToggle={toggleSortDirection} />
                              <th className="text-left py-2 px-3 font-medium">Perspectives</th>
                              <th className="text-left py-2 px-3 font-medium">Data Journey</th>
                              <SortableHeader column="cost" label="Cost" currentSort={sortBy} direction={sortDirection} onSort={setSortBy} onToggle={toggleSortDirection} />
                              <th className="text-right py-2 px-3 font-medium">Consumers</th>
                              <SortableHeader column="impact" label="Impact" currentSort={sortBy} direction={sortDirection} onSort={setSortBy} onToggle={toggleSortDirection} align="right" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.rows.map((row) => {
                              const isSelected = selectedAttributeId === row.attribute.id;
                              return (
                                <tr
                                  key={row.attribute.id}
                                  onClick={() => selectAttribute(row.attribute.id)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 hover:bg-blue-100'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <td className="py-2 px-3 font-medium text-gray-900">
                                    {row.attribute.name}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">{row.entityName}</td>
                                  <td className="py-2 px-3 text-gray-600">{row.systemName}</td>
                                  <td className="py-2 px-3">
                                    {row.reliability !== '-' ? (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${RELIABILITY_COLORS[row.reliability] ?? 'bg-gray-100 text-gray-700'}`}
                                      >
                                        {row.reliability}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {row.attribute.perspective_ids && row.attribute.perspective_ids.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {row.attribute.perspective_ids.map((pid: string) => (
                                          <span key={pid} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-700 border border-purple-200">
                                            {pid}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-gray-500 text-xs max-w-[160px] truncate">
                                    {row.crystallisationLabel}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {formatDuration(row.cost?.total_duration_minutes)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray-600">
                                    {row.consumers > 0 ? row.consumers : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {row.impact > 0 ? (
                                      <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        {row.impact}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedAttributeId && (
        <AttributeDetailPanel
          attributeId={selectedAttributeId}
          onClose={() => selectAttribute(null)}
        />
      )}
    </div>
  );
}
