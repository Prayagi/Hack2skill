const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────
// DATA STORE (in-memory)
// ──────────────────────────────────────
let volunteers = [
  { id: 'v1', name: 'Alice Johnson',   available: true, currentTask: null, efficiency: 9, skills: ['logistics', 'medical'] },
  { id: 'v2', name: 'Bob Williams',    available: true, currentTask: null, efficiency: 7, skills: ['teaching', 'logistics'] },
  { id: 'v3', name: 'Charlie Davis',   available: true, currentTask: null, efficiency: 8, skills: ['construction', 'logistics'] },
  { id: 'v4', name: 'Diana Martinez',  available: true, currentTask: null, efficiency: 9, skills: ['medical', 'counseling'] },
  { id: 'v5', name: 'Ethan Brown',     available: true, currentTask: null, efficiency: 6, skills: ['teaching', 'construction'] },
];

let requests = [];
let logs = [];

// Tracking metrics
let metrics = {
  totalAssigned: 0,
  totalCompleted: 0,
  totalReassigned: 0,
  avgResponseTime: 0,
  responseTimes: [],
};

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────
const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  logs.unshift(entry);
  if (logs.length > 100) logs.pop(); // Keep last 100 logs
  console.log(entry);
};

// Auto Reassignment Timers
const timers = {};
const assignedTimestamps = {}; // Track when a task was assigned (for response time calc)

// ──────────────────────────────────────
// CORE ALGORITHM: Prioritize + Match + Assign
// ──────────────────────────────────────
const processQueue = () => {
  // 1. Sort pending requests by urgency (highest first)
  const pendingRequests = requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => b.urgency - a.urgency);

  if (pendingRequests.length === 0) return;

  // 2. Rank available volunteers by efficiency (highest first)
  const availableVolunteers = volunteers
    .filter((v) => v.available)
    .sort((a, b) => b.efficiency - a.efficiency);

  if (availableVolunteers.length === 0) {
    addLog('⚠️ No available volunteers for pending requests.');
    return;
  }

  // Process as many pending requests as we have volunteers for
  const pairsToAssign = Math.min(pendingRequests.length, availableVolunteers.length);

  for (let i = 0; i < pairsToAssign; i++) {
    const request = pendingRequests[i];
    const volunteer = availableVolunteers[i];

    // 3. Assign
    request.status = 'assigned';
    request.assignedTo = volunteer.id;
    request.assignedAt = Date.now();
    volunteer.available = false;
    volunteer.currentTask = request.id;
    metrics.totalAssigned++;

    addLog(`📌 "${request.title}" → assigned to ${volunteer.name} (Urgency: ${request.urgency})`);

    // 4. Start auto-reassignment timer (15s for demo)
    assignedTimestamps[request.id] = Date.now();
    timers[request.id] = setTimeout(() => {
      addLog(`⏰ TIMEOUT — ${volunteer.name} didn't respond to "${request.title}". Reassigning...`);
      metrics.totalReassigned++;

      // Reset volunteer
      volunteer.available = true;
      volunteer.currentTask = null;

      // Mark this volunteer as having declined (skip them next round)
      if (!request.declinedBy) request.declinedBy = [];
      request.declinedBy.push(volunteer.id);

      // Reset request
      request.status = 'pending';
      request.assignedTo = null;
      delete assignedTimestamps[request.id];

      // Re-trigger queue
      processQueue();
    }, 15000);
  }
};

// ──────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────

// GET full state (polled by frontend)
app.get('/api/state', (req, res) => {
  res.json({
    volunteers,
    requests,
    logs,
    metrics: {
      totalRequests: requests.length,
      totalCompleted: metrics.totalCompleted,
      totalReassigned: metrics.totalReassigned,
      avgResponseTime: metrics.responseTimes.length > 0
        ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length / 1000)
        : 0,
      completionRate: requests.length > 0
        ? Math.round((metrics.totalCompleted / requests.length) * 100)
        : 0,
      volunteerUtilization: volunteers.length > 0
        ? Math.round((volunteers.filter(v => !v.available).length / volunteers.length) * 100)
        : 0,
    },
  });
});

// POST new request
app.post('/api/requests', (req, res) => {
  const { title, description, urgency } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const newRequest = {
    id: `r${Date.now()}`,
    title: title.trim(),
    description: (description || '').trim(),
    urgency: Math.min(10, Math.max(1, parseInt(urgency) || 5)),
    status: 'pending',
    assignedTo: null,
    createdAt: Date.now(),
    declinedBy: [],
  };

  requests.push(newRequest);
  addLog(`📥 New Request: "${newRequest.title}" (Urgency: ${newRequest.urgency})`);
  processQueue();
  res.status(201).json(newRequest);
});

// POST accept a task
app.post('/api/requests/:id/accept', (req, res) => {
  const request = requests.find((r) => r.id === req.params.id);
  if (!request || request.status !== 'assigned') {
    return res.status(400).json({ error: 'Cannot accept this request' });
  }

  // Clear reassignment timer
  clearTimeout(timers[request.id]);
  delete timers[request.id];

  // Track response time
  if (assignedTimestamps[request.id]) {
    const responseTime = Date.now() - assignedTimestamps[request.id];
    metrics.responseTimes.push(responseTime);
    delete assignedTimestamps[request.id];
  }

  request.status = 'in-progress';
  const volunteer = volunteers.find((v) => v.id === request.assignedTo);
  addLog(`✅ "${request.title}" ACCEPTED by ${volunteer.name}`);

  res.json(request);
});

// POST complete a task
app.post('/api/requests/:id/complete', (req, res) => {
  const request = requests.find((r) => r.id === req.params.id);
  if (!request || request.status !== 'in-progress') {
    return res.status(400).json({ error: 'Cannot complete this request' });
  }

  request.status = 'completed';
  request.completedAt = Date.now();
  metrics.totalCompleted++;

  const volunteer = volunteers.find((v) => v.id === request.assignedTo);
  volunteer.available = true;
  volunteer.currentTask = null;

  addLog(`🎉 "${request.title}" COMPLETED by ${volunteer.name}`);

  // Process queue in case pending tasks are waiting
  processQueue();
  res.json(request);
});

// ──────────────────────────────────────
// START SERVER
// ──────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Resource Allocation backend running on port ${PORT}`);
  addLog('🟢 System Initialized — Ready to receive requests');
});
