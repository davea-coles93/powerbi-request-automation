import { X } from 'lucide-react';

interface ProcessStepDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepData: {
    step: {
      id: string;
      label: string;
      description?: string;
      sequence: number;
      perspective_id: string;
      actor?: string;
    };
    consumesObservations: Array<{ id: string; name: string; description?: string }>;
    producesObservations: Array<{ id: string; name: string; description?: string }>;
    usesMetrics: Array<{ id: string; name: string; description?: string }>;
    crystallizes: Array<{ id: string; name: string; description?: string }>;
  } | null;
}

export function ProcessStepDataModal({ isOpen, onClose, stepData }: ProcessStepDataModalProps) {
  if (!isOpen || !stepData) return null;

  const renderSection = (title: string, items: Array<{ id: string; name: string; description?: string }>) => {
    if (items.length === 0) {
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          <p className="text-sm text-gray-500 italic">None</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-gray-900 pl-4 border-l-2 border-gray-300 py-1">
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-600 mt-0.5">{item.description}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Systems & Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {stepData.step.sequence}: {stepData.step.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step Information */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Perspective:</span>
                <span className="ml-2 text-gray-900">{stepData.step.perspective_id}</span>
              </div>
              {stepData.step.actor && (
                <div>
                  <span className="font-medium text-gray-700">Actor:</span>
                  <span className="ml-2 text-gray-900">{stepData.step.actor}</span>
                </div>
              )}
            </div>
            {stepData.step.description && (
              <p className="text-sm text-gray-600 mt-3">{stepData.step.description}</p>
            )}
          </div>

          {/* Data Sections */}
          <div className="space-y-6">
            {renderSection('Consumes Observations', stepData.consumesObservations)}
            {renderSection('Produces Observations', stepData.producesObservations)}
            {renderSection('Uses Metrics', stepData.usesMetrics)}
            {renderSection('Crystallizes', stepData.crystallizes)}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
