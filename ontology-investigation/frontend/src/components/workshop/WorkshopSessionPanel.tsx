import { useState, useCallback } from 'react';
import { X, Users, Calendar, FileText, Loader2 } from 'lucide-react';
import {
  useWorkshopSessions,
  useCreateWorkshopSession,
  useDeleteWorkshopSession,
  useUpdateWorkshopSession,
} from '../../hooks/useOntology';
import type { WorkshopSession, WorkshopSessionType } from '../../types/ontology';
import { SessionListSidebar } from './SessionListSidebar';
import { SessionCreateForm } from './SessionCreateForm';
import { TopDownWorkshop } from './TopDownWorkshop';
import { GapAnalysisWorkshop } from './GapAnalysisWorkshop';

interface WorkshopSessionPanelProps {
  onClose: () => void;
  onOpenProcessEditor?: (processId: string, session: WorkshopSession) => void;
}

export function WorkshopSessionPanel({ onClose, onOpenProcessEditor }: WorkshopSessionPanelProps) {
  const { data: sessions = [], isLoading } = useWorkshopSessions();
  const createSession = useCreateWorkshopSession();
  const deleteSession = useDeleteWorkshopSession();
  const updateSession = useUpdateWorkshopSession();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Notes editing (for legacy / bottom-up sessions)
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleSelectSession = useCallback((session: WorkshopSession) => {
    setActiveSessionId(session.id);
    setNotesText(session.notes || '');
    setEditingNotes(false);
    setShowCreateForm(false);
  }, []);

  const handleCreateSession = useCallback(
    async (data: { name: string; date: string; participants: string[]; session_type: WorkshopSessionType }) => {
      const result = await createSession.mutateAsync({
        name: data.name,
        date: data.date,
        participants: data.participants,
        session_type: data.session_type,
      } as any);
      setActiveSessionId(result.id);
      setShowCreateForm(false);
    },
    [createSession]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession.mutateAsync(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [deleteSession, activeSessionId]
  );

  const handleSessionUpdate = useCallback(
    (updated: WorkshopSession) => {
      // The hooks auto-invalidate queries, so the session list updates automatically.
      // But we keep the active session ID so it stays selected.
      setActiveSessionId(updated.id);
    },
    []
  );

  const handleSaveNotes = async () => {
    if (!activeSession) return;
    setSavingNotes(true);
    try {
      await updateSession.mutateAsync({
        id: activeSession.id,
        data: { notes: notesText },
      });
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleBottomUpClick = () => {
    if (!activeSession) return;
    if (onOpenProcessEditor && activeSession.process_id) {
      onOpenProcessEditor(activeSession.process_id, activeSession);
    }
  };

  // Render the right-panel content based on session type
  const renderSessionContent = () => {
    if (showCreateForm) {
      return (
        <SessionCreateForm
          onCancel={() => setShowCreateForm(false)}
          onCreate={handleCreateSession}
        />
      );
    }

    if (!activeSession) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Select a session or create a new one</p>
            <p className="text-xs text-gray-400 mt-1">
              Workshop sessions capture discovery findings and facts
            </p>
          </div>
        </div>
      );
    }

    // Session header (shared across all types)
    const sessionHeader = (
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{activeSession.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {activeSession.date}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                {activeSession.session_type === 'top_down'
                  ? 'Top-Down'
                  : activeSession.session_type === 'bottom_up'
                  ? 'Bottom-Up'
                  : 'Gap Analysis'}
              </span>
            </div>
          </div>
        </div>
        {activeSession.participants.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {activeSession.participants.map((p) => (
                <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // Notes section (shared)
    const notesSection = (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Notes
          </h4>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => {
                setNotesText(activeSession.notes || '');
                setEditingNotes(true);
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              {activeSession.notes ? 'Edit' : 'Add notes'}
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Record facts, decisions, and key discussion points..."
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setEditingNotes(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              >
                {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Notes
              </button>
            </div>
          </div>
        ) : activeSession.notes ? (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
            {activeSession.notes}
          </p>
        ) : (
          <p className="text-xs text-gray-400 italic">No notes recorded yet</p>
        )}
      </div>
    );

    // Route to specific workshop type
    if (activeSession.session_type === 'top_down') {
      return (
        <div>
          {sessionHeader}
          {notesSection}
          <TopDownWorkshop session={activeSession} onSessionUpdate={handleSessionUpdate} />
        </div>
      );
    }

    if (activeSession.session_type === 'gap_analysis') {
      return (
        <div>
          {sessionHeader}
          {notesSection}
          <GapAnalysisWorkshop session={activeSession} onSessionUpdate={handleSessionUpdate} />
        </div>
      );
    }

    if (activeSession.session_type === 'bottom_up') {
      return (
        <div>
          {sessionHeader}
          {notesSection}
          <div className="border border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50/30">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Bottom-up workshops use the Process Builder canvas
            </p>
            <p className="text-xs text-blue-600 mb-4">
              {activeSession.process_id
                ? 'This session is linked to a process. Open it in the Process Builder to add steps, systems, and facts.'
                : 'Create a linked process to start mapping the as-is reality on the canvas.'}
            </p>
            <button
              type="button"
              onClick={handleBottomUpClick}
              disabled={!activeSession.process_id || !onOpenProcessEditor}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeSession.process_id ? 'Open in Process Builder' : 'Link Process (coming soon)'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Workshop Sessions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Guided capture for top-down, bottom-up, and gap analysis workshops
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          <SessionListSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            loading={isLoading}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onCreateNew={() => {
              setActiveSessionId(null);
              setShowCreateForm(true);
            }}
          />
          <div className="flex-1 p-6 overflow-y-auto">
            {renderSessionContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
