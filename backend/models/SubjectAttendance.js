const mongoose = require('mongoose');

const attendanceStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
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
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    required: true
  }
}, { _id: false });

const subjectAttendanceSchema = new mongoose.Schema({
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
  date: {
    type: String,
    required: true
  },
  students: {
    type: [attendanceStudentSchema],
    default: []
  }
}, {
  timestamps: true
});

subjectAttendanceSchema.index({ teacherId: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SubjectAttendance', subjectAttendanceSchema);
