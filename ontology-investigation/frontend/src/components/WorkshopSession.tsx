import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Users,
  Calendar,
  FileText,
  Loader2,
  ChevronRight,
  Trash2,
  Tag,
  AlertTriangle,
  Search,
  Eye,
  Lightbulb,
  ArrowDownUp,
  Zap,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

interface WorkshopSessionPanelProps {
  onClose: () => void;
}

// --- Types ---

interface WorkshopFinding {
  id: string;
  category:
    | 'missing_supply'
    | 'unused_supply'
    | 'shadow_system'
    | 'high_manual_effort'
    | 'data_quality'
    | 'other';
  description: string;
  related_entity_ids: string[];
  related_attribute_ids: string[];
  priority: 'high' | 'medium' | 'low';
}

interface WorkshopSessionData {
  id: string;
  name: string;
  date: string;
  participants: string[];
  session_type: 'top_down' | 'bottom_up' | 'gap_analysis';
  notes: string | null;
  findings: WorkshopFinding[];
}

type FindingCategory = WorkshopFinding['category'];
type Priority = WorkshopFinding['priority'];
type SessionType = WorkshopSessionData['session_type'];

// --- Constants ---

const CATEGORY_CONFIG: Record<
  FindingCategory,
  { label: string; color: string; bgColor: string; borderColor: string; icon: typeof AlertTriangle }
> = {
  missing_supply: {
    label: 'Missing Supply',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
  },
  unused_supply: {
    label: 'Unused Supply',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: Eye,
  },
  shadow_system: {
    label: 'Shadow System',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: ShieldAlert,
  },
  high_manual_effort: {
    label: 'High Manual Effort',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Zap,
  },
  data_quality: {
    label: 'Data Quality',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Search,
  },
  other: {
    label: 'Other',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: HelpCircle,
  },
};

