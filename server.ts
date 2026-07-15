import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getDatabaseState,
  saveDatabaseState,
  addAuditLog,
  createBackup,
  listBackups,
  restoreBackup,
  hashPassword,
  verifyPassword
} from './server/db';
import { performAutomaticAllocation } from './server/allocation';
import { DatabaseState, Student, Hall, Exam, Allocation, Attendance, User, SystemSettings } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Middleware to parse auth token (simplified Bearer token for our client state)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      (req as any).user = decoded;
    } catch (e) {
      // Invalid token
    }
  }
  next();
});

// Helper validation middleware
function requireAuth(roles?: ('admin' | 'staff' | 'student')[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDatabaseState();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  // Generate a mock base64 token representing the user session
  const tokenPayload = { id: user.id, username: user.username, role: user.role, studentId: user.studentId };
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

  addAuditLog(user.id, user.username, user.role, 'User Login', `Successfully logged in to the portal.`);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      studentId: user.studentId
    }
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  const db = getDatabaseState();
  const userIdx = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User with this email not found' });
  }

  db.users[userIdx].passwordHash = hashPassword(newPassword);
  saveDatabaseState(db);

  addAuditLog(db.users[userIdx].id, db.users[userIdx].username, db.users[userIdx].role, 'Password Reset', `Password updated successfully via forgot password route.`);

  res.json({ success: true, message: 'Password has been updated successfully.' });
});

