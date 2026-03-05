import { useState } from 'react';
import { X, Upload, Database, Loader2, ChevronRight, Info, ChevronDown, Check, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAvailableModels, usePreviewTmdlMerge, useMergeTmdlModel } from '../hooks/useOntology';
import type { AvailableModel, TmdlMergePreview, ConflictStrategy } from '../types/ontology';

interface TmdlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TmdlImportModal({ isOpen, onClose }: TmdlImportModalProps) {
  const [selectedModel, setSelectedModel] = useState<AvailableModel | null>(null);
  const [preview, setPreview] = useState<TmdlMergePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [showConflicts, setShowConflicts] = useState(false);

  const { data: availableModels, isLoading: modelsLoading } = useAvailableModels();
  const previewMutation = usePreviewTmdlMerge();
  const mergeMutation = useMergeTmdlModel();

  const handleSelectModel = async (model: AvailableModel) => {
    setSelectedModel(model);
    setCustomName(model.name);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setShowConflicts(false);

    try {
      const result = await previewMutation.mutateAsync({
        modelPath: model.path,
        modelName: model.name,
      });
      setPreview(result);
    } catch (err: any) {
      setPreviewError(err?.response?.data?.detail || 'Failed to preview model');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedModel) return;

    try {
      const result = await mergeMutation.mutateAsync({
        modelPath: selectedModel.path,
        modelName: customName || selectedModel.name,
        conflictStrategy,
      });
      toast.success(result.message);
      handleClose();
    } catch (err: any) {
      setPreviewError(err?.response?.data?.detail || 'Failed to merge model');
    }
  };

  const handleClose = () => {
    setSelectedModel(null);
    setPreview(null);
    setPreviewError(null);
    setCustomName('');
    setConflictStrategy('skip');
    setShowConflicts(false);
    onClose();
  };

  if (!isOpen) return null;

  const totalNew = preview
    ? preview.new_entities + preview.new_attributes + preview.new_measures + preview.new_metrics
    : 0;
  const totalConflicts = preview
    ? preview.conflicting_entities + preview.conflicting_attributes + preview.conflicting_measures + preview.conflicting_metrics
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Import from Power BI
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Merge a TMDL semantic model into your existing ontology
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Merge info banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Import will <strong>merge</strong> into your existing ontology. Processes and
              manually-created data are preserved.
            </p>
          </div>

          {/* Available Models List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Models</h3>
            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-gray-500">Scanning for models...</span>
              </div>
            ) : !availableModels || availableModels.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No TMDL models found in project directories.</p>
                <p className="text-xs mt-1">
                  Place .SemanticModel folders in sample-data/ or models/ directories.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableModels.map((model) => (
                  <button
                    key={model.path}
                    onClick={() => handleSelectModel(model)}
                    disabled={previewLoading || mergeMutation.isPending}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedModel?.path === model.path
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${(previewLoading || mergeMutation.isPending) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className={`w-5 h-5 ${
                          selectedModel?.path === model.path ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <span className="font-medium text-gray-900">{model.name}</span>
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
                            {model.definition_path}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${
                        selectedModel?.path === model.path ? 'text-blue-500' : 'text-gray-300'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Section */}
          {selectedModel && (
            <div className="border-t pt-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-gray-500">Analyzing merge...</span>
                </div>
              ) : previewError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{previewError}</p>
                </div>
              ) : preview ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Merge Preview</h3>

                  {/* Custom name input */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a name for this import"
                    />
                  </div>

                  {/* Two-column merge summary */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* New items */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Plus className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                          New Items ({totalNew})
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <MergeRow label="Entities" count={preview.new_entities} color="green" />
                        <MergeRow label="Attributes" count={preview.new_attributes} color="green" />
                        <MergeRow label="Measures" count={preview.new_measures} color="green" />
                        <MergeRow label="Metrics" count={preview.new_metrics} color="green" />
                      </div>
                    </div>

                    {/* Conflicts */}
                    <div className={`border rounded-lg p-3 ${
                      totalConflicts > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${totalConflicts > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          totalConflicts > 0 ? 'text-amber-700' : 'text-gray-500'
                        }`}>
                          Already Exist ({totalConflicts})
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <MergeRow label="Entities" count={preview.conflicting_entities} color="amber" />
                        <MergeRow label="Attributes" count={preview.conflicting_attributes} color="amber" />
                        <MergeRow label="Measures" count={preview.conflicting_measures} color="amber" />
                        <MergeRow label="Metrics" count={preview.conflicting_metrics} color="amber" />
                      </div>
                    </div>
                  </div>

                  {/* Conflict details (collapsible) */}
                  {totalConflicts > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowConflicts(!showConflicts)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                      >
                        {showConflicts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {preview.conflicts.length} conflict{preview.conflicts.length !== 1 ? 's' : ''} found
                      </button>
                      {showConflicts && (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                          {preview.conflicts.map((c) => (
                            <div key={`${c.entity_type}-${c.id}`} className="text-xs px-2 py-1 bg-amber-50 rounded flex items-center gap-1">
                              <span className="font-medium text-amber-700 capitalize">{c.entity_type}:</span>
                              <span className="text-amber-800">"{c.name}"</span>
                              <span className="text-amber-600">already exists as "{c.existing_name}"</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Conflict strategy picker */}
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2">
                          When an imported item matches an existing item:
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-start gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="strategy"
                              value="skip"
                              checked={conflictStrategy === 'skip'}
                              onChange={() => setConflictStrategy('skip')}
                              className="mt-0.5"
                            />
                            <span>
                              <strong>Skip</strong>
                              <span className="text-gray-500"> — keep existing data, ignore imported version</span>
                              <span className="ml-1 text-xs text-green-600">(Recommended)</span>
                            </span>
                          </label>
                          <label className="flex items-start gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="strategy"
                              value="update"
                              checked={conflictStrategy === 'update'}
                              onChange={() => setConflictStrategy('update')}
                              className="mt-0.5"
                            />
                            <span>
                              <strong>Update</strong>
                              <span className="text-gray-500"> — overwrite existing with imported version</span>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tables list */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Tables ({preview.tables.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.tables.map((table) => (
                        <span
                          key={table}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sample measures */}
                  {preview.sample_measures.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">
                        Sample Measures ({preview.total_measures} total)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.sample_measures.map((measure) => (
                          <span
                            key={measure}
                            className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md"
                          >
                            {measure}
                          </span>
                        ))}
                        {preview.total_measures > preview.sample_measures.length && (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                            +{preview.total_measures - preview.sample_measures.length} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics info */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>{preview.total_metrics}</strong> business metrics will be auto-generated from terminal measures.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={mergeMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!preview || mergeMutation.isPending || previewLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Merge into Ontology
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MergeRow({ label, count, color }: { label: string; count: number; color: 'green' | 'amber' }) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-between text-gray-400">
        <span>{label}</span>
        <span>0</span>
      </div>
    );
  }
  const textColor = color === 'green' ? 'text-green-700' : 'text-amber-700';
  return (
    <div className={`flex items-center justify-between ${textColor}`}>
      <span>{label}</span>
      <span className="font-semibold">{count}</span>
    </div>
  );
}
