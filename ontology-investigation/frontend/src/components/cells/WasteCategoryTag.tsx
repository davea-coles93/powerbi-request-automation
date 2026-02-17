const wasteStyles: Record<string, string> = {
  'Manual Data Entry': 'bg-red-50 text-red-700 border-red-200',
  'Physical Media': 'bg-orange-50 text-orange-700 border-orange-200',
  'System Switching': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Waiting Time': 'bg-blue-50 text-blue-700 border-blue-200',
  'Manual Verification': 'bg-purple-50 text-purple-700 border-purple-200',
};

interface WasteCategoryTagProps {
  category?: string;
}

export function WasteCategoryTag({ category }: WasteCategoryTagProps) {
  if (!category) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${wasteStyles[category] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {category}
    </span>
  );
}
