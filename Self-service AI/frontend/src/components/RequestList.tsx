import { useState } from 'react';
import type { ChangeRequest, RequestStatus, TriageResult } from '../types';
import { requestsApi } from '../api';
import { ClarificationForm } from './ClarificationForm';
import { validateUrl, sanitizeErrorMessage } from '../utils/validation';

interface RequestListProps {
  requests: ChangeRequest[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: '#6b7280',
  triaging: '#f59e0b',
  analyzed: '#8b5cf6',
  awaiting_clarification: '#f59e0b',
  in_progress: '#3b82f6',
  validating: '#8b5cf6',
  testing: '#8b5cf6',
  pr_created: '#10b981',
  completed: '#22c55e',
  failed: '#ef4444',
  needs_human: '#f97316',
};

const TRIAGE_LABELS: Record<TriageResult, string> = {
  auto_fix: 'Auto-Fix',
  assisted_fix: 'Assisted',
  human_design: 'Human Design',
  clarification_needed: 'Needs Clarification',
};

export function RequestList({ requests, onRefresh }: RequestListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [submittingClarification, setSubmittingClarification] = useState<string | null>(null);

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      await requestsApi.execute(id);
      onRefresh();
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setExecuting(null);
    }
  };

  const handleClarificationSubmit = async (id: string, answers: string) => {
    setSubmittingClarification(id);
    try {
      await requestsApi.submitClarification(id, answers);
      // Clear expanded state and refresh
      setExpandedId(null);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to submit clarification:', error);
      const message = sanitizeErrorMessage(error);
      alert(message);
    } finally {
      setSubmittingClarification(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (requests.length === 0) {
    return (
      <div className="request-list empty">
        <p>No requests yet. Submit one using the form above.</p>
      </div>
    );
  }

  return (
    <div className="request-list">
      <div className="list-header">
        <h2>Change Requests</h2>
        <button onClick={onRefresh} className="btn btn-outline btn-sm">
          Refresh
        </button>
      </div>

      <div className="requests">
        {requests.map(request => (
          <div key={request.id} className="request-card">
            <div
              className="request-header"
              onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
            >
              <div className="request-main">
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_COLORS[request.status] }}
                >
                  {request.status.replace('_', ' ')}
                </span>
                <h3>{request.title}</h3>
              </div>
              <div className="request-meta">
                <span className="client">{request.clientId}</span>
                <span className="model">{request.modelName}</span>
                <span className={`urgency urgency-${request.urgency}`}>
                  {request.urgency}
                </span>
              </div>
            </div>

            {expandedId === request.id && (
              <div className="request-details">
                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{request.description}</p>
                </div>

                {request.status === 'awaiting_clarification' && request.clarificationQuestions && (
                  <>
                    {request.clarificationAttempts && request.clarificationAttempts >= 2 && (
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '14px',
                        color: '#92400e'
                      }}>
                        ⚠ Multiple clarification rounds ({request.clarificationAttempts}).
                        Consider providing more detail or contacting support.
                      </div>
                    )}
                    <ClarificationForm
                      questions={request.clarificationQuestions}
                      onSubmit={(answers) => handleClarificationSubmit(request.id, answers)}
                      isSubmitting={submittingClarification === request.id}
                    />
                  </>
                )}

                {request.status === 'analyzed' && request.analysisReport && (
                  <div className="detail-section" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#6d28d9', marginTop: 0 }}>Analysis Report</h4>
                    <p style={{ fontWeight: 500 }}>{request.analysisReport.summary}</p>
                    <p style={{ color: '#4b5563', fontSize: '14px' }}>{request.analysisReport.reasoning}</p>

                    {request.analysisReport.warnings.length > 0 && (
                      <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                        {request.analysisReport.warnings.map((w, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#92400e' }}>⚠ {w}</div>
                        ))}
                      </div>
                    )}

                    {request.analysisReport.knockOnEffects && request.analysisReport.knockOnEffects.length > 0 && (
                      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
                          Knock-On Effects & Engineer Guidance
                        </h5>
                        {request.analysisReport.knockOnEffects.map((effect, i) => (
                          <div key={i} style={{
                            padding: '8px 10px',
                            marginBottom: i < request.analysisReport!.knockOnEffects.length - 1 ? '6px' : 0,
                            background: effect.severity === 'action_required' ? '#fef2f2' : effect.severity === 'warning' ? '#fffbeb' : '#f0fdf4',
                            border: `1px solid ${effect.severity === 'action_required' ? '#fca5a5' : effect.severity === 'warning' ? '#fcd34d' : '#86efac'}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: effect.severity === 'action_required' ? '#dc2626' : effect.severity === 'warning' ? '#d97706' : '#16a34a',
                                color: 'white',
                              }}>
                                {effect.severity === 'action_required' ? 'ACTION' : effect.severity === 'warning' ? 'WARN' : 'INFO'}
                              </span>
                              <strong style={{ color: '#1f2937' }}>{effect.area}</strong>
                            </div>
                            <div style={{ color: '#374151', marginBottom: '3px' }}>{effect.description}</div>
                            <div style={{ color: '#4b5563', fontStyle: 'italic' }}>Recommendation: {effect.recommendation}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {request.analysisReport.proposedChanges.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '12px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #c4b5fd', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Action</th>
                              <th style={{ padding: '6px 8px' }}>Table</th>
                              <th style={{ padding: '6px 8px' }}>Measure</th>
                              <th style={{ padding: '6px 8px' }}>DAX Expression</th>
                              <th style={{ padding: '6px 8px' }}>Format</th>
                            </tr>
                          </thead>
                          <tbody>
                            {request.analysisReport.proposedChanges.map((change, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '6px 8px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    background: change.type === 'create' ? '#d1fae5' : change.type === 'delete' ? '#fee2e2' : '#dbeafe',
                                    color: change.type === 'create' ? '#065f46' : change.type === 'delete' ? '#991b1b' : '#1e40af',
                                  }}>
                                    {change.type}
                                  </span>
                                </td>
                                <td style={{ padding: '6px 8px' }}>{change.tableName}</td>
                                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{change.measureName}</td>
                                <td style={{ padding: '6px 8px' }}>
                                  {change.expression && (
                                    <code style={{ fontSize: '12px', background: '#1e1e2e', color: '#a5f3fc', padding: '4px 8px', borderRadius: '4px', display: 'block', whiteSpace: 'pre-wrap', maxWidth: '400px' }}>
                                      {change.expression}
                                    </code>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '12px' }}>{change.formatString || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button
                        onClick={() => handleExecute(request.id)}
                        disabled={executing === request.id}
                        style={{
                          padding: '8px 20px',
                          background: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: executing === request.id ? 'not-allowed' : 'pointer',
                          opacity: executing === request.id ? 0.6 : 1,
                        }}
                      >
                        {executing === request.id ? 'Executing...' : 'Approve & Execute'}
                      </button>
                      <button
                        disabled
                        title="Agent remediation — coming soon"
                        style={{
                          padding: '8px 20px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          opacity: 0.5,
                        }}
                      >
                        Remediate via Agent (TODO)
                      </button>
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-item">
                    <label>Change Type</label>
                    <span>{request.changeType.replace(/_/g, ' ')}</span>
                  </div>
                  {request.triageResult && (
                    <div className="detail-item">
                      <label>Triage Result</label>
                      <span className={`triage triage-${request.triageResult}`}>
                        {TRIAGE_LABELS[request.triageResult]}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{formatDate(request.createdAt)}</span>
                  </div>
                </div>

                {request.prUrl && validateUrl(request.prUrl) && (
                  <div className="detail-section">
                    <h4>Pull Request</h4>
                    <a href={request.prUrl} target="_blank" rel="noopener noreferrer">
                      {request.prUrl}
                    </a>
                  </div>
                )}

                {request.executionLog.length > 0 && (
                  <div className="detail-section">
                    <h4>Execution Log</h4>
                    <div className="log-entries">
                      {request.executionLog.map((entry, idx) => (
                        <div key={idx} className={`log-entry log-${entry.status}`}>
                          <span className="log-time">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="log-action">{entry.action}</span>
                          <span className="log-details">{entry.details}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {request.testResults && request.testResults.length > 0 && (
                  <div className="detail-section">
                    <h4>Test Results</h4>
                    <div className="test-results">
                      {request.testResults.map((test, idx) => (
                        <div key={idx} className={`test-result ${test.passed ? 'passed' : 'failed'}`}>
                          <span className="test-icon">{test.passed ? '✓' : '✗'}</span>
                          <span className="test-name">{test.testName}</span>
                          <span className="test-message">{test.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="request-actions">
                  {request.status === 'needs_human' && (
                    <button
                      onClick={() => handleExecute(request.id)}
                      disabled={executing === request.id}
                      className="btn btn-primary"
                    >
                      {executing === request.id ? 'Executing...' : 'Retry Execution'}
                    </button>
                  )}
                  {request.status === 'pr_created' && (
                    <button className="btn btn-success">Mark Complete</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
