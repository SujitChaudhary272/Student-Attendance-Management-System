const API_BASE = 'http://localhost:5000/api';
const TEACHER_TOKEN_KEY = 'teacherAuthToken';
const TEACHER_DATA_KEY = 'teacherProfile';

let currentSubjectStudentSearch = '';
let currentSubjectRecordSearch = '';
let currentSubjectStudents = [];
let currentSubjectRecordStudents = [];
let selectedSubjectStudentId = null;

function showTeacherAlert(containerId, message, type = 'success') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${message}</span>
    </div>
  `;
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function saveTeacherSession(token, teacher) {
  localStorage.setItem(TEACHER_TOKEN_KEY, token);
  localStorage.setItem(TEACHER_DATA_KEY, JSON.stringify(teacher));
}

function getTeacherToken() {
  return localStorage.getItem(TEACHER_TOKEN_KEY);
}

function clearTeacherSession() {
  localStorage.removeItem(TEACHER_TOKEN_KEY);
  localStorage.removeItem(TEACHER_DATA_KEY);
}

function logoutTeacher() {
  clearTeacherSession();
  window.location.href = 'index.html';
}

function getCurrentSubject() {
  return new URLSearchParams(window.location.search).get('subject') || '';
}

function buildSubjectUrl(page, subject) {
  return `${page}?subject=${encodeURIComponent(subject)}`;
}

function wireSubjectNavigation(subject) {
  const brandName = document.getElementById('subjectBrandName');
  if (brandName) {
    brandName.textContent = subject;
  }

  const navMap = {
    subjectNavDashboard: 'subjectDashboard.html',
    subjectNavStudents: 'subjectStudents.html',
    subjectNavAttendance: 'subjectAttendance.html',
    subjectNavRecords: 'subjectRecords.html',
    subjectActionStudents: 'subjectStudents.html',
    subjectActionAttendance: 'subjectAttendance.html',
    subjectActionRecords: 'subjectRecords.html'
  };

  Object.entries(navMap).forEach(([id, page]) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.setAttribute('href', buildSubjectUrl(page, subject));
  });

  const current = window.location.pathname.split('/').pop() || 'subjectDashboard.html';
  const activeMap = {
    'subjectDashboard.html': 'subjectNavDashboard',
    'subjectStudents.html': 'subjectNavStudents',
    'subjectAttendance.html': 'subjectNavAttendance',
    'subjectRecords.html': 'subjectNavRecords'
  };
  const activeId = activeMap[current];
  if (activeId) {
    const activeLink = document.getElementById(activeId);
    if (activeLink) activeLink.classList.add('active');
  }
}

async function teacherApi(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = getTeacherToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) clearTeacherSession();
  if (!response.ok) throw new Error(data.message || 'Request failed.');

  return data;
}

async function requireTeacherAuth() {
  if (!getTeacherToken()) {
    window.location.href = 'index.html';
    return null;
  }

  try {
    const data = await teacherApi('/teachers/me');
    localStorage.setItem(TEACHER_DATA_KEY, JSON.stringify(data.teacher));
    return data.teacher;
  } catch (error) {
    window.location.href = 'index.html';
    return null;
  }
}

function redirectIfTeacherLoggedIn() {
  if (getTeacherToken()) {
    window.location.href = 'teacherDashboard.html';
  }
}

async function registerTeacher(event) {
  event.preventDefault();

  const btn = document.getElementById('teacherRegisterBtn');
  const name = document.getElementById('teacherName').value.trim();
  const email = document.getElementById('teacherEmail').value.trim();
  const password = document.getElementById('teacherPassword').value;
  const subjects = document.getElementById('teacherSubjects').value
    .split(',')
    .map(subject => subject.trim())
    .filter(Boolean);

  if (!name || !email || !password || subjects.length === 0) {
    showTeacherAlert('teacherRegisterAlert', 'Please complete all fields and add at least one subject.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating Account...';

  try {
    const data = await teacherApi('/teachers/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, subjects })
    });

    saveTeacherSession(data.token, data.teacher);
    window.location.href = 'teacherDashboard.html';
  } catch (error) {
    showTeacherAlert('teacherRegisterAlert', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function loginTeacher(event) {
  event.preventDefault();

  const btn = document.getElementById('teacherLoginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showTeacherAlert('teacherLoginAlert', 'Please enter your email and password.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging In...';

  try {
    const data = await teacherApi('/teachers/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    saveTeacherSession(data.token, data.teacher);
    window.location.href = 'teacherDashboard.html';
  } catch (error) {
    showTeacherAlert('teacherLoginAlert', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function loadTeacherDashboard() {
  const teacher = await requireTeacherAuth();
  const grid = document.getElementById('teacherSubjectsGrid');
  if (!teacher || !grid) return;

  try {
    const data = await teacherApi('/teachers/dashboard');
    document.getElementById('teacherWelcomeName').textContent = data.teacher.name;
    document.getElementById('teacherSubjectCount').textContent = `${data.subjects.length} Subject${data.subjects.length === 1 ? '' : 's'}`;

    if (data.subjects.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">Subjects</div>
          <div class="empty-title">No subjects yet</div>
          <div class="empty-desc">Please update the teacher profile with at least one subject.</div>
        </div>`;
      return;
    }

    grid.innerHTML = data.subjects.map(subject => `
      <a class="subject-card" href="${buildSubjectUrl('subjectDashboard.html', subject)}">
        <div class="subject-card-tag">Subject</div>
        <div class="subject-card-name">${subject}</div>
        <div class="subject-card-desc">Open the full workspace for ${subject}.</div>
      </a>
    `).join('');
  } catch (error) {
    showTeacherAlert('teacherDashboardAlert', error.message, 'error');
    grid.innerHTML = '<div class="alert alert-error">Could not load your subjects.</div>';
  }
}

