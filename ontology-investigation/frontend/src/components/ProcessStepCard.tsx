import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ProcessStepCardProps {
  step: {
    id: string;
    name: string;
    sequence: number;
    perspective_id: string;
    actor?: string;
    crystallizes_observation_ids?: string[];
  };
  hasMappedObservations?: boolean;
  onClick?: () => void;
}

export function ProcessStepCard({ step, hasMappedObservations, onClick }: ProcessStepCardProps) {
  const perspectiveColors = {
    operational: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' },
    management: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-700' },
    financial: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
  };

  const colors = perspectiveColors[step.perspective_id as keyof typeof perspectiveColors] || {
    bg: 'bg-gray-50',
    border: 'border-gray-500',
    text: 'text-gray-700',
  };

  const hasCrystallization = (step.crystallizes_observation_ids?.length || 0) > 0;

  // Determine mapping status
  let MappingIcon = AlertCircle;
  let mappingColor = 'text-yellow-500';
  let mappingTooltip = 'Partial mapping';

  if (hasMappedObservations === true) {
    MappingIcon = CheckCircle;
    mappingColor = 'text-green-500';
    mappingTooltip = 'Fully mapped to semantic model';
  } else if (hasMappedObservations === false) {
    MappingIcon = XCircle;
    mappingColor = 'text-red-500';
    mappingTooltip = 'Not mapped to semantic model';
  }

  return (
    <div
      className={`${colors.bg} border-2 ${colors.border} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">
              Step {step.sequence}
            </span>
            {hasCrystallization && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Crystallization
              </span>
            )}
          </div>
          <h4 className={`font-semibold ${colors.text} mt-1`}>{step.name}</h4>
          {step.actor && (
            <p className="text-xs text-gray-600 mt-1">Actor: {step.actor}</p>
          )}
          {hasCrystallization && (
            <p className="text-xs text-purple-600 mt-1">
              {step.crystallizes_observation_ids?.length} observation{step.crystallizes_observation_ids?.length !== 1 ? 's' : ''} freeze here
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
            {step.perspective_id}
          </span>
          <div className="flex items-center gap-1" title={mappingTooltip}>
            <MappingIcon className={`w-4 h-4 ${mappingColor}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
