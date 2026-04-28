require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const Task = require('./models/Task');
const Assignment = require('./models/Assignment');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);

// ──────────────────────────────────────
// DATA STORE (Legacy/Logs)
// ──────────────────────────────────────
let logs = [];
const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  logs.unshift(entry);
  if (logs.length > 100) logs.pop();
  console.log(entry);
};

// ──────────────────────────────────────
// TASK APIs
// ──────────────────────────────────────

// GET all state (NGO view)
app.get('/api/state', auth, async (req, res) => {
  try {
    const tasks = await Task.find().populate('createdBy', 'name');
    const assignments = await Assignment.find().populate('taskId').populate('volunteerId', 'name');
    const volunteers = await User.find({ role: 'volunteer' }).select('-password');
    
    res.json({
      tasks,
      assignments,
      volunteers,
      logs,
      metrics: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        activeAssignments: assignments.filter(a => a.status !== 'completed').length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new task (NGO only)
app.post('/api/tasks', auth, async (req, res) => {
  if (req.user.role !== 'ngo') return res.status(403).json({ msg: 'Access denied' });
  
  const { title, description, category, priority, location } = req.body;
  try {
    const newTask = new Task({
      title,
      description,
      category,
      priority,
      location,
      createdBy: req.user.id
    });
    await newTask.save();
    addLog(`📥 New Task: "${title}" created by ${req.user.id}`);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET my tasks (Volunteer view)
app.get('/api/tasks/my', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ volunteerId: req.user.id })
      .populate('taskId')
      .sort({ assignedAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update progress
app.put('/api/tasks/:id/progress', auth, async (req, res) => {
  const { progress } = req.body;
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, volunteerId: req.user.id });
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    
    assignment.progress = progress;
    assignment.status = 'in-progress';
    await assignment.save();
    
    addLog(`📈 Progress update: Task ${assignment.taskId} at ${progress}%`);
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT complete task
app.put('/api/tasks/:id/complete', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, volunteerId: req.user.id });
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    
    assignment.status = 'completed';
    assignment.progress = 100;
    assignment.completedAt = Date.now();
    await assignment.save();
    
    const task = await Task.findById(assignment.taskId);
    if (task) {
      task.status = 'completed';
      await task.save();
    }
    
    addLog(`🎉 Task COMPLETED: "${task.title}" by ${req.user.id}`);
    res.json({ assignment, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST assign task (NGO only)
app.post('/api/tasks/:id/assign', auth, async (req, res) => {
  if (req.user.role !== 'ngo') return res.status(403).json({ msg: 'Access denied' });
  
  const { volunteerId } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    const newAssignment = new Assignment({
      taskId: task._id,
      volunteerId,
      status: 'assigned'
    });
    await newAssignment.save();
    
    task.status = 'assigned';
    await task.save();
    
    addLog(`📌 Task "${task.title}" assigned to ${volunteerId}`);
    res.json(newAssignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST match volunteers to task
app.post('/api/match', auth, async (req, res) => {
  const { title, location, skillsRequired, priority } = req.body;
  
  try {
    // 1. Filter only available volunteers
    const volunteers = await User.find({ role: 'volunteer', available: true });
    
    // Configurable weights
    const WEIGHTS = { SKILL: 0.4, DISTANCE: 0.3, PRIORITY: 0.3 };

    // 2. Calculate match score for each volunteer
    const matches = volunteers.map(v => {
      // Skill Score: matching skills / total required
      let skillScore = 0;
      if (skillsRequired && skillsRequired.length > 0) {
        const matchingSkills = v.skills.filter(s => skillsRequired.includes(s));
        skillScore = matchingSkills.length / skillsRequired.length;
      }

      // Distance Score: Same location -> 1, Different -> 0.5
      const distanceScore = v.location === location ? 1 : 0.5;

      // Priority Boost: High -> 1, Medium -> 0.6, Low -> 0.3
      let priorityBoost = 0.3;
      if (priority === 'high') priorityBoost = 1;
      else if (priority === 'medium') priorityBoost = 0.6;

      const totalScore = (skillScore * WEIGHTS.SKILL) + 
                         (distanceScore * WEIGHTS.DISTANCE) + 
                         (priorityBoost * WEIGHTS.PRIORITY);

      return {
        volunteer: { id: v._id, name: v.name, skills: v.skills, location: v.location },
        score: parseFloat(totalScore.toFixed(2))
      };
    });

    // 3. Sort by highest match score and return top 3
    const topMatches = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    addLog(`🔍 Matching performed for task: "${title}". Top match score: ${topMatches[0]?.score || 0}`);
    res.json(topMatches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ──────────────────────────────────────
// START SERVER
// ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Resource Allocation backend running on port ${PORT}`);
  addLog('🟢 System Initialized — Ready for action');
});
