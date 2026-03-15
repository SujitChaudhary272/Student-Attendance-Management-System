const API_BASE = 'http://localhost:5000/api';
let cachedStudents = [];
let selectedStudentId = null;
let currentStudentSearch = '';
let currentDeleteStudentSearch = '';
let deleteStudentMatches = [];

function showAlert(containerId, message, type = 'success') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${message}</span>
    </div>
  `;

  setTimeout(() => {
    if (container) container.innerHTML = '';
  }, 4000);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function fetchStudents(force = false) {
  if (!force && cachedStudents.length > 0) return cachedStudents;

  const res = await fetch(`${API_BASE}/students`);
  if (!res.ok) throw new Error('Failed to fetch students');

  cachedStudents = await res.json();
  return cachedStudents;
}

function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

function getAttendanceStatus(student, date) {
  const existing = student.attendance.find(record => record.date === date);
  return existing ? existing.status : null;
}

function getStudentSummary(student) {
  const total = student.attendance.length;
  const present = student.attendance.filter(record => record.status === 'Present').length;
  const absent = total - present;
  const percentage = total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

  return { total, present, absent, percentage };
}

async function loadDashboard() {
  const totalEl = document.getElementById('totalStudents');
  const todayEl = document.getElementById('todayAttendance');
  const presentEl = document.getElementById('presentToday');
  const listEl = document.getElementById('recentStudentsList');

  if (!totalEl || !todayEl || !presentEl || !listEl) return;

  try {
    const students = await fetchStudents(true);
    const today = getTodayDate();
    let presentToday = 0;
    let absentToday = 0;

    students.forEach(student => {
      const todayRecord = student.attendance.find(record => record.date === today);
      if (todayRecord) {
        if (todayRecord.status === 'Present') {
          presentToday++;
        } else if (todayRecord.status === 'Absent') {
          absentToday++;
        }
      }
    });

    animateCount(totalEl, students.length);
    animateCount(todayEl, absentToday);
    animateCount(presentEl, presentToday);

    if (students.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">Class</div>
          <div class="empty-title">No students yet</div>
          <div class="empty-desc">Start by adding your first student.</div>
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
              <th>Total Classes</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>`;

    students.forEach((student, index) => {
      const todayRecord = student.attendance.find(record => record.date === today);
      const todayBadge = todayRecord
        ? `<span class="badge badge-${todayRecord.status.toLowerCase()}">${todayRecord.status}</span>`
        : '<span style="color:var(--text-muted);font-size:0.8rem">Not marked</span>';

      html += `
        <tr class="fade-in" style="animation-delay:${index * 0.05}s">
          <td style="color:var(--text-muted)">${index + 1}</td>
          <td><strong>${student.name}</strong></td>
          <td><span class="roll-badge">${student.rollNumber}</span></td>
          <td style="font-family:var(--font-mono)">${student.attendance.length}</td>
          <td>${todayBadge}</td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    listEl.innerHTML = html;
  } catch (error) {
    listEl.innerHTML = '<div class="alert alert-error">Could not connect to the server. Start the backend first.</div>';
  }
}

async function addStudent(event) {
  event.preventDefault();
  const name = document.getElementById('studentName').value.trim();
  const rollNumber = document.getElementById('rollNumber').value.trim();
  const btn = document.getElementById('submitBtn');

  if (!name || !rollNumber) {
    showAlert('formAlert', 'Please fill in all fields.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Adding...';

  try {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rollNumber })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('formAlert', data.message || 'Failed to add student.', 'error');
      return;
    }

    cachedStudents = [];
    showAlert('formAlert', `Student "${name}" added successfully.`, 'success');
    document.getElementById('addStudentForm').reset();
    await loadStudentDeleteOptions();
    await refreshAttendanceSheet();
    await loadStudentsForView();
  } catch (error) {
    showAlert('formAlert', 'Server error. Please check if backend is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '+ Add Student';
  }
}

async function loadStudentDeleteOptions() {
  const searchInput = document.getElementById('deleteStudentSearch');
  const options = document.getElementById('deleteStudentOptions');
  if (!searchInput || !options) return;

  try {
    const students = await fetchStudents(true);
    const normalizedSearch = currentDeleteStudentSearch.trim().toLowerCase();
    deleteStudentMatches = students.filter(student =>
      student.name.toLowerCase().includes(normalizedSearch)
    );

    if (students.length === 0) {
      options.innerHTML = '';
      searchInput.disabled = true;
      searchInput.placeholder = 'No students available';
      return;
    }

    searchInput.disabled = false;
    searchInput.placeholder = 'Type a student name';

    options.innerHTML = deleteStudentMatches
      .map(student => `<option value="${student.name} (${student.rollNumber})"></option>`)
      .join('');

  } catch (error) {
    options.innerHTML = '';
    searchInput.disabled = true;
    searchInput.placeholder = 'Could not load students';
  }
}

async function deleteStudent() {
  const searchInput = document.getElementById('deleteStudentSearch');
  const btn = document.getElementById('deleteStudentBtn');
  if (!searchInput || !btn) return;

  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    showAlert('deleteAlert', 'Please search and choose a student to delete.', 'error');
    return;
  }

  const matchedStudents = cachedStudents.filter(student => {
    const optionLabel = `${student.name} (${student.rollNumber})`.toLowerCase();
    return optionLabel === query || student.name.toLowerCase() === query;
  });

  if (matchedStudents.length === 0) {
    showAlert('deleteAlert', 'No student matches that name. Choose a suggestion from the search box.', 'error');
    return;
  }

  if (matchedStudents.length > 1) {
    showAlert('deleteAlert', 'Multiple students share that name. Pick the suggestion with the roll number.', 'error');
    return;
  }

  const student = matchedStudents[0];
  const studentId = student._id;
  const studentName = student ? student.name : 'this student';
  const confirmed = window.confirm(`Delete ${studentName} and all attendance records?`);
  if (!confirmed) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Deleting...';

  try {
    const res = await fetch(`${API_BASE}/students/${studentId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('deleteAlert', data.message || 'Failed to delete student.', 'error');
      return;
    }

    cachedStudents = [];
    currentDeleteStudentSearch = '';
    showAlert('deleteAlert', `${studentName} was deleted successfully.`, 'success');
    searchInput.value = '';
    await loadStudentDeleteOptions();
    await refreshAttendanceSheet();
    await loadStudentsForView();
    await loadDashboard();
  } catch (error) {
    showAlert('deleteAlert', 'Server error. Please check if backend is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Delete Student';
  }
}

function updateAttendanceCounters() {
  const checkboxes = Array.from(document.querySelectorAll('.attendance-checkbox'));
  if (checkboxes.length === 0) return;

  const presentCount = checkboxes.filter(checkbox => checkbox.checked).length;
  const total = checkboxes.length;

  document.getElementById('sheetTotalStudents').textContent = total;
  document.getElementById('sheetPresentCount').textContent = presentCount;
  document.getElementById('sheetAbsentCount').textContent = total - presentCount;
}

function renderAttendanceSheet(students, date) {
  const sheetEl = document.getElementById('attendanceSheet');
  if (!sheetEl) return;

  if (students.length === 0) {
    sheetEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Class</div>
        <div class="empty-title">No students found</div>
        <div class="empty-desc">Add students first to create the attendance sheet.</div>
      </div>`;
    document.getElementById('sheetTotalStudents').textContent = '0';
    document.getElementById('sheetPresentCount').textContent = '0';
    document.getElementById('sheetAbsentCount').textContent = '0';
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
    const status = getAttendanceStatus(student, date);
    const checked = status === 'Present' ? 'checked' : '';
    const note = status === 'Present'
      ? 'Already marked present'
      : status === 'Absent'
        ? 'Already marked absent'
        : 'Unchecked means absent';
    const noteClass = status === 'Absent' ? 'attendance-note absent' : 'attendance-note';

    html += `
      <label class="attendance-row" for="attendance-${student._id}">
        <div><strong>${student.name}</strong></div>
        <div><span class="roll-badge">${student.rollNumber}</span></div>
        <div>
          <input
            type="checkbox"
            id="attendance-${student._id}"
            class="attendance-checkbox"
            data-student-id="${student._id}"
            ${checked}
            onchange="updateAttendanceCounters()"
          />
        </div>
        <div class="${noteClass}">${note}</div>
      </label>`;
  });

  sheetEl.innerHTML = html;
  updateAttendanceCounters();
}

async function refreshAttendanceSheet() {
  const sheetEl = document.getElementById('attendanceSheet');
  const dateInput = document.getElementById('attendanceDate');
  const banner = document.getElementById('editDateBanner');
  if (!sheetEl || !dateInput) return;

  try {
    const students = await fetchStudents(true);
    renderAttendanceSheet(students, dateInput.value);
    const alreadyMarkedForDate = students.some(student => getAttendanceStatus(student, dateInput.value));

    if (banner) {
      if (dateInput.value && alreadyMarkedForDate) {
        banner.textContent = `Editing attendance for ${formatDate(dateInput.value)}. Tick Present and leave unchecked for Absent.`;
        banner.style.display = 'block';
      } else {
        banner.textContent = 'Choose a date to load or edit attendance for that day.';
        banner.style.display = 'none';
      }
    }
  } catch (error) {
    showAlert('attendanceAlert', 'Cannot load students. Is the backend running?', 'error');
    sheetEl.innerHTML = '<div class="alert alert-error">Could not load the class attendance sheet.</div>';
    if (banner) {
      banner.textContent = 'Choose a date to load or edit attendance for that day.';
      banner.style.display = 'none';
    }
  }
}

function toggleAllAttendance(isChecked) {
  document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
    checkbox.checked = isChecked;
  });

  updateAttendanceCounters();
}

async function markAttendance(event) {
  event.preventDefault();
  const dateInput = document.getElementById('attendanceDate');
  const btn = document.getElementById('markBtn');
  const checkboxes = Array.from(document.querySelectorAll('.attendance-checkbox'));

  if (!dateInput || !dateInput.value) {
    showAlert('attendanceAlert', 'Please select a date.', 'error');
    return;
  }

  if (checkboxes.length === 0) {
    showAlert('attendanceAlert', 'There are no students to mark yet.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const records = checkboxes.map(checkbox => ({
      studentId: checkbox.dataset.studentId,
      status: checkbox.checked ? 'Present' : 'Absent'
    }));

    const res = await fetch(`${API_BASE}/attendance/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateInput.value, records })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('attendanceAlert', data.message || 'Failed to save attendance.', 'error');
      return;
    }

    await refreshAttendanceSheet();
    showAlert('attendanceAlert', `Attendance saved for ${formatDate(dateInput.value)}.`, 'success');
  } catch (error) {
    showAlert('attendanceAlert', 'Server error. Please check if backend is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Attendance';
  }
}

