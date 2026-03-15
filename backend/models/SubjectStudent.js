const mongoose = require('mongoose');

const subjectStudentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

subjectStudentSchema.index({ teacherId: 1, subject: 1, rollNumber: 1 }, { unique: true });

module.exports = mongoose.model('SubjectStudent', subjectStudentSchema);
