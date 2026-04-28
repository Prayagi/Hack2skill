const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["volunteer", "ngo"] },
  skills: [String],
  location: String,
  available: { type: Boolean, default: true },
  impactScore: { type: Number, default: 0 },
  notifications: [{
    message: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }]
});


module.exports = mongoose.model("User", userSchema);