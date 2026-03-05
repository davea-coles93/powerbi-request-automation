import { AlertTriangle, CheckCircle, XCircle, Calculator, Eye, ArrowRight, Download, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useFindGaps } from '../hooks/useOntology';

interface AIGapSuggestion {
  type: 'missing_measure' | 'broken_flow' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  attribute_or_measure: string;
  suggested_action: string;
}

function mapGapsToSuggestions(gapData: any): AIGapSuggestion[] {
  if (!gapData?.gaps) return [];
  return gapData.gaps.map((gap: any) => {
    const typeMap: Record<string, AIGapSuggestion['type']> = {
      metric_without_measures: 'missing_measure',
      measure_without_inputs: 'broken_flow',
      unused_attribute: 'optimization',
    };
    const actionMap: Record<string, string> = {
      metric_without_measures: 'Define measures that calculate this metric',
      measure_without_inputs: 'Link attributes or other measures as inputs',
      unused_attribute: 'Create a measure that uses this attribute, or remove if unneeded',
    };
    return {
      type: typeMap[gap.type] || 'optimization',
      priority: gap.type === 'metric_without_measures' ? 'high' : gap.type === 'measure_without_inputs' ? 'high' : 'medium',
      description: gap.issue,
      attribute_or_measure: gap.element,
      suggested_action: actionMap[gap.type] || 'Review and address this gap',
    };
  });
}

interface GapAnalysisProps {
  mappingStatus: {
    total_tables?: number;
    mapped_tables?: number;
    unmapped_tables?: number;
    total_columns?: number;
    mapped_columns?: number;
    total_measures?: number;
    mapped_measures?: number;
    orphaned_tables?: string[];
    missing_columns?: any[];
    total_attributes?: number;
    attributes_used_by_measures?: number;
    orphaned_attributes: string[];
    total_business_measures?: number;
    implemented_measures?: number;
    unimplemented_measures?: string[];
    attributes_with_complete_flow?: number;
    attributes_with_broken_flow?: string[];
    measures_without_attributes?: string[];
    semantic_tables_with_measures?: number;
    semantic_tables_without_measures?: string[];
    orphaned_measures: string[];
    unmapped_columns: any[];
  };
}

