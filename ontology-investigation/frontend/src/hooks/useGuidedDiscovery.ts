import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type {
  DiscoverySessionState,
  DiscoveryChatMessage,
  WorkshopProposals,
  CrossPerspectiveNote,
  KnowledgePack,
} from '../types/ontology';
import {
  getKnowledgePacks,
  startDiscoverySession,
  discoveryAIChatStream,
  skipDiscoveryQuestion,
  goBackDiscoveryQuestion,
  captureDiscoveryElements,
  materializeDiscoverySession,
} from '../services/api';

/**
 * Extract proposal blocks from assistant message content.
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
      // skip malformed
    }
  }

  return found ? merged : null;
}

/**
 * Extract cross-perspective notes from assistant message content.
 */
function extractCrossPerspectiveNotes(content: string): CrossPerspectiveNote[] {
  const regex = /```cross_perspective_note\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  const notes: CrossPerspectiveNote[] = [];

  while ((match = regex.exec(content)) !== null) {
    try {
      notes.push(JSON.parse(match[1]));
    } catch {
      // skip malformed
    }
  }

  return notes;
}

let msgCounter = 0;
function nextId() {
  return `disc_${Date.now()}_${++msgCounter}`;
}

export function useGuidedDiscovery() {
  const [knowledgePacks, setKnowledgePacks] = useState<KnowledgePack[]>([]);
  const [session, setSession] = useState<DiscoverySessionState | null>(null);
  const [messages, setMessages] = useState<DiscoveryChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const loadKnowledgePacks = useCallback(async () => {
    try {
      const packs = await getKnowledgePacks();
      setKnowledgePacks(packs);
    } catch {
      toast.error('Failed to load knowledge packs');
    }
  }, []);

  const startSession = useCallback(async (perspective: string, industry: string) => {
    setIsStarting(true);
    try {
      const sessionState = await startDiscoverySession(perspective, industry);
      setSession(sessionState);
      setMessages([]);
      return sessionState;
    } catch {
      toast.error('Failed to start discovery session');
      return null;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming || !session) return;

    const userMsg: DiscoveryChatMessage = {
      id: nextId(),
      role: 'user',
      content: userText.trim(),
      proposals: null,
      timestamp: Date.now(),
    };

    const assistantMsg: DiscoveryChatMessage = {
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

    await discoveryAIChatStream(
      session.id,
      userText.trim(),
      // onText
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
      // onDone
      () => {
        setIsStreaming(false);
        abortRef.current = null;
        // Extract proposals and cross-perspective notes
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              proposals: extractProposals(last.content),
              crossPerspectiveNotes: extractCrossPerspectiveNotes(last.content),
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
            updated[updated.length - 1] = { ...last, content: last.content || `Error: ${error}` };
          }
          return updated;
        });
      },
      // onSessionUpdate
      (updatedSession) => {
        setSession(updatedSession);
      },
      abortController.signal,
    );
  }, [session, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const skip = useCallback(async () => {
    if (!session) return;
    try {
      const updated = await skipDiscoveryQuestion(session.id);
      setSession(updated);
    } catch {
      toast.error('Failed to skip question');
    }
  }, [session]);

  const goBack = useCallback(async () => {
    if (!session) return;
    try {
      const updated = await goBackDiscoveryQuestion(session.id);
      setSession(updated);
    } catch {
      toast.error('Failed to go back');
    }
  }, [session]);

  const captureProposals = useCallback(async (proposals: WorkshopProposals) => {
    if (!session) return;
    try {
      const updated = await captureDiscoveryElements(session.id, proposals);
      setSession(updated);
      toast.success('Elements captured');
    } catch {
      toast.error('Failed to capture elements');
    }
  }, [session]);

  const materialize = useCallback(async () => {
    if (!session) return null;
    try {
      const result = await materializeDiscoverySession(session.id);
      const parts: string[] = [];
      for (const [key, count] of Object.entries(result.created || {})) {
        if ((count as number) > 0) parts.push(`${count} ${key}`);
      }
      if (parts.length > 0) {
        toast.success(`Created: ${parts.join(', ')}`);
      } else {
        toast('All elements already exist', { icon: 'i' });
      }
      queryClient.invalidateQueries();
      return result;
    } catch (e: any) {
      toast.error(`Failed to materialize: ${e.message || 'Unknown error'}`);
      return null;
    }
  }, [session, queryClient]);

  const endSession = useCallback(() => {
    setSession(null);
    setMessages([]);
  }, []);

  return {
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
  };
}
