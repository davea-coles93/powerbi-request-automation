import {
  Plus,
  Loader2,
  ChevronRight,
  Trash2,
  Lightbulb,
} from 'lucide-react';
import type { WorkshopSession, WorkshopSessionType } from '../../types/ontology';

const SESSION_TYPE_LABELS: Record<WorkshopSessionType, { label: string; color: string }> = {
  top_down: { label: 'Top-Down', color: 'bg-green-100 text-green-700' },
  bottom_up: { label: 'Bottom-Up', color: 'bg-blue-100 text-blue-700' },
  gap_analysis: { label: 'Gap Analysis', color: 'bg-amber-100 text-amber-700' },
};

interface SessionListSidebarProps {
  sessions: WorkshopSession[];
  activeSessionId: string | null;
  loading: boolean;
  onSelectSession: (session: WorkshopSession) => void;
  onDeleteSession: (id: string) => void;
  onCreateNew: () => void;
}

export function SessionListSidebar({
  sessions,
  activeSessionId,
  loading,
  onSelectSession,
  onDeleteSession,
  onCreateNew,
}: SessionListSidebarProps) {
  return (
    <div className="w-72 border-r bg-gray-50/50 p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sessions</h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
          title="New session"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No sessions yet</p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Create your first session
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const typeConfig = SESSION_TYPE_LABELS[session.session_type];
            const isActive = activeSessionId === session.id;
            return (
              <div
                key={session.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                }`}
                onClick={() => onSelectSession(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.name}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      {session.session_type === 'top_down' && session.top_down_data?.metrics?.length ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {session.top_down_data.metrics.length} metric{session.top_down_data.metrics.length !== 1 ? 's' : ''}
                        </span>
                      ) : session.session_type === 'gap_analysis' && session.gap_analysis_data?.gaps?.length ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          {session.gap_analysis_data.gaps.length} gap{session.gap_analysis_data.gaps.length !== 1 ? 's' : ''}
                        </span>
                      ) : session.findings?.length > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          {session.findings.length} finding{session.findings.length !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{session.date}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <ChevronRight
                      className={`w-3 h-3 ${isActive ? 'text-purple-500' : 'text-gray-300'}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
