import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { GAP_TYPE_CONFIG } from './GapCard';
import { GAP_TYPES, colorClasses } from './types';
import type { GapItem, GapType } from './types';

interface GapsDashboardProps {
  gaps: GapItem[];
  onFilterType: (type: GapType | null) => void;
  activeFilterType: GapType | null;
}

/** Horizontal bar for a single gap type — width proportional to count */
function TypeBar({ type, count, total, isActive, onClick }: {
  type: GapType;
  count: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const config = GAP_TYPE_CONFIG[type];
  if (!config) return null;
  const cls = colorClasses(config.color);
  const Icon = config.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 transition-all cursor-pointer ${
        isActive
          ? `${cls.bg} ${cls.border} border-2 shadow-sm`
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cls.text}`} />
      <span className="text-xs font-medium text-gray-700 w-32 truncate">{config.label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cls.badge}`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${cls.text}`}>{count} <span className="font-normal text-gray-400">({pct}%)</span></span>
    </button>
  );
}

/** Status bar — horizontal stacked bar with labels, accessible (not color-only) */
function StatusBar({ open, inProgress, resolved }: { open: number; inProgress: number; resolved: number }) {
  const total = open + inProgress + resolved;
  if (total === 0) return null;

  const segments = [
    { count: open, label: 'Open', color: 'bg-red-500', textColor: 'text-red-700', icon: AlertTriangle },
    { count: inProgress, label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-700', icon: Clock },
    { count: resolved, label: 'Resolved', color: 'bg-emerald-500', textColor: 'text-emerald-700', icon: CheckCircle2 },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-2.5">
      <div className="flex h-7 rounded-lg overflow-hidden bg-gray-100">
        {segments.map(({ count, label, color }) => (
          <div
            key={label}
            className={`${color} flex items-center justify-center text-xs font-semibold text-white min-w-[2rem]`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${count} ${label.toLowerCase()}`}
          >
            {count}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {segments.map(({ count, label, color, textColor, icon: Icon }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <Icon className={`w-3 h-3 ${textColor}`} />
            <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
            <span>{count} {label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Priority breakdown as stacked bar */
function PriorityBar({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = high + medium + low;
  if (total === 0) return null;

  const segments = [
    { count: high, label: 'High', color: 'bg-red-500', dotColor: 'bg-red-500' },
    { count: medium, label: 'Medium', color: 'bg-amber-500', dotColor: 'bg-amber-500' },
    { count: low, label: 'Low', color: 'bg-blue-500', dotColor: 'bg-blue-500' },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-2.5">
      <div className="flex h-7 rounded-lg overflow-hidden bg-gray-100">
        {segments.map(({ count, label, color }) => (
          <div
            key={label}
            className={`${color} flex items-center justify-center text-xs font-semibold text-white min-w-[2rem]`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${count} ${label.toLowerCase()} priority`}
          >
            {count}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {segments.map(({ count, label, dotColor }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {label} ({count})
          </span>
        ))}
      </div>
    </div>
  );
}

export function GapsDashboard({ gaps, onFilterType, activeFilterType }: GapsDashboardProps) {
  const [showTypeBreakdown, setShowTypeBreakdown] = useState(true);

  const stats = useMemo(() => {
    const openCount = gaps.filter((g) => (!g.status || g.status === 'open') && !g.resolved).length;
    const inProgressCount = gaps.filter((g) => g.status === 'in_progress').length;
    const resolvedCount = gaps.filter((g) => g.status === 'resolved' || g.resolved).length;
    const highCount = gaps.filter((g) => g.priority === 'high').length;
    const mediumCount = gaps.filter((g) => g.priority === 'medium').length;
    const lowCount = gaps.filter((g) => g.priority === 'low').length;

    const typeCounts = GAP_TYPES.reduce((acc, t) => {
      acc[t] = gaps.filter((g) => g.gap_type === t).length;
      return acc;
    }, {} as Record<GapType, number>);

    const sortedTypes = GAP_TYPES.filter((t) => typeCounts[t] > 0).sort((a, b) => typeCounts[b] - typeCounts[a]);

    return { openCount, inProgressCount, resolvedCount, highCount, mediumCount, lowCount, typeCounts, sortedTypes };
  }, [gaps]);

  if (gaps.length === 0) return null;

  const resolvedPct = gaps.length > 0 ? Math.round((stats.resolvedCount / gaps.length) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* KPI stat cards — with colored left borders for visual hierarchy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
        <div className="bg-white px-5 py-4 border-l-4 border-l-gray-300 first:rounded-tl-xl">
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{gaps.length}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            Total Gaps
          </div>
        </div>
        <div className="bg-white px-5 py-4 border-l-4 border-l-red-400">
          <div className="text-2xl font-bold text-red-600 tabular-nums">{stats.openCount}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Open
          </div>
        </div>
        <div className="bg-white px-5 py-4 border-l-4 border-l-amber-400">
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{stats.inProgressCount}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            In Progress
          </div>
        </div>
        <div className="bg-white px-5 py-4 border-l-4 border-l-emerald-400 last:rounded-tr-xl">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.resolvedCount}</span>
            {resolvedPct > 0 && (
              <span className="text-xs font-medium text-emerald-500 tabular-nums">{resolvedPct}%</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Resolved
          </div>
        </div>
      </div>

      {/* Charts row — status + priority as accessible stacked bars */}
      <div className="border-t border-gray-100 px-5 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Distribution</h4>
            <StatusBar open={stats.openCount} inProgress={stats.inProgressCount} resolved={stats.resolvedCount} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority Breakdown</h4>
            <PriorityBar high={stats.highCount} medium={stats.mediumCount} low={stats.lowCount} />
          </div>
        </div>
      </div>

      {/* Expandable type breakdown */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowTypeBreakdown(!showTypeBreakdown)}
          className="w-full flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {showTypeBreakdown ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {showTypeBreakdown ? 'Hide' : 'Show'} category breakdown ({stats.sortedTypes.length} types)
          {activeFilterType && (
            <span className="ml-auto text-purple-600 font-medium">
              Filtered: {GAP_TYPE_CONFIG[activeFilterType]?.label}
              <button
                onClick={(e) => { e.stopPropagation(); onFilterType(null); }}
                className="ml-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
        </button>
        {showTypeBreakdown && (
          <div className="px-3 pb-3 space-y-0.5">
            {stats.sortedTypes.map((type) => (
              <TypeBar
                key={type}
                type={type}
                count={stats.typeCounts[type]}
                total={gaps.length}
                isActive={activeFilterType === type}
                onClick={() => onFilterType(activeFilterType === type ? null : type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
