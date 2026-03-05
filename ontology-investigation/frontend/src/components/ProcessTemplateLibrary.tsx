import { useState } from 'react';
import { X, Download, ChevronRight, ChevronLeft, Database, Layers, Box, BarChart3, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates, useImportTemplate } from '../hooks/useOntology';
import type { TemplateInfo } from '../types/ontology';

interface Props {
  onClose: () => void;
  onImported?: (processId?: string) => void;
}

export function ProcessTemplateLibrary({ onClose, onImported }: Props) {
  const { data: templates, isLoading } = useTemplates();
  const importTemplate = useImportTemplate();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleImport = async (template: TemplateInfo) => {
    try {
      const result = await importTemplate.mutateAsync(template.id);
      const createdSummary = Object.entries(result.created)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      toast.success(`Imported ${template.name}: ${createdSummary}`);
      onImported?.();
      onClose();
    } catch (error) {
      toast.error('Failed to import template');
    }
  };

  const previewTemplate = templates?.find(t => t.id === previewId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            {previewId && (
              <button
                onClick={() => setPreviewId(null)}
                className="p-1 hover:bg-white/60 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {previewId ? previewTemplate?.name : 'Process Template Library'}
              </h2>
              <p className="text-xs text-gray-500">
                {previewId
                  ? 'Review what will be imported'
                  : 'Pre-built processes to add to your workspace'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/60 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No templates available
            </div>
          ) : previewId && previewTemplate ? (
            <PreviewView template={previewTemplate} onImport={() => handleImport(previewTemplate)} importing={importTemplate.isPending} />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={() => setPreviewId(template.id)}
                  onImport={() => handleImport(template)}
                  importing={importTemplate.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onPreview,
  onImport,
  importing,
}: {
  template: TemplateInfo;
  onPreview: () => void;
  onImport: () => void;
  importing: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{template.name}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              {template.category}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>

          {/* Counts row */}
          <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
            <span>{template.step_count} steps</span>
            <span className="text-gray-200">|</span>
            <span>{template.system_count} systems</span>
            <span className="text-gray-200">|</span>
            <span>{template.entity_count} entities</span>
            <span className="text-gray-200">|</span>
            <span>{template.attribute_count} attributes</span>
            <span className="text-gray-200">|</span>
            <span>{template.measure_count} measures</span>
            <span className="text-gray-200">|</span>
            <span>{template.metric_count} metrics</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPreview}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Preview <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={onImport}
              disabled={importing}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewView({
  template,
  onImport,
  importing,
}: {
  template: TemplateInfo;
  onImport: () => void;
  importing: boolean;
}) {
  const counts = [
    { icon: Layers, label: 'Process Steps', count: template.step_count, color: 'text-purple-600' },
    { icon: Database, label: 'Systems', count: template.system_count, color: 'text-pink-600' },
    { icon: Box, label: 'Entities', count: template.entity_count, color: 'text-blue-600' },
    { icon: Layers, label: 'Attributes', count: template.attribute_count, color: 'text-indigo-600' },
    { icon: BarChart3, label: 'Measures', count: template.measure_count, color: 'text-amber-600' },
    { icon: Target, label: 'Metrics', count: template.metric_count, color: 'text-emerald-600' },
  ];

  return (
    <div>
      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{template.description}</p>

      {/* What will be imported */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        What will be imported
      </h4>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {counts.map(({ icon: Icon, label, count, color }) => (
          <div key={label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <div>
              <div className="text-sm font-semibold text-gray-900">{count}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-4">
        Existing data in your workspace will be preserved. Only new items will be added — duplicates are skipped.
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {importing ? 'Importing...' : `Import ${template.name}`}
      </button>
    </div>
  );
}
