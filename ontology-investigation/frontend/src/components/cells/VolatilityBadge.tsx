const volatilityStyles: Record<string, string> = {
  'Point-in-time': 'bg-sky-100 text-sky-800',
  'Accumulating': 'bg-violet-100 text-violet-800',
  'Continuous': 'bg-amber-100 text-amber-800',
};

interface VolatilityBadgeProps {
  volatility?: string;
}

export function VolatilityBadge({ volatility }: VolatilityBadgeProps) {
  if (!volatility) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${volatilityStyles[volatility] || 'bg-gray-100 text-gray-600'}`}>
      {volatility}
    </span>
  );
}
