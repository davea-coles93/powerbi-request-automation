interface ManualEffortBarProps {
  percentage?: number;
}

export function ManualEffortBar({ percentage }: ManualEffortBarProps) {
  if (percentage == null) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  const color =
    percentage >= 80
      ? 'bg-red-500'
      : percentage >= 50
        ? 'bg-orange-400'
        : percentage >= 20
          ? 'bg-yellow-400'
          : 'bg-green-500';

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-600 w-8 text-right">
        {percentage}%
      </span>
    </div>
  );
}