function animateCount(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

function renderRecentAttendanceTable(records, wrapId) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  if (records.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Dates</div>
        <div class="empty-title">No attendance saved yet</div>
        <div class="empty-desc">Start by adding students and saving attendance for this subject.</div>
      </div>`;
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Present</th>
            <th>Absent</th>
          </tr>
        </thead>
        <tbody>`;

  records.forEach((record, index) => {
    const present = record.students.filter(student => student.status === 'Present').length;
    const absent = record.students.length - present;
    html += `
      <tr>
        <td style="color:var(--text-muted)">${index + 1}</td>
        <td style="font-family:var(--font-mono)">${record.date}</td>
        <td><span class="status-text regular">${present}</span></td>
        <td><span class="status-text defaulter">${absent}</span></td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

async function loadSubjectDashboard() {
  const teacher = await requireTeacherAuth();
  const subject = getCurrentSubject();
  if (!teacher || !subject) return;

  wireSubjectNavigation(subject);

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/dashboard?date=${getTodayDate()}`);
    document.getElementById('subjectDashboardTitle').textContent = subject;
    document.getElementById('subjectDashboardSubtitle').textContent = `All data below belongs only to ${subject}.`;
    document.getElementById('subjectTeacherName').textContent = teacher.name;

    animateCount(document.getElementById('subjectTotalStudents'), data.stats.totalStudents);
    animateCount(document.getElementById('subjectPresentToday'), data.stats.presentToday);
    animateCount(document.getElementById('subjectAbsentToday'), data.stats.absentToday);

    renderRecentAttendanceTable(data.recentAttendance, 'subjectDashboardRecentWrap');
  } catch (error) {
    showTeacherAlert('subjectDashboardAlert', error.message, 'error');
    document.getElementById('subjectDashboardRecentWrap').innerHTML = '<div class="alert alert-error">Could not load the subject dashboard.</div>';
  }
}

async function loadSubjectStudents() {
  const teacher = await requireTeacherAuth();
  const subject = getCurrentSubject();
  const wrap = document.getElementById('subjectStudentsListWrap');
  if (!teacher || !subject || !wrap) return;

  wireSubjectNavigation(subject);
  document.getElementById('subjectStudentsTitle').textContent = subject;

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/students`);
    currentSubjectStudents = data.students;
    renderSubjectStudentsTable(data.students);
    populateSubjectDeleteOptions(data.students);
  } catch (error) {
    showTeacherAlert('subjectStudentFormAlert', error.message, 'error');
    wrap.innerHTML = '<div class="alert alert-error">Could not load subject students.</div>';
  }
}

function renderSubjectStudentsTable(students) {
  const wrap = document.getElementById('subjectStudentsListWrap');
  if (!wrap) return;

  if (students.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Class</div>
        <div class="empty-title">No students in this subject</div>
        <div class="empty-desc">Add students for this subject to begin attendance tracking.</div>
      </div>`;
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Roll Number</th>
            <th>Attendance %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

  students.forEach((student, index) => {
    const isLow = student.percentage < 75;
    html += `
      <tr>
        <td style="color:var(--text-muted)">${index + 1}</td>
        <td><strong>${student.name}</strong></td>
        <td><span class="roll-badge">${student.rollNumber}</span></td>
        <td style="font-family:var(--font-mono)">${student.percentage.toFixed(2)}%</td>
        <td>${isLow ? '<span class="status-text defaulter">Defaulter</span>' : '<span class="status-text regular">Regular</span>'}</td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function populateSubjectDeleteOptions(students) {
  const options = document.getElementById('subjectStudentDeleteOptions');
  if (!options) return;

  const normalizedSearch = currentSubjectStudentSearch.trim().toLowerCase();
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(normalizedSearch)
  );

  options.innerHTML = filteredStudents
    .map(student => `<option value="${student.name} (${student.rollNumber})"></option>`)
    .join('');
}

async function addSubjectStudent(event) {
  event.preventDefault();

  const subject = getCurrentSubject();
  const btn = document.getElementById('subjectStudentSubmitBtn');
  const name = document.getElementById('subjectStudentName').value.trim();
  const rollNumber = document.getElementById('subjectStudentRollNumber').value.trim();

  if (!subject || !name || !rollNumber) {
    showTeacherAlert('subjectStudentFormAlert', 'Please enter the student name and roll number.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Adding...';

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/students`, {
      method: 'POST',
      body: JSON.stringify({ name, rollNumber })
    });

    showTeacherAlert('subjectStudentFormAlert', data.message, 'success');
    document.getElementById('subjectStudentForm').reset();
    await loadSubjectStudents();
  } catch (error) {
    showTeacherAlert('subjectStudentFormAlert', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Student';
  }
}

async function deleteSubjectStudent() {
  const subject = getCurrentSubject();
  const input = document.getElementById('subjectStudentDeleteSearch');
  const btn = document.getElementById('subjectDeleteStudentBtn');
  if (!subject || !input || !btn) return;

  const query = input.value.trim().toLowerCase();
  if (!query) {
    showTeacherAlert('subjectStudentDeleteAlert', 'Please search and choose a student to delete.', 'error');
    return;
  }

  const matches = currentSubjectStudents.filter(student => {
    const optionLabel = `${student.name} (${student.rollNumber})`.toLowerCase();
    return optionLabel === query || student.name.toLowerCase() === query;
  });

  if (matches.length === 0) {
    showTeacherAlert('subjectStudentDeleteAlert', 'No student matches that name for this subject.', 'error');
    return;
  }

  if (matches.length > 1) {
    showTeacherAlert('subjectStudentDeleteAlert', 'Multiple students share that name. Choose the suggestion with the roll number.', 'error');
    return;
  }

  const student = matches[0];
  if (!window.confirm(`Delete ${student.name} from ${subject}?`)) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Deleting...';

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/students/${student._id}`, {
      method: 'DELETE'
    });

    showTeacherAlert('subjectStudentDeleteAlert', data.message, 'success');
    input.value = '';
    currentSubjectStudentSearch = '';
    await loadSubjectStudents();
  } catch (error) {
    showTeacherAlert('subjectStudentDeleteAlert', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete Student';
  }
}

function updateSubjectCounters() {
  const checkboxes = Array.from(document.querySelectorAll('.subject-attendance-checkbox'));
  const total = checkboxes.length;
  const present = checkboxes.filter(checkbox => checkbox.checked).length;

  document.getElementById('subjectSheetTotalStudents').textContent = total;
  document.getElementById('subjectSheetPresentCount').textContent = present;
  document.getElementById('subjectSheetAbsentCount').textContent = total - present;
}

function renderSubjectAttendanceSheet(students) {
  const sheet = document.getElementById('subjectAttendanceSheet');
  if (!sheet) return;

  if (students.length === 0) {
    sheet.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Class</div>
        <div class="empty-title">No students in this subject</div>
        <div class="empty-desc">Add students in the subject student page first.</div>
      </div>`;
    updateSubjectCounters();
    return;
  }

  let html = `
    <div class="attendance-sheet-head">
      <div>Student</div>
      <div>Roll Number</div>
      <div>Present</div>
      <div>Status</div>
    </div>`;

  students.forEach(student => {
    const checked = student.status === 'Present' ? 'checked' : '';
    const note = student.status === 'Present'
      ? 'Already marked present'
      : student.status === 'Absent'
        ? 'Already marked absent'
        : 'Unchecked means absent';
    const noteClass = student.status === 'Absent' ? 'attendance-note absent' : 'attendance-note';

    html += `
      <label class="attendance-row" for="subject-attendance-${student._id}">
        <div><strong>${student.name}</strong></div>
        <div><span class="roll-badge">${student.rollNumber}</span></div>
        <div>
          <input
            type="checkbox"
            id="subject-attendance-${student._id}"
            class="attendance-checkbox subject-attendance-checkbox"
            data-student-id="${student._id}"
            ${checked}
            onchange="updateSubjectCounters()"
          />
        </div>
        <div class="${noteClass}">${note}</div>
      </label>`;
  });

  sheet.innerHTML = html;
  updateSubjectCounters();
}

function toggleAllSubjectAttendance(isChecked) {
  document.querySelectorAll('.subject-attendance-checkbox').forEach(checkbox => {
    checkbox.checked = isChecked;
  });
  updateSubjectCounters();
}

async function loadSubjectAttendancePage() {
  const teacher = await requireTeacherAuth();
  const subject = getCurrentSubject();
  const dateInput = document.getElementById('subjectAttendanceDate');
  if (!teacher || !subject || !dateInput) return;

  wireSubjectNavigation(subject);
  document.getElementById('subjectPageTitle').textContent = subject;
  document.getElementById('subjectPageSubtitle').textContent = `Logged in as ${teacher.name}. This attendance sheet belongs only to ${subject}.`;

  if (!dateInput.value) dateInput.value = getTodayDate();

  try {
    const [attendanceData, recordsData] = await Promise.all([
      teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/attendance?date=${dateInput.value}`),
      teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/records`)
    ]);

    const banner = document.getElementById('subjectEditDateBanner');
    const alreadyMarked = attendanceData.students.some(student => student.status);
    banner.textContent = alreadyMarked
      ? `Editing ${subject} attendance for ${formatDate(dateInput.value)}. Tick Present and leave unchecked for Absent.`
      : `Choose a date to load or create ${subject} attendance.`;

    renderSubjectAttendanceSheet(attendanceData.students);
    renderRecentAttendanceTable(recordsData.records, 'subjectRecordsWrap');
  } catch (error) {
    showTeacherAlert('subjectAttendanceAlert', error.message, 'error');
    document.getElementById('subjectAttendanceSheet').innerHTML = '<div class="alert alert-error">Could not load the subject attendance sheet.</div>';
  }
}

