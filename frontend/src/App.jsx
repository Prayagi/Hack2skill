import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';

// ── Shared App State & Logic Component ──
function AppContent() {
  const [state, setState] = useState({ volunteers: [], requests: [], logs: [], metrics: {} });
  const [theme, setTheme] = useState('light');
  
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sras_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const navigate = useNavigate();

  // ── Dynamic Background on Mouse Move ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.body.style.backgroundPosition = `${x * 100}% ${y * 100}%`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // ── Auth Handlers ──
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('sras_auth', JSON.stringify(userData));
    if (userData.role === 'ngo') navigate('/ngo');
    else navigate('/volunteer');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sras_auth');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      </button>

      {user && (
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      )}

      <header className="app-header">
        <h1>Smart Resource Allocation</h1>
        <p>Connecting NGOs and Volunteers intelligently for rapid disaster and community response.</p>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to={user ? (user.role === 'ngo' ? '/ngo' : '/volunteer') : '/login'} />} />
        
        <Route 
          path="/login" 
          element={!user ? <Login volunteers={state.volunteers} onLogin={handleLogin} /> : <Navigate to={user.role === 'ngo' ? '/ngo' : '/volunteer'} />} 
        />
        
        <Route 
          path="/ngo" 
          element={user?.role === 'ngo' ? <NgoDashboard state={state} fetchState={fetchState} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/volunteer" 
          element={user?.role === 'volunteer' ? <VolunteerDashboard state={state} fetchState={fetchState} user={user} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </div>
  );
}

// ──────────────────────────────────────
// PAGES
// ──────────────────────────────────────

// ── Login Page ──
function Login({ volunteers, onLogin }) {
  const [volId, setVolId] = useState('');

  return (
    <div className="grid-2" style={{ maxWidth: '1000px', margin: '40px auto' }}>
      {/* NGO Login */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '24px', borderBottom: 'none' }}>
          <span className="icon" style={{ fontSize: '4.5rem' }}>🏢</span>
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px', fontWeight: 800 }}>NGO Control Center</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem', padding: '0 20px' }}>
          Dispatch urgent tasks, monitor global metrics, and manage your volunteer workforce in real-time.
        </p>
        <button 
          className="btn btn-primary btn-pulse" 
          onClick={() => onLogin({ role: 'ngo', name: 'NGO Admin' })}
          style={{ width: '80%', padding: '20px', fontSize: '1.2rem' }}
        >
          Enter NGO Dashboard ➔
        </button>
      </div>

      {/* Volunteer Login */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '24px', borderBottom: 'none' }}>
          <span className="icon" style={{ fontSize: '4.5rem' }}>🦸‍♂️</span>
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px', fontWeight: 800 }}>Volunteer Portal</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem', padding: '0 20px' }}>
          Ready to help? Log in to your profile to receive smart-matched assignments based on your skills.
        </p>
        <div className="form-group" style={{ width: '80%', textAlign: 'left', marginBottom: 0 }}>
          <label style={{ textAlign: 'center', display: 'block', marginBottom: '12px' }}>Select Your Profile</label>
          <select 
            value={volId} 
            onChange={(e) => setVolId(e.target.value)}
            style={{ marginBottom: '20px', padding: '16px', fontSize: '1.1rem' }}
          >
            <option value="">-- Choose Profile --</option>
            {volunteers.map(v => (
              <option key={v.id} value={v.id}>{v.name} (Efficiency: {v.efficiency})</option>
            ))}
          </select>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '2px solid var(--accent)', padding: '16px', fontSize: '1.1rem' }}
            disabled={!volId}
            onClick={() => {
              const v = volunteers.find(vol => vol.id === volId);
              if (v) onLogin({ role: 'volunteer', id: v.id, name: v.name });
            }}
          >
            Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NGO Dashboard ──
