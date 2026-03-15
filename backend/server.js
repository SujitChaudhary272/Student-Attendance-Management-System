// =============================================
// server.js - Main entry point for the backend
// =============================================

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const attendanceRoutes = require('./routes/attendanceRoutes');
const teacherRoutes = require('./routes/teacherRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ---- Middleware ----
app.use(cors());                        // Allow cross-origin requests from frontend
app.use(express.json());                // Parse incoming JSON requests

// ---- Routes ----
app.use('/api', attendanceRoutes);      // All API routes prefixed with /api
app.use('/api', teacherRoutes);

// ---- Root Route (health check) ----
app.get('/', (req, res) => {
  res.json({ message: 'Student Attendance System API is running!' });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