async function saveSubjectAttendance(event) {
  event.preventDefault();

  const subject = getCurrentSubject();
  const btn = document.getElementById('subjectMarkBtn');
  const dateInput = document.getElementById('subjectAttendanceDate');
  const checkboxes = Array.from(document.querySelectorAll('.subject-attendance-checkbox'));

  if (!subject || !dateInput.value || checkboxes.length === 0) {
    showTeacherAlert('subjectAttendanceAlert', 'Subject, date, and subject students are required.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/attendance`, {
      method: 'POST',
      body: JSON.stringify({
        date: dateInput.value,
        records: checkboxes.map(checkbox => ({
          studentId: checkbox.dataset.studentId,
          status: checkbox.checked ? 'Present' : 'Absent'
        }))
      })
    });

    showTeacherAlert('subjectAttendanceAlert', data.message, 'success');
    await loadSubjectAttendancePage();
  } catch (error) {
    showTeacherAlert('subjectAttendanceAlert', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Subject Attendance';
  }
}

async function loadSubjectRecordsPage() {
  const teacher = await requireTeacherAuth();
  const subject = getCurrentSubject();
  if (!teacher || !subject) return;

  wireSubjectNavigation(subject);
  document.getElementById('subjectRecordsTitle').textContent = subject;

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/students`);
    currentSubjectRecordStudents = data.students;
    updateSubjectRecordsView();
  } catch (error) {
    showTeacherAlert('subjectRecordsAlert', error.message, 'error');
    document.getElementById('subjectRecordsTableWrap').innerHTML = '<div class="alert alert-error">Could not load subject records.</div>';
  }
}

function renderSubjectRecordsTable(students) {
  const wrap = document.getElementById('subjectRecordsTableWrap');
  if (!wrap) return;

  if (students.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Class</div>
        <div class="empty-title">No students found</div>
        <div class="empty-desc">Add students to this subject to view records.</div>
      </div>`;
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th>Roll Number</th>
            <th>Attendance %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

  students.forEach((student, index) => {
    const isLow = student.percentage < 75;
    html += `
      <tr>
        <td style="color:var(--text-muted)">${index + 1}</td>
        <td><button type="button" class="table-link-btn" onclick="loadSubjectStudentRecordDetail('${student._id}')">${student.name}</button></td>
        <td><span class="roll-badge">${student.rollNumber}</span></td>
        <td><button type="button" class="table-link-btn percentage-link" onclick="loadSubjectStudentRecordDetail('${student._id}')">${student.percentage.toFixed(2)}%</button></td>
        <td>${isLow ? '<span class="status-text defaulter">Defaulter</span>' : '<span class="status-text regular">Regular</span>'}</td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function renderEmptySubjectRecordDetail(message) {
  const detail = document.getElementById('subjectStudentRecordDetail');
  if (!detail) return;

  detail.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">Records</div>
      <div class="empty-title">No student selected</div>
      <div class="empty-desc">${message}</div>
    </div>`;
}

async function loadSubjectStudentRecordDetail(studentId) {
  const subject = getCurrentSubject();
  const detail = document.getElementById('subjectStudentRecordDetail');
  if (!subject || !detail) return;

  try {
    const data = await teacherApi(`/teachers/subjects/${encodeURIComponent(subject)}/students/${studentId}/records`);
    selectedSubjectStudentId = studentId;
    const summary = data.summary;
    const isLow = summary.percentage < 75;

    let html = `
      <div class="student-detail-header">
        <div>
          <div class="detail-name">${data.student.name}</div>
          <div class="detail-roll">${data.student.rollNumber}</div>
        </div>
        <div class="detail-flag ${isLow ? 'defaulter' : 'regular'}">${isLow ? 'Defaulter' : 'Regular'}</div>
      </div>

      <div class="summary-bar">
        <div class="summary-stat">
          <div class="val accent">${summary.percentage.toFixed(2)}%</div>
          <div class="lbl">Attendance %</div>
          <div class="progress-wrap">
            <div class="progress-fill ${isLow ? 'low' : ''}" style="width:${summary.percentage}%"></div>
          </div>
        </div>
        <div class="summary-stat">
          <div class="val accent">${summary.total}</div>
          <div class="lbl">Total Classes</div>
        </div>
        <div class="summary-stat">
          <div class="val green">${summary.present}</div>
          <div class="lbl">Present</div>
        </div>
        <div class="summary-stat">
          <div class="val red">${summary.absent}</div>
          <div class="lbl">Absent</div>
        </div>
      </div>`;

    if (data.attendance.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-icon">Days</div>
          <div class="empty-title">No attendance records</div>
          <div class="empty-desc">Mark attendance in this subject to see date-wise records here.</div>
        </div>`;
      detail.innerHTML = html;
      return;
    }

    html += `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>`;

    data.attendance.forEach((record, index) => {
      const day = new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long' });
      html += `
        <tr>
          <td style="color:var(--text-muted)">${index + 1}</td>
          <td style="font-family:var(--font-mono)">${record.date}</td>
          <td style="color:var(--text-secondary)">${day}</td>
          <td><span class="badge badge-${record.status.toLowerCase()}">${record.status}</span></td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    detail.innerHTML = html;
  } catch (error) {
    showTeacherAlert('subjectRecordsAlert', error.message, 'error');
  }
}

function updateSubjectRecordsView() {
  const normalizedSearch = currentSubjectRecordSearch.trim().toLowerCase();
  const filteredStudents = currentSubjectRecordStudents.filter(student =>
    student.name.toLowerCase().includes(normalizedSearch)
  );

  renderSubjectRecordsTable(filteredStudents);

  if (filteredStudents.length === 0) {
    selectedSubjectStudentId = null;
    renderEmptySubjectRecordDetail('No students match the current subject record search.');
    return;
  }

  const activeStudent = filteredStudents.find(student => student._id === selectedSubjectStudentId) || filteredStudents[0];
  loadSubjectStudentRecordDetail(activeStudent._id);
}

document.addEventListener('DOMContentLoaded', () => {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });

  if (current === 'index.html' && getTeacherToken()) {
    window.location.href = 'teacherDashboard.html';
    return;
  }

  if (current === 'teacherRegister.html' || current === 'teacherLogin.html') {
    redirectIfTeacherLoggedIn();
  }

  if (current === 'teacherDashboard.html') {
    loadTeacherDashboard();
  }

  if (current === 'subjectDashboard.html') {
    loadSubjectDashboard();
  }

  if (current === 'subjectStudents.html') {
    const deleteSearch = document.getElementById('subjectStudentDeleteSearch');
    if (deleteSearch) {
      deleteSearch.addEventListener('input', event => {
        currentSubjectStudentSearch = event.target.value;
        populateSubjectDeleteOptions(currentSubjectStudents);
      });
    }
    loadSubjectStudents();
  }

  if (current === 'subjectAttendance.html') {
    const dateInput = document.getElementById('subjectAttendanceDate');
    if (dateInput) {
      dateInput.value = getTodayDate();
      dateInput.addEventListener('change', loadSubjectAttendancePage);
    }
    loadSubjectAttendancePage();
  }

  if (current === 'subjectRecords.html') {
    const searchInput = document.getElementById('subjectRecordSearch');
    if (searchInput) {
      searchInput.addEventListener('input', event => {
        currentSubjectRecordSearch = event.target.value;
        updateSubjectRecordsView();
      });
    }
    loadSubjectRecordsPage();
  }
});
