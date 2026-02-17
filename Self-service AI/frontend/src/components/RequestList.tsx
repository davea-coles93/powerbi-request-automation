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
