const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'assigned' },
  progress: { type: Number, default: 0 },
  proofUrl: { type: String },
  volunteerRating: { type: Number },
  ngoRating: { type: Number },
  feedbackComments: { type: String },
  assignedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});


module.exports = mongoose.model('Assignment', assignmentSchema);
