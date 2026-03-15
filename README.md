# Student Attendance Management System

A beginner-friendly, full-stack college project built with **Node.js**, **Express.js**, **MongoDB**, and **Vanilla JS**.

---

## 📁 Project Structure

```
student-attendance-system/
├── backend/
│   ├── server.js                 ← Main server entry point
│   ├── package.json              ← Node.js dependencies
│   ├── config/
│   │   └── db.js                 ← MongoDB connection
│   ├── models/
│   │   └── Student.js            ← Mongoose schema
│   └── routes/
│       └── attendanceRoutes.js   ← All REST API routes
│
└── frontend/
    ├── index.html                ← Dashboard
    ├── addStudent.html           ← Add student form
    ├── attendance.html           ← Mark attendance
    ├── viewAttendance.html       ← View records & percentage
    ├── css/
    │   └── style.css             ← All styles
    └── js/
        └── script.js             ← All frontend logic
```

---

## ⚙️ Prerequisites

Make sure you have these installed:

| Tool       | Download Link                         |
|------------|---------------------------------------|
| Node.js    | https://nodejs.org (v18+ recommended) |
| MongoDB    | https://www.mongodb.com/try/download/community |

---

## 🚀 Installation & Setup

### Step 1 — Clone / Download the project
```bash
cd student-attendance-system
```

### Step 2 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 3 — Start MongoDB
Make sure your local MongoDB service is running:
```bash
# On macOS/Linux
mongod

# On Windows (run as Administrator)
net start MongoDB
```

### Step 4 — Start the backend server
```bash
# From the backend/ folder
node server.js
```

You should see:
```
✅ MongoDB Connected Successfully!
✅ Server running on http://localhost:5000
```

### Step 5 — Start the frontend
```bash
cd ../frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

> Tip: You can still open `frontend/index.html` directly or use **Live Server** in VS Code if you prefer.

---

## 🔌 API Reference

| Method | Endpoint                | Description                     |
|--------|-------------------------|---------------------------------|
| POST   | /api/students           | Add a new student               |
| GET    | /api/students           | Get all students                |
| POST   | /api/attendance         | Mark attendance for a student   |
| GET    | /api/attendance/:id     | Get attendance records by ID    |

---

## 📮 Example API Calls

### Add a Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name": "Arjun Sharma", "rollNumber": "CS2024-001"}'
```

### Get All Students
```bash
curl http://localhost:5000/api/students
```

### Mark Attendance
```bash
curl -X POST http://localhost:5000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{"studentId": "<_id from student>", "date": "2024-11-20", "status": "Present"}'
```

### View Attendance for a Student
```bash
curl http://localhost:5000/api/attendance/<studentId>
```

---

## 📊 Expected API Response — View Attendance

```json
{
  "student": {
    "_id": "...",
    "name": "Arjun Sharma",
    "rollNumber": "CS2024-001"
  },
  "attendance": [
    { "date": "2024-11-20", "status": "Present" },
    { "date": "2024-11-21", "status": "Absent" }
  ],
  "summary": {
    "total": 2,
    "present": 1,
    "absent": 1,
    "percentage": "50.00%"
  }
}
```

---

## 🖥️ UI Overview

| Page                | Description                                          |
|---------------------|------------------------------------------------------|
| **Dashboard**       | Stats (total students, today's count), student table |
| **Add Student**     | Form to register name + roll number                  |
| **Mark Attendance** | Select student, pick date, toggle Present/Absent     |
| **View Records**    | Summary stats + full history table + progress bar    |

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Mongoose
- **Database**: MongoDB (local)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Fetch API
- **Fonts**: Sora + JetBrains Mono (Google Fonts)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `MongoDB connection failed` | Make sure `mongod` is running |
| `CORS error` in browser | Ensure backend is on port 5000 |
| Students not loading | Check browser console for errors |
| Port 5000 in use | Change `PORT` in `server.js` |

---

## 👨‍💻 Author

Built as a college project — beginner-friendly, clean, and ready to demo!
