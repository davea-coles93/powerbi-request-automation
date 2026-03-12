import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Database,
  Zap,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Square,
  FileText,
  Box,
  Link2,
  BarChart3,
  Eye,
  Download,
} from 'lucide-react';
import { useIngestion, type StagedSource, type EnrichmentResult } from '../../hooks/useIngestion';

interface IngestionPanelProps {
  onClose: () => void;
}

// ── Source type icons & colors ──────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { icon: typeof FileSpreadsheet; color: string; bg: string; label: string }> = {
  excel: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'Excel' },
  csv: { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'CSV' },
  powerbi: { icon: Database, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Power BI' },
  powerapp: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', label: 'PowerApp' },
  spreadsheet: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'Spreadsheet' },
  document: { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Document' },
};

function getSourceConfig(type: string) {
  return SOURCE_CONFIG[type] || SOURCE_CONFIG.spreadsheet;
}

// ── Drop Zone ───────────────────────────────────────────────────────────

function DropZone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled: boolean }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }, [onFiles, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFiles]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' :
          isDragOver ? 'border-blue-400 bg-blue-50 scale-[1.01]' :
          'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.zip,.pdf,.docx,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Upload className={`w-5 h-5 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
          <p className="text-xs text-gray-400 mt-0.5">Excel, CSV, PDF, Word, PowerPoint, Images, Power BI (.zip)</p>
        </div>
      </div>
    </div>
  );
}

// ── Staged Source Card ──────────────────────────────────────────────────

