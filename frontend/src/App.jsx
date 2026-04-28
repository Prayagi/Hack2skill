import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';

// ── App Container ──
function AppContent() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sras_auth');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.user && parsed.token) return parsed;
      localStorage.removeItem('sras_auth');
      return null;
    } catch (e) { return null; }
  });

  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.body.style.backgroundPosition = `${x * 100}% ${y * 100}%`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleLogin = (userData, intendedRole) => {
    setUser(userData);
    localStorage.setItem('sras_auth', JSON.stringify(userData));
    const role = intendedRole || userData.user.role;
    if (role === 'ngo') navigate('/ngo');
    else navigate('/volunteer');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sras_auth');
    navigate('/');
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
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Smart Resource Allocation</h1>
        <p>Advanced Disaster & Community Response System</p>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} user={user} />} />
        <Route path="/ngo/*" element={user?.user?.role === 'ngo' ? <NgoDashboard user={user} /> : <Navigate to="/login" state={{ intendedRole: 'ngo' }} />} />
        <Route path="/volunteer/*" element={user?.user?.role === 'volunteer' ? <VolunteerDashboard user={user} /> : <Navigate to="/login" state={{ intendedRole: 'volunteer' }} />} />
      </Routes>
    </div>
  );
}

// ── Landing Page ──
function LandingPage({ user }) {
  const navigate = useNavigate();
  return (
    <div className="grid-2" style={{ maxWidth: '1000px', margin: '40px auto' }}>
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <span className="icon" style={{ fontSize: '4.5rem' }}>🏢</span>
        <h2 style={{ fontSize: '2rem', margin: '16px 0' }}>NGO Control Center</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Dispatch tasks and monitor real-time resource allocation.</p>
        <button className="btn btn-primary btn-pulse" onClick={() => navigate(user?.user?.role === 'ngo' ? '/ngo' : '/login', { state: { intendedRole: 'ngo' } })} style={{ width: '80%', padding: '18px' }}>Enter NGO Dashboard ➔</button>
      </div>
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <span className="icon" style={{ fontSize: '4.5rem' }}>🦸‍♂️</span>
        <h2 style={{ fontSize: '2rem', margin: '16px 0' }}>Volunteer Portal</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Accept assignments and track your impact on the ground.</p>
        <button className="btn btn-primary" onClick={() => navigate(user?.user?.role === 'volunteer' ? '/volunteer' : '/login', { state: { intendedRole: 'volunteer' } })} style={{ width: '80%', padding: '18px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '2px solid var(--accent)' }}>Access My Assignments ➔</button>
      </div>
    </div>
  );
}

// ── Login Component ──
function Login({ onLogin, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const intendedRole = location.state?.intendedRole;
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: intendedRole || 'volunteer', skills: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && (!intendedRole || user.user.role === intendedRole)) {
      navigate(user.user.role === 'ngo' ? '/ngo' : '/volunteer');
    }
  }, [user, intendedRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const dataToSubmit = { ...formData, skills: formData.skills.split(',').map(s => s.trim()) };
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Auth failed');
      onLogin(data, intendedRole);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '450px', margin: '40px auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <div className="form-group"><label>Full Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
        )}
        <div className="form-group"><label>Email Address</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
        <div className="form-group"><label>Password</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required /></div>
        {isRegister && (
          <>
            <div className="form-group"><label>Skills (comma separated)</label><input type="text" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="e.g. First Aid, Driving, Coding" /></div>
            <div className="form-group"><label>Location</label><input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Downtown, NY" /></div>
            <div className="form-group">
              <label>Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="volunteer">Volunteer</option>
                <option value="ngo">NGO Admin</option>
              </select>
            </div>
          </>
        )}
        <button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}</button>
      </form>
      <p style={{ marginTop: '16px', textAlign: 'center' }}>
        {isRegister ? 'Already have an account?' : 'New here?'} 
        <button onClick={() => setIsRegister(!isRegister)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}> {isRegister ? 'Sign In' : 'Sign Up'}</button>
      </p>
    </div>
  );
}

