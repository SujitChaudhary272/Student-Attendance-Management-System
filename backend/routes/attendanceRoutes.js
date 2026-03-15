// =============================================
// routes/attendanceRoutes.js - All API routes
// =============================================

const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

function normalizeDateString(date) {
  if (typeof date !== 'string') return '';

  const trimmedDate = date.trim();
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDatePattern.test(trimmedDate)) return trimmedDate;

  const parsedDate = new Date(trimmedDate);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toISOString().split('T')[0];
}

function replaceAttendanceForDate(student, date, status) {
  const normalizedDate = normalizeDateString(date);

  student.attendance = student.attendance.filter(entry => normalizeDateString(entry.date) !== normalizedDate);
  student.attendance.push({ date: normalizedDate, status });
}

// -----------------------------------------------
// POST /api/students
// Add a new student to the database
// -----------------------------------------------
router.post('/students', async (req, res) => {
  try {
    const { name, rollNumber } = req.body;

    // Validate input fields
    if (!name || !rollNumber) {
      return res.status(400).json({ message: 'Name and Roll Number are required.' });
    }

    // Check if roll number already exists
    const existing = await Student.findOne({ rollNumber });
    if (existing) {
      return res.status(409).json({ message: 'Roll Number already exists.' });
    }

    // Create and save new student
    const student = new Student({ name, rollNumber, attendance: [] });
    await student.save();

    res.status(201).json({ message: 'Student added successfully!', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// -----------------------------------------------
// GET /api/students
// Get all students (without full attendance array)
// -----------------------------------------------
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find({}, 'name rollNumber attendance');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// -----------------------------------------------
// DELETE /api/students/:id
// Delete a student and all their attendance data
// -----------------------------------------------
router.delete('/students/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    res.status(200).json({ message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// -----------------------------------------------
// POST /api/attendance
// Mark attendance for a student on a given date
// Body: { studentId, date, status }
// -----------------------------------------------
router.post('/attendance', async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    const normalizedDate = normalizeDateString(date);

    // Validate input
    if (!studentId || !normalizedDate || !status) {
      return res.status(400).json({ message: 'studentId, date, and status are required.' });
    }

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Present or Absent.' });
    }

    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    replaceAttendanceForDate(student, normalizedDate, status);

    await student.save();
    res.status(200).json({ message: 'Attendance marked successfully!', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// -----------------------------------------------
// POST /api/attendance/bulk
// Mark attendance for all students for one date
// Body: { date, records: [{ studentId, status }] }
// -----------------------------------------------
router.post('/attendance/bulk', async (req, res) => {
  try {
    const { date, records } = req.body;
    const normalizedDate = normalizeDateString(date);

    if (!normalizedDate || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'date and records are required.' });
    }

    const allowedStatuses = ['Present', 'Absent'];
    const studentIds = [];

    for (const record of records) {
      if (!record.studentId || !allowedStatuses.includes(record.status)) {
        return res.status(400).json({ message: 'Each record must include a valid studentId and status.' });
      }

      studentIds.push(record.studentId);
    }

    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = new Map(students.map(student => [String(student._id), student]));

    if (studentMap.size !== studentIds.length) {
      return res.status(404).json({ message: 'One or more students were not found.' });
    }

    for (const record of records) {
      const student = studentMap.get(record.studentId);
      replaceAttendanceForDate(student, normalizedDate, record.status);
    }

    await Promise.all(students.map(student => student.save()));

    res.status(200).json({
      message: 'Attendance saved successfully!',
      updated: records.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// -----------------------------------------------
// GET /api/attendance/:id
// Get attendance records for a specific student
// -----------------------------------------------
router.get('/attendance/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Calculate attendance percentage
    const total = student.attendance.length;
    const present = student.attendance.filter(a => a.status === 'Present').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    res.status(200).json({
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber
      },
      attendance: student.attendance,
      summary: {
        total,
        present,
        absent: total - present,
        percentage: `${percentage}%`
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
