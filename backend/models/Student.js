// =============================================
// models/Student.js - Mongoose schema for Student
// =============================================

const mongoose = require('mongoose');

// Sub-schema for individual attendance records
const attendanceSchema = new mongoose.Schema({
  date: {
    type: String,               // Store date as string (e.g., "2024-11-20")
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'], // Only allow these two values
    required: true
  }
});

// Main Student schema
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true                  // Removes extra spaces
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,               // Each roll number must be unique
    trim: true
  },
  attendance: [attendanceSchema] // Array of attendance records
}, {
  timestamps: true              // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Student', studentSchema);
