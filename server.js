const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => { console.error('❌ MongoDB connection error:', err.message); process.exit(1); });

// ─── Schemas & Models ─────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number },
    email: { type: String, unique: true },
    course: { type: String },
    grade: { type: String }
}, { timestamps: true });

const timetableSchema = new mongoose.Schema({
    day_of_week: { type: String, required: true },
    subject: { type: String, required: true },
    time_slot: { type: String, required: true },
    classroom: { type: String }
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true },   // stored as 'YYYY-MM-DD'
    status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Absent' }
}, { timestamps: true });
// Unique attendance per student per day
attendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

const feeSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    total_fee: { type: Number, default: 50000 },
    paid_fee: { type: Number, default: 0 },
    status: { type: String, default: 'Unpaid' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);

// ─── JWT Middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret_change_me', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: 'User registered successfully', user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect password.' });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || 'default_secret_change_me',
            { expiresIn: '1h' }
        );
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STUDENT CRUD ─────────────────────────────────────────────────────────────
app.get('/api/students', authenticateToken, async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        res.json(students);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students', authenticateToken, async (req, res) => {
    const { name, age, email, course, grade } = req.body;
    try {
        const student = await Student.create({ name, age, email, course, grade });
        // Auto-create a blank fee ledger for this student
        await Fee.create({ student_id: student._id, total_fee: 50000, paid_fee: 0, status: 'Unpaid' });
        res.status(201).json(student);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
    const { name, age, email, course, grade } = req.body;
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { name, age, email, course, grade },
            { new: true, runValidators: true }
        );
        if (!student) return res.status(404).json({ error: 'Student not found.' });
        res.json(student);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        await Fee.deleteOne({ student_id: req.params.id });
        res.json({ message: 'Student removed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TIMETABLE ────────────────────────────────────────────────────────────────
const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

app.get('/api/timetable', authenticateToken, async (req, res) => {
    try {
        const entries = await Timetable.find();
        // Sort by day order
        entries.sort((a, b) => (dayOrder[a.day_of_week] || 6) - (dayOrder[b.day_of_week] || 6));
        res.json(entries);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/timetable', authenticateToken, async (req, res) => {
    const { day_of_week, subject, time_slot, classroom } = req.body;
    try {
        const entry = await Timetable.create({ day_of_week, subject, time_slot, classroom });
        res.status(201).json(entry);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
app.get('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        const students = await Student.find().sort({ createdAt: -1 });

        const attendanceRecords = await Attendance.find({ date: today });
        const attendanceMap = {};
        attendanceRecords.forEach(a => { attendanceMap[a.student_id.toString()] = a.status; });

        const result = students.map(s => ({
            student_id: s._id,
            name: s.name,
            course: s.course,
            status: attendanceMap[s._id.toString()] || null,
            date: today
        }));
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
    const { student_id, status } = req.body;
    try {
        const today = new Date().toISOString().split('T')[0];
        const record = await Attendance.findOneAndUpdate(
            { student_id, date: today },
            { status },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(record);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── FEES LEDGER ──────────────────────────────────────────────────────────────
app.get('/api/fees', authenticateToken, async (req, res) => {
    try {
        const fees = await Fee.find().populate('student_id', 'name course').sort({ createdAt: -1 });
        const result = fees.map(f => ({
            id: f._id,
            student_id: f.student_id?._id,
            name: f.student_id?.name,
            course: f.student_id?.course,
            total_fee: f.total_fee,
            paid_fee: f.paid_fee,
            status: f.status
        }));
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/fees/:student_id', authenticateToken, async (req, res) => {
    const { student_id } = req.params;
    const { paid_fee } = req.body;
    try {
        const feeRecord = await Fee.findOne({ student_id });
        if (!feeRecord) return res.status(404).json({ error: 'Fee record not found.' });

        const total = feeRecord.total_fee;
        const paid = parseFloat(paid_fee);
        const status = paid >= total ? 'Fully Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';

        feeRecord.paid_fee = paid;
        feeRecord.status = status;
        await feeRecord.save();
        res.json(feeRecord);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── Catch-all for SPA ────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));