function renderStudentDetails(studentId) {
  const resultsDiv = document.getElementById('attendanceResults');
  if (!resultsDiv) return;

  const student = cachedStudents.find(item => item._id === studentId);
  if (!student) return;

  selectedStudentId = studentId;

  const summary = getStudentSummary(student);
  const isLow = summary.percentage < 75;
  const sortedAttendance = [...student.attendance].sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = `
    <div class="student-detail-header">
      <div>
        <div class="detail-name">${student.name}</div>
        <div class="detail-roll">${student.rollNumber}</div>
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

  if (sortedAttendance.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">Days</div>
        <div class="empty-title">No attendance records</div>
        <div class="empty-desc">Mark attendance to view present and absent days.</div>
      </div>`;
    resultsDiv.innerHTML = html;
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

  sortedAttendance.forEach((record, index) => {
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
  resultsDiv.innerHTML = html;
}

function renderRecordsTable(students) {
  const wrap = document.getElementById('recordsTableWrap');
  if (!wrap) return;

  if (students.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Class</div>
        <div class="empty-title">No students found</div>
        <div class="empty-desc">Add students to see attendance percentages here.</div>
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
    const summary = getStudentSummary(student);
    const isLow = summary.percentage < 75;

    html += `
      <tr>
        <td style="color:var(--text-muted)">${index + 1}</td>
        <td><button type="button" class="table-link-btn" onclick="renderStudentDetails('${student._id}')">${student.name}</button></td>
        <td><span class="roll-badge">${student.rollNumber}</span></td>
        <td><button type="button" class="table-link-btn percentage-link" onclick="renderStudentDetails('${student._id}')">${summary.percentage.toFixed(2)}%</button></td>
        <td>${isLow ? '<span class="status-text defaulter">Defaulter</span>' : '<span class="status-text regular">Regular</span>'}</td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function renderEmptyStudentDetails(message = 'Search for another student or select one from the list.') {
  const resultsDiv = document.getElementById('attendanceResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">Records</div>
      <div class="empty-title">No student selected</div>
      <div class="empty-desc">${message}</div>
    </div>`;
}

function updateRecordsView() {
  if (cachedStudents.length === 0) {
    renderRecordsTable([]);
    selectedStudentId = null;
    renderEmptyStudentDetails('Add students and mark attendance to view records here.');
    return;
  }

  const normalizedSearch = currentStudentSearch.trim().toLowerCase();
  const filteredStudents = cachedStudents.filter(student =>
    student.name.toLowerCase().includes(normalizedSearch)
  );

  renderRecordsTable(filteredStudents);

  if (filteredStudents.length === 0) {
    selectedStudentId = null;
    renderEmptyStudentDetails('No students match the current name search.');
    return;
  }

  const activeStudent = filteredStudents.find(student => student._id === selectedStudentId) || filteredStudents[0];
  renderStudentDetails(activeStudent._id);
}

async function loadStudentsForView() {
  const wrap = document.getElementById('recordsTableWrap');
  if (!wrap) return;

  try {
    cachedStudents = await fetchStudents(true);
    updateRecordsView();
  } catch (error) {
    showAlert('viewAlert', 'Cannot load students.', 'error');
    wrap.innerHTML = '<div class="alert alert-error">Could not load attendance records.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });

  const dateInput = document.getElementById('attendanceDate');
  if (dateInput) dateInput.value = getTodayDate();

  const studentSearch = document.getElementById('studentSearch');
  if (studentSearch) {
    studentSearch.addEventListener('input', event => {
      currentStudentSearch = event.target.value;
      updateRecordsView();
    });
  }

  const deleteStudentSearch = document.getElementById('deleteStudentSearch');
  if (deleteStudentSearch) {
    deleteStudentSearch.addEventListener('input', event => {
      currentDeleteStudentSearch = event.target.value;
      loadStudentDeleteOptions();
    });
  }

  loadDashboard();
  refreshAttendanceSheet();
  loadStudentsForView();
  loadStudentDeleteOptions();
});
