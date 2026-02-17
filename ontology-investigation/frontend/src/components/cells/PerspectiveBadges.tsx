const perspectiveColors: Record<string, string> = {
  operational: 'bg-green-100 text-green-800',
  management: 'bg-yellow-100 text-yellow-800',
  financial: 'bg-blue-100 text-blue-800',
};

interface PerspectiveBadgesProps {
  perspectiveIds: string[];
  maxVisible?: number;
  abbreviated?: boolean;
}

export function PerspectiveBadges({ perspectiveIds, maxVisible, abbreviated = false }: PerspectiveBadgesProps) {
  if (!perspectiveIds || perspectiveIds.length === 0) {
    return <span className="text-xs text-gray-400">N/A</span>;
  }

  const visible = maxVisible ? perspectiveIds.slice(0, maxVisible) : perspectiveIds;
  const remaining = maxVisible ? perspectiveIds.length - maxVisible : 0;

  return (
    <div className="flex gap-1 flex-wrap">
      {visible.map((p) => (
        <span
          key={p}
          className={`px-2 py-1 rounded-full text-xs font-medium ${perspectiveColors[p] || 'bg-gray-100 text-gray-600'}`}
        >
          {abbreviated ? p.substring(0, 3) : p}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500">+{remaining}</span>
      )}
    </div>
  );
}
