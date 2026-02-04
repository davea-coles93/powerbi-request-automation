import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  level: 'process' | 'step';
}

interface ProcessBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export function ProcessBreadcrumb({ items, onNavigate }: ProcessBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b text-sm">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          <button
            onClick={() => onNavigate(index)}
            className={`${
              index === items.length - 1
                ? 'text-gray-900 font-medium cursor-default'
                : 'text-blue-600 hover:text-blue-800 hover:underline'
            }`}
            disabled={index === items.length - 1}
          >
            {item.label}
          </button>
        </div>
      ))}
    </nav>
  );
}
