import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Square, Sparkles, Check, ChevronDown, ChevronRight, Pencil, User, Bot } from 'lucide-react';
import { useProcessAI } from '../../hooks/useProcessAI';
import type { ProcessAIChatMessage } from '../../hooks/useProcessAI';
import type { ProcessProposal, ProposedProcessStep } from '../../types/ontology';

interface ProcessAIPanelProps {
  onClose: () => void;
  onProcessCreated?: (processId: string) => void;
}

const STARTER_PROMPTS = [
  'Map our month-end financial close process',
  'Create a purchase-to-pay process',
  'I have meeting notes from a process mapping workshop...',
  'Design an inventory cycle count process',
];

// Strip process_proposal blocks from displayed content
function renderContent(content: string): string {
  let cleaned = content.replace(/```process_proposal\s*\n[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```process_proposal[\s\S]*$/g, '');
  return cleaned.trim();
}

function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        const isList = lines.every((l) => /^\s*[-*]\s/.test(l) || !l.trim());
        if (isList && lines.some((l) => l.trim())) {
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <li key={j} className="text-sm text-gray-700">{line.replace(/^\s*[-*]\s/, '')}</li>
              ))}
            </ul>
          );
        }
        const isNumbered = lines.every((l) => /^\s*\d+[.)]\s/.test(l) || !l.trim());
        if (isNumbered && lines.some((l) => l.trim())) {
          return (
            <ol key={i} className="list-decimal list-inside space-y-0.5">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <li key={j} className="text-sm text-gray-700">{line.replace(/^\s*\d+[.)]\s/, '')}</li>
              ))}
            </ol>
          );
        }
        return <p key={i} className="text-sm text-gray-700 leading-relaxed">{para.replace(/\n/g, ' ')}</p>;
      })}
    </div>
  );
}

const PERSPECTIVE_COLORS: Record<string, string> = {
  operational: 'bg-emerald-100 text-emerald-700',
  management: 'bg-amber-100 text-amber-700',
  financial: 'bg-blue-100 text-blue-700',
};

