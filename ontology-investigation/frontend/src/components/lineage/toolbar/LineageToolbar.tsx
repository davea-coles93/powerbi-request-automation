import { Search, Filter, Clock } from 'lucide-react';

interface PerspectiveOption {
  id: string;
  name: string;
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
}

/**
 * Toolbar for the enhanced Lineage view.
 *
 * Provides perspective filtering, search, and summary statistics.
 */
export function LineageToolbar({
  perspectiveFilter,
  onPerspectiveChange,
  searchQuery,
  onSearchChange,
  perspectives,
  stats,
}: LineageToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 z-20">
      {/* Perspective filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
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
            {stats.totalCrystallisationHours.toFixed(1)}h crystallisation
          </span>
        )}
      </div>
    </div>
  );
}
