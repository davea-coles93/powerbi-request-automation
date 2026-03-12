import { useState, useRef, useEffect } from 'react';
import { X, Send, Square, Compass, ChevronRight, ChevronLeft, SkipForward, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useGuidedDiscovery } from '../../hooks/useGuidedDiscovery';
import { useSystems, useEntities, usePerspectives } from '../../hooks/useOntology';
import { ChatMessage } from '../workshop-ai/ChatMessage';
import type { DiscoverySessionState, KnowledgePack, WorkshopProposals } from '../../types/ontology';

interface GuidedDiscoveryPanelProps {
  onClose: () => void;
}

const PERSPECTIVE_CARDS = [
  {
    id: 'financial',
    name: 'Financial',
    icon: '💰',
    color: 'blue',
    approach: 'Top-Down',
    description: 'Start with business questions, trace backwards to data',
  },
  {
    id: 'management',
    name: 'Management',
    icon: '📊',
    color: 'amber',
    approach: 'Middle-Out',
    description: 'Connect KPIs to financial outcomes and operational data',
  },
  {
    id: 'operational',
    name: 'Operational',
    icon: '⚙️',
    color: 'emerald',
    approach: 'Bottom-Up',
    description: 'Map systems, people, and data creation points',
  },
] as const;

// ── Launcher (perspective + industry picker) ──────────────────────────────

