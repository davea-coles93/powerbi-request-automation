import type { WorkshopChatMessage, WorkshopProposals } from '../../types/ontology';
import { ProposalCard } from './ProposalCard';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: WorkshopChatMessage;
  onMaterialize: (proposals: WorkshopProposals) => Promise<any>;
  isStreaming?: boolean;
}

/**
 * Render message content, stripping out ```proposal blocks
 * (they're rendered separately as ProposalCards).
 */
function renderContent(content: string): string {
  return content.replace(/```proposal\s*\n[\s\S]*?```/g, '').trim();
}

/**
 * Very lightweight markdown: bold, italic, bullet lists, paragraphs.
 * No dependency needed for this.
 */
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        // Bullet list
        const lines = para.split('\n');
        const isList = lines.every((l) => /^\s*[-*]\s/.test(l) || !l.trim());
        if (isList && lines.some((l) => l.trim())) {
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <li key={j} className="text-sm text-gray-700">
                  <InlineFormat text={line.replace(/^\s*[-*]\s/, '')} />
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        const isNumbered = lines.every((l) => /^\s*\d+[.)]\s/.test(l) || !l.trim());
        if (isNumbered && lines.some((l) => l.trim())) {
          return (
            <ol key={i} className="list-decimal list-inside space-y-0.5">
              {lines.filter((l) => l.trim()).map((line, j) => (
                <li key={j} className="text-sm text-gray-700">
                  <InlineFormat text={line.replace(/^\s*\d+[.)]\s/, '')} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            <InlineFormat text={para.replace(/\n/g, ' ')} />
          </p>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }: { text: string }) {
  // Bold and italic
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-purple-700">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatMessage({ message, onMaterialize, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const displayContent = renderContent(message.content);

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-100' : 'bg-purple-100'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-purple-600" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-full text-left rounded-xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white [&_*]:text-white/90 [&_strong]:text-white'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <>
              <SimpleMarkdown text={displayContent} />
              {isStreaming && !displayContent && (
                <div className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Proposal card (only for assistant messages with proposals, after streaming done) */}
        {!isUser && message.proposals && !isStreaming && (
          <ProposalCard
            proposals={message.proposals}
            onMaterialize={onMaterialize}
          />
        )}
      </div>
    </div>
  );
}