function StagedSourceCard({ source, onRemove }: { source: StagedSource; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = getSourceConfig(source.sourceType);
  const Icon = config.icon;

  const totalElements = Object.values(source.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{source.fileName}</p>
          <p className="text-xs text-gray-500">
            {config.label} &middot; {totalElements} elements
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2 mt-2">
            {source.counts.entities > 0 && (
              <CountBadge label="Entities" count={source.counts.entities} color="blue" />
            )}
            {source.counts.attributes > 0 && (
              <CountBadge label="Attributes" count={source.counts.attributes} color="emerald" />
            )}
            {source.counts.measures > 0 && (
              <CountBadge label="Measures" count={source.counts.measures} color="amber" />
            )}
            {source.counts.systems > 0 && (
              <CountBadge label="Systems" count={source.counts.systems} color="purple" />
            )}
            {source.counts.processes > 0 && (
              <CountBadge label="Processes" count={source.counts.processes} color="indigo" />
            )}
            {source.counts.relationships > 0 && (
              <CountBadge label="Relations" count={source.counts.relationships} color="pink" />
            )}
          </div>

          {/* Document metadata */}
          {source.data.document_summary && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {source.data.document_type?.replace(/_/g, ' ') || 'Document'}
                {source.data.confidence && (
                  <span className={`ml-1.5 px-1 py-0.5 rounded text-[9px] ${
                    source.data.confidence === 'high' ? 'bg-green-50 text-green-600' :
                    source.data.confidence === 'medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {source.data.confidence} confidence
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">{source.data.document_summary}</p>
            </div>
          )}

          {/* Column profiles for spreadsheets */}
          {source.data.column_profiles && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Columns</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {source.data.column_profiles.map((col: any) => (
                  <div key={col.column_name} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      col.classification === 'measure' ? 'bg-amber-50 text-amber-700' :
                      col.classification === 'date_dimension' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {col.classification === 'measure' ? 'M' : col.classification === 'date_dimension' ? 'D' : 'dim'}
                    </span>
                    <span className="text-gray-700 truncate">{col.column_name}</span>
                    <span className="text-gray-400 ml-auto flex-shrink-0">{col.data_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CountBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    pink: 'bg-pink-50 text-pink-700',
  };
  return (
    <div className={`px-2 py-1 rounded-md text-xs font-medium ${colors[color] || colors.blue}`}>
      {count} {label}
    </div>
  );
}

// ── Enrichment Progress ─────────────────────────────────────────────────

const ENRICHMENT_PHASES = [
  { id: 'analyze', label: 'Analyzing sources', keywords: ['analyz', 'found', 'source', 'overlap'] },
  { id: 'dedup', label: 'Deduplicating entities', keywords: ['dedup', 'merg', 'same entity', 'overlap'] },
  { id: 'relationships', label: 'Inferring relationships', keywords: ['relat', 'foreign key', 'connect', 'link'] },
  { id: 'classify', label: 'Classifying elements', keywords: ['classif', 'perspective', 'dimension', 'measure'] },
  { id: 'metrics', label: 'Generating metrics', keywords: ['metric', 'business question', 'kpi'] },
  { id: 'gaps', label: 'Identifying gaps', keywords: ['gap', 'missing', 'recommend'] },
];

function detectCurrentPhase(text: string): number {
  let lastPhase = 0;
  for (let i = ENRICHMENT_PHASES.length - 1; i >= 0; i--) {
    const phase = ENRICHMENT_PHASES[i];
    if (phase.keywords.some(kw => text.toLowerCase().includes(kw))) {
      lastPhase = i;
      break;
    }
  }
  return lastPhase;
}

function EnrichmentProgress({ text, isActive }: { text: string; isActive: boolean }) {
  const currentPhase = detectCurrentPhase(text);

  return (
    <div className="space-y-1.5">
      {ENRICHMENT_PHASES.map((phase, i) => {
        const isComplete = i < currentPhase;
        const isCurrent = i === currentPhase && isActive;

        return (
          <div key={phase.id} className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : isCurrent ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
            )}
            <span className={`text-xs ${
              isComplete ? 'text-green-700 font-medium' :
              isCurrent ? 'text-blue-700 font-medium' :
              'text-gray-400'
            }`}>
              {phase.label}
              {isCurrent && <span className="animate-pulse">...</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Enrichment Results ──────────────────────────────────────────────────

function EnrichmentResultView({ result }: { result: EnrichmentResult }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'gaps' | 'changes'>('overview');

  const tabs = [
    { key: 'overview' as const, label: 'Overview', count: null },
    { key: 'entities' as const, label: 'Elements', count: result.entities.length + result.attributes.length + result.measures.length + result.metrics.length },
    { key: 'gaps' as const, label: 'Gaps', count: result.gaps.length },
    { key: 'changes' as const, label: 'Changes', count: result.deduplicationLog.length },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/30'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3 max-h-[40vh] overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* AI Analysis */}
            {result.analysis && (
              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {result.analysis}
              </div>
            )}

            {/* Summary counts */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <SummaryCard icon={Box} label="Entities" count={result.entities.length} color="blue" />
              <SummaryCard icon={Database} label="Attributes" count={result.attributes.length} color="emerald" />
              <SummaryCard icon={BarChart3} label="Measures" count={result.measures.length} color="amber" />
              <SummaryCard icon={Sparkles} label="Metrics" count={result.metrics.length} color="purple" />
              <SummaryCard icon={Link2} label="Relationships" count={result.relationships.length} color="pink" />
              <SummaryCard icon={AlertTriangle} label="Gaps Found" count={result.gaps.length} color="red" />
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="space-y-3">
            {result.entities.length > 0 && (
              <ElementSection title="Entities" items={result.entities} renderItem={(e) => (
                <div className="text-xs">
                  <span className="font-medium text-gray-900">{e.name}</span>
                  <span className="text-gray-400 ml-1">({e.id})</span>
                  {e.description && <p className="text-gray-500 mt-0.5">{e.description}</p>}
                  {e.source_origins && (
                    <div className="flex gap-1 mt-1">
                      {e.source_origins.map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )} />
            )}

            {result.measures.length > 0 && (
              <ElementSection title="Measures" items={result.measures} renderItem={(m) => (
                <div className="text-xs">
                  <span className="font-medium text-gray-900">{m.name}</span>
                  {m.logic && <span className="text-gray-500 ml-1">— {m.logic}</span>}
                </div>
              )} />
            )}

            {result.metrics.length > 0 && (
              <ElementSection title="Metrics" items={result.metrics} renderItem={(mt) => (
                <div className="text-xs">
                  <span className="font-medium text-gray-900">{mt.name}</span>
                  {mt.business_question && (
                    <p className="text-gray-500 mt-0.5 italic">"{mt.business_question}"</p>
                  )}
                </div>
              )} />
            )}

            {result.relationships.length > 0 && (
              <ElementSection title="Relationships" items={result.relationships} renderItem={(r) => (
                <div className="text-xs">
                  <span className="font-medium text-gray-900">{r.from_entity_id}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-gray-400" />
                  <span className="font-medium text-gray-900">{r.to_entity_id}</span>
                  <span className="text-gray-400 ml-1">({r.relationship_type})</span>
                </div>
              )} />
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-2">
            {result.gaps.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No gaps identified</p>
            ) : (
              result.gaps.map((gap, i) => (
                <div key={i} className={`p-2.5 rounded-lg border ${
                  gap.severity === 'high' ? 'bg-red-50 border-red-200' :
                  gap.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                      gap.severity === 'high' ? 'text-red-500' :
                      gap.severity === 'medium' ? 'text-amber-500' :
                      'text-gray-400'
                    }`} />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{gap.description}</p>
                      {gap.recommendation && (
                        <p className="text-xs text-gray-500 mt-1">{gap.recommendation}</p>
                      )}
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/50 text-gray-600">
                        {gap.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="space-y-2">
            {result.deduplicationLog.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No deduplication changes</p>
            ) : (
              result.deduplicationLog.map((entry, i) => (
                <div key={i} className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 uppercase">
                      {entry.action}
                    </span>
                    <span className="text-xs text-gray-700">{entry.reason}</span>
                  </div>
                  {entry.original_ids && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {entry.original_ids.join(', ')} → {entry.result_id}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, count, color }: { icon: typeof Box; label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
    pink: 'text-pink-600 bg-pink-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${colors[color] || colors.blue}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{count}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

function ElementSection({ title, items, renderItem }: { title: string; items: any[]; renderItem: (item: any) => React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 hover:text-gray-700"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title} ({items.length})
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-4">
          {items.map((item, i) => (
            <div key={item.id || i}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────

export function IngestionPanel({ onClose }: IngestionPanelProps) {
  const {
    stage,
    stagedSources,
    enrichmentText,
    enrichmentResult,
    error,
    uploadProgress,
    addFiles,
    removeSource,
    clearAll,
    startEnrichment,
    stopEnrichment,
    loadToOntology,
    loadRawToOntology,
  } = useIngestion();

  const [guidance, setGuidance] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll streaming text
  useEffect(() => {
    if (stage === 'enriching' && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [enrichmentText, stage]);

  const totalCounts = stagedSources.reduce(
    (acc, s) => ({
      entities: acc.entities + s.counts.entities,
      attributes: acc.attributes + s.counts.attributes,
      measures: acc.measures + s.counts.measures,
      systems: acc.systems + s.counts.systems,
    }),
    { entities: 0, attributes: 0, measures: 0, systems: 0 },
  );

  const isEnriching = stage === 'enriching';
  const hasStaged = stagedSources.length > 0;

  return (
    <div className="fixed right-0 top-0 h-full w-[520px] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Data Ingestion</h2>
            <p className="text-[10px] text-gray-500">Upload, enrich, and load data sources</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasStaged && (
            <button
              onClick={clearAll}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Step 1: Upload */}
        <section>
          <StepHeader number={1} title="Upload Sources" active={!isEnriching} />
          <DropZone onFiles={addFiles} disabled={isEnriching || stage === 'loading'} />

          {uploadProgress && (
            <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploadProgress}
            </div>
          )}
        </section>

        {/* Step 2: Staged Sources */}
        {hasStaged && (
          <section>
            <StepHeader
              number={2}
              title={`Staged Sources (${stagedSources.length})`}
              active
              subtitle={`${totalCounts.entities} entities, ${totalCounts.attributes} attrs, ${totalCounts.measures} measures`}
            />
            <div className="space-y-2">
              {stagedSources.map(source => (
                <StagedSourceCard
                  key={source.id}
                  source={source}
                  onRemove={() => removeSource(source.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Enrichment */}
        {hasStaged && stage !== 'loaded' && (
          <section>
            <StepHeader
              number={3}
              title="AI Enrichment"
              active={stage === 'enriching' || stage === 'enriched'}
              subtitle="Cross-source deduplication, relationships, and metrics"
            />

            {/* Guidance input */}
            {!isEnriching && !enrichmentResult && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowGuidance(!showGuidance)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showGuidance ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Add guidance for the AI (optional)
                </button>

                {showGuidance && (
                  <textarea
                    value={guidance}
                    onChange={e => setGuidance(e.target.value)}
                    placeholder='e.g., "This is manufacturing data, focus on COGS lineage" or "These sources are for the same business unit"'
                    rows={2}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                  />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => startEnrichment(guidance)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Enrich with AI
                  </button>
                  <button
                    onClick={() => loadRawToOntology()}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    title="Load raw elements without AI enrichment"
                  >
                    <Download className="w-4 h-4" />
                    Load Raw
                  </button>
                </div>
              </div>
            )}

            {/* Enrichment streaming */}
            {isEnriching && (
              <div className="space-y-3">
                <div className="bg-white border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold text-blue-700">AI is analyzing your data...</span>
                    <button
                      onClick={stopEnrichment}
                      className="ml-auto p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Stop"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <EnrichmentProgress text={enrichmentText} isActive={true} />
                </div>

                {/* Live streaming text */}
                {enrichmentText && (
                  <div
                    ref={streamRef}
                    className="bg-gray-900 rounded-xl p-3 max-h-40 overflow-y-auto"
                  >
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {enrichmentText.split('```enrichment')[0].slice(-600)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Enrichment result */}
            {enrichmentResult && stage === 'enriched' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-700">Enrichment complete</span>
                </div>
                <EnrichmentResultView result={enrichmentResult} />
              </div>
            )}

            {/* Enrichment done but no parseable block (show raw text) */}
            {!enrichmentResult && stage === 'enriched' && enrichmentText && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">AI Analysis</span>
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {enrichmentText}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700">Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success state */}
        {stage === 'loaded' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-700">Successfully loaded into ontology</p>
            <p className="text-xs text-green-600 mt-1">Your data is now available across all views.</p>
            <div className="flex gap-2 mt-3 justify-center">
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Import More
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer action bar */}
      {enrichmentResult && stage === 'enriched' && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => startEnrichment(guidance)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-enrich
            </button>
            <button
              onClick={() => loadToOntology()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept & Load to Ontology
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {stage === 'loading' && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading elements into ontology...
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────

function StepHeader({ number, title, active, subtitle }: { number: number; title: string; active: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {number}
      </div>
      <div>
        <span className={`text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{title}</span>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}
