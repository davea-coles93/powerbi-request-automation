import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-300" />
            )}
            {isLast ? (
              <span className="font-bold text-gray-900 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                {item.label}
              </span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="px-3 py-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all font-medium"
              >
                {item.label}
              </button>
            ) : (
              <span className="px-3 py-1.5 text-gray-600 font-medium">{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
