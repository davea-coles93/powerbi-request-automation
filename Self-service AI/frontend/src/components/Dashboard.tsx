import type { Stats, RequestStatus } from '../types';

interface DashboardProps {
  stats: Stats | null;
  isConnected: boolean;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  triaging: 'Triaging',
  awaiting_clarification: 'Awaiting Clarification',
  in_progress: 'In Progress',
  validating: 'Validating',
  testing: 'Testing',
  pr_created: 'PR Created',
  completed: 'Completed',
  failed: 'Failed',
  needs_human: 'Needs Human',
};

export function Dashboard({ stats, isConnected }: DashboardProps) {
  if (!stats) {
    return (
      <div className="dashboard loading">
        <p>Loading stats...</p>
      </div>
    );
  }

  const activeCount =
    stats.byStatus.triaging +
    stats.byStatus.in_progress +
    stats.byStatus.testing;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Requests</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>

        <div className="stat-card success">
          <div className="stat-value">{stats.byStatus.completed}</div>
          <div className="stat-label">Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{(stats.autoFixRate * 100).toFixed(0)}%</div>
          <div className="stat-label">Auto-Fix Rate</div>
        </div>
      </div>

      <div className="status-breakdown">
        <h3>Status Breakdown</h3>
        <div className="status-bars">
          {(Object.entries(stats.byStatus) as [RequestStatus, number][])
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status} className="status-bar">
                <div className="status-info">
                  <span className="status-name">{STATUS_LABELS[status]}</span>
                  <span className="status-count">{count}</span>
                </div>
                <div className="bar-container">
                  <div
                    className={`bar bar-${status}`}
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="info-panel">
        <h3>How It Works</h3>
        <ol>
          <li>
            <strong>Submit</strong> - Client submits a change request via form
          </li>
          <li>
            <strong>Triage</strong> - Claude analyzes the request and classifies it
          </li>
          <li>
            <strong>Execute</strong> - For auto-fixable changes, Claude implements the DAX/model changes
          </li>
          <li>
            <strong>Test</strong> - Changes are validated against the PowerBI model
          </li>
          <li>
            <strong>PR</strong> - Successful changes create a pull request for review
          </li>
        </ol>

        <h4>Triage Categories</h4>
        <ul>
          <li><strong>Auto-Fix:</strong> Simple changes executed automatically (DAX tweaks, new measures)</li>
          <li><strong>Assisted:</strong> Claude helps but human reviews before merge</li>
          <li><strong>Human Design:</strong> Complex requirements needing architect input</li>
          <li><strong>Clarification:</strong> Request needs more details before proceeding</li>
        </ul>
      </div>
    </div>
  );
}
