import { useState } from 'react';
import { useObservations, useSystems } from '../hooks/useOntology';

interface ProcessStepEditModalProps {
  step: StepFormData;
  onSave: (step: StepFormData) => void;
  onCancel: () => void;
}

export interface StepFormData {
  id: string;
  name: string;
  actor?: string;
  sequence: number;
  perspective_id: string;
  estimated_duration_minutes?: number;
  automation_potential?: 'High' | 'Medium' | 'Low' | 'None';
  waste_category?: string;
  manual_effort_percentage?: number;
  produces_observation_ids?: string[];
  consumes_observation_ids?: string[];
  uses_metric_ids?: string[];
  systems_used_ids?: string[];
  description?: string;
}

export function ProcessStepEditModal({ step: initialStep, onSave, onCancel }: ProcessStepEditModalProps) {
  const [step, setStep] = useState<StepFormData>(initialStep);
  const [activeTab, setActiveTab] = useState<'basic' | 'metadata' | 'links'>('basic');
  const [showCreateObservation, setShowCreateObservation] = useState(false);
  const [showCreateSystem, setShowCreateSystem] = useState(false);

  const { data: observations = [] } = useObservations();
  const { data: systems = [] } = useSystems();

  const wasteCategories = [
    'Manual Data Entry',
    'Manual Export',
    'Physical Media',
    'System Switching',
    'Manual Verification',
    'Manual Tracking',
    'Waiting Time',
    'System Navigation',
    'Manual Authentication',
    'Manual Decision Making',
    'Manual Formatting',
  ];

  const handleSave = () => {
    onSave(step);
  };

  const toggleArrayItem = (field: keyof StepFormData, itemId: string) => {
    const currentArray = (step[field] as string[]) || [];
    const newArray = currentArray.includes(itemId)
      ? currentArray.filter(id => id !== itemId)
      : [...currentArray, itemId];

    setStep({ ...step, [field]: newArray });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Edit Process Step</h2>
              <p className="text-purple-100 text-sm mt-1">{step.name}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-purple-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'basic'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📝 Basic Info
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'metadata'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Metadata
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'links'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🔗 Links & Data
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Step Name *</label>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => setStep({ ...step, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Export to Excel"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Actor / Role</label>
                <input
                  type="text"
                  value={step.actor || ''}
                  onChange={(e) => setStep({ ...step, actor: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Production Supervisor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Sequence *</label>
                  <input
                    type="number"
                    value={step.sequence}
                    onChange={(e) => setStep({ ...step, sequence: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Perspective</label>
                  <select
                    value={step.perspective_id}
                    onChange={(e) => setStep({ ...step, perspective_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="operational">Operational</option>
                    <option value="management">Management</option>
                    <option value="financial">Financial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea
                  value={step.description || ''}
                  onChange={(e) => setStep({ ...step, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="What happens in this step?"
                />
              </div>
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">⏱️ Duration (minutes)</label>
                  <input
                    type="number"
                    value={step.estimated_duration_minutes || ''}
                    onChange={(e) => setStep({ ...step, estimated_duration_minutes: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="5"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long does this typically take?</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">✋ Manual Effort (%)</label>
                  <input
                    type="number"
                    value={step.manual_effort_percentage || ''}
                    onChange={(e) => setStep({ ...step, manual_effort_percentage: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="100"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">% of work done manually vs automated</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">🤖 Automation Potential</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['High', 'Medium', 'Low', 'None'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setStep({ ...step, automation_potential: level })}
                      className={`px-4 py-2 rounded font-semibold ${
                        step.automation_potential === level
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {step.automation_potential === 'High' && '🔴 High priority for automation - significant ROI potential'}
                  {step.automation_potential === 'Medium' && '🟠 Moderate automation opportunity'}
                  {step.automation_potential === 'Low' && '🟡 Limited automation benefit'}
                  {step.automation_potential === 'None' && '🟢 Good as is - no automation needed'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">🗑️ Waste Category</label>
                <select
                  value={step.waste_category || ''}
                  onChange={(e) => setStep({ ...step, waste_category: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None - No waste identified</option>
                  {wasteCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Type of waste present in this step</p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Automation Insights</h3>
                <p className="text-sm text-blue-800">
                  {step.manual_effort_percentage && step.manual_effort_percentage > 80
                    ? '⚠️ High manual effort - consider automation to reduce repetitive work'
                    : step.manual_effort_percentage && step.manual_effort_percentage > 50
                    ? '⚡ Moderate manual work - some automation opportunities exist'
                    : '✅ Low manual effort - current process is efficient'}
                </p>
              </div>
            </div>
          )}

          {/* Links Tab */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Observations Produced */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">📤 Produces Observations</label>
                  <button
                    onClick={() => setShowCreateObservation(true)}
                    className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ➕ Create New
                  </button>
                </div>
                <div className="border rounded p-3 max-h-40 overflow-y-auto">
                  {observations.length === 0 ? (
                    <p className="text-sm text-gray-500">No observations available</p>
                  ) : (
                    <div className="space-y-1">
                      {observations.map((obs) => (
                        <label key={obs.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={step.produces_observation_ids?.includes(obs.id) || false}
                            onChange={() => toggleArrayItem('produces_observation_ids', obs.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{obs.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Observations Consumed */}
              <div>
                <label className="block text-sm font-semibold mb-2">📥 Consumes Observations</label>
                <div className="border rounded p-3 max-h-40 overflow-y-auto">
                  {observations.length === 0 ? (
                    <p className="text-sm text-gray-500">No observations available</p>
                  ) : (
                    <div className="space-y-1">
                      {observations.map((obs) => (
                        <label key={obs.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={step.consumes_observation_ids?.includes(obs.id) || false}
                            onChange={() => toggleArrayItem('consumes_observation_ids', obs.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{obs.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Systems Used */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">💻 Systems Used</label>
                  <button
                    onClick={() => setShowCreateSystem(true)}
                    className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ➕ Create New
                  </button>
                </div>
                <div className="border rounded p-3 max-h-40 overflow-y-auto">
                  {systems.length === 0 ? (
                    <p className="text-sm text-gray-500">No systems available</p>
                  ) : (
                    <div className="space-y-1">
                      {systems.map((system) => (
                        <label key={system.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={step.systems_used_ids?.includes(system.id) || false}
                            onChange={() => toggleArrayItem('systems_used_ids', system.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{system.name}</span>
                          <span className="text-xs text-gray-500">({system.type})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 rounded font-semibold hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700"
          >
            💾 Save Changes
          </button>
        </div>
      </div>

      {/* Create Observation Modal - Placeholder */}
      {showCreateObservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Create New Observation</h3>
            <p className="text-gray-600 mb-4">
              Full observation creation form coming soon!
            </p>
            <button
              onClick={() => setShowCreateObservation(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create System Modal - Placeholder */}
      {showCreateSystem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Create New System</h3>
            <p className="text-gray-600 mb-4">
              Full system creation form coming soon!
            </p>
            <button
              onClick={() => setShowCreateSystem(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