app.post('/api/auth/register', (req, res) => {
  const { role, username, email, password, name, department, year, semester, phone } = req.body;

  if (!role || !username || !email || !password || !name) {
    return res.status(400).json({ error: 'Role, Username, Email, Password, and Full Name are required' });
  }

  if (role !== 'student' && role !== 'staff') {
    return res.status(400).json({ error: 'Invalid role selected. Must be Student or Staff.' });
  }

  const db = getDatabaseState();

  // Check if username or email already exists in users list
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: `Username "${username}" is already taken` });
  }
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: `Email "${email}" is already registered` });
  }

  let studentId: string | undefined = undefined;

  if (role === 'student') {
    // If student, check if roll number already exists
    if (db.students.some(s => s.rollNumber.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: `Roll number "${username}" already exists` });
    }

    studentId = `std-${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      rollNumber: username,
      registrationNumber: `REG2026${department || 'CSE'}${Math.floor(100 + Math.random() * 900)}`,
      name,
      email,
      phone: phone || '',
      department: department || 'CSE',
      year: Number(year) || 1,
      semester: Number(semester) || 1,
      branch: department === 'CSE' ? 'Computer Science & Engineering' :
              department === 'ECE' ? 'Electronics & Communication' : 'Mechanical Engineering',
      gender: 'Male',
      section: 'A',
      subjects: department === 'CSE' ? ['CS301', 'CS302', 'CS303'] : 
                department === 'ECE' ? ['EC301', 'EC302', 'CS301'] : ['ME301', 'ME302', 'CS301']
    };
    db.students.push(newStudent);
  }

  const userId = `usr-${Date.now()}`;
  const newUser: User = {
    id: userId,
    username,
    email,
    role,
    studentId,
    passwordHash: hashPassword(password)
  };

  db.users.push(newUser);
  saveDatabaseState(db);

  addAuditLog(userId, username, role, 'User Register', `Successfully registered a new ${role} account for ${name}.`);

  // Generate a mock base64 token representing the user session
  const tokenPayload = { id: newUser.id, username: newUser.username, role: newUser.role, studentId: newUser.studentId };
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

  res.json({
    success: true,
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      studentId: newUser.studentId
    }
  });
});

// ==========================================
// STUDENT CRUD & IMPORT/EXPORT
// ==========================================

app.get('/api/students', requireAuth(['admin', 'staff']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.students);
});

app.post('/api/students', requireAuth(['admin']), (req: any, res) => {
  const studentData: Omit<Student, 'id'> = req.body;
  
  if (!studentData.rollNumber || !studentData.name || !studentData.email || !studentData.department) {
    return res.status(400).json({ error: 'Missing required student fields' });
  }

  const db = getDatabaseState();
  
  // Duplicate roll number check
  if (db.students.some(s => s.rollNumber.toLowerCase() === studentData.rollNumber.toLowerCase())) {
    return res.status(400).json({ error: `Roll number ${studentData.rollNumber} already exists` });
  }

  const studentId = `std-${Date.now()}`;
  const newStudent: Student = {
    ...studentData,
    id: studentId
  };

  db.students.push(newStudent);

  // Auto-generate student login credentials
  db.users.push({
    id: `usr-${studentId}`,
    username: newStudent.rollNumber,
    email: newStudent.email,
    role: 'student',
    studentId: studentId,
    passwordHash: hashPassword('password') // Default password
  });

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Add Student', `Created student ${newStudent.name} (${newStudent.rollNumber})`);

  res.status(201).json(newStudent);
});

app.put('/api/students/:id', requireAuth(['admin', 'staff']), (req: any, res) => {
  const { id } = req.params;
  const updatedData: Partial<Student> = req.body;

  const db = getDatabaseState();
  const idx = db.students.findIndex(s => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Duplicate roll check if roll is changed
  if (updatedData.rollNumber && updatedData.rollNumber.toLowerCase() !== db.students[idx].rollNumber.toLowerCase()) {
    if (db.students.some(s => s.rollNumber.toLowerCase() === updatedData.rollNumber!.toLowerCase())) {
      return res.status(400).json({ error: `Roll number ${updatedData.rollNumber} is already in use` });
    }
    // Update linked user username if it was their roll number
    const userIdx = db.users.findIndex(u => u.studentId === id);
    if (userIdx !== -1) {
      db.users[userIdx].username = updatedData.rollNumber;
    }
  }

  db.students[idx] = {
    ...db.students[idx],
    ...updatedData
  };

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Update Student', `Updated student ${db.students[idx].name}`);

  res.json(db.students[idx]);
});

app.delete('/api/students/:id', requireAuth(['admin']), (req: any, res) => {
  const { id } = req.params;

  const db = getDatabaseState();
  const studentIdx = db.students.findIndex(s => s.id === id);

  if (studentIdx === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const student = db.students[studentIdx];

  // Remove student
  db.students.splice(studentIdx, 1);

  // Remove student's user account
  db.users = db.users.filter(u => u.studentId !== id);

  // Remove student's allocations
  db.allocations = db.allocations.filter(a => a.studentId !== id);

  // Remove student's attendance records
  db.attendance = db.attendance.filter(a => a.studentId !== id);

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Delete Student', `Deleted student ${student.name} (${student.rollNumber})`);

  res.json({ success: true });
});

// Import Students from Excel (CSV formatted upload)
app.post('/api/students/import', requireAuth(['admin']), (req: any, res) => {
  const { studentsList } = req.body; // Expecting array of parsed row objects
  if (!studentsList || !Array.isArray(studentsList)) {
    return res.status(400).json({ error: 'Invalid students list provided' });
  }

  const db = getDatabaseState();
  let importCount = 0;
  let duplicatesCount = 0;

  studentsList.forEach((row: any) => {
    const roll = String(row.rollNumber || '').trim();
    const name = String(row.name || '').trim();
    const email = String(row.email || '').trim() || `${roll.toLowerCase()}@examhall.edu`;
    const department = String(row.department || '').trim();

    if (!roll || !name || !department) return; // skip malformed

    // Check duplicate roll
    if (db.students.some(s => s.rollNumber.toLowerCase() === roll.toLowerCase())) {
      duplicatesCount++;
      return;
    }

    const studentId = `std-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newStudent: Student = {
      id: studentId,
      rollNumber: roll,
      registrationNumber: String(row.registrationNumber || `REG2026${roll}`).trim(),
      name,
      email,
      phone: String(row.phone || '+91 99999 99999').trim(),
      department,
      year: Number(row.year) || 1,
      semester: Number(row.semester) || 1,
      branch: String(row.branch || `${department} Engineering`).trim(),
      gender: (row.gender === 'Female' || row.gender === 'Other') ? row.gender : 'Male',
      section: String(row.section || 'A').trim(),
      subjects: Array.isArray(row.subjects) ? row.subjects : String(row.subjects || 'CS301').split(',').map(s => s.trim()),
    };

    db.students.push(newStudent);

    // Create user login
    db.users.push({
      id: `usr-${studentId}`,
      username: roll,
      email,
      role: 'student',
      studentId,
      passwordHash: hashPassword('password')
    });

    importCount++;
  });

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Import Students', `Imported ${importCount} students via bulk CSV. Duplicates skipped: ${duplicatesCount}.`);

  res.json({ success: true, imported: importCount, duplicates: duplicatesCount });
});

