import { useState, useEffect } from 'react';
import { X, Download, ChevronRight, ChevronLeft, Box, Database, Layers, BarChart3, Target, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates, useImportTemplate } from '../hooks/useOntology';
import { getTemplate } from '../services/api';
import type { TemplateInfo, TemplateDetail } from '../types/ontology';

interface Props {
  onClose: () => void;
  onImported?: () => void;
}

export function EntityPackLibrary({ onClose, onImported }: Props) {
  const { data: allTemplates, isLoading } = useTemplates();
  const importTemplate = useImportTemplate();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const templates = allTemplates?.filter(t => t.category === 'Entity Pack');

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
      toast.error('Failed to import entity pack');
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
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
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
                {previewId ? previewTemplate?.name : 'Entity Pack Library'}
              </h2>
              <p className="text-xs text-gray-500">
                {previewId
                  ? 'Review what will be imported'
                  : 'Pre-built entity definitions to add to your workspace'}
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
              <div className="w-6 h-6 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No entity packs available
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
    <div className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{template.name}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded">
              Entity Pack
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>

          {/* Counts row */}
          <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
            <span className="font-medium text-emerald-600">{template.entity_count} entities</span>
            <span className="text-gray-200">|</span>
            <span className="font-medium text-emerald-600">{template.attribute_count} attributes</span>
            <span className="text-gray-200">|</span>
            <span>{template.system_count} systems</span>
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
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
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

const PERSPECTIVE_COLORS: Record<string, { bg: string; text: string }> = {
  operational: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  management: { bg: 'bg-amber-50', text: 'text-amber-700' },
  financial: { bg: 'bg-blue-50', text: 'text-blue-700' },
};

function EntityCard({ entity }: { entity: TemplateDetail['entities'][0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <Box className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-sm font-medium text-gray-900 flex-1">{entity.name}</span>
        <span className="text-[10px] text-gray-400">{entity.core_attributes?.length || 0} attrs</span>
        <span className="text-[10px] text-gray-400">{entity.lenses?.length || 0} lenses</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 bg-gray-50/50">
          {entity.description && (
            <p className="text-xs text-gray-500 pt-2">{entity.description}</p>
          )}

          {/* Core attributes */}
          {entity.core_attributes && entity.core_attributes.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Core Attributes</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {entity.core_attributes.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[11px]">
                    <span className="text-gray-700">{a.name}</span>
                    <span className="text-gray-400 font-mono text-[9px]">{a.data_type}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Perspective lenses */}
          {entity.lenses && entity.lenses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Perspective Lenses</span>
              {entity.lenses.map((lens, i) => {
                const colors = PERSPECTIVE_COLORS[lens.perspective_id] || { bg: 'bg-gray-50', text: 'text-gray-600' };
                return (
                  <div key={i} className={`px-2.5 py-1.5 rounded-md ${colors.bg}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase ${colors.text}`}>{lens.perspective_id}</span>
                    </div>
                    <p className={`text-xs italic ${colors.text} opacity-80`}>"{lens.interpretation}"</p>
                    {lens.derived_attributes && lens.derived_attributes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lens.derived_attributes.map((da, j) => (
                          <span key={j} className="text-[10px] px-1 py-0.5 bg-white/60 rounded text-gray-600">{da.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTemplate(template.id).then(setDetail).finally(() => setLoading(false));
  }, [template.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return <div className="text-center py-8 text-gray-400 text-sm">Failed to load template details</div>;
  }

  const counts = [
    { icon: Box, label: 'Entities', count: template.entity_count, color: 'text-emerald-600' },
    { icon: Layers, label: 'Attributes', count: template.attribute_count, color: 'text-green-600' },
    { icon: Database, label: 'Systems', count: template.system_count, color: 'text-teal-600' },
    { icon: BarChart3, label: 'Measures', count: template.measure_count, color: 'text-amber-600' },
    { icon: Target, label: 'Metrics', count: template.metric_count, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="grid grid-cols-5 gap-2">
        {counts.map(({ icon: Icon, label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-lg">
            <Icon className={`w-3 h-3 ${color}`} />
            <div>
              <div className="text-sm font-semibold text-gray-900">{count}</div>
              <div className="text-[9px] text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Entities */}
      {detail.entities.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Entities ({detail.entities.length})
          </h4>
          <div className="space-y-1.5">
            {detail.entities.map((entity) => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      {detail.attributes.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Attributes ({detail.attributes.length})
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {detail.attributes.map((attr) => (
              <div key={attr.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-[11px]">
                <Layers className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span className="text-gray-700 truncate" title={attr.description}>{attr.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measures */}
      {detail.measures.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Measures ({detail.measures.length})
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {detail.measures.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-[11px]">
                <BarChart3 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="text-gray-700 truncate" title={m.description}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      {detail.metrics.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Metrics ({detail.metrics.length})
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {detail.metrics.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-[11px]">
                <Target className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="text-gray-700 truncate" title={m.description}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Systems */}
      {detail.systems.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Systems ({detail.systems.length})
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {detail.systems.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-[11px]">
                <Database className="w-3 h-3 text-teal-400 flex-shrink-0" />
                <span className="text-gray-700 truncate">{s.name}</span>
                <span className="text-[9px] text-gray-400 ml-auto">{s.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
        Existing data in your workspace will be preserved. Only new items will be added — duplicates are skipped.
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {importing ? 'Importing...' : `Import ${template.name}`}
      </button>
    </div>
  );
}