// ── Volunteer Dashboard ──
function VolunteerDashboard({ user }) {
  const [view, setView] = useState('home'); // home, details, active
  const [selectedTask, setSelectedTask] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [stats, setStats] = useState({ impactScore: 0, completedCount: 0 });

  const fetchData = async () => {
    // Fetch assignments
    const resA = await fetch('http://localhost:5000/api/tasks/my', { headers: { 'Authorization': `Bearer ${user.token}` } });
    const jsonA = await resA.json();
    setAssignments(jsonA);

    // Fetch all available tasks for marketplace
    const resS = await fetch('http://localhost:5000/api/state', { headers: { 'Authorization': `Bearer ${user.token}` } });
    const jsonS = await resS.json();
    setAllTasks(jsonS.tasks.filter(t => t.status === 'open'));
    
    // Set stats
    const completed = jsonA.filter(a => a.status === 'completed');
    setStats({ impactScore: user.user.impactScore || (completed.length * 50), completedCount: completed.length });
  };

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 10000);
    return () => clearInterval(inv);
  }, []);

  const handleUpdateProgress = async (id, progress) => {
    await fetch(`http://localhost:5000/api/tasks/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ progress }),
    });
    fetchData();
  };

  const handleComplete = async (id) => {
    await fetch(`http://localhost:5000/api/tasks/${id}/complete`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user.token}` },
    });
    setView('home');
    fetchData();
  };

  return (
    <div className="volunteer-flow">
      {/* ── Header Stats ── */}
      <div className="grid-4" style={{ marginBottom: '30px' }}>
        <div className="glass-panel stats-card">
          <span className="stats-label">Impact Score</span>
          <span className="stats-value" style={{ color: 'var(--accent)' }}>{stats.impactScore}</span>
        </div>
        <div className="glass-panel stats-card">
          <span className="stats-label">Completed</span>
          <span className="stats-value" style={{ color: 'var(--success)' }}>{stats.completedCount}</span>
        </div>
        <div className="glass-panel stats-card">
          <span className="stats-label">Active Task</span>
          <span className="stats-value">{assignments.filter(a => a.status !== 'completed').length}</span>
        </div>
        <div className="glass-panel stats-card">
          <span className="stats-label">Ranking</span>
          <span className="stats-value">#12</span>
        </div>
      </div>

      {view === 'home' && (
        <div className="grid-2">
          <div className="glass-panel">
            <h3>🎯 Recommended Tasks</h3>
            {allTasks.length === 0 && <p>No tasks available right now.</p>}
            {allTasks.map(t => (
              <div key={t._id} className="request-card" onClick={() => { setSelectedTask(t); setView('details'); }} style={{ cursor: 'pointer', marginBottom: '15px' }}>
                <h4>{t.title} <span className="badge">{t.priority}</span></h4>
                <p>📍 {t.location}</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Requires: {t.skillsRequired?.join(', ') || 'General'}</p>
              </div>
            ))}
          </div>
          <div className="glass-panel">
            <h3>📍 My Current Assignments</h3>
            {assignments.filter(a => a.status !== 'completed').map(a => (
              <div key={a._id} className="request-card in-progress" onClick={() => { setSelectedTask(a); setView('active'); }} style={{ cursor: 'pointer', marginBottom: '15px' }}>
                <h4>{a.taskId?.title}</h4>
                <div style={{ marginTop: '10px' }}>
                  <label>Progress: {a.progress}%</label>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${a.progress}%`, height: '100%', background: 'var(--success)' }}></div>
                  </div>
                </div>
              </div>
            ))}
            {assignments.filter(a => a.status !== 'completed').length === 0 && <p>You have no active tasks. Explore the recommendations!</p>}
          </div>
        </div>
      )}

      {view === 'details' && selectedTask && (
        <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button className="btn btn-sm" onClick={() => setView('home')}>← Back</button>
          <h2 style={{ marginTop: '20px' }}>{selectedTask.title}</h2>
          <p className="badge" style={{ display: 'inline-block', marginBottom: '20px' }}>{selectedTask.priority} Priority</p>
          <div className="task-info">
            <p><strong>📍 Location:</strong> {selectedTask.location}</p>
            <p><strong>🛠 Required Skills:</strong> {selectedTask.skillsRequired?.join(', ') || 'None specified'}</p>
            <p style={{ marginTop: '20px' }}>{selectedTask.description || 'No detailed description provided.'}</p>
          </div>
          <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { /* Real accept logic would go here */ alert("Task request sent to NGO!"); setView('home'); }}>Request to Join</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => setView('home')}>Skip Task</button>
          </div>
        </div>
      )}

      {view === 'active' && selectedTask && (
        <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button className="btn btn-sm" onClick={() => setView('home')}>← Back</button>
          <h2 style={{ marginTop: '20px' }}>🚀 In Progress: {selectedTask.taskId?.title}</h2>
          <div className="progress-section" style={{ margin: '30px 0' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontSize: '1.2rem' }}>Update Your Progress: {selectedTask.progress}%</label>
            <input type="range" min="0" max="100" value={selectedTask.progress} onChange={(e) => handleUpdateProgress(selectedTask._id, e.target.value)} style={{ width: '100%', height: '15px' }} />
          </div>
          <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', marginBottom: '30px' }}>
            <h4>Team Members</h4>
            <p>👤 You (Lead) | 👤 System Bot (Support)</p>
          </div>
          <div className="upload-section">
            <label>Upload Proof (Report/Image)</label>
            <div style={{ padding: '30px', border: '2px dashed var(--glass-border)', borderRadius: '10px', textAlign: 'center', marginTop: '10px' }}>
              📁 Click to select file or drag & drop
            </div>
          </div>
          <button className="btn btn-success btn-full" style={{ marginTop: '30px' }} onClick={() => handleComplete(selectedTask._id)}>Mark as Complete & Submit</button>
        </div>
      )}
    </div>
  );
}

// ── NGO Dashboard ──
function NgoDashboard({ user }) {
  const [view, setView] = useState('admin'); // admin, matching, reviews
  const [data, setData] = useState({ tasks: [], assignments: [], volunteers: [], logs: [], metrics: {} });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', location: '', skillsRequired: '' });
  const [matchingResults, setMatchingResults] = useState(null);

  const fetchData = async () => {
    const res = await fetch('http://localhost:5000/api/state', { headers: { 'Authorization': `Bearer ${user.token}` } });
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 5000);
    return () => clearInterval(inv);
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const taskToSave = { ...newTask, skillsRequired: newTask.skillsRequired.split(',').map(s => s.trim()).filter(s => s) };
    await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify(taskToSave),
    });
    setNewTask({ title: '', description: '', priority: 'medium', location: '', skillsRequired: '' });
    fetchData();
  };

  const handleAssign = async (taskId, volunteerId) => {
    await fetch(`http://localhost:5000/api/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ volunteerId }),
    });
    setMatchingResults(null);
    fetchData();
  };

  const handleSuggestMatch = async (task) => {
    const res = await fetch('http://localhost:5000/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ title: task.title, location: task.location, skillsRequired: task.skillsRequired, priority: task.priority }),
    });
    const json = await res.json();
    setMatchingResults({ taskId: task._id, matches: json });
  };

  return (
    <div className="ngo-flow">
      {/* ── Navigation ── */}
      <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '15px', marginBottom: '30px' }}>
        <button className={`btn btn-sm ${view === 'admin' ? 'btn-primary' : ''}`} onClick={() => setView('admin')}>📊 Admin Dashboard</button>
        <button className={`btn btn-sm ${view === 'reviews' ? 'btn-primary' : ''}`} onClick={() => setView('reviews')}>📝 Review & Feedback</button>
      </div>

      {view === 'admin' && (
        <div className="dashboard-layout">
          <div className="grid-4" style={{ marginBottom: '30px' }}>
            <div className="glass-panel stats-card"><span className="stats-label">Active Issues</span><span className="stats-value">{data.tasks.length}</span></div>
            <div className="glass-panel stats-card"><span className="stats-label">Volunteers</span><span className="stats-value">{data.volunteers.length}</span></div>
            <div className="glass-panel stats-card"><span className="stats-label">Completion</span><span className="stats-value" style={{ color: 'var(--success)' }}>{Math.round((data.metrics.completedTasks/data.metrics.totalTasks)*100 || 0)}%</span></div>
            <div className="glass-panel stats-card"><span className="stats-label">Live Ops</span><span className="stats-value" style={{ color: 'var(--accent)' }}>{data.metrics.activeAssignments}</span></div>
          </div>

          <div className="grid-2">
            <div className="glass-panel">
              <h3>🚨 New Entry / Problem Upload</h3>
              <form onSubmit={handleCreateTask}>
                <div className="form-group"><label>Issue Title</label><input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required /></div>
                <div className="form-group"><label>Location</label><input value={newTask.location} onChange={e => setNewTask({...newTask, location: e.target.value})} required /></div>
                <div className="form-group"><label>Priority</label><select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                <div className="form-group"><label>Description</label><textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} /></div>
                <button className="btn btn-primary btn-full">Dispatch Problem</button>
              </form>
            </div>
            <div className="glass-panel">
              <h3>📡 Execution Monitor</h3>
              {data.tasks.map(t => (
                <div key={t._id} className={`request-card ${t.status}`} style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.title}</span>
                    <button className="btn btn-sm btn-accent" onClick={() => handleSuggestMatch(t)}>✨ Suggest Match</button>
                  </div>
                  {matchingResults?.taskId === t._id && (
                    <div className="match-area" style={{ marginTop: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                      {matchingResults.matches.map(m => (
                        <div key={m.volunteer.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                          <span>{m.volunteer.name} ({Math.round(m.score*100)}%)</span>
                          <button className="btn btn-sm btn-success" onClick={() => handleAssign(t._id, m.volunteer.id)}>Assign</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'reviews' && (
        <div className="glass-panel">
          <h2>Review & Approve Completion</h2>
          {data.assignments.filter(a => a.status === 'completed').length === 0 && <p>No completed tasks to review yet.</p>}
          {data.assignments.filter(a => a.status === 'completed').map(a => (
            <div key={a._id} className="request-card" style={{ marginBottom: '20px' }}>
              <h3>{a.taskId?.title}</h3>
              <p>Completed by: <strong>{a.volunteerId?.name}</strong></p>
              <div style={{ margin: '15px 0', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <p>🖼 <em>Proof of work attached: [proof-image.jpg]</em></p>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label>Rate Volunteer (1-5)</label>
                  <input type="number" min="1" max="5" defaultValue="5" />
                </div>
                <button className="btn btn-success" style={{ flex: 2 }}>Approve & Grant Impact Score</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
