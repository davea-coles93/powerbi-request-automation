import { usePerspectives } from '../hooks/useOntology';
import { Factory, BarChart3, DollarSign } from 'lucide-react';

interface PerspectiveNavProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const perspectiveIcons: Record<string, typeof Factory> = {
  operational: Factory,
  management: BarChart3,
  financial: DollarSign,
};

const perspectiveColors: Record<string, string> = {
  operational: 'bg-operational-500 hover:bg-operational-600',
  management: 'bg-management-500 hover:bg-management-600',
  financial: 'bg-financial-500 hover:bg-financial-600',
};

const perspectiveSelectedColors: Record<string, string> = {
  operational: 'bg-operational-700 ring-2 ring-operational-300',
  management: 'bg-management-700 ring-2 ring-management-300',
  financial: 'bg-financial-700 ring-2 ring-financial-300',
};

export function PerspectiveNav({ selectedId, onSelect }: PerspectiveNavProps) {
  const { data: perspectives, isLoading } = usePerspectives();

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-48 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 bg-gray-50 border-b">
      {perspectives?.map((perspective) => {
        const Icon = perspectiveIcons[perspective.id] || Factory;
        const isSelected = selectedId === perspective.id;
        const colorClass = isSelected
          ? perspectiveSelectedColors[perspective.id]
          : perspectiveColors[perspective.id];

        return (
          <button
            key={perspective.id}
            onClick={() => onSelect(perspective.id)}
            className={`flex flex-col items-center p-4 rounded-lg text-white transition-all ${colorClass}`}
          >
            <Icon className="w-8 h-8 mb-2" />
            <span className="font-semibold">{perspective.name}</span>
            <span className="text-xs opacity-90 text-center mt-1 max-w-[180px]">
              {perspective.primary_concern}
            </span>
          </button>
        );
      })}
    </div>
  );
}
