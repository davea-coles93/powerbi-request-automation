import { useState } from 'react';

interface ProcessCreationModalProps {
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => void;
  isSaving?: boolean;
}

export function ProcessCreationModal({ onClose, onSave, isSaving }: ProcessCreationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSubmit = () => {
    // Validate
    if (!name.trim()) {
      setNameError('Process name is required');
      return;
    }
    setNameError('');
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Process</h2>
              <p className="text-purple-100 text-sm mt-1">
                Define a new business process to map
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-2xl"
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Process Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 ${
                nameError ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., Month-End Close, Order-to-Cash"
              autoFocus
            />
            {nameError && (
              <p className="text-red-500 text-xs mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="What does this process accomplish? What business objective does it serve?"
            />
          </div>

          <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm text-blue-800">
            <p>
              After creating the process, you can add steps using the Process Map
              Editor. Steps can span multiple perspectives (Operational,
              Management, Financial) and be connected to show dependencies.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 rounded font-semibold hover:bg-gray-300"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? 'Creating...' : 'Create Process'}
          </button>
        </div>
      </div>
    </div>
  );
}
