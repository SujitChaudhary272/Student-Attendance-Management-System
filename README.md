# Student Attendance Management System

A beginner-friendly full-stack college project built with **Node.js**, **Express.js**, **MongoDB**, and **JavaScript**.

This project helps manage student attendance with a simple interface for teachers. It includes teacher registration and login, subject-wise dashboards, student management, attendance marking, and attendance record viewing.

---

## 📌 Features

- Teacher registration and login
- Separate dashboard for each teacher
- Subject-based attendance management
- Add students to a subject
- Mark attendance subject-wise
- View attendance records
- Clean frontend using HTML, CSS, and JavaScript
- Backend API with Express and MongoDB

---

## 📁 Project Structure

```text
Student-Attendance-Management-System
│
├── README.md
│
├── backend
│   │
│   ├── package.json
│   ├── server.js
│   │
│   ├── config
│   │   └── db.js
│   │
│   ├── middleware
│   │   └── authMiddleware.js
│   │
│   ├── models
│   │   ├── Student.js
│   │   ├── SubjectAttendance.js
│   │   ├── SubjectStudent.js
│   │   ├── Teacher.js
│   │   └── teacherScopedModels.js
│   │
│   └── routes
│       ├── attendanceRoutes.js
│       └── teacherRoutes.js
│
└── frontend
    │
    ├── package.json
    ├── server.js
    │
    ├── index.html
    ├── addStudent.html
    ├── attendance.html
    ├── subjectAttendance.html
    ├── subjectDashboard.html
    ├── subjectRecords.html
    ├── subjectStudents.html
    ├── teacherDashboard.html
    ├── teacherLogin.html
    ├── teacherRegister.html
    ├── viewAttendance.html
    │
    ├── css
    │   └── style.css
    │
    └── js
        ├── script.js
        └── teacher.js
```

---

## ⚙️ Prerequisites

Make sure these are installed on your system:

| Tool | Version |
|------|---------|
| Node.js | v18 or above recommended |
| npm | comes with Node.js |
| MongoDB | Community Server / local MongoDB |

Downloads:

- Node.js: https://nodejs.org
- MongoDB: https://www.mongodb.com/try/download/community

---

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/SujitChaudhary272/Student-Attendance-Management-System.git
cd Student-Attendance-Management-System
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Start MongoDB

Make sure MongoDB is running on your system.

#### Windows
```bash
net start MongoDB
```

#### macOS / Linux
```bash
mongod
```

### 5. Start the backend server

From the `backend` folder:

```bash
node server.js
```

Expected output:

```bash
MongoDB Connected Successfully!
Server running on http://localhost:5000
```

### 6. Start the frontend server

Open a new terminal, then:

```bash
cd frontend
npm run dev
```

Then open:

```text
http://localhost:3000
```

> You can also open the HTML files directly in the browser or use the Live Server extension in VS Code.

---

## 🔐 Main Modules

### Teacher Module
- Teacher registration
- Teacher login
- Subject-specific access
- Personal teacher dashboard

### Student Module
- Add student to a subject
- View subject students
- Manage student records

### Attendance Module
- Mark daily attendance
- View attendance history
- Check attendance subject-wise

---

## 🌐 Pages Overview

| Page | Purpose |
|------|---------|
| `index.html` | Landing page |
| `teacherRegister.html` | Teacher registration page |
| `teacherLogin.html` | Teacher login page |
| `teacherDashboard.html` | Main teacher dashboard |
| `subjectDashboard.html` | Dashboard for a selected subject |
| `addStudent.html` | Add student form |
| `subjectStudents.html` | View students of a subject |
| `attendance.html` | Attendance marking page |
| `subjectAttendance.html` | Attendance handling for a subject |
| `viewAttendance.html` | View attendance records |
| `subjectRecords.html` | Subject-wise attendance reports |

---

## 🔌 API Reference

> Actual endpoints may vary slightly depending on your backend route setup.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teachers/register` | Register a new teacher |
| POST | `/api/teachers/login` | Teacher login |
| POST | `/api/students` | Add a new student |
| GET | `/api/students` | Get all students |
| POST | `/api/attendance` | Mark attendance |
| GET | `/api/attendance/:id` | Get attendance by student ID |

---

## 📮 Example API Calls

### Register Teacher
```bash
curl -X POST http://localhost:5000/api/teachers/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sujit Chaudhary","email":"sujit@example.com","password":"123456","subject":"DBMS"}'
```

### Login Teacher
```bash
curl -X POST http://localhost:5000/api/teachers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sujit@example.com","password":"123456"}'
```

### Add a Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Arjun Sharma","rollNumber":"CS2024-001"}'
```

### Get All Students
```bash
curl http://localhost:5000/api/students
```

### Mark Attendance
```bash
curl -X POST http://localhost:5000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<student_id>","date":"2026-03-16","status":"Present"}'
```

### View Attendance for a Student
```bash
curl http://localhost:5000/api/attendance/<student_id>
```

---

## 📊 Example Attendance Response

```json
{
  "student": {
    "_id": "123abc",
    "name": "Arjun Sharma",
    "rollNumber": "CS2024-001"
  },
  "attendance": [
    { "date": "2026-03-15", "status": "Present" },
    { "date": "2026-03-16", "status": "Absent" }
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

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Middleware for route protection

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection failed | Make sure MongoDB service is running |
| Port 5000 already in use | Change the port in `backend/server.js` |
| Frontend not loading data | Check backend is running and API URLs are correct |
| Login not working | Verify teacher exists in database |
| CORS error | Make sure backend allows frontend origin |
| `npm install` fails | Delete `node_modules` and run `npm install` again |

---

## ✅ Future Improvements

- Add password encryption with bcrypt
- Add JWT-based protected routes
- Add attendance percentage charts
- Export attendance to Excel or PDF
- Improve UI design
- Add admin panel
- Deploy frontend and backend online

---

## 👨‍💻 Author

**Sujit Chaudhary**

Built as a college project for learning full-stack web development with Node.js, Express, MongoDB, and JavaScript.

---

## 📄 License

This project is created for educational and learning purposes.