function DiscoveryLauncher({
  knowledgePacks,
  isStarting,
  onStart,
}: {
  knowledgePacks: KnowledgePack[];
  isStarting: boolean;
  onStart: (perspective: string, industry: string) => void;
}) {
  const [selectedPerspective, setSelectedPerspective] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', ring: 'ring-blue-400' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-400' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4">
        <Compass className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Guided Discovery</h3>
      <p className="text-xs text-gray-500 mb-6 text-center max-w-sm">
        Choose a perspective and industry to start a structured discovery interview.
        The AI will guide you through key questions and build the ontology as you go.
      </p>

      {/* Perspective selection */}
      <div className="w-full space-y-2 mb-5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">1. Choose Perspective</p>
        {PERSPECTIVE_CARDS.map((card) => {
          const isSelected = selectedPerspective === card.id;
          const colors = colorMap[card.color];
          return (
            <button
              key={card.id}
              onClick={() => setSelectedPerspective(card.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{card.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isSelected ? colors.text : 'text-gray-900'}`}>
                      {card.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected ? `${colors.bg} ${colors.text}` : 'bg-gray-100 text-gray-500'
                    }`}>
                      {card.approach}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{card.description}</p>
                </div>
                {isSelected && <CheckCircle2 className={`w-4 h-4 ${colors.text}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Industry selection */}
      <div className="w-full space-y-2 mb-6">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">2. Choose Industry</p>
        {knowledgePacks.map((pack) => {
          const isSelected = selectedIndustry === pack.id;
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedIndustry(pack.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{pack.icon}</span>
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                    {pack.name}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{pack.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <button
        onClick={() => {
          if (selectedPerspective && selectedIndustry) {
            onStart(selectedPerspective, selectedIndustry);
          }
        }}
        disabled={!selectedPerspective || !selectedIndustry || isStarting}
        className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isStarting ? 'Starting...' : 'Start Discovery'}
      </button>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────

function DiscoveryProgressBar({ session }: { session: DiscoverySessionState }) {
  const phases = Array.from({ length: session.total_phases }, (_, i) => i);

  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-1 mb-1">
        {phases.map((i) => {
          const isCurrent = i === session.current_phase_index;
          const isComplete = i < session.current_phase_index;
          return (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${
                isComplete ? 'bg-teal-500' : isCurrent ? 'bg-teal-300' : 'bg-gray-200'
              }`} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          {session.current_phase?.name || 'Complete'} — Q{session.current_question_index + 1}
        </span>
        <span className="text-[10px] text-gray-400">{session.progress_pct}%</span>
      </div>
    </div>
  );
}

// ── Cross-Perspective Note Banner ─────────────────────────────────────────

function CrossPerspectiveNoteBanner({ note }: { note: { from_perspective: string; to_perspective: string; summary: string; suggested_action: string } }) {
  const perspectiveEmojis: Record<string, string> = {
    financial: '💰',
    management: '📊',
    operational: '⚙️',
  };

  return (
    <div className="mx-4 my-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{perspectiveEmojis[note.from_perspective] || '🔗'}</span>
        <ChevronRight className="w-3 h-3 text-amber-400" />
        <span className="text-xs">{perspectiveEmojis[note.to_perspective] || '🔗'}</span>
        <span className="text-[10px] font-semibold text-amber-700 ml-1">Cross-Perspective Link</span>
      </div>
      <p className="text-[10px] text-amber-800">{note.summary}</p>
      <p className="text-[10px] text-amber-600 mt-0.5 italic">{note.suggested_action}</p>
    </div>
  );
}

// ── Captured Elements Summary ─────────────────────────────────────────────

function CapturedSummary({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="mx-4 my-1 flex items-center gap-2">
      <span className="text-[10px] text-gray-400">Captured:</span>
      {Object.entries(counts).map(([key, count]) => {
        if (count === 0) return null;
        const colors: Record<string, string> = {
          metrics: 'bg-purple-100 text-purple-700',
          measures: 'bg-blue-100 text-blue-700',
          attributes: 'bg-emerald-100 text-emerald-700',
        };
        return (
          <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${colors[key] || 'bg-gray-100 text-gray-600'}`}>
            {count} {key}
          </span>
        );
      })}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export function GuidedDiscoveryPanel({ onClose }: GuidedDiscoveryPanelProps) {
  const {
    knowledgePacks,
    session,
    messages,
    isStreaming,
    isStarting,
    loadKnowledgePacks,
    startSession,
    sendMessage,
    stopStreaming,
    skip,
    goBack,
    captureProposals,
    materialize,
    endSession,
  } = useGuidedDiscovery();

  const { data: systemsData } = useSystems();
  const { data: entitiesData } = useEntities();
  const { data: perspectivesData } = usePerspectives();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lookupSystems = systemsData?.map(s => ({ id: s.id, name: s.name })) || [];
  const lookupEntities = entitiesData?.map(e => ({ id: e.id, name: e.name })) || [];
  const lookupPerspectives = perspectivesData?.map(p => ({ id: p.id, name: p.name })) || [];

  // Load knowledge packs on mount
  useEffect(() => {
    loadKnowledgePacks();
  }, [loadKnowledgePacks]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when session starts
  useEffect(() => {
    if (session) inputRef.current?.focus();
  }, [session]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMaterialize = async (proposals: WorkshopProposals) => {
    await captureProposals(proposals);
    // Also reuse the workshop materialize for immediate creation
    const { workshopAIMaterialize } = await import('../../services/api');
    const result = await workshopAIMaterialize(proposals);
    return result;
  };

  const perspectiveLabel = session
    ? PERSPECTIVE_CARDS.find(c => c.id === session.perspective)
    : null;

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={endSession}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Back to launcher"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {session ? `${perspectiveLabel?.icon || ''} ${perspectiveLabel?.name || ''} Discovery` : 'Guided Discovery'}
            </h2>
            <p className="text-[10px] text-gray-500">
              {session ? `${perspectiveLabel?.approach} • ${session.industry}` : 'Structured ontology interview'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Session progress bar */}
      {session && !session.completed && <DiscoveryProgressBar session={session} />}

      {/* Captured elements summary */}
      {session && <CapturedSummary counts={session.captured_counts} />}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <DiscoveryLauncher
            knowledgePacks={knowledgePacks}
            isStarting={isStarting}
            onStart={startSession}
          />
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Current question card (shown at top when no messages yet) */}
            {messages.length === 0 && session.current_question && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-1">
                  {session.current_phase?.name}
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  {session.current_question.text}
                </p>
                {session.current_question.hints.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-teal-600 font-medium">Hints:</p>
                    {session.current_question.hints.slice(0, 2).map((hint, i) => (
                      <p key={i} className="text-[10px] text-gray-500 pl-2 border-l-2 border-teal-200">
                        {hint}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => {
              const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant';
              return (
                <div key={msg.id}>
                  <ChatMessage
                    message={msg}
                    onMaterialize={handleMaterialize}
                    isStreaming={isStreaming && isLastAssistant}
                    systems={lookupSystems}
                    entities={lookupEntities}
                    perspectives={lookupPerspectives}
                  />
                  {/* Cross-perspective notes */}
                  {msg.crossPerspectiveNotes?.map((note, ni) => (
                    <CrossPerspectiveNoteBanner key={ni} note={note} />
                  ))}
                </div>
              );
            })}

            {/* Completion state */}
            {session.completed && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Discovery Complete</h4>
                <p className="text-xs text-gray-500 mb-3">
                  All questions for {perspectiveLabel?.name} perspective have been covered.
                </p>
                <button
                  onClick={materialize}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Create All Captured Elements
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area (only when session is active) */}
      {session && !session.completed && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          {/* Navigation controls */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={goBack}
              disabled={isStreaming || (session.current_phase_index === 0 && session.current_question_index === 0)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" />
              Back
            </button>
            <button
              onClick={skip}
              disabled={isStreaming}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
            >
              Skip
              <SkipForward className="w-3 h-3" />
            </button>
            <div className="flex-1" />
            <span className="text-[10px] text-gray-400">
              Q{session.questions_answered + 1} of {session.total_questions}
            </span>
          </div>

          {/* Input */}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Answer the question..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 max-h-32"
              style={{ minHeight: '40px' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 128) + 'px';
              }}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                title="Stop generation"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