// ── Collapsible section ───────────────────────────────────────────
function GapSection({
  id,
  title,
  subtitle,
  count,
  icon,
  color,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  icon: ReactNode;
  color: 'red' | 'amber' | 'yellow' | 'orange' | 'purple';
  expanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  if (count === 0) return null;

  const colors = {
    red: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-700' },
  }[color];

  return (
    <div className={`border rounded-lg overflow-hidden ${colors.border}`}>
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${expanded ? colors.bg : 'bg-white'}`}
      >
        <span className={colors.text}>{icon}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{title}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {count}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className={`px-4 pb-3 ${colors.bg}`}>
          <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

// ── Gap item row ──────────────────────────────────────────────────
function GapRow({
  name,
  actionLabel,
  onAction,
  color,
}: {
  name: string;
  actionLabel: string;
  onAction: () => void;
  color: 'red' | 'amber' | 'yellow' | 'orange' | 'purple';
}) {
  const actionColors = {
    red: 'text-red-600 hover:text-red-800',
    amber: 'text-amber-600 hover:text-amber-800',
    yellow: 'text-yellow-600 hover:text-yellow-800',
    orange: 'text-orange-600 hover:text-orange-800',
    purple: 'text-purple-600 hover:text-purple-800',
  }[color];

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-white text-xs border border-gray-100">
      <span className="font-mono text-gray-700 truncate flex-1 mr-2">{name}</span>
      <button
        onClick={onAction}
        className={`font-medium whitespace-nowrap ${actionColors}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export function GapAnalysisDashboard({ mappingStatus }: GapAnalysisProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGapSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const findGaps = useFindGaps();

  useEffect(() => {
    setAiLoading(true);
    findGaps.mutateAsync(undefined)
      .then(data => setAiSuggestions(mapGapsToSuggestions(data)))
      .catch(() => {})
      .finally(() => setAiLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed metrics ──────────────────────────────────────────
  const totalAttributes = mappingStatus.total_attributes || 0;
  const attributesUsed = mappingStatus.attributes_used_by_measures || 0;
  const attributesWithCompleteFlow = mappingStatus.attributes_with_complete_flow || 0;

  const attributeUsagePercent = totalAttributes > 0
    ? Math.round((attributesUsed / totalAttributes) * 100) : 0;
  const completeFlowPercent = totalAttributes > 0
    ? Math.round((attributesWithCompleteFlow / totalAttributes) * 100) : 0;

  const totalBusinessMeasures = mappingStatus.total_business_measures || 0;
  const implementedMeasures = mappingStatus.implemented_measures || 0;
  const measureImplementationPercent = totalBusinessMeasures > 0
    ? Math.round((implementedMeasures / totalBusinessMeasures) * 100) : 0;

  const overallHealth = Math.round(
    completeFlowPercent * 0.5 + measureImplementationPercent * 0.3 + attributeUsagePercent * 0.2
  );

  // ── Gap counts ────────────────────────────────────────────────
  const brokenFlow = mappingStatus.attributes_with_broken_flow || [];
  const unimplemented = mappingStatus.unimplemented_measures || [];
  const orphaned = mappingStatus.orphaned_attributes;
  const noInputs = mappingStatus.measures_without_attributes || [];

  const totalGaps = brokenFlow.length + unimplemented.length + orphaned.length + noInputs.length;
  const hasGaps = totalGaps > 0;

  // Auto-expand the first category that has items
  const categories = useMemo(() => [
    { id: 'broken', count: brokenFlow.length },
    { id: 'unimplemented', count: unimplemented.length },
    { id: 'orphaned', count: orphaned.length },
    { id: 'no-inputs', count: noInputs.length },
    { id: 'ai', count: aiSuggestions.length },
  ], [brokenFlow.length, unimplemented.length, orphaned.length, noInputs.length, aiSuggestions.length]);

  useEffect(() => {
    const first = categories.find(c => c.count > 0);
    if (first) setExpanded(new Set([first.id]));
  }, [categories]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Handlers ──────────────────────────────────────────────────
  const copyAndToast = (name: string, nextStep: string) => {
    navigator.clipboard.writeText(name);
    toast.success(`"${name}" copied`, { duration: 3000 });
    toast(nextStep, { duration: 5000, icon: '\u{1F4A1}' });
  };

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const report = {
        timestamp: new Date().toISOString(),
        overall_health: overallHealth,
        summary: {
          total_attributes: totalAttributes,
          attributes_used: attributesUsed,
          attributes_with_complete_flow: attributesWithCompleteFlow,
          total_business_measures: totalBusinessMeasures,
          implemented_measures: implementedMeasures,
          measure_implementation_percent: measureImplementationPercent,
          complete_flow_percent: completeFlowPercent,
        },
        gaps: {
          attributes_with_broken_flow: brokenFlow,
          unimplemented_measures: unimplemented,
          orphaned_attributes: orphaned,
          measures_without_attributes: noInputs,
        },
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gap-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Health bar color ──────────────────────────────────────────
  const healthColor = overallHealth >= 80 ? 'bg-emerald-500' : overallHealth >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const healthLabel = overallHealth >= 80 ? 'Healthy' : overallHealth >= 50 ? 'Needs work' : 'Critical';

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      {/* ─── Header strip ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          {/* Health score */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{overallHealth}%</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-gray-500">Data Flow Health</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  overallHealth >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  overallHealth >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>{healthLabel}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
                <div className={`h-full rounded-full transition-all ${healthColor}`} style={{ width: `${overallHealth}%` }} />
              </div>
            </div>
          </div>

          {/* Pipeline summary */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
            <span className="font-semibold text-gray-700">{totalAttributes}</span>
            <span>attrs</span>
            <ArrowRight className="w-3 h-3 text-gray-300" />
            <span className="font-semibold text-gray-700">{totalBusinessMeasures}</span>
            <span>measures</span>
            <ArrowRight className="w-3 h-3 text-gray-300" />
            <span className="font-semibold text-gray-700">{implementedMeasures}</span>
            <span>DAX</span>
          </div>

          {/* Gap count + actions */}
          <div className="flex items-center gap-2 ml-4">
            {hasGaps && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {totalGaps} gap{totalGaps !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleExportReport}
              disabled={isExporting}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Export gap report"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gap categories ───────────────────────────────────── */}
      {!hasGaps && !aiLoading && aiSuggestions.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-800">Complete data flow</p>
          <p className="text-xs text-emerald-600 mt-1">
            All {totalAttributes} attributes flow through to the semantic model
          </p>
        </div>
      )}

      <div className="space-y-2">
        {/* Broken Flow */}
        <GapSection
          id="broken"
          title="Broken Flow"
          subtitle="Attributes used by measures but no DAX implementation reaches the semantic model"
          count={brokenFlow.length}
          icon={<XCircle className="w-4 h-4" />}
          color="red"
          expanded={expanded.has('broken')}
          onToggle={toggle}
        >
          {brokenFlow.map(name => (
            <GapRow
              key={name}
              name={name}
              actionLabel="Create Measure →"
              onAction={() => copyAndToast(name, 'Create a measure using this attribute, then implement it as DAX')}
              color="red"
            />
          ))}
        </GapSection>

        {/* Unimplemented Measures */}
        <GapSection
          id="unimplemented"
          title="Missing DAX"
          subtitle="Business measures defined in the ontology but not yet implemented as DAX"
          count={unimplemented.length}
          icon={<Calculator className="w-4 h-4" />}
          color="amber"
          expanded={expanded.has('unimplemented')}
          onToggle={toggle}
        >
          {unimplemented.map(name => (
            <GapRow
              key={name}
              name={name}
              actionLabel="Implement →"
              onAction={() => copyAndToast(name, 'Add DAX implementation for this measure in the semantic model')}
              color="amber"
            />
          ))}
        </GapSection>

        {/* Orphaned Attributes */}
        <GapSection
          id="orphaned"
          title="Orphaned Attributes"
          subtitle="Attributes not consumed by any measure — unused data"
          count={orphaned.length}
          icon={<Eye className="w-4 h-4" />}
          color="yellow"
          expanded={expanded.has('orphaned')}
          onToggle={toggle}
        >
          {orphaned.map(name => (
            <GapRow
              key={name}
              name={name}
              actionLabel="Link →"
              onAction={() => copyAndToast(name, 'Create or find a measure and add this attribute as an input')}
              color="yellow"
            />
          ))}
        </GapSection>

        {/* Measures Without Inputs */}
        <GapSection
          id="no-inputs"
          title="No Inputs"
          subtitle="Measures defined without any input attributes or dependent measures"
          count={noInputs.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="orange"
          expanded={expanded.has('no-inputs')}
          onToggle={toggle}
        >
          {noInputs.map(name => (
            <GapRow
              key={name}
              name={name}
              actionLabel="Add Inputs →"
              onAction={() => copyAndToast(name, 'Edit this measure and link attribute inputs')}
              color="orange"
            />
          ))}
        </GapSection>

        {/* AI Suggestions */}
        {aiLoading && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-purple-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing ontology for gaps...</span>
          </div>
        )}
        {!aiLoading && aiSuggestions.length > 0 && (
          <GapSection
            id="ai"
            title="AI Suggestions"
            subtitle="Automatically detected structural gaps in the ontology"
            count={aiSuggestions.length}
            icon={<Sparkles className="w-4 h-4" />}
            color="purple"
            expanded={expanded.has('ai')}
            onToggle={toggle}
          >
            {aiSuggestions.map((s, i) => (
              <div key={i} className="py-1.5 px-2 rounded bg-white text-xs border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    s.priority === 'high' ? 'bg-red-100 text-red-700' :
                    s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {s.priority.toUpperCase()}
                  </span>
                  <span className="text-gray-700 font-medium truncate">{s.description}</span>
                </div>
                <p className="text-gray-500 mt-0.5 ml-0.5">{s.suggested_action}</p>
              </div>
            ))}
          </GapSection>
        )}
      </div>
    </div>
  );
}
