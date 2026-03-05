import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save, X, ExternalLink } from 'lucide-react';
import { useCanvasStore } from '../hooks/useCanvasStore';
import { useProcessData } from '../hooks/useProcessData';
import { perspectiveLabels } from '../nodes/perspectiveConfig';

const WASTE_CATEGORIES = [
  'Manual Data Entry',
  'Physical Media',
  'System Switching',
  'Waiting Time',
  'Manual Verification',
  'Rework',
  'Overprocessing',
];

const PERSPECTIVES = ['operational', 'management', 'financial'] as const;

export function StepEditForm() {
  const selectedStep = useCanvasStore((s) => s.selectedStep);
  const activeProcessId = useCanvasStore((s) => s.activeProcessId);
  const setInspectorEditMode = useCanvasStore((s) => s.setInspectorEditMode);
  const selectStep = useCanvasStore((s) => s.selectStep);
  const setShowFullEditor = useCanvasStore((s) => s.setShowFullEditor);

  const { updateStepMutation } = useProcessData();

  // Local form state
  const [name, setName] = useState(selectedStep?.name || '');
  const [actor, setActor] = useState(selectedStep?.actor || '');
  const [perspectiveId, setPerspectiveId] = useState(selectedStep?.perspective_id || 'operational');
  const [duration, setDuration] = useState<string>(
    selectedStep?.estimated_duration_minutes?.toString() || '',
  );
  const [automation, setAutomation] = useState<string>(
    selectedStep?.automation_potential || '',
  );
  const [wasteCategory, setWasteCategory] = useState(selectedStep?.waste_category || '');
  const [manualEffort, setManualEffort] = useState<string>(
    selectedStep?.manual_effort_percentage?.toString() || '',
  );

  const handleSave = useCallback(() => {
    if (!selectedStep || !name.trim()) return;

    const updatedData: Record<string, any> = {
      name: name.trim(),
      actor: actor.trim() || undefined,
      perspective_id: perspectiveId,
      estimated_duration_minutes: duration ? parseInt(duration, 10) : undefined,
      automation_potential: automation || undefined,
      waste_category: wasteCategory || undefined,
      manual_effort_percentage: manualEffort ? parseInt(manualEffort, 10) : undefined,
    };

    updateStepMutation.mutate(
      {
        processId: activeProcessId,
        stepId: selectedStep.id,
        data: updatedData,
      },
      {
        onSuccess: () => {
          toast.success('Step updated!');
          setInspectorEditMode(false);
          selectStep(null);
        },
        onError: () => toast.error('Error updating step.'),
      },
    );
  }, [
    selectedStep, name, actor, perspectiveId, duration, automation,
    wasteCategory, manualEffort, activeProcessId,
    updateStepMutation, setInspectorEditMode, selectStep,
  ]);

  const handleCancel = useCallback(() => {
    setInspectorEditMode(false);
  }, [setInspectorEditMode]);

  if (!selectedStep) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Edit Step</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            autoFocus
          />
        </div>

        {/* Actor */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Actor / Role</label>
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., Production Operator"
          />
        </div>

        {/* Perspective */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Perspective</label>
          <select
            value={perspectiveId}
            onChange={(e) => setPerspectiveId(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
          >
            {PERSPECTIVES.map((pid) => (
              <option key={pid} value={pid}>
                {perspectiveLabels[pid]?.label || pid}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            min="0"
            placeholder="e.g., 30"
          />
        </div>

        {/* Automation Potential */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Automation Potential</label>
          <div className="grid grid-cols-4 gap-1">
            {['High', 'Medium', 'Low', 'None'].map((level) => (
              <button
                key={level}
                onClick={() => setAutomation(automation === level ? '' : level)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  automation === level
                    ? level === 'High' ? 'bg-red-500 text-white' :
                      level === 'Medium' ? 'bg-orange-500 text-white' :
                      level === 'Low' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Effort */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">
              Manual Effort: {manualEffort !== '' ? `${manualEffort}%` : 'Not assessed'}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={manualEffort !== ''}
                onChange={(e) => setManualEffort(e.target.checked ? '50' : '')}
                className="w-3.5 h-3.5 accent-orange-500 rounded"
              />
              <span className="text-[10px] text-gray-400">Assessed</span>
            </label>
          </div>
          {manualEffort !== '' && (
            <>
              <input
                type="range"
                value={manualEffort}
                onChange={(e) => setManualEffort(e.target.value)}
                className="w-full accent-orange-500"
                min="0"
                max="100"
                step="5"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>0% (automated)</span>
                <span>50%</span>
                <span>100% (manual)</span>
              </div>
            </>
          )}
        </div>

        {/* Waste Category */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Waste Category</label>
          <select
            value={wasteCategory}
            onChange={(e) => setWasteCategory(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
          >
            <option value="">None</option>
            {WASTE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || updateStepMutation.isPending}
            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            {updateStepMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
        <button
          onClick={() => {
            setInspectorEditMode(false);
            setShowFullEditor(true);
          }}
          className="w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm flex items-center justify-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Full Editor
        </button>
      </div>
    </div>
  );
}
