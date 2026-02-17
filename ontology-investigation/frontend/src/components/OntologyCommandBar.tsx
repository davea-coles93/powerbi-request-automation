import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, X, Loader2, ChevronRight } from 'lucide-react';
import { useExplainMetric, useFindGaps, useSuggestMeasures } from '../hooks/useOntology';
import { analyzeImpact, getStepFullLineage, getMeasureUsage } from '../services/api';

interface Metric {
  id: string;
  name: string;
}

interface OntologyCommandBarProps {
  metrics: Metric[];
  attributes?: Array<{ id: string; name: string }>;
  measures?: Array<{ id: string; name: string }>;
  processSteps?: Array<{ id: string; name: string }>;
}

type QueryType = 'explain' | 'gaps' | 'suggest' | 'impact' | 'lineage' | 'usage';

interface ClassifyResult {
  type: QueryType;
  metricId?: string;
  attributeId?: string;
  stepId?: string;
  measureId?: string;
}

function classifyQuery(
  query: string,
  metrics: Metric[],
  attributes?: Array<{ id: string; name: string }>,
  processSteps?: Array<{ id: string; name: string }>,
  measures?: Array<{ id: string; name: string }>
): ClassifyResult {
  const lower = query.toLowerCase().trim();

  // Check for gap analysis queries
  if (/\b(gap|missing|orphan|unused|broken|incomplete)\b/.test(lower)) {
    return { type: 'gaps' };
  }

  // Check for impact analysis queries
  if (/\b(impact|break|risk|wrong|quality|if .+ breaks|what happens if)\b/.test(lower)) {
    const matched = attributes?.find(a =>
      lower.includes(a.name.toLowerCase()) || lower.includes(a.id.toLowerCase())
    );
    return { type: 'impact', attributeId: matched?.id };
  }

  // Check for lineage queries (step-based)
  if (/\b(lineage|trace step|how does .+ connect|step .+ to metric)\b/.test(lower)) {
    const matched = processSteps?.find(s =>
      lower.includes(s.name.toLowerCase()) || lower.includes(s.id.toLowerCase())
    );
    return { type: 'lineage', stepId: matched?.id };
  }

  // Check for usage queries (measure-based)
  if (/\b(what uses|who uses|depends on|dependency|upstream|downstream)\b/.test(lower)) {
    const matched = measures?.find(m =>
      lower.includes(m.name.toLowerCase()) || lower.includes(m.id.toLowerCase())
    );
    return { type: 'usage', measureId: matched?.id };
  }

  // Check for explain/trace queries - try to match a metric name
  if (/\b(explain|what is|what does|describe|trace|feeds|where does)\b/.test(lower)) {
    const matched = metrics.find(m =>
      lower.includes(m.name.toLowerCase()) || lower.includes(m.id.toLowerCase())
    );
    if (matched) {
      return { type: 'explain', metricId: matched.id };
    }
    // If asking "what feeds X", try partial match
    const feedsMatch = lower.match(/what feeds (.+)/);
    if (feedsMatch) {
      const target = feedsMatch[1].replace(/[?.]/, '').trim();
      const fuzzyMatch = metrics.find(m =>
        m.name.toLowerCase().includes(target) || target.includes(m.name.toLowerCase())
      );
      if (fuzzyMatch) return { type: 'explain', metricId: fuzzyMatch.id };
    }
  }

  // Default to suggest measures for requirements-style queries
  return { type: 'suggest' };
}

