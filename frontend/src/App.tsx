import { useState, useEffect, useCallback } from 'react';
import { IntakeForm } from './components/IntakeForm';
import { RequestList } from './components/RequestList';
import { Dashboard } from './components/Dashboard';
import { requestsApi, healthApi } from './api';
import { ChangeRequest, Stats } from './types';
import './App.css';

function App() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'dashboard'>('form');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [requestsData, statsData] = await Promise.all([
        requestsApi.getAll(),
        requestsApi.getStats(),
      ]);
      setRequests(requestsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to connect to backend. Make sure the server is running.');
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const health = await healthApi.check();
      setIsConnected(health.status === 'ok');
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    fetchData();

    // Poll for updates
    const interval = setInterval(() => {
      fetchData();
      checkHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData, checkHealth]);

  const handleSubmit = () => {
    fetchData();
    setActiveTab('list');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h2v2H5zm0-4h2v2H5zm0-4h2v2H5zm4 8h10v2H9zm0-4h10v2H9zm0-4h10v2H9z"/>
          </svg>
          <h1>PowerBI Request Automation</h1>
        </div>
        <div className="header-status">
          <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          New Request
        </button>
        <button
          className={`nav-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Requests ({requests.length})
        </button>
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
      </nav>

      <main className="app-main">
        {error && (
          <div className="alert alert-error global-error">
            {error}
          </div>
        )}

        {activeTab === 'form' && <IntakeForm onSubmit={handleSubmit} />}
        {activeTab === 'list' && <RequestList requests={requests} onRefresh={fetchData} />}
        {activeTab === 'dashboard' && <Dashboard stats={stats} isConnected={isConnected} />}
      </main>

      <footer className="app-footer">
        <p>
          POC: AI-Powered PowerBI Change Management |
          Integrates with PowerApps/Dataverse ticketing |
          Claude API for triage & execution
        </p>
      </footer>
    </div>
  );
}

export default App;
