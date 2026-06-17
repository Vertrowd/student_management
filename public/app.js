// Automatically uses the live server's domain name in production
const API_URL = `${window.location.origin}/api`;
const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Guard Route Interceptor Execution mapping check
if (window.location.pathname.includes('dashboard.html') && !localStorage.getItem('token')) {
    window.location.href = '/login.html';
}

// Tab Swapping Controller Module Engine setup
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('text-indigo-600', 'border-indigo-600');
        el.classList.add('text-gray-500', 'border-transparent');
    });

    document.getElementById(tabId).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${tabId}`);
    activeBtn.classList.remove('text-gray-500', 'border-transparent');
    activeBtn.classList.add('text-indigo-600', 'border-indigo-600');

    // Content Pipeline Refresher Dispatch Mapping Check
    if (tabId === 'studentsTab') loadStudents();
    if (tabId === 'timetableTab') loadTimetable();
    if (tabId === 'attendanceTab') loadAttendance();
    if (tabId === 'feesTab') loadFees();
};

document.addEventListener('DOMContentLoaded', () => {
    setupFormListener('signupForm', async (data) => {
        await makeRequest(`${API_URL}/auth/signup`, 'POST', data);
        alert('Registration Successful! Please Login.');
        window.location.href = '/login.html';
    });

    setupFormListener('loginForm', async (data) => {
        const res = await makeRequest(`${API_URL}/auth/login`, 'POST', data);
        localStorage.setItem('token', res.token);
        localStorage.setItem('username', res.username);
        window.location.href = '/dashboard.html';
    });

    if (window.location.pathname.includes('dashboard.html')) {
        document.getElementById('userDisplay').innerText = localStorage.getItem('username');
        document.getElementById('attendanceDateDisplay').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });

        // Core Pipeline Student CRUD Registration Submission Interface mapping Hook
        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('studentId').value;
            const payload = {
                name: document.getElementById('studName').value,
                age: parseInt(document.getElementById('studAge').value),
                email: document.getElementById('studEmail').value,
                course: document.getElementById('studCourse').value,
                grade: document.getElementById('studGrade').value,
            };
            const endpoint = id ? `${API_URL}/students/${id}` : `${API_URL}/students`;
            await makeRequest(endpoint, id ? 'PUT' : 'POST', payload, getAuthHeaders());
            resetStudentForm();
            loadStudents();
        });

        // Timetable Execution Scheduling Submission Module Link
        document.getElementById('timetableForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                day_of_week: document.getElementById('timeDay').value,
                subject: document.getElementById('timeSubject').value,
                time_slot: document.getElementById('timeSlot').value,
                classroom: document.getElementById('timeRoom').value,
            };
            await makeRequest(`${API_URL}/timetable`, 'POST', payload, getAuthHeaders());
            document.getElementById('timetableForm').reset();
            loadTimetable();
        });

        loadStudents();
        document.getElementById('cancelEditBtn').addEventListener('click', resetStudentForm);
    }
});

// Network API fetch utility pipeline pattern wrapper
async function makeRequest(url, method, body, headers = { 'Content-Type': 'application/json' }) {
    try {
        const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request transaction pipeline failed');
        return data;
    } catch (err) { alert(err.message); throw err; }
}

function setupFormListener(formId, callback) {
    const form = document.getElementById(formId);
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); callback(Object.fromEntries(new FormData(form).entries())); });
}

// PIPELINE LOADER 1: LOAD DIRECTORY LIST DATA VIEW
async function loadStudents() {
    try {
        const students = await makeRequest(`${API_URL}/students`, 'GET', null, getAuthHeaders());
        const tbody = document.getElementById('studentTableBody');
        tbody.innerHTML = '';
        students.forEach(s => {
            tbody.innerHTML += `
                <tr class="border-b hover:bg-gray-50 text-sm font-medium text-gray-700">
                    <td class="p-4 font-semibold text-gray-900">${s.name}</td><td class="p-4">${s.age}</td><td class="p-4 text-gray-500">${s.email}</td><td class="p-4">${s.course}</td>
                    <td class="p-4"><span class="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-md font-bold border border-indigo-100">${s.grade}</span></td>
                    <td class="p-4 flex justify-center space-x-3">
                        <button onclick="editStudent(${s.id}, '${s.name}', ${s.age}, '${s.email}', '${s.course}', '${s.grade}')" class="text-indigo-600 hover:text-indigo-900 font-bold text-xs">Edit</button>
                        <button onclick="deleteStudent(${s.id})" class="text-rose-600 hover:text-rose-900 font-bold text-xs">Delete</button>
                    </td>
                </tr>`;
        });
    } catch (err) {}
}

// PIPELINE LOADER 2: TIMETABLE ब्लू प्रिंट RENDER
async function loadTimetable() {
    try {
        const schedule = await makeRequest(`${API_URL}/timetable`, 'GET', null, getAuthHeaders());
        const tbody = document.getElementById('timetableBody');
        tbody.innerHTML = '';
        schedule.forEach(t => {
            tbody.innerHTML += `<tr class="border-b text-sm font-medium text-gray-700 hover:bg-gray-50">
                <td class="p-4 font-bold text-indigo-700">${t.day_of_week}</td><td class="p-4 font-semibold text-gray-900">${t.subject}</td><td class="p-4 text-gray-500">${t.time_slot}</td><td class="p-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold">${t.classroom}</span></td>
            </tr>`;
        });
    } catch (err) {}
}

// PIPELINE LOADER 3: DISPATCH ATTENDANCE VIEW MARKER ROSTER
async function loadAttendance() {
    try {
        const roster = await makeRequest(`${API_URL}/attendance`, 'GET', null, getAuthHeaders());
        const tbody = document.getElementById('attendanceBody');
        tbody.innerHTML = '';
        roster.forEach(r => {
            const status = r.status || 'Unmarked';
            tbody.innerHTML += `<tr class="border-b text-sm font-medium text-gray-700 hover:bg-gray-50">
                <td class="p-4 font-semibold text-gray-900">${r.name}</td><td class="p-4 text-gray-500">${r.course}</td>
                <td class="p-4 text-center space-x-2">
                    <button onclick="markAttendance(${r.student_id}, 'Present')" class="px-3 py-1 rounded text-xs font-bold transition ${status === 'Present' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'}">Present</button>
                    <button onclick="markAttendance(${r.student_id}, 'Absent')" class="px-3 py-1 rounded text-xs font-bold transition ${status === 'Absent' ? 'bg-rose-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600'}">Absent</button>
                    <button onclick="markAttendance(${r.student_id}, 'Late')" class="px-3 py-1 rounded text-xs font-bold transition ${status === 'Late' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600'}">Late</button>
                </td>
            </tr>`;
        });
    } catch (err) {}
}

window.markAttendance = async (studentId, statusState) => {
    await makeRequest(`${API_URL}/attendance`, 'POST', { student_id: studentId, status: statusState }, getAuthHeaders());
    loadAttendance();
};

// PIPELINE LOADER 4: LOAD FINANCIAL LEDGER ACCOUNTS STRUCTURE DATA
async function loadFees() {
    try {
        const fees = await makeRequest(`${API_URL}/fees`, 'GET', null, getAuthHeaders());
        const tbody = document.getElementById('feesBody');
        tbody.innerHTML = '';
        fees.forEach(f => {
            let badgeClass = f.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : f.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200';
            tbody.innerHTML += `<tr class="border-b text-sm font-medium text-gray-700 hover:bg-gray-50">
                <td class="p-4 font-semibold text-gray-900">${f.name}</td><td class="p-4 text-gray-500">${f.course}</td><td class="p-4 font-mono font-bold">$${f.total_fee}</td><td class="p-4 font-mono text-emerald-600 font-semibold">$${f.paid_fee}</td>
                <td class="p-4"><span class="border px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}">${f.status}</span></td>
                <td class="p-4 text-center"><button onclick="collectFeePrompt(${f.student_id}, ${f.paid_fee})" class="bg-indigo-50 text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-md hover:bg-indigo-600 hover:text-white transition">Update Payment</button></td>
            </tr>`;
        });
    } catch (err) {}
}

window.collectFeePrompt = async (studentId, currentPaid) => {
    const amount = prompt("Enter total combined field paid credit amount received to date:", currentPaid);
    if (amount !== null && !isNaN(amount)) {
        await makeRequest(`${API_URL}/fees/${studentId}`, 'PUT', { paid_fee: parseFloat(amount) }, getAuthHeaders());
        loadFees();
    }
};

// Global mapping operations execution contexts hooks
window.deleteStudent = async (id) => {
    if (confirm('Are you sure you want to remove this record?')) { await makeRequest(`${API_URL}/students/${id}`, 'DELETE', null, getAuthHeaders()); loadStudents(); }
};

window.editStudent = (id, name, age, email, course, grade) => {
    document.getElementById('formTitle').innerText = "Modify Student Record";
    document.getElementById('studentId').value = id; document.getElementById('studName').value = name;
    document.getElementById('studAge').value = age; document.getElementById('studEmail').value = email;
    document.getElementById('studCourse').value = course; document.getElementById('studGrade').value = grade;
    document.getElementById('saveBtn').innerText = "Update Entry"; document.getElementById('cancelEditBtn').classList.remove('hidden');
};

function resetStudentForm() {
    document.getElementById('formTitle').innerText = "Add New Student Profile"; document.getElementById('studentId').value = '';
    document.getElementById('studentForm').reset(); document.getElementById('saveBtn').innerText = "Save Student Record";
    document.getElementById('cancelEditBtn').classList.add('hidden');
}