export function OntologyCommandBar({ metrics, attributes, measures, processSteps }: OntologyCommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [resultType, setResultType] = useState<QueryType | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const explainMetric = useExplainMetric();
  const findGaps = useFindGaps();
  const suggestMeasures = useSuggestMeasures();

  const isLoading = explainMetric.isPending || findGaps.isPending || suggestMeasures.isPending || directLoading;

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setResult(null);
        setResultType(null);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const classification = classifyQuery(query, metrics, attributes, processSteps, measures);
    setResultType(classification.type);

    try {
      switch (classification.type) {
        case 'explain':
          if (classification.metricId) {
            const res = await explainMetric.mutateAsync(classification.metricId);
            setResult(res);
          } else {
            setResult({ error: 'Could not identify which metric to explain. Try including the metric name.' });
          }
          break;
        case 'gaps': {
          const gapRes = await findGaps.mutateAsync(undefined);
          setResult(gapRes);
          break;
        }
        case 'suggest': {
          const suggestRes = await suggestMeasures.mutateAsync(query);
          setResult(suggestRes);
          break;
        }
        case 'impact': {
          if (classification.attributeId) {
            setDirectLoading(true);
            const res = await analyzeImpact(classification.attributeId);
            setResult(res);
          } else {
            setResult({ error: 'Could not identify which attribute to analyze. Try including the attribute name.' });
          }
          break;
        }
        case 'lineage': {
          if (classification.stepId) {
            setDirectLoading(true);
            const res = await getStepFullLineage(classification.stepId);
            setResult(res);
          } else {
            setResult({ error: 'Could not identify which process step to trace. Try including the step name.' });
          }
          break;
        }
        case 'usage': {
          if (classification.measureId) {
            setDirectLoading(true);
            const res = await getMeasureUsage(classification.measureId);
            setResult(res);
          } else {
            setResult({ error: 'Could not identify which measure to look up. Try including the measure name.' });
          }
          break;
        }
      }
    } catch (err: any) {
      setResult({ error: err?.response?.data?.detail || err?.message || 'Request failed' });
    } finally {
      setDirectLoading(false);
    }
  }, [query, metrics, attributes, measures, processSteps, isLoading, explainMetric, findGaps, suggestMeasures]);

  const renderResult = () => {
    if (!result) return null;

    if (result.error) {
      return (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg">
          {result.error}
        </div>
      );
    }

    switch (resultType) {
      case 'explain':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                Metric Explanation
              </span>
              <span className="font-semibold text-gray-900">{result.metric_name}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Data Lineage</p>
              <p className="text-sm text-gray-600">{result.lineage_summary}</p>
            </div>
          </div>
        );

      case 'gaps':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                Gap Analysis
              </span>
              <span className="text-sm text-gray-600">
                {result.gaps?.length || 0} gaps found
              </span>
            </div>
            {result.recommendations?.map((rec: string, i: number) => (
              <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                {rec}
              </p>
            ))}
            {result.gaps?.slice(0, 5).map((gap: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  gap.type === 'metric_without_measures' ? 'bg-red-100 text-red-700' :
                  gap.type === 'measure_without_inputs' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{gap.type.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-900">{gap.element}</span>
                <span className="text-gray-500">— {gap.issue}</span>
              </div>
            ))}
            {result.gaps?.length > 5 && (
              <p className="text-xs text-gray-500">... and {result.gaps.length - 5} more</p>
            )}
          </div>
        );

      case 'suggest':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                Suggestion
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.rationale}</p>
          </div>
        );

      case 'impact':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                Impact Analysis
              </span>
              <span className="font-semibold text-gray-900">{result.attribute?.name}</span>
            </div>
            <p className="text-sm text-gray-700">
              If this attribute has issues, <strong>{result.affected_measures?.length || 0} measures</strong> and <strong>{result.affected_metrics?.length || 0} metrics</strong> are at risk
            </p>
            {result.affected_measures?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.affected_measures.map((m: any, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {m.name || m}
                  </span>
                ))}
              </div>
            )}
            {result.affected_metrics?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.affected_metrics.map((m: any, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    {m.name || m}
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      case 'lineage':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                Full Lineage
              </span>
              <span className="font-semibold text-gray-900">{result.step?.name}</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              {result.consumes_attributes?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Consumes:</strong> {result.consumes_attributes.map((a: any) => a.name || a).join(', ')}</span>
                </p>
              )}
              {result.produces_attributes?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Produces:</strong> {result.produces_attributes.map((a: any) => a.name || a).join(', ')}</span>
                </p>
              )}
              {result.crystallizes_attributes?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Crystallizes:</strong> {result.crystallizes_attributes.map((a: any) => a.name || a).join(', ')}</span>
                </p>
              )}
              {result.attributes_feed_measures?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Measures:</strong> {result.attributes_feed_measures.map((m: any) => m.name || m).join(', ')}</span>
                </p>
              )}
              {result.measures_calculate_metrics?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Metrics:</strong> {result.measures_calculate_metrics.map((m: any) => m.name || m).join(', ')}</span>
                </p>
              )}
            </div>
            {result.waste_analysis && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <strong>Waste Analysis:</strong>{' '}
                {result.waste_analysis.waste_category && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded mr-1">{result.waste_analysis.waste_category}</span>
                )}
                {result.waste_analysis.manual_effort_percentage != null && (
                  <span>{result.waste_analysis.manual_effort_percentage}% manual effort</span>
                )}
              </div>
            )}
          </div>
        );

      case 'usage':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                Measure Usage
              </span>
              <span className="font-semibold text-gray-900">{result.measure?.name}</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              {result.depends_on_attributes?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Input attributes:</strong> {result.depends_on_attributes.map((a: any) => a.name || a).join(', ')}</span>
                </p>
              )}
              {result.depends_on_measures?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Input measures:</strong> {result.depends_on_measures.map((m: any) => m.name || m).join(', ')}</span>
                </p>
              )}
              {result.used_in_metrics?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Used in metrics:</strong> {result.used_in_metrics.map((m: any) => m.name || m).join(', ')}</span>
                </p>
              )}
              {result.used_in_measures?.length > 0 && (
                <p className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Used in measures:</strong> {result.used_in_measures.map((m: any) => m.name || m).join(', ')}</span>
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm text-gray-500 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Ask about your ontology...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setResult(null);
          setResultType(null);
          setQuery('');
        }}
      />

      {/* Command Bar */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "What feeds COGS?", "Find gaps", or "I need to track inventory turnover"'
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
            {isLoading && <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setResult(null);
                setResultType(null);
                setQuery('');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </form>

        {/* Hints when empty */}
        {!result && !isLoading && (
          <div className="px-4 py-3 text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-500">Explain:</strong> "What feeds COGS?" or "Explain [metric name]"</p>
            <p><strong className="text-gray-500">Gaps:</strong> "Find gaps" or "What's missing?"</p>
            <p><strong className="text-gray-500">Suggest:</strong> "I need to track labor cost variance"</p>
            <p><strong className="text-gray-500">Impact:</strong> "What if production confirmations break?"</p>
            <p><strong className="text-gray-500">Lineage:</strong> "How does [step name] connect to metrics?"</p>
            <p><strong className="text-gray-500">Usage:</strong> "What uses [measure name]?"</p>
          </div>
        )}

        {/* Results */}
        {(result || isLoading) && (
          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing your ontology...
              </div>
            ) : (
              renderResult()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