const SESSION_TYPE_LABELS: Record<SessionType, { label: string; description: string }> = {
  top_down: {
    label: 'Top-Down',
    description: 'Executive perspective: business questions, metrics, requirements',
  },
  bottom_up: {
    label: 'Bottom-Up',
    description: 'Operational: process mapping, data sources, pain points',
  },
  gap_analysis: {
    label: 'Gap Analysis',
    description: 'Cross-reference demand vs supply, identify gaps',
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: 'text-red-700', bgColor: 'bg-red-100' },
  medium: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export function WorkshopSessionPanel({ onClose }: WorkshopSessionPanelProps) {
  const [sessions, setSessions] = useState<WorkshopSessionData[]>([]);
  const [activeSession, setActiveSession] = useState<WorkshopSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newParticipants, setNewParticipants] = useState('');
  const [newType, setNewType] = useState<SessionType>('top_down');

  // Finding form state
  const [findingCategory, setFindingCategory] = useState<FindingCategory>('missing_supply');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingPriority, setFindingPriority] = useState<Priority>('medium');

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/discovery/workshop/sessions');
      setSessions(response.data);
    } catch {
      // Silently handle - sessions list will be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const response = await api.post('/discovery/workshop/sessions', {
        name: newName.trim(),
        date: newDate,
        participants: newParticipants
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        type: newType,
      });
      setSessions((prev) => [...prev, response.data]);
      setActiveSession(response.data);
      setShowCreateForm(false);
      setNewName('');
      setNewParticipants('');
    } catch {
      // Silently handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.delete(`/discovery/workshop/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSession?.id === id) {
        setActiveSession(null);
      }
    } catch {
      // Silently handle error
    }
  };

  const handleAddFinding = async () => {
    if (!activeSession || !findingDescription.trim()) return;
    setSaving(true);
    try {
      const response = await api.post(
        `/discovery/workshop/sessions/${activeSession.id}/findings`,
        {
          category: findingCategory,
          description: findingDescription.trim(),
          priority: findingPriority,
          related_entity_ids: [],
          related_attribute_ids: [],
        }
      );
      setActiveSession(response.data);
      setSessions((prev) =>
        prev.map((s) => (s.id === response.data.id ? response.data : s))
      );
      setFindingDescription('');
      setShowFindingForm(false);
    } catch {
      // Silently handle error
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFinding = async (findingId: string) => {
    if (!activeSession) return;
    try {
      const response = await api.delete(
        `/discovery/workshop/sessions/${activeSession.id}/findings/${findingId}`
      );
      setActiveSession(response.data);
      setSessions((prev) =>
        prev.map((s) => (s.id === response.data.id ? response.data : s))
      );
    } catch {
      // Silently handle error
    }
  };

  const handleSaveNotes = async () => {
    if (!activeSession) return;
    setSaving(true);
    try {
      const response = await api.put(
        `/discovery/workshop/sessions/${activeSession.id}`,
        { notes: notesText }
      );
      setActiveSession(response.data);
      setSessions((prev) =>
        prev.map((s) => (s.id === response.data.id ? response.data : s))
      );
      setEditingNotes(false);
    } catch {
      // Silently handle error
    } finally {
      setSaving(false);
    }
  };

  // Group findings by category
  const groupedFindings: Record<FindingCategory, WorkshopFinding[]> = {
    missing_supply: [],
    unused_supply: [],
    shadow_system: [],
    high_manual_effort: [],
    data_quality: [],
    other: [],
  };
  if (activeSession) {
    for (const finding of activeSession.findings) {
      groupedFindings[finding.category].push(finding);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Workshop Sessions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Record discovery workshops, capture findings and observations
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

        <div className="flex min-h-[400px]">
          {/* Session List (left panel) */}
          <div className="w-72 border-r bg-gray-50/50 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Sessions</h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
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
                  onClick={() => setShowCreateForm(true)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Create your first session
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeSession?.id === session.id
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    <div
                      className="flex items-start justify-between"
                      onClick={() => {
                        setActiveSession(session);
                        setNotesText(session.notes || '');
                        setEditingNotes(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.name}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              SESSION_TYPE_LABELS[session.session_type]
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {SESSION_TYPE_LABELS[session.session_type]?.label || session.session_type}
                          </span>
                          {session.findings.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              {session.findings.length} finding{session.findings.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{session.date}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight
                          className={`w-3 h-3 ${
                            activeSession?.id === session.id
                              ? 'text-purple-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Session Detail (right panel) */}
          <div className="flex-1 p-6 overflow-y-auto">
            {showCreateForm ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">New Workshop Session</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Session Name *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Month-End Close Discovery"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Participants (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newParticipants}
                      onChange={(e) => setNewParticipants(e.target.value)}
                      placeholder="e.g., John Smith, Jane Doe, Bob Wilson"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Session Type
                    </label>
                    <div className="space-y-2">
                      {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, typeof SESSION_TYPE_LABELS[SessionType]][]).map(
                        ([value, config]) => (
                          <label
                            key={value}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              newType === value
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="session_type"
                              value={value}
                              checked={newType === value}
                              onChange={() => setNewType(value)}
                              className="mt-0.5 accent-purple-600"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {config.label}
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                            </div>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSession}
                      disabled={!newName.trim() || saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Create Session
                    </button>
                  </div>
                </div>
              </div>
            ) : activeSession ? (
              <div>
                {/* Session Header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {activeSession.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {activeSession.date}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
                        >
                          {SESSION_TYPE_LABELS[activeSession.session_type]?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  {activeSession.participants.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {activeSession.participants.map((p) => (
                          <span
                            key={p}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
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
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                        placeholder="Record observations, decisions, and key discussion points..."
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
                          disabled={saving}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
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

                {/* Findings Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Findings ({activeSession.findings.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowFindingForm(true)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Finding
                    </button>
                  </div>

                  {/* Finding Creation Form */}
                  {showFindingForm && (
                    <div className="mb-4 p-4 border border-purple-200 bg-purple-50/30 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-800 mb-3">New Finding</h5>

                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Category
                            </label>
                            <div className="relative">
                              <select
                                value={findingCategory}
                                onChange={(e) =>
                                  setFindingCategory(e.target.value as FindingCategory)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              >
                                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                  <option key={key} value={key}>
                                    {config.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Priority
                            </label>
                            <div className="relative">
                              <select
                                value={findingPriority}
                                onChange={(e) => setFindingPriority(e.target.value as Priority)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              >
                                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                  <option key={key} value={key}>
                                    {config.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description *
                          </label>
                          <textarea
                            value={findingDescription}
                            onChange={(e) => setFindingDescription(e.target.value)}
                            rows={3}
                            placeholder="Describe the finding..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFindingForm(false);
                              setFindingDescription('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddFinding}
                            disabled={!findingDescription.trim() || saving}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Add Finding
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Findings grouped by category */}
                  {activeSession.findings.length === 0 ? (
                    <div className="text-center py-6">
                      <ArrowDownUp className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No findings recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Add findings to document gaps, shadow systems, and opportunities
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Object.entries(groupedFindings) as [FindingCategory, WorkshopFinding[]][])
                        .filter(([, findings]) => findings.length > 0)
                        .map(([category, findings]) => {
                          const config = CATEGORY_CONFIG[category];
                          const IconComponent = config.icon;
                          return (
                            <div key={category}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <IconComponent className={`w-3.5 h-3.5 ${config.color}`} />
                                <span className={`text-xs font-semibold ${config.color}`}>
                                  {config.label} ({findings.length})
                                </span>
                              </div>
                              <div className="space-y-2">
                                {findings.map((finding) => (
                                  <div
                                    key={finding.id}
                                    className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-800">
                                          {finding.description}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-2">
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                              PRIORITY_CONFIG[finding.priority].bgColor
                                            } ${PRIORITY_CONFIG[finding.priority].color}`}
                                          >
                                            {PRIORITY_CONFIG[finding.priority].label}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFinding(finding.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                                        title="Remove finding"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Select a session or create a new one</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Workshop sessions capture discovery findings and observations
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
