import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, ArrowRightLeft } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../ConfirmDeleteDialog';
import { useCanvasStore } from '../hooks/useCanvasStore';
import { useProcessData } from '../hooks/useProcessData';

export function BulkActionsPanel() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selectedStepIds = useCanvasStore((s) => s.selectedStepIds);
  const activeProcessId = useCanvasStore((s) => s.activeProcessId);
  const clearMultiSelection = useCanvasStore((s) => s.clearMultiSelection);

  const { bulkUpdateStepsMutation, bulkDeleteStepsMutation } = useProcessData();

  const count = selectedStepIds.size;
  if (count === 0) return null;

  const stepIds = Array.from(selectedStepIds);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-bold text-lg text-gray-900">
          {count} step{count !== 1 ? 's' : ''} selected
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Ctrl+click to add/remove steps
        </p>
      </div>

      {/* Change perspective */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Change Perspective
        </h4>
        <div className="flex gap-2">
          {(['operational', 'management', 'financial'] as const).map((pid) => (
            <button
              key={pid}
              onClick={() => {
                bulkUpdateStepsMutation.mutate(
                  { processId: activeProcessId, stepIds, updates: { perspective_id: pid } },
                  {
                    onSuccess: () => {
                      toast.success(`Moved ${count} steps to ${pid}`);
                      clearMultiSelection();
                    },
                    onError: () => toast.error('Failed to update steps'),
                  },
                );
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium border ${
                pid === 'operational'
                  ? 'border-green-300 text-green-700 hover:bg-green-50'
                  : pid === 'management'
                  ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                  : 'border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3 inline mr-1" />
              {pid.charAt(0).toUpperCase() + pid.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk delete */}
      <div className="border-t pt-3">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete {count} step{count !== 1 ? 's' : ''}
        </button>
      </div>

      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        itemName={`${count} selected step${count !== 1 ? 's' : ''}`}
        itemType="Steps"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          bulkDeleteStepsMutation.mutate(
            { processId: activeProcessId, stepIds },
            {
              onSuccess: () => {
                toast.success(`${count} steps deleted!`);
                clearMultiSelection();
              },
              onError: () => toast.error('Failed to delete steps'),
            },
          );
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
