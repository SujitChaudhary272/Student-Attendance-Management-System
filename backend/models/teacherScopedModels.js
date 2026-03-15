const mongoose = require('mongoose');

const subjectStudentSchema = new mongoose.Schema({
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

subjectStudentSchema.index({ subject: 1, rollNumber: 1 }, { unique: true });

const attendanceStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
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

subjectAttendanceSchema.index({ subject: 1, date: 1 }, { unique: true });

function getTeacherScopedModels(dbName) {
  const connection = mongoose.connection.useDb(dbName, { useCache: true });

  return {
    SubjectStudent: connection.models.SubjectStudent || connection.model('SubjectStudent', subjectStudentSchema),
    SubjectAttendance: connection.models.SubjectAttendance || connection.model('SubjectAttendance', subjectAttendanceSchema)
  };
}

module.exports = {
  getTeacherScopedModels
};
