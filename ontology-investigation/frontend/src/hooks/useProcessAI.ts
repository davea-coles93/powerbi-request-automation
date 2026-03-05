import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { WorkshopChatMessage, ProcessProposal } from '../types/ontology';
import { processAIChatStream, processAIMaterialize } from '../services/api';

/**
 * Parse process_proposal blocks from assistant message content.
 */
function extractProcessProposal(content: string): ProcessProposal | null {
  const regex = /```process_proposal\s*\n([\s\S]*?)```/g;
  const match = regex.exec(content);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.process && parsed.steps) {
      return parsed as ProcessProposal;
    }
  } catch {
    // malformed
  }
  return null;
}

let msgCounter = 0;
function nextId() {
  return `pmsg_${Date.now()}_${++msgCounter}`;
}

export interface ProcessAIChatMessage extends WorkshopChatMessage {
  processProposal?: ProcessProposal | null;
}

export function useProcessAI() {
  const [messages, setMessages] = useState<ProcessAIChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg: ProcessAIChatMessage = {
      id: nextId(),
      role: 'user',
      content: userText.trim(),
      proposals: null,
      processProposal: null,
      timestamp: Date.now(),
    };

    const assistantMsg: ProcessAIChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      proposals: null,
      processProposal: null,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await processAIChatStream(
      apiMessages,
      (text) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + text };
          }
          return updated;
        });
      },
      () => {
        setIsStreaming(false);
        abortRef.current = null;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              processProposal: extractProcessProposal(last.content),
            };
          }
          return updated;
        });
      },
      (error) => {
        setIsStreaming(false);
        abortRef.current = null;
        toast.error(`AI error: ${error}`);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content || `Error: ${error}` };
          }
          return updated;
        });
      },
      abortController.signal,
    );
  }, [messages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const materializeProcess = useCallback(async (proposal: ProcessProposal) => {
    try {
      const result = await processAIMaterialize(proposal);
      toast.success(`Created process "${result.process_name}" with ${result.steps_created} steps`);
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      return result;
    } catch (e: any) {
      toast.error(`Failed to create process: ${e.message || 'Unknown error'}`);
      throw e;
    }
  }, [queryClient]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    materializeProcess,
    clearChat,
  };
}