function NgoDashboard({ state, fetchState }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(5);

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

  const getUrgencyClass = (u) => (u >= 8 ? 'urgency-high' : u >= 5 ? 'urgency-medium' : 'urgency-low');
  const getUrgencyLabel = (u) => (u >= 8 ? '🔴 Critical' : u >= 5 ? '🟡 Medium' : '🟢 Low');
  const getVolunteerName = (id) => {
    const v = state.volunteers.find((v) => v.id === id);
    return v ? v.name : 'Unassigned';
  };

  const totalRequests = state.requests.length;
  const activeRequests = state.requests.filter((r) => r.status !== 'completed');
  const completedRequests = state.requests.filter((r) => r.status === 'completed');

  return (
    <div className="grid-2">
      <div>
        <div className="metrics-strip">
          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--accent)' }}>{totalRequests}</div>
            <div className="metric-label">Total Requests</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--warning)' }}>{activeRequests.length}</div>
            <div className="metric-label">Active</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--success)' }}>{completedRequests.length}</div>
            <div className="metric-label">Completed</div>
          </div>
        </div>

        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">📋</span>
            <h2>Dispatch Task</h2>
          </div>
          <form onSubmit={submitRequest}>
            <div className="form-group">
              <label>Task Title</label>
              <input
                placeholder="e.g. Deliver medical supplies to Sector 4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Detailed Description</label>
              <textarea
                placeholder="Provide location details, requirements, and context for the volunteers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Urgency Level (1-10)</label>
              <div className="urgency-slider-group" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="urgency-value">{urgency}</div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={urgency}
                  onChange={(e) => setUrgency(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '1rem', fontWeight: 800, color: urgency >= 8 ? 'var(--danger)' : urgency >= 5 ? 'var(--warning)' : 'var(--success)', minWidth: '100px', textAlign: 'right' }}>
                  {getUrgencyLabel(urgency)}
                </span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-pulse" style={{ marginTop: '16px', padding: '18px', fontSize: '1.2rem' }}>
              🚀 Dispatch Immediately
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div className="glass-panel">
          <div className="section-header">
            <span className="icon">📡</span>
            <h2>Active Tasks Monitor</h2>
            {activeRequests.length > 0 && <span className="badge">{activeRequests.length}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeRequests.map((r) => (
              <div key={r.id} className={`request-card ${r.status}`}>
                <div className="request-header">
                  <span className="request-title">{r.title}</span>
                  <span className={`urgency-badge ${getUrgencyClass(r.urgency)}`}>
                    Urgency {r.urgency}
                  </span>
                </div>
                {r.description && <p className="request-desc">{r.description}</p>}
                <div className="request-status">
                  {r.status === 'pending' && <><span style={{fontSize:'1.2rem'}}>⏳</span> Pending Assignment (Finding matching volunteer...)</>}
                  {r.status === 'assigned' && <><span style={{fontSize:'1.2rem'}}>🔔</span> Assigned to {getVolunteerName(r.assignedTo)} — Waiting for acceptance...</>}
                  {r.status === 'in-progress' && <><span style={{fontSize:'1.2rem'}}>🛠️</span> In Progress by {getVolunteerName(r.assignedTo)}</>}
                </div>
              </div>
            ))}
            {activeRequests.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>All Clear!</h3>
                <p className="filler-text">There are no active requests pending or in progress right now. The queue is completely empty.</p>
              </div>
            )}
          </div>
        </div>

        {completedRequests.length > 0 && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div className="section-header">
              <span className="icon">✅</span>
              <h2>Recent Completions</h2>
              <span className="badge" style={{ background: 'var(--success)' }}>{completedRequests.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {completedRequests.slice(0, 4).map((r) => (
                <div key={r.id} className="request-card completed" style={{ padding: '16px 20px' }}>
                  <div className="request-header" style={{ marginBottom: 0 }}>
                    <span className="request-title" style={{ textDecoration: 'line-through' }}>{r.title}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ✓ Done by {getVolunteerName(r.assignedTo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Volunteer Dashboard ──
function VolunteerDashboard({ state, fetchState, user }) {
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

  const getUrgencyClass = (u) => (u >= 8 ? 'urgency-high' : u >= 5 ? 'urgency-medium' : 'urgency-low');
  
  const selectedV = state.volunteers.find(v => v.id === user.id);
  let assignedTasks = [];
  let inProgressTasks = [];

  if (selectedV) {
    assignedTasks = state.requests.filter(r => r.status === 'assigned' && r.assignedTo === selectedV.id);
    inProgressTasks = state.requests.filter(r => r.status === 'in-progress' && r.assignedTo === selectedV.id);
  }

  return (
    <div className="grid-1" style={{ maxWidth: '850px', margin: '0 auto' }}>
      
      {selectedV && (
        <div className="volunteer-profile">
          <div className="volunteer-profile-avatar">
            {selectedV.name.charAt(0)}
          </div>
          <div className="volunteer-profile-details">
            <div className="volunteer-profile-name">Welcome back, {selectedV.name}!</div>
            <div className="volunteer-profile-skills">
              <span style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
                ⭐️ Efficiency: <strong>{selectedV.efficiency}/10</strong>
              </span>
              {selectedV.skills && selectedV.skills.map(s => (
                <span key={s} style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '4px 12px', borderRadius: '50px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {s}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                Status: 
                {selectedV.available ? 
                  <span style={{color: 'var(--success)', display:'flex', alignItems:'center', gap:'6px'}}><span style={{width:'12px', height:'12px', background:'var(--success)', borderRadius:'50%', boxShadow:'0 0 10px var(--success)'}}></span> Available</span> : 
                  <span style={{color: 'var(--warning)', display:'flex', alignItems:'center', gap:'6px'}}><span style={{width:'12px', height:'12px', background:'var(--warning)', borderRadius:'50%'}}></span> Busy</span>
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedV && (
        <>
          <div className="glass-panel" style={{ border: assignedTasks.length > 0 ? '2px solid var(--warning)' : '', padding: '32px' }}>
            <div className="section-header">
              <span className="icon">🔔</span>
              <h2>Action Required</h2>
              {assignedTasks.length > 0 && <span className="badge" style={{background: 'var(--warning)'}}>{assignedTasks.length}</span>}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {assignedTasks.map((r) => (
                <div key={r.id} className="request-card assigned">
                  <div className="request-header">
                    <span className="request-title" style={{ fontSize: '1.4rem' }}>{r.title}</span>
                    <span className={`urgency-badge ${getUrgencyClass(r.urgency)}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                      Urgency {r.urgency}
                    </span>
                  </div>
                  {r.description && <div className="request-desc" style={{ fontSize: '1.05rem' }}>{r.description}</div>}
                  <div className="request-action" style={{ marginTop: '24px', paddingTop: '24px' }}>
                    <span className="request-action-text" style={{ color: 'var(--warning)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{fontSize:'1.5rem'}}>⏱️</span> You have exactly 15 seconds to accept!
                    </span>
                    <button className="btn btn-primary btn-pulse" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={() => acceptTask(r.id)}>
                      ✅ Accept Task Now
                    </button>
                  </div>
                </div>
              ))}
              {assignedTasks.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">☕</div>
                  <h3>You're all caught up!</h3>
                  <p className="filler-text">You have no pending assignments right now. Take a break or wait for the system to match you with a new urgent task.</p>
                </div>
              )}
            </div>
          </div>

          {inProgressTasks.length > 0 && (
            <div className="glass-panel" style={{ border: '2px solid var(--success)', padding: '32px' }}>
              <div className="section-header">
                <span className="icon">🛠️</span>
                <h2>My Active Mission</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {inProgressTasks.map((r) => (
                  <div key={r.id} className="request-card in-progress">
                    <div className="request-header">
                      <span className="request-title" style={{ fontSize: '1.4rem' }}>{r.title}</span>
                      <span className={`urgency-badge ${getUrgencyClass(r.urgency)}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                        Urgency {r.urgency}
                      </span>
                    </div>
                    {r.description && <div className="request-desc" style={{ fontSize: '1.05rem' }}>{r.description}</div>}
                    <div className="request-action" style={{ marginTop: '24px', paddingTop: '24px' }}>
                      <span className="request-action-text" style={{ color: 'var(--success)', fontSize: '1rem' }}>
                        Complete the mission and mark it done to become available again.
                      </span>
                      <button className="btn btn-success" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={() => completeTask(r.id)}>
                        ✔️ Mission Completed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Root Wrapper ──
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