// Export students to CSV
app.get('/api/students/export', (req, res) => {
  const db = getDatabaseState();
  let csvContent = 'Name,Roll Number,Registration Number,Email,Phone,Department,Year,Semester,Branch,Section,Subjects\n';
  
  db.students.forEach(s => {
    csvContent += `"${s.name}","${s.rollNumber}","${s.registrationNumber}","${s.email}","${s.phone}","${s.department}",${s.year},${s.semester},"${s.branch}","${s.section}","${s.subjects.join(',')}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=students-export.csv');
  res.send(csvContent);
});

// ==========================================
// HALL CRUD
// ==========================================

app.get('/api/halls', requireAuth(['admin', 'staff']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.halls);
});

app.post('/api/halls', requireAuth(['admin']), (req: any, res) => {
  const hallData: Omit<Hall, 'id' | 'availableSeats'> = req.body;

  if (!hallData.hallNumber || !hallData.building || !hallData.rows || !hallData.cols) {
    return res.status(400).json({ error: 'Missing required hall layout parameters' });
  }

  const db = getDatabaseState();

  if (db.halls.some(h => h.hallNumber.toLowerCase() === hallData.hallNumber.toLowerCase())) {
    return res.status(400).json({ error: `Hall ${hallData.hallNumber} already exists` });
  }

  const newHall: Hall = {
    ...hallData,
    id: `hall-${Date.now()}`,
    capacity: hallData.rows * hallData.cols,
    availableSeats: hallData.rows * hallData.cols,
    status: hallData.status || 'active'
  };

  db.halls.push(newHall);
  saveDatabaseState(db);

  addAuditLog(req.user.id, req.user.username, req.user.role, 'Create Hall', `Created examination hall ${newHall.hallNumber} with capacity ${newHall.capacity} (${newHall.rows}x${newHall.cols})`);

  res.status(201).json(newHall);
});

app.put('/api/halls/:id', requireAuth(['admin']), (req: any, res) => {
  const { id } = req.params;
  const updatedData: Partial<Hall> = req.body;

  const db = getDatabaseState();
  const idx = db.halls.findIndex(h => h.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Hall not found' });
  }

  // Duplicate name check
  if (updatedData.hallNumber && updatedData.hallNumber.toLowerCase() !== db.halls[idx].hallNumber.toLowerCase()) {
    if (db.halls.some(h => h.hallNumber.toLowerCase() === updatedData.hallNumber!.toLowerCase())) {
      return res.status(400).json({ error: `Hall number ${updatedData.hallNumber} is already in use` });
    }
  }

  const originalRows = db.halls[idx].rows;
  const originalCols = db.halls[idx].cols;

  db.halls[idx] = {
    ...db.halls[idx],
    ...updatedData
  };

  // If dimensions changed, recalculate capacity
  if (updatedData.rows || updatedData.cols) {
    const r = db.halls[idx].rows;
    const c = db.halls[idx].cols;
    db.halls[idx].capacity = r * c;
    db.halls[idx].availableSeats = r * c; // Note: In complex systems, we'd subtract current exam allocations, handled below on dynamic checks

    // If size shrunk, clear allocations that are now out-of-bounds
    if (r < originalRows || c < originalCols) {
      db.allocations = db.allocations.filter(a => {
        if (a.hallId !== id) return true;
        return a.row < r && a.col < c;
      });
    }
  }

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Update Hall', `Updated details/dimensions of hall ${db.halls[idx].hallNumber}`);

  res.json(db.halls[idx]);
});

app.delete('/api/halls/:id', requireAuth(['admin']), (req: any, res) => {
  const { id } = req.params;

  const db = getDatabaseState();
  const idx = db.halls.findIndex(h => h.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Hall not found' });
  }

  const hall = db.halls[idx];
  db.halls.splice(idx, 1);

  // Delete all allocations associated with this hall
  db.allocations = db.allocations.filter(a => a.hallId !== id);

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Delete Hall', `Deleted examination hall ${hall.hallNumber}`);

  res.json({ success: true });
});

// ==========================================
// EXAM CRUD
// ==========================================

app.get('/api/exams', requireAuth(['admin', 'staff', 'student']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.exams);
});

app.post('/api/exams', requireAuth(['admin']), (req: any, res) => {
  const examData: Omit<Exam, 'id'> = req.body;

  if (!examData.name || !examData.subjectCode || !examData.department || !examData.date || !examData.time) {
    return res.status(400).json({ error: 'Missing core examination scheduling criteria' });
  }

  const db = getDatabaseState();
  const newExam: Exam = {
    ...examData,
    id: `ex-${Date.now()}`
  };

  db.exams.push(newExam);
  saveDatabaseState(db);

  addAuditLog(req.user.id, req.user.username, req.user.role, 'Create Exam', `Created exam event "${newExam.name}" for code ${newExam.subjectCode}`);

  res.status(201).json(newExam);
});

app.put('/api/exams/:id', requireAuth(['admin']), (req: any, res) => {
  const { id } = req.params;
  const updatedData: Partial<Exam> = req.body;

  const db = getDatabaseState();
  const idx = db.exams.findIndex(e => e.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  db.exams[idx] = {
    ...db.exams[idx],
    ...updatedData
  };

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Update Exam', `Modified exam properties for "${db.exams[idx].name}"`);

  res.json(db.exams[idx]);
});

app.delete('/api/exams/:id', requireAuth(['admin']), (req: any, res) => {
  const { id } = req.params;

  const db = getDatabaseState();
  const idx = db.exams.findIndex(e => e.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  const exam = db.exams[idx];
  db.exams.splice(idx, 1);

  // Delete all allocations and attendance for this exam
  db.allocations = db.allocations.filter(a => a.examId !== id);
  db.attendance = db.attendance.filter(a => a.examId !== id);

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Delete Exam', `Removed exam event "${exam.name}" and purged its allocations/attendance`);

  res.json({ success: true });
});

// ==========================================
// SEAT ALLOCATION ENGINE APIS
// ==========================================

app.get('/api/allocations', requireAuth(['admin', 'staff', 'student']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.allocations);
});

// Trigger automatic seating plan generator
app.post('/api/allocations/auto', requireAuth(['admin']), (req: any, res) => {
  const { examId, hallIds } = req.body;

  if (!examId || !hallIds || !Array.isArray(hallIds) || hallIds.length === 0) {
    return res.status(400).json({ error: 'Please specify an exam and select at least one active hall for allocation.' });
  }

  try {
    const db = getDatabaseState();
    
    // Check if exam exists
    const exam = db.exams.find(e => e.id === examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Execute algorithm
    const result = performAutomaticAllocation(db, examId, hallIds);

    // Save outputs
    db.allocations = result.allocations;
    saveDatabaseState(db);

    addAuditLog(
      req.user.id,
      req.user.username,
      req.user.role,
      'Seating Allocation',
      `Auto-allocated ${result.allocatedCount} students to halls for exam "${exam.name}". Overflow students unallocated: ${result.unallocatedCount}.`
    );

    res.json({
      success: true,
      allocatedCount: result.allocatedCount,
      unallocatedCount: result.unallocatedCount,
      unallocatedStudentIds: result.unallocatedStudentIds,
      allocations: result.allocations.filter(a => a.examId === examId)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Allocation processing failed' });
  }
});

// Manual modification: drag and drop swap, custom place, lock/unlock
app.post('/api/allocations/manual', requireAuth(['admin']), (req: any, res) => {
  const { action, examId, studentId, hallId, row, col, targetStudentId, allocationId } = req.body;
  const db = getDatabaseState();

  if (!examId) return res.status(400).json({ error: 'Exam ID is required.' });

  if (action === 'assign') {
    // Manually place a student on a specific seat
    if (!studentId || !hallId || row === undefined || col === undefined) {
      return res.status(400).json({ error: 'Missing student, hall, or coordinates.' });
    }

    const hall = db.halls.find(h => h.id === hallId);
    if (!hall) return res.status(404).json({ error: 'Hall not found' });

    // Ensure within bounds
    if (row >= hall.rows || col >= hall.cols) {
      return res.status(400).json({ error: 'Seat coordinate is out of hall bounds.' });
    }

    // Check if target seat is already occupied
    const seatKey = `${hallId}-${row}-${col}`;
    const occupantIdx = db.allocations.findIndex(a => a.examId === examId && a.hallId === hallId && a.row === row && a.col === col);
    const letter = String.fromCharCode(65 + row);
    const seatNumber = `${letter}-${col + 1}`;

    if (occupantIdx !== -1) {
      return res.status(400).json({ error: `Seat ${seatNumber} is already occupied by another student.` });
    }

    // Remove any previous allocation for this student in this exam
    db.allocations = db.allocations.filter(a => !(a.examId === examId && a.studentId === studentId));

    // Place student
    db.allocations.push({
      id: `alloc-${examId}-${studentId}-${hallId}`,
      examId,
      studentId,
      hallId,
      row,
      col,
      seatNumber,
      isLocked: true // Lock automatically on manual override
    });

    saveDatabaseState(db);
    addAuditLog(req.user.id, req.user.username, req.user.role, 'Manual Seating', `Assigned student (ID: ${studentId}) to seat ${seatNumber} in Hall ${hall.hallNumber}`);
    return res.json({ success: true, allocations: db.allocations.filter(a => a.examId === examId) });
  }

  if (action === 'swap') {
    // Swap positions between studentId and targetStudentId for this exam
    if (!studentId || !targetStudentId) {
      return res.status(400).json({ error: 'Both students are required for a swap operation.' });
    }

    const s1AllocIdx = db.allocations.findIndex(a => a.examId === examId && a.studentId === studentId);
    const s2AllocIdx = db.allocations.findIndex(a => a.examId === examId && a.studentId === targetStudentId);

    if (s1AllocIdx === -1 && s2AllocIdx === -1) {
      return res.status(400).json({ error: 'Neither student has an active seating allocation.' });
    }

    if (s1AllocIdx !== -1 && s2AllocIdx !== -1) {
      // Both allocated, swap coordinates and halls
      const tempHall = db.allocations[s1AllocIdx].hallId;
      const tempRow = db.allocations[s1AllocIdx].row;
      const tempCol = db.allocations[s1AllocIdx].col;
      const tempSeatNo = db.allocations[s1AllocIdx].seatNumber;

      db.allocations[s1AllocIdx].hallId = db.allocations[s2AllocIdx].hallId;
      db.allocations[s1AllocIdx].row = db.allocations[s2AllocIdx].row;
      db.allocations[s1AllocIdx].col = db.allocations[s2AllocIdx].col;
      db.allocations[s1AllocIdx].seatNumber = db.allocations[s2AllocIdx].seatNumber;
      db.allocations[s1AllocIdx].isLocked = true;

      db.allocations[s2AllocIdx].hallId = tempHall;
      db.allocations[s2AllocIdx].row = tempRow;
      db.allocations[s2AllocIdx].col = tempCol;
      db.allocations[s2AllocIdx].seatNumber = tempSeatNo;
      db.allocations[s2AllocIdx].isLocked = true;
    } else if (s1AllocIdx !== -1) {
      // Student 1 allocated, Student 2 unallocated. Just move Student 1's seat to Student 2 and unallocate Student 1
      const seat = db.allocations[s1AllocIdx];
      db.allocations[s1AllocIdx] = {
        ...seat,
        id: `alloc-${examId}-${targetStudentId}-${seat.hallId}`,
        studentId: targetStudentId,
        isLocked: true
      };
    } else {
      // Student 2 allocated, Student 1 unallocated. Move to Student 1
      const seat = db.allocations[s2AllocIdx];
      db.allocations[s2AllocIdx] = {
        ...seat,
        id: `alloc-${examId}-${studentId}-${seat.hallId}`,
        studentId: studentId,
        isLocked: true
      };
    }

    saveDatabaseState(db);
    addAuditLog(req.user.id, req.user.username, req.user.role, 'Manual Seating Swap', `Swapped seats between student ${studentId} and student ${targetStudentId}`);
    return res.json({ success: true, allocations: db.allocations.filter(a => a.examId === examId) });
  }

  if (action === 'toggle-lock') {
    if (!allocationId) return res.status(400).json({ error: 'Allocation ID is required.' });
    const allocIdx = db.allocations.findIndex(a => a.id === allocationId);
    if (allocIdx === -1) return res.status(404).json({ error: 'Allocation record not found.' });

    db.allocations[allocIdx].isLocked = !db.allocations[allocIdx].isLocked;
    saveDatabaseState(db);
    return res.json({ success: true, allocation: db.allocations[allocIdx] });
  }

  res.status(400).json({ error: 'Unknown manual seating command action' });
});

app.post('/api/allocations/reset', requireAuth(['admin']), (req: any, res) => {
  const { examId } = req.body;
  if (!examId) return res.status(400).json({ error: 'Exam ID is required.' });

  const db = getDatabaseState();
  const originalCount = db.allocations.length;
  db.allocations = db.allocations.filter(a => a.examId !== examId);
  const deletedCount = originalCount - db.allocations.length;

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Purge Allocations', `Cleared ${deletedCount} seat allocations for Exam ID ${examId}.`);

  res.json({ success: true, purgedCount: deletedCount });
});

// ==========================================
// ATTENDANCE MODULE
// ==========================================

app.get('/api/attendance', requireAuth(['admin', 'staff']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.attendance);
});

// Mark single or batch attendance
app.post('/api/attendance', requireAuth(['admin', 'staff']), (req: any, res) => {
  const { examId, records } = req.body; // records: array of { studentId, status: 'present'|'absent'|'late' }

  if (!examId || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Exam ID and attendance records array are required.' });
  }

  const db = getDatabaseState();
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  records.forEach(({ studentId, status }) => {
    // Delete existing attendance for this student-exam pair to avoid duplicates
    db.attendance = db.attendance.filter(a => !(a.examId === examId && a.studentId === studentId));

    db.attendance.push({
      id: `att-${examId}-${studentId}`,
      examId,
      studentId,
      status,
      markedAt: new Date().toISOString(),
      markedBy: req.user.username
    });
  });

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Mark Attendance', `Updated attendance records for ${records.length} students in Exam "${exam.name}"`);

  res.json({ success: true, updatedCount: records.length });
});

// ==========================================
// ANALYTICS & REPORTS
// ==========================================

app.get('/api/reports/dashboard', requireAuth(['admin', 'staff', 'student']), (req: any, res) => {
  const db = getDatabaseState();
  
  if (req.user.role === 'student') {
    // Return student-specific dashboard info
    const student = db.students.find(s => s.id === req.user.studentId);
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    // Find student's allocated exams and schedules
    const studentExams = db.exams.filter(e => student.subjects.includes(e.subjectCode));
    const studentAllocations = db.allocations.filter(a => a.studentId === student.id);
    const studentAttendance = db.attendance.filter(a => a.studentId === student.id);

    return res.json({
      student,
      exams: studentExams,
      allocations: studentAllocations,
      attendance: studentAttendance,
      universityName: db.settings.universityName,
      currentTerm: db.settings.currentTerm,
    });
  }

  // Admin/Staff dashboard reports aggregations
  const totalStudents = db.students.length;
  const totalHalls = db.halls.length;
  const totalExams = db.exams.length;
  
  const totalCapacity = db.halls.reduce((sum, h) => sum + (h.status === 'active' ? h.capacity : 0), 0);
  const totalAllocated = db.allocations.length;
  const vacantSeats = Math.max(0, totalCapacity - totalAllocated);

  // Department student distributions
  const departmentBreakdown: Record<string, number> = {};
  db.students.forEach(s => {
    departmentBreakdown[s.department] = (departmentBreakdown[s.department] || 0) + 1;
  });

  // Upcoming exams
  const upcomingExams = [...db.exams]
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  res.json({
    totals: {
      students: totalStudents,
      halls: totalHalls,
      exams: totalExams,
      allocated: totalAllocated,
      vacantSeats,
      capacity: totalCapacity
    },
    departmentBreakdown,
    upcomingExams,
    universityName: db.settings.universityName,
    currentTerm: db.settings.currentTerm,
    activeHalls: db.halls.filter(h => h.status === 'active')
  });
});

// ==========================================
// SYSTEM SETTINGS & BACKUPS
// ==========================================

app.get('/api/settings', requireAuth(['admin', 'staff']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.settings);
});

app.post('/api/settings', requireAuth(['admin']), (req: any, res) => {
  const newSettings: Partial<SystemSettings> = req.body;
  const db = getDatabaseState();

  db.settings = {
    ...db.settings,
    ...newSettings
  };

  saveDatabaseState(db);
  addAuditLog(req.user.id, req.user.username, req.user.role, 'Update Settings', `System configuration variables modified.`);

  res.json(db.settings);
});

app.get('/api/settings/backup', requireAuth(['admin']), (req, res) => {
  const backups = listBackups();
  res.json({ backups });
});

app.post('/api/settings/backup', requireAuth(['admin']), (req: any, res) => {
  try {
    const backupFileName = createBackup();
    addAuditLog(req.user.id, req.user.username, req.user.role, 'Database Backup', `Manual snapshot generated: ${backupFileName}`);
    res.json({ success: true, backupFileName });
  } catch (error) {
    res.status(500).json({ error: 'Manual backup file write failed' });
  }
});

app.post('/api/settings/restore', requireAuth(['admin']), (req: any, res) => {
  const { fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: 'Backup filename is required.' });

  try {
    restoreBackup(fileName);
    addAuditLog(req.user.id, req.user.username, req.user.role, 'Database Restore', `System restored to snapshotted state: ${fileName}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Database restoration sequence aborted' });
  }
});

app.get('/api/logs', requireAuth(['admin']), (req, res) => {
  const db = getDatabaseState();
  res.json(db.logs);
});

// ==========================================
// STATIC ASSET SERVING & VITE CONFIG
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In development mode, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve prebuilt assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam Hall Allocation System full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
