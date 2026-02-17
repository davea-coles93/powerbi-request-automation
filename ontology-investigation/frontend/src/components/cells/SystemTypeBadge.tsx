const systemTypeColors: Record<string, string> = {
  ERP: 'bg-blue-100 text-blue-700',
  MES: 'bg-purple-100 text-purple-700',
  WMS: 'bg-green-100 text-green-700',
  Spreadsheet: 'bg-yellow-100 text-yellow-700',
  Manual: 'bg-gray-100 text-gray-700',
  BI: 'bg-indigo-100 text-indigo-700',
  Other: 'bg-gray-100 text-gray-600',
};

interface SystemTypeBadgeProps {
  type: string;
}

export function SystemTypeBadge({ type }: SystemTypeBadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemTypeColors[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}
