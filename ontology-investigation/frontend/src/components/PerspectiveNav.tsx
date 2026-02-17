import { useState } from 'react';
import { usePerspectives } from '../hooks/useOntology';
import { Factory, BarChart3, DollarSign, Edit, Plus, Trash2 } from 'lucide-react';
import { Perspective } from '../types/ontology';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface PerspectiveNavProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onEditPerspective?: (perspective: Perspective) => void;
  onDeletePerspective?: (perspective: Perspective) => void;
  onNewPerspective?: () => void;
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

export function PerspectiveNav({ selectedId, onSelect, onEditPerspective, onDeletePerspective, onNewPerspective }: PerspectiveNavProps) {
  const { data: perspectives, isLoading } = usePerspectives();
  const [deleteTarget, setDeleteTarget] = useState<Perspective | null>(null);

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
    <div className="flex gap-4 p-4 bg-gray-50 border-b items-stretch">
      {perspectives?.map((perspective) => {
        const Icon = perspectiveIcons[perspective.id] || Factory;
        const isSelected = selectedId === perspective.id;
        const colorClass = isSelected
          ? perspectiveSelectedColors[perspective.id] || 'bg-gray-700 ring-2 ring-gray-300'
          : perspectiveColors[perspective.id] || 'bg-gray-500 hover:bg-gray-600';

        return (
          <div key={perspective.id} className="relative group">
            <button
              onClick={() => onSelect(perspective.id)}
              className={`flex flex-col items-center p-4 rounded-lg text-white transition-all ${colorClass} min-w-[180px]`}
            >
              <Icon className="w-8 h-8 mb-2" />
              <span className="font-semibold">{perspective.name}</span>
              <span className="text-xs opacity-90 text-center mt-1 max-w-[180px]">
                {perspective.primary_concern}
              </span>
            </button>
            {(onEditPerspective || onDeletePerspective) && (
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEditPerspective && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPerspective(perspective);
                    }}
                    className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"
                    title="Edit perspective"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeletePerspective && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(perspective);
                    }}
                    className="p-1 bg-white/20 hover:bg-red-500/60 rounded text-white"
                    title="Delete perspective"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {onNewPerspective && (
        <button
          onClick={onNewPerspective}
          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all min-w-[120px]"
        >
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Add</span>
        </button>
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="Perspective"
        onConfirm={() => {
          if (deleteTarget) {
            onDeletePerspective?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
