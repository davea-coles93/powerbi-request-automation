import { useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, AlertTriangle, ChevronDown, ChevronRight, Shield, Info, Check } from 'lucide-react';
import { gapAIAnalyzeStream } from '../../services/api';
import type { GapAnalysisResult, AIGapItem, GapItem, GapType } from '../../types/ontology';

const VALID_GAP_TYPES: GapType[] = [
  'missing_supply', 'unused_supply', 'shadow_system', 'high_manual_effort',
  'broken_lineage', 'coverage_gap', 'process_risk',
  'missing_crystallisation', 'high_crystallisation_cost', 'late_crystallisation',
];

function mapAIGapToGapItem(aiGap: AIGapItem): GapItem {
  const gapType: GapType = VALID_GAP_TYPES.includes(aiGap.type as GapType)
    ? (aiGap.type as GapType)
    : 'coverage_gap';

  return {
    id: `ai-${aiGap.id}-${Date.now()}`,
    gap_type: gapType,
    description: `${aiGap.title}: ${aiGap.description}`,
    priority: aiGap.severity,
    related_entity_ids: [],
    related_attribute_ids: [],
    related_measure_ids: [],
    related_process_ids: [],
    suggested_action: aiGap.recommendation,
    resolved: false,
    status: 'open',
  };
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
};

function extractAnalysis(content: string): GapAnalysisResult | null {
  const regex = /```gap_analysis\s*\n([\s\S]*?)```/;
  const match = regex.exec(content);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as GapAnalysisResult;
  } catch {
    return null;
  }
}

function renderProse(content: string): string {
  let cleaned = content.replace(/```gap_analysis\s*\n[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```gap_analysis[\s\S]*$/g, '');
  return cleaned.trim();
}

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg}`}>
      <Shield className={`w-5 h-5 ${color}`} />
      <div>
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-gray-500 ml-1">/100</span>
      </div>
      <span className="text-xs text-gray-600 ml-2">Health Score</span>
    </div>
  );
}

function GapItemCard({ gap, onAccept, isAccepted }: { gap: AIGapItem; onAccept?: (gap: AIGapItem) => void; isAccepted?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[gap.severity] || SEVERITY_STYLES.medium;

  return (
    <div className={`border rounded-lg overflow-hidden ${styles.border} ${styles.bg}`}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`w-2 h-2 rounded-full ${styles.dot} flex-shrink-0`} />
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        <span className={`text-xs font-semibold ${styles.text} flex-1`}>{gap.title}</span>
        {onAccept && (
          isAccepted ? (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-green-700 bg-green-100 border border-green-200 rounded">
              <Check className="w-3 h-3" /> Accepted
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(gap); }}
              className="px-2 py-0.5 text-[10px] font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200 transition-colors"
            >
              Accept
            </button>
          )
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles.text} ${styles.bg} border ${styles.border}`}>
          {gap.severity}
        </span>
        <span className="text-[10px] text-gray-500 capitalize">{gap.type.replace(/_/g, ' ')}</span>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          <p className="text-xs text-gray-700">{gap.description}</p>
          {gap.affected_elements.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {gap.affected_elements.map((el) => (
                <span key={el} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 font-mono">{el}</span>
              ))}
            </div>
          )}
          <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-gray-200">
            <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600">{gap.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface AIGapAnalysisProps {
  onAcceptGap?: (gap: GapItem) => void;
}

export function AIGapAnalysis({ onAcceptGap }: AIGapAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [analysis, setAnalysis] = useState<GapAnalysisResult | null>(null);
  const [focus, setFocus] = useState('');
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const handleAcceptGap = useCallback((aiGap: AIGapItem) => {
    if (!onAcceptGap) return;
    const gapItem = mapAIGapToGapItem(aiGap);
    onAcceptGap(gapItem);
    setAcceptedIds((prev) => new Set(prev).add(aiGap.id));
  }, [onAcceptGap]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setStreamContent('');
    setAnalysis(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let fullContent = '';

    await gapAIAnalyzeStream(
      (text) => {
        fullContent += text;
        setStreamContent(fullContent);
      },
      () => {
        setIsAnalyzing(false);
        abortRef.current = null;
        const result = extractAnalysis(fullContent);
        setAnalysis(result);
      },
      (error) => {
        setIsAnalyzing(false);
        abortRef.current = null;
        setStreamContent(`Error: ${error}`);
      },
      focus || undefined,
      abortController.signal,
    );
  }, [focus]);

  const stopAnalysis = () => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  };

  const prose = renderProse(streamContent);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900">AI Gap Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Focus area (optional)"
              className="px-2 py-1 text-xs border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
            {isAnalyzing ? (
              <button
                onClick={stopAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze
              </button>
            )}
          </div>
        </div>
      </div>

      {(isAnalyzing || streamContent) && (
        <div className="p-4 space-y-4">
          {/* Streaming prose */}
          {prose && (
            <div className="text-sm text-gray-700 leading-relaxed">
              {prose.split('\n\n').map((p, i) => (
                <p key={i} className="mb-2">{p}</p>
              ))}
            </div>
          )}

          {/* Loading indicator during streaming */}
          {isAnalyzing && !prose && (
            <div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Analyzing ontology...</span>
            </div>
          )}

          {/* Structured results */}
          {analysis && (
            <div className="space-y-4">
              <HealthScore score={analysis.health_score} />

              {analysis.summary && (
                <p className="text-sm text-gray-600 italic">{analysis.summary}</p>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Identified Gaps ({analysis.gaps.length})
                </h4>
                {analysis.gaps.map((gap) => (
                  <GapItemCard
                    key={gap.id}
                    gap={gap}
                    onAccept={onAcceptGap ? handleAcceptGap : undefined}
                    isAccepted={acceptedIds.has(gap.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No gaps found */}
          {!isAnalyzing && streamContent && !analysis && (
            <div className="text-center py-4 text-gray-400">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs">Could not extract structured gap data from the response.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isAnalyzing && !streamContent && (
        <div className="px-4 py-6 text-center text-gray-400">
          <p className="text-sm">Click "Analyze" to run AI-powered gap detection</p>
          <p className="text-xs mt-1">Uses Claude to analyze your entire ontology and identify structural gaps, coverage issues, and improvement opportunities</p>
        </div>
      )}
    </div>
  );
}
