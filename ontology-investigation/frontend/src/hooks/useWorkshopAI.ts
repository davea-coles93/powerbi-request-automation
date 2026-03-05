import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { WorkshopChatMessage, WorkshopProposals } from '../types/ontology';
import { workshopAIChatStream, workshopAIMaterialize } from '../services/api';

/**
 * Parse proposal blocks from assistant message content.
 * Looks for ```proposal ... ``` blocks and extracts JSON.
 */
function extractProposals(content: string): WorkshopProposals | null {
  const regex = /```proposal\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  const merged: WorkshopProposals = { metrics: [], measures: [], attributes: [] };
  let found = false;

  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.metrics) merged.metrics.push(...parsed.metrics);
      if (parsed.measures) merged.measures.push(...parsed.measures);
      if (parsed.attributes) merged.attributes.push(...parsed.attributes);
      found = true;
    } catch {
      // skip malformed proposal blocks
    }
  }

  return found ? merged : null;
}

let msgCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export function useWorkshopAI() {
  const [messages, setMessages] = useState<WorkshopChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg: WorkshopChatMessage = {
      id: nextId(),
      role: 'user',
      content: userText.trim(),
      proposals: null,
      timestamp: Date.now(),
    };

    const assistantMsg: WorkshopChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      proposals: null,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    // Build conversation history for the API (all messages including the new user one)
    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await workshopAIChatStream(
      apiMessages,
      // onText
      (text) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + text,
            };
          }
          return updated;
        });
      },
      // onDone
      () => {
        setIsStreaming(false);
        abortRef.current = null;
        // Extract proposals from completed message
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              proposals: extractProposals(last.content),
            };
          }
          return updated;
        });
      },
      // onError
      (error) => {
        setIsStreaming(false);
        abortRef.current = null;
        toast.error(`AI error: ${error}`);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content || `Error: ${error}`,
            };
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

  const materialize = useCallback(async (proposals: WorkshopProposals) => {
    try {
      const result = await workshopAIMaterialize(proposals);
      const parts: string[] = [];
      for (const [key, count] of Object.entries(result.created)) {
        if (count > 0) parts.push(`${count} ${key}`);
      }
      if (parts.length > 0) {
        toast.success(`Created: ${parts.join(', ')}`);
      } else {
        toast('All elements already exist', { icon: 'ℹ️' });
      }
      // Invalidate all ontology queries so the UI reflects new data
      queryClient.invalidateQueries();
      return result;
    } catch (e: any) {
      toast.error(`Failed to materialize: ${e.message || 'Unknown error'}`);
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
    materialize,
    clearChat,
  };
}
