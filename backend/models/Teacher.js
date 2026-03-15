const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  dbName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subjects: {
    type: [String],
    default: [],
    validate: {
      validator(subjects) {
        return Array.isArray(subjects) && subjects.length > 0;
      },
      message: 'At least one subject is required.'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema);
