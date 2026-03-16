import { colorClasses, GAP_TYPES } from './types';
import { GAP_TYPE_CONFIG } from './GapCard';
import type { GapItem } from './types';

interface GapsSummaryBarProps {
  gaps: GapItem[];
}

export function GapsSummaryBar({ gaps }: GapsSummaryBarProps) {
  if (gaps.length === 0) return null;

  const counts = GAP_TYPES.reduce(
    (acc, t) => {
      acc[t] = gaps.filter((g) => g.gap_type === t).length;
      return acc;
    },
    {} as Record<string, number>,
  );
  const openCount = gaps.filter((g) => !g.status || g.status === 'open').filter((g) => !g.resolved).length;
  const inProgressCount = gaps.filter((g) => g.status === 'in_progress').length;
  const resolvedCount = gaps.filter((g) => g.status === 'resolved' || g.resolved).length;

  return (
    <div className="bg-gray-50 border rounded-lg p-4 flex items-center justify-between mt-4">
      <div className="flex items-center gap-4 flex-wrap">
        {GAP_TYPES.map((t) => {
          if (counts[t] === 0) return null;
          const cfg = GAP_TYPE_CONFIG[t];
          const cls = colorClasses(cfg.color);
          const Icon = cfg.icon;
          return (
            <span
              key={t}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${cls.badge} ${cls.text}`}
            >
              <Icon className="w-3 h-3" /> {counts[t]} {cfg.label}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-xs flex-shrink-0">
        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {openCount} open
        </span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> {inProgressCount} in progress
        </span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500" /> {resolvedCount} resolved
        </span>
      </div>
    </div>
  );
}
