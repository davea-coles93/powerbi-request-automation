const automationStyles: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-blue-100 text-blue-800',
  Low: 'bg-orange-100 text-orange-800',
  None: 'bg-gray-100 text-gray-600',
};

interface AutomationBadgeProps {
  potential?: string;
}

export function AutomationBadge({ potential }: AutomationBadgeProps) {
  if (!potential) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${automationStyles[potential] || 'bg-gray-100 text-gray-600'}`}>
      {potential}
    </span>
  );
}
