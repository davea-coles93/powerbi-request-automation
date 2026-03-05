import { ExternalLink } from 'lucide-react';
import { useCanvasStore } from '../hooks/useCanvasStore';
import { perspectiveLabels } from '../nodes/perspectiveConfig';

export function HandoffInspector() {
  const selectedHandoff = useCanvasStore((s) => s.selectedHandoff);
  const selectHandoff = useCanvasStore((s) => s.selectHandoff);
  const setLineageStepId = useCanvasStore((s) => s.setLineageStepId);

  if (!selectedHandoff) return null;

  const srcPerspective = perspectiveLabels[selectedHandoff.sourceStep.perspective_id];
  const tgtPerspective = perspectiveLabels[selectedHandoff.targetStep.perspective_id];

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h3 className="font-bold text-lg text-purple-900">Perspective Handoff</h3>
        <p className="text-xs text-gray-500 mt-1">Data crossing a perspective boundary</p>
      </div>

      {/* Source → Target */}
      <div className="space-y-3">
        <PerspectiveStep
          perspectiveId={selectedHandoff.sourceStep.perspective_id}
          name={selectedHandoff.sourceStep.name}
          label="FROM"
        />

        <div className="flex items-center gap-2 pl-4">
          <div className="w-0.5 h-6 bg-purple-300" />
          <span className="text-xs text-purple-500 font-medium">Data flows across boundary</span>
        </div>

        <PerspectiveStep
          perspectiveId={selectedHandoff.targetStep.perspective_id}
          name={selectedHandoff.targetStep.name}
          label="TO"
        />
      </div>

      {/* Explanation */}
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-xs text-purple-700 leading-relaxed">
          This handoff transitions from{' '}
          <em>"{srcPerspective?.concern}"</em> to{' '}
          <em>"{tgtPerspective?.concern}"</em>.
          These boundaries are where data quality risks and manual effort tend to concentrate.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => {
            setLineageStepId(selectedHandoff.sourceStep.id);
            selectHandoff(null);
          }}
          className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Source Lineage
        </button>
        <button
          onClick={() => {
            setLineageStepId(selectedHandoff.targetStep.id);
            selectHandoff(null);
          }}
          className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Target Lineage
        </button>
      </div>
    </div>
  );
}

function PerspectiveStep({ perspectiveId, name, label }: {
  perspectiveId: string;
  name: string;
  label: string;
}) {
  const colorClass = perspectiveId === 'operational'
    ? 'bg-green-100 text-green-800'
    : perspectiveId === 'management'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-bold text-gray-400 mt-1.5 w-8">{label}</span>
      <div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colorClass}`}>
          {perspectiveLabels[perspectiveId]?.label || perspectiveId}
        </span>
        <div className="mt-1 text-sm font-medium text-gray-800">{name}</div>
      </div>
    </div>
  );
}
