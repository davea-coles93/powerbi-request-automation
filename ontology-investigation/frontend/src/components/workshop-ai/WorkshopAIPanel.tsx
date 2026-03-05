import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Square, Sparkles } from 'lucide-react';
import { useWorkshopAI } from '../../hooks/useWorkshopAI';
import { ChatMessage } from './ChatMessage';

interface WorkshopAIPanelProps {
  onClose: () => void;
}

const STARTER_PROMPTS = [
  'We need to understand our production yield and why we\'re seeing quality issues',
  'What metrics do we need for month-end financial close?',
  'Help me define KPIs for on-time delivery performance',
  'We want to track inventory accuracy and shrinkage',
];

export function WorkshopAIPanel({ onClose }: WorkshopAIPanelProps) {
  const { messages, isStreaming, sendMessage, stopStreaming, materialize, clearChat } = useWorkshopAI();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Workshop AI</h2>
            <p className="text-[10px] text-gray-500">Top-Down Discovery Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Clear conversation"
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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Top-Down Workshop
            </h3>
            <p className="text-xs text-gray-500 mb-6 max-w-sm">
              Describe the business questions you need answered. I'll help structure them into
              metrics, measures, and attributes — linking to your existing ontology where possible.
            </p>
            <div className="w-full space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Try asking</p>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onMaterialize={materialize}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a business question..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 max-h-32"
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
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Shift+Enter for new line. Proposals can be accepted to create ontology elements.
        </p>
      </div>
    </div>
  );
}
