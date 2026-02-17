const reliabilityColors: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
};

interface ReliabilityBadgeProps {
  reliability?: string;
}

export function ReliabilityBadge({ reliability }: ReliabilityBadgeProps) {
  if (!reliability) {
    return <span className="text-xs text-gray-400">N/A</span>;
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${reliabilityColors[reliability] || 'bg-gray-100 text-gray-600'}`}>
      {reliability}
    </span>
  );
}
