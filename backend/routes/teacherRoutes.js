const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const { getTeacherScopedModels } = require('../models/teacherScopedModels');
const { protectTeacher, JWT_SECRET, buildTeacherDbName } = require('../middleware/authMiddleware');

const router = express.Router();

function normalizeDateString(date) {
  if (typeof date !== 'string') return '';

  const trimmedDate = date.trim();
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDatePattern.test(trimmedDate)) return trimmedDate;

  const parsedDate = new Date(trimmedDate);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toISOString().split('T')[0];
}

function normalizeSubjects(subjectsInput) {
  const rawSubjects = Array.isArray(subjectsInput)
    ? subjectsInput
    : String(subjectsInput || '').split(',');

  return [...new Set(rawSubjects.map(subject => subject.trim()).filter(Boolean))];
}

function createToken(teacher) {
  return jwt.sign({ teacherId: teacher._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
}

function serializeTeacher(teacher) {
  return {
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    dbName: teacher.dbName,
    subjects: teacher.subjects
  };
}

function ensureTeacherSubjectAccess(teacher, subject) {
  return teacher.subjects.includes(subject);
}

function getTeacherModels(teacher) {
  return getTeacherScopedModels(teacher.dbName);
}

async function buildStudentSummaries(teacher, subject) {
  const { SubjectStudent, SubjectAttendance } = getTeacherModels(teacher);
  const [students, attendanceDocs] = await Promise.all([
    SubjectStudent.find({ subject }).sort({ createdAt: 1 }),
    SubjectAttendance.find({ subject }).sort({ date: -1 })
  ]);

  const summaryMap = new Map(
    students.map(student => [String(student._id), {
      _id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      total: 0,
      present: 0,
      absent: 0,
      percentage: 0
    }])
  );

  attendanceDocs.forEach(doc => {
    doc.students.forEach(entry => {
      const key = String(entry.studentId);
      const summary = summaryMap.get(key);
      if (!summary) return;

      summary.total += 1;
      if (entry.status === 'Present') {
        summary.present += 1;
      } else {
        summary.absent += 1;
      }
    });
  });

  summaryMap.forEach(summary => {
    summary.percentage = summary.total > 0
      ? Number(((summary.present / summary.total) * 100).toFixed(2))
      : 0;
  });

  return Array.from(summaryMap.values());
}

router.post('/teachers/register', async (req, res) => {
  try {
    const { name, email, password, subjects } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedSubjects = normalizeSubjects(subjects);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (normalizedSubjects.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one subject.' });
    }

    const existingTeacher = await Teacher.findOne({ email: normalizedEmail });
    if (existingTeacher) {
      return res.status(409).json({ message: 'A teacher with this email already exists.' });
    }

    const teacherId = new mongoose.Types.ObjectId();
    const teacher = await Teacher.create({
      _id: teacherId,
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      dbName: buildTeacherDbName(teacherId),
      subjects: normalizedSubjects
    });

    res.status(201).json({
      message: 'Teacher registered successfully.',
      token: createToken(teacher),
      teacher: serializeTeacher(teacher)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/teachers/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const teacher = await Teacher.findOne({ email: normalizedEmail });
    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.status(200).json({
      message: 'Login successful.',
      token: createToken(teacher),
      teacher: serializeTeacher(teacher)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/teachers/me', protectTeacher, async (req, res) => {
  res.status(200).json({ teacher: serializeTeacher(req.teacher) });
});

router.get('/teachers/dashboard', protectTeacher, async (req, res) => {
  res.status(200).json({
    teacher: serializeTeacher(req.teacher),
    subjects: req.teacher.subjects
  });
});

router.get('/teachers/subjects/:subject/dashboard', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectStudent, SubjectAttendance } = getTeacherModels(req.teacher);

    const today = normalizeDateString(req.query.date || new Date().toISOString());
    const [students, todayAttendance, recentDocs] = await Promise.all([
      SubjectStudent.find({ subject }).sort({ createdAt: 1 }),
      SubjectAttendance.findOne({ subject, date: today }),
      SubjectAttendance.find({ subject }).sort({ date: -1 }).limit(5)
    ]);

    const todayStudents = todayAttendance?.students || [];
    const presentToday = todayStudents.filter(student => student.status === 'Present').length;
    const absentToday = todayStudents.filter(student => student.status === 'Absent').length;

    res.status(200).json({
      teacher: serializeTeacher(req.teacher),
      subject,
      today,
      stats: {
        totalStudents: students.length,
        presentToday,
        absentToday
      },
      recentAttendance: recentDocs
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/teachers/subjects/:subject/students', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }

    const students = await buildStudentSummaries(req.teacher, subject);
    res.status(200).json({ subject, students });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/teachers/subjects/:subject/students', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    const { name, rollNumber } = req.body;

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectStudent } = getTeacherModels(req.teacher);

    if (!name || !rollNumber) {
      return res.status(400).json({ message: 'Name and roll number are required.' });
    }

    const existingStudent = await SubjectStudent.findOne({
      subject,
      rollNumber: String(rollNumber).trim()
    });

    if (existingStudent) {
      return res.status(409).json({ message: 'This roll number already exists for the subject.' });
    }

    const student = await SubjectStudent.create({
      subject,
      name: String(name).trim(),
      rollNumber: String(rollNumber).trim()
    });

    res.status(201).json({ message: 'Student added to subject successfully.', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/teachers/subjects/:subject/students/:id', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    const studentId = req.params.id;

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectStudent, SubjectAttendance } = getTeacherModels(req.teacher);

    const deletedStudent = await SubjectStudent.findOneAndDelete({
      _id: studentId,
      subject
    });

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found for this subject.' });
    }

    await SubjectAttendance.updateMany(
      { subject },
      { $pull: { students: { studentId: deletedStudent._id } } }
    );

    res.status(200).json({ message: 'Student removed from subject successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/teachers/subjects/:subject/students/:id/records', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    const studentId = req.params.id;

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectStudent, SubjectAttendance } = getTeacherModels(req.teacher);

    const student = await SubjectStudent.findOne({
      _id: studentId,
      subject
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found for this subject.' });
    }

    const attendanceDocs = await SubjectAttendance.find({
      subject,
      'students.studentId': student._id
    }).sort({ date: -1 });

    const attendance = attendanceDocs.map(doc => {
      const entry = doc.students.find(item => String(item.studentId) === String(student._id));
      return {
        date: doc.date,
        status: entry.status
      };
    });

    const total = attendance.length;
    const present = attendance.filter(item => item.status === 'Present').length;
    const absent = total - present;

    res.status(200).json({
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber
      },
      attendance,
      summary: {
        total,
        present,
        absent,
        percentage: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/teachers/subjects/:subject/attendance', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    const date = normalizeDateString(req.query.date);

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectStudent, SubjectAttendance } = getTeacherModels(req.teacher);

    const students = await SubjectStudent.find({ subject }).sort({ createdAt: 1 });
    const attendanceDoc = date
      ? await SubjectAttendance.findOne({ subject, date })
      : null;

    const statusByStudentId = new Map(
      (attendanceDoc?.students || []).map(entry => [String(entry.studentId), entry.status])
    );

    res.status(200).json({
      subject,
      date: date || null,
      students: students.map(student => ({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        status: statusByStudentId.get(String(student._id)) || null
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/teachers/subjects/:subject/attendance', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();
    const date = normalizeDateString(req.body.date);
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot save attendance for this subject.' });
    }
    const { SubjectStudent, SubjectAttendance } = getTeacherModels(req.teacher);

    if (!date || records.length === 0) {
      return res.status(400).json({ message: 'Date and records are required.' });
    }

    const allowedStatuses = ['Present', 'Absent'];
    const studentIds = [];

    for (const record of records) {
      if (!record.studentId || !allowedStatuses.includes(record.status)) {
        return res.status(400).json({ message: 'Each record must include a valid studentId and status.' });
      }
      studentIds.push(record.studentId);
    }

    const students = await SubjectStudent.find({
      _id: { $in: studentIds },
      subject
    });

    const studentMap = new Map(students.map(student => [String(student._id), student]));
    if (studentMap.size !== studentIds.length) {
      return res.status(404).json({ message: 'One or more subject students were not found.' });
    }

    const attendanceStudents = records.map(record => {
      const student = studentMap.get(String(record.studentId));
      return {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        status: record.status
      };
    });

    const attendanceDoc = await SubjectAttendance.findOneAndUpdate(
      { subject, date },
      { subject, date, students: attendanceStudents },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: `Attendance saved for ${subject}.`,
      attendance: attendanceDoc
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/teachers/subjects/:subject/records', protectTeacher, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject).trim();

    if (!ensureTeacherSubjectAccess(req.teacher, subject)) {
      return res.status(403).json({ message: 'You cannot access this subject.' });
    }
    const { SubjectAttendance } = getTeacherModels(req.teacher);

    const records = await SubjectAttendance.find({
      subject
    }).sort({ date: -1 });

    res.status(200).json({ subject, records });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
