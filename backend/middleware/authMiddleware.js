const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'attendance-secret-key';

function buildTeacherDbName(teacherId) {
  return `teacher_attendance_${String(teacherId).toLowerCase()}`;
}

async function protectTeacher(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    let teacher = await Teacher.findById(decoded.teacherId).select('-password');

    if (!teacher) {
      return res.status(401).json({ message: 'Teacher account not found.' });
    }

    if (!teacher.dbName) {
      teacher.dbName = buildTeacherDbName(teacher._id || new mongoose.Types.ObjectId());
      await teacher.save();
      teacher = await Teacher.findById(decoded.teacherId).select('-password');
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = {
  protectTeacher,
  JWT_SECRET,
  buildTeacherDbName
};
