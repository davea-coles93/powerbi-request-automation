import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { System, SystemType, ReliabilityLevel, IntegrationStatus } from '../types/ontology';

interface SystemEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: System | null;
  onSave: (systemData: System) => void;
}

const systemTypes: SystemType[] = ['ERP', 'MES', 'WMS', 'Spreadsheet', 'Manual', 'BI', 'Other'];
const reliabilityLevels: ReliabilityLevel[] = ['High', 'Medium', 'Low'];
const integrationStatuses: IntegrationStatus[] = ['Connected', 'Planned', 'Manual Extract', 'None'];

export function SystemEditorModal({ isOpen, onClose, system, onSave }: SystemEditorModalProps) {
  const [formData, setFormData] = useState<System>({
    id: '',
    name: '',
    type: 'ERP',
    vendor: '',
    reliability_default: 'Medium',
    integration_status: 'None',
    notes: '',
  });

  useEffect(() => {
    if (system) {
      setFormData(system);
    } else {
      setFormData({
        id: '',
        name: '',
        type: 'ERP',
        vendor: '',
        reliability_default: 'Medium',
        integration_status: 'None',
        notes: '',
      });
    }
  }, [system, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate ID from name if creating new
    const systemData = {
      ...formData,
      id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '_'),
    };

    onSave(systemData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {system ? 'Edit System' : 'New System'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ERP System"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System ID
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="Auto-generated from name if left blank"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to auto-generate from name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SystemType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {systemTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <input
                type="text"
                value={formData.vendor || ''}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SAP, Microsoft, Oracle"
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Reliability
              </label>
              <select
                value={formData.reliability_default || 'Medium'}
                onChange={(e) => setFormData({ ...formData, reliability_default: e.target.value as ReliabilityLevel })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reliabilityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Default reliability level for observations from this system
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Integration Status
              </label>
              <select
                value={formData.integration_status || 'None'}
                onChange={(e) => setFormData({ ...formData, integration_status: e.target.value as IntegrationStatus })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {integrationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this system..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {system ? 'Update System' : 'Create System'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
