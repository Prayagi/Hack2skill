import React, { useState, useEffect, useMemo } from 'react';
import './index.css';

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function App() {
  const [state, setState] = useState({ volunteers: [], requests: [], logs: [] });
  const [theme, setTheme] = useState('light');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(5);

  // ── Fetch state from backend every 2s ──
  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/state');
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error('Backend unreachable:', err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Theme Toggle ──
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // ── Submit new request ──
  const submitRequest = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, urgency }),
      });
      setTitle('');
      setDescription('');
      setUrgency(5);
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptTask = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/requests/${id}/accept`, { method: 'POST' });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const completeTask = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/requests/${id}/complete`, { method: 'POST' });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Derived metrics ──
  const metrics = useMemo(() => {
    const total = state.requests.length;
    const completed = state.requests.filter((r) => r.status === 'completed').length;
    const active = state.requests.filter((r) => r.status !== 'completed').length;
    const availableVols = state.volunteers.filter((v) => v.available).length;
    return { total, completed, active, availableVols };
  }, [state]);

  const activeRequests = state.requests.filter((r) => r.status !== 'completed');
  const completedRequests = state.requests.filter((r) => r.status === 'completed');

  const getUrgencyClass = (u) => (u >= 8 ? 'urgency-high' : u >= 5 ? 'urgency-medium' : 'urgency-low');
  const getUrgencyLabel = (u) => (u >= 8 ? '🔴 Critical' : u >= 5 ? '🟡 Medium' : '🟢 Low');

  const getVolunteerName = (id) => {
    const v = state.volunteers.find((v) => v.id === id);
    return v ? v.name : 'Unassigned';
  };

  return (
    <div className="app-container">
      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
      </button>

      {/* Header */}
      <header className="app-header">
        <h1>Smart Resource Allocation</h1>
        <p>Urgency-first prioritization · Intelligent matching · Auto-reassignment</p>
      </header>

      {/* Metrics Strip */}
      <div className="metrics-strip">
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--accent)' }}>{metrics.total}</div>
          <div className="metric-label">Total Requests</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--warning)' }}>{metrics.active}</div>
          <div className="metric-label">Active Tasks</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--success)' }}>{metrics.completed}</div>
          <div className="metric-label">Completed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: 'var(--info)' }}>{metrics.availableVols}</div>
          <div className="metric-label">Available Volunteers</div>
        </div>
      </div>

      {/* Row 1: Form + Volunteers */}
      <div className="main-grid">
        {/* Submit Request Form */}
        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">📋</span>
            <h2>Submit Request</h2>
          </div>
          <form onSubmit={submitRequest}>
            <div className="form-group">
              <label htmlFor="task-title">Task Title</label>
              <input
                id="task-title"
                placeholder="e.g. Deliver supplies to Zone A"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                placeholder="Provide details about the task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Urgency Level</label>
              <div className="urgency-slider-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="urgency-value">{urgency}</div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={urgency}
                  onChange={(e) => setUrgency(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: urgency >= 8 ? 'var(--danger)' : urgency >= 5 ? 'var(--warning)' : 'var(--success)' }}>
                  {getUrgencyLabel(urgency)}
                </span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              🚀 Create Task
            </button>
          </form>
        </div>

        {/* Volunteers Panel */}
        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">👥</span>
            <h2>Volunteers</h2>
            <span className="badge">{state.volunteers.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {state.volunteers.map((v, i) => (
              <div key={v.id} className="volunteer-card">
                <div
                  className="volunteer-avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {v.name.charAt(0)}
                </div>
                <div className="volunteer-info">
                  <div className="volunteer-name">{v.name}</div>
                  <div className="volunteer-meta">
                    Efficiency: {v.efficiency}/10
                    {v.currentTask && ` · Working on task`}
                  </div>
                </div>
                <div
                  className={`status-dot ${v.available ? 'available' : 'busy'}`}
                  title={v.available ? 'Available' : 'Busy'}
                />
              </div>
            ))}
            {state.volunteers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <p>Connecting to server...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Active Requests + Logs */}
      <div className="full-width-grid">
        {/* Active Requests */}
        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">⚡</span>
            <h2>Active Requests</h2>
            {activeRequests.length > 0 && <span className="badge">{activeRequests.length}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeRequests.map((r) => (
              <div key={r.id} className={`request-card ${r.status}`}>
                <div className="request-header">
                  <span className="request-title">{r.title}</span>
                  <span className={`urgency-badge ${getUrgencyClass(r.urgency)}`}>
                    Urgency {r.urgency}
                  </span>
                </div>
                <div className="request-status">
                  {r.status === 'pending' && '⏳ Pending Assignment'}
                  {r.status === 'assigned' && `🔔 Assigned to ${getVolunteerName(r.assignedTo)}`}
                  {r.status === 'in-progress' && `🛠️ In Progress — ${getVolunteerName(r.assignedTo)}`}
                </div>

                {r.status === 'assigned' && (
                  <div className="request-action">
                    <span className="request-action-text" style={{ color: 'var(--warning)' }}>
                      ⏱️ Waiting for acceptance (15s timeout)...
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => acceptTask(r.id)}>
                      ✅ Accept
                    </button>
                  </div>
                )}

                {r.status === 'in-progress' && (
                  <div className="request-action">
                    <span className="request-action-text" style={{ color: 'var(--success)' }}>
                      Task is being worked on...
                    </span>
                    <button className="btn btn-success btn-sm" onClick={() => completeTask(r.id)}>
                      ✔️ Complete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {activeRequests.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No active requests — submit one above!</p>
              </div>
            )}
          </div>

          {/* Completed Section (inline) */}
          {completedRequests.length > 0 && (
            <>
              <div className="section-header" style={{ marginTop: '28px' }}>
                <span className="icon">✅</span>
                <h2>Completed</h2>
                <span className="badge" style={{ background: 'var(--success)' }}>{completedRequests.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedRequests.slice(0, 5).map((r) => (
                  <div key={r.id} className="request-card completed">
                    <div className="request-header">
                      <span className="request-title" style={{ textDecoration: 'line-through', opacity: 0.7 }}>{r.title}</span>
                      <span className={`urgency-badge ${getUrgencyClass(r.urgency)}`}>
                        Urgency {r.urgency}
                      </span>
                    </div>
                    <div className="request-status">
                      Done by {getVolunteerName(r.assignedTo)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* System Logs */}
        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">📡</span>
            <h2>System Logs</h2>
            {state.logs.length > 0 && <span className="badge" style={{ background: 'var(--text-secondary)' }}>{state.logs.length}</span>}
          </div>
          <div className="log-container">
            {state.logs.map((log, i) => (
              <div key={i} className="log-entry">{log}</div>
            ))}
            {state.logs.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No logs yet — events will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
