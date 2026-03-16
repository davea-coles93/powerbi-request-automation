import { Snowflake, Clock, Server } from 'lucide-react';
import { formatDuration, getEffortColor, getEffortTextColor } from '../../../utils/formatters';
import type { ProcessStep } from '../../../types/ontology';

const PERSPECTIVE_COLORS: Record<string, string> = {
  operational: 'border-l-green-500',
  management: 'border-l-yellow-500',
  financial: 'border-l-blue-500',
};

interface ProcessStepMiniCardProps {
  step: ProcessStep;
  isCrystallising: boolean;
  systemNames?: Record<string, string>;
  onClick?: () => void;
}

export function ProcessStepMiniCard({
  step,
  isCrystallising,
  systemNames = {},
  onClick,
}: ProcessStepMiniCardProps) {
  const borderColor = PERSPECTIVE_COLORS[step.perspective_id] || PERSPECTIVE_COLORS.operational;
  const manualPct = step.manual_effort_percentage;
  const systems = step.systems_used_ids || [];
  const systemNamesList = systems.map((sId) => systemNames[sId] || sId);

  // Build tooltip: actor + systems detail
  const tooltipParts: string[] = [];
  if (step.actor) tooltipParts.push(`Actor: ${step.actor}`);
  if (systemNamesList.length > 0) tooltipParts.push(`Systems: ${systemNamesList.join(', ')}`);
  if (onClick) tooltipParts.push('Click to open in Process Canvas');
  const tooltip = tooltipParts.join('\n');

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={`
        rounded-md border-l-4 bg-white border border-gray-200
        ${borderColor}
        ${isCrystallising ? 'border-r-2 border-r-blue-400' : ''}
        ${onClick ? 'cursor-pointer hover:bg-gray-50 hover:shadow-sm transition-all' : ''}
      `}
    >
      <div className="px-2.5 py-2 space-y-1.5">
        {/* Header: name + duration + crystallise icon */}
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-semibold text-gray-900 leading-tight">
            {step.name}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {step.estimated_duration_minutes != null && step.estimated_duration_minutes > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(step.estimated_duration_minutes)}
              </span>
            )}
            {isCrystallising && (
              <Snowflake className="w-3.5 h-3.5 text-blue-500" />
            )}
          </div>
        </div>

        {/* Manual effort bar */}
        {manualPct != null && (
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-gray-500">Manual</span>
              <span className={`text-[10px] font-medium ${getEffortTextColor(manualPct)}`}>
                {manualPct}%
              </span>
            </div>
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getEffortColor(manualPct)}`}
                style={{ width: `${Math.min(100, manualPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Waste + Systems count row */}
        <div className="flex flex-wrap gap-1">
          {step.waste_category && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {step.waste_category}
            </span>
          )}
          {systems.length > 0 && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"
              title={systemNamesList.join(', ')}
            >
              <Server className="w-2.5 h-2.5" />
              {systems.length === 1 ? systemNamesList[0] : `${systems.length} systems`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