function ProcessProposalCard({
  proposal: initialProposal,
  onMaterialize,
}: {
  proposal: ProcessProposal;
  onMaterialize: (proposal: ProcessProposal) => Promise<any>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [materializing, setMaterializing] = useState(false);
  const [materialized, setMaterialized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processName, setProcessName] = useState(initialProposal.process.name);
  const [processDesc, setProcessDesc] = useState(initialProposal.process.description);
  const [steps, setSteps] = useState(initialProposal.steps);

  const handleMaterialize = async () => {
    setMaterializing(true);
    try {
      await onMaterialize({
        process: { ...initialProposal.process, name: processName, description: processDesc },
        steps,
      });
      setMaterialized(true);
    } catch {
      // handled in hook
    } finally {
      setMaterializing(false);
    }
  };

  const updateStep = (id: string, patch: Partial<ProposedProcessStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mt-3 border border-indigo-200 rounded-lg bg-indigo-50/50 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-indigo-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-700">
            Proposed Process
          </span>
          <span className="text-[10px] text-indigo-500">
            {steps.length} steps
          </span>
        </div>
        {!materialized && steps.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleMaterialize(); }}
            disabled={materializing}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {materializing ? (
              <span className="animate-pulse">Creating...</span>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Accept & Create
              </>
            )}
          </button>
        )}
        {materialized && (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-medium">
            <Check className="w-3 h-3" /> Created
          </span>
        )}
      </div>

      {expanded && !materialized && (
        <div className="px-3 pb-3 space-y-2">
          {/* Process name/desc - editable */}
          <div className="p-2 bg-white rounded-md border border-gray-200">
            <input
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 border-none outline-none bg-transparent"
              placeholder="Process name"
            />
            <input
              value={processDesc}
              onChange={(e) => setProcessDesc(e.target.value)}
              className="w-full text-xs text-gray-500 border-none outline-none bg-transparent mt-0.5"
              placeholder="Description"
            />
          </div>

          {/* Steps */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Steps</div>
            {steps.map((step) => (
              <div key={step.id} className="py-1.5 px-2 group bg-white rounded border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono w-4 text-right">{step.sequence}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${PERSPECTIVE_COLORS[step.perspective_id] || 'bg-gray-100 text-gray-600'}`}>
                    {step.perspective_id?.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{step.name}</span>
                  {step.manual_effort_percentage != null && (
                    <span className={`text-[10px] font-medium ${step.manual_effort_percentage >= 70 ? 'text-red-500' : 'text-gray-400'}`}>
                      {step.manual_effort_percentage}% manual
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingId(editingId === step.id ? null : step.id)} className="p-0.5 hover:bg-gray-100 rounded">
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                    <button onClick={() => removeStep(step.id)} className="p-0.5 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
                {step.actor && (
                  <div className="ml-6 mt-0.5 text-[10px] text-gray-500">Actor: {step.actor}</div>
                )}
                {editingId === step.id && (
                  <div className="mt-2 ml-6 space-y-1.5 p-2 bg-gray-50 rounded-md border border-gray-200">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Name</label>
                      <input value={step.name} onChange={(e) => updateStep(step.id, { name: e.target.value })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Actor</label>
                      <input value={step.actor || ''} onChange={(e) => updateStep(step.id, { actor: e.target.value })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Perspective</label>
                        <select value={step.perspective_id} onChange={(e) => updateStep(step.id, { perspective_id: e.target.value })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white">
                          <option value="operational">Operational</option>
                          <option value="management">Management</option>
                          <option value="financial">Financial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Manual %</label>
                        <input type="number" min={0} max={100} value={step.manual_effort_percentage ?? ''} onChange={(e) => updateStep(step.id, { manual_effort_percentage: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Duration (min)</label>
                        <input type="number" min={0} value={step.estimated_duration_minutes ?? ''} onChange={(e) => updateStep(step.id, { estimated_duration_minutes: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Automation</label>
                        <select value={step.automation_potential || ''} onChange={(e) => updateStep(step.id, { automation_potential: e.target.value || undefined })} className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white">
                          <option value="">-</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 pt-1">
            Hover to edit or remove steps. Click pencil to adjust details.
          </p>
        </div>
      )}

      {expanded && materialized && (
        <div className="px-3 pb-2 text-[11px] text-green-600">
          {processName} — {steps.length} steps created
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
  onMaterialize,
}: {
  message: ProcessAIChatMessage;
  isStreaming: boolean;
  onMaterialize: (proposal: ProcessProposal) => Promise<any>;
}) {
  const isUser = message.role === 'user';
  const displayContent = renderContent(message.content);

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-100' : 'bg-indigo-100'
      }`}>
        {isUser ? <User className="w-3.5 h-3.5 text-blue-600" /> : <Bot className="w-3.5 h-3.5 text-indigo-600" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-full text-left rounded-xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white [&_*]:text-white/90'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <>
              <SimpleMarkdown text={displayContent} />
              {isStreaming && !displayContent && (
                <div className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </>
          )}
        </div>

        {!isUser && message.processProposal && !isStreaming && (
          <ProcessProposalCard
            proposal={message.processProposal}
            onMaterialize={onMaterialize}
          />
        )}
      </div>
    </div>
  );
}

export function ProcessAIPanel({ onClose, onProcessCreated }: ProcessAIPanelProps) {
  const { messages, isStreaming, sendMessage, stopStreaming, materializeProcess, clearChat } = useProcessAI();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleMaterialize = async (proposal: ProcessProposal) => {
    const result = await materializeProcess(proposal);
    onProcessCreated?.(result.process_id);
    return result;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Process Builder AI</h2>
            <p className="text-[10px] text-gray-500">Describe a process or paste a transcript</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Process Builder AI</h3>
            <p className="text-xs text-gray-500 mb-6 max-w-sm">
              Describe a business process or paste meeting notes from a process mapping session.
              I'll extract structured steps with systems, actors, and effort estimates.
            </p>
            <div className="w-full space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Try asking</p>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                onMaterialize={handleMaterialize}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Describe a process or paste transcript..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 max-h-32"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />
          {isStreaming ? (
            <button onClick={stopStreaming} className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors">
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Shift+Enter for new line. Paste transcripts directly for extraction.
        </p>
      </div>
    </div>
  );
}
