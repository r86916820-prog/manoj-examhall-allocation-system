import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseState, User, Student, Hall, Exam, Allocation, Attendance, AuditLog, SystemSettings } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'db.json');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Native secure password hashing helpers
export function hashPassword(password: string): string {
  const salt = 'examsalt123'; // Static salt for simplicity in this full-stack applet
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate default mock data to seed the database
function generateInitialState(): DatabaseState {
  const users: User[] = [
    {
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@examhall.edu',
      role: 'admin',
      passwordHash: hashPassword('password'),
    },
    {
      id: 'usr-staff1',
      username: 'staff',
      email: 'staff@examhall.edu',
      role: 'staff',
      passwordHash: hashPassword('password'),
    },
  ];

  // Generating rich sample students across multiple departments
  const depts = [
    { code: 'CSE', name: 'Computer Science & Engineering', count: 12 },
    { code: 'ECE', name: 'Electronics & Communication', count: 10 },
    { code: 'MECH', name: 'Mechanical Engineering', count: 8 }
  ];

  const students: Student[] = [];
  let studentCounter = 1;

  depts.forEach((dept) => {
    for (let i = 1; i <= dept.count; i++) {
      const year = Math.floor(Math.random() * 4) + 1;
      const sem = year * 2 - (Math.random() > 0.5 ? 1 : 0);
      const rollNum = `${dept.code}260${String(i).padStart(2, '0')}`;
      const regNum = `REG2026${dept.code}${String(i).padStart(3, '0')}`;
      const name = [
        'Aarav', 'Ananya', 'Vihaan', 'Aditi', 'Arjun', 'Diya', 'Sai', 'Pranav', 'Rohan', 'Sneha',
        'Ishaan', 'Rahul', 'Kavya', 'Riya', 'Nikhil', 'Dev', 'Tara', 'Shreya', 'Kabir', 'Maya'
      ][(studentCounter - 1) % 20] + ' ' + [
        'Sharma', 'Verma', 'Patel', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Reddy', 'Rao', 'Joshi'
      ][Math.floor(Math.random() * 10)];

      const studentId = `std-${studentCounter++}`;
      
      students.push({
        id: studentId,
        rollNumber: rollNum,
        registrationNumber: regNum,
        name,
        email: `${rollNum.toLowerCase()}@examhall.edu`,
        phone: `+91 98765 ${String(40000 + studentCounter).padStart(5, '0')}`,
        department: dept.code,
        year,
        semester: sem,
        branch: dept.name,
        gender: Math.random() > 0.55 ? 'Male' : (Math.random() > 0.9 ? 'Other' : 'Female'),
        section: i <= Math.ceil(dept.count / 2) ? 'A' : 'B',
        subjects: dept.code === 'CSE' ? ['CS301', 'CS302', 'CS303'] : 
                  dept.code === 'ECE' ? ['EC301', 'EC302', 'CS301'] : ['ME301', 'ME302', 'CS301'],
      });

      // Also generate login credentials for students
      users.push({
        id: `usr-${studentId}`,
        username: rollNum,
        email: `${rollNum.toLowerCase()}@examhall.edu`,
        role: 'student',
        studentId,
        passwordHash: hashPassword('password'),
      });
    }
  });

  const halls: Hall[] = [
    {
      id: 'hall-1',
      hallNumber: 'LH-101',
      building: 'Newton Block',
      floor: 1,
      capacity: 24,
      rows: 6,
      cols: 4,
      availableSeats: 24,
      status: 'active',
    },
    {
      id: 'hall-2',
      hallNumber: 'LH-102',
      building: 'Newton Block',
      floor: 1,
      capacity: 20,
      rows: 5,
      cols: 4,
      availableSeats: 20,
      status: 'active',
    },
    {
      id: 'hall-3',
      hallNumber: 'CH-201',
      building: 'Ramanujan Lab',
      floor: 2,
      capacity: 35,
      rows: 7,
      cols: 5,
      availableSeats: 35,
      status: 'active',
    },
  ];

  const exams: Exam[] = [
    {
      id: 'ex-1',
      name: 'Data Structures & Algorithms',
      subjectCode: 'CS301',
      department: 'CSE',
      semester: 3,
      date: '2026-07-20',
      time: '09:30',
      duration: 180,
      instructions: 'Do not bring programmable calculators. Standard rough sheets will be provided.',
    },
    {
      id: 'ex-2',
      name: 'Digital Signal Processing',
      subjectCode: 'EC302',
      department: 'ECE',
      semester: 5,
      date: '2026-07-21',
      time: '14:00',
      duration: 120,
      instructions: 'Carry your own graphing tool if authorized. Show your Hall Ticket before entry.',
    },
    {
      id: 'ex-3',
      name: 'Object Oriented Programming',
      subjectCode: 'CS302',
      department: 'CSE',
      semester: 3,
      date: '2026-07-22',
      time: '09:30',
      duration: 180,
      instructions: 'Ensure your laptop is kept in the storage area if you did not select paper-based options.',
    }
  ];

  const settings: SystemSettings = {
    universityName: 'Apex Technological University',
    currentTerm: 'Summer Term 2026',
    autoBackupEnabled: true,
    theme: 'light',
  };

  const logs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      userId: 'usr-admin',
      username: 'admin',
      role: 'admin',
      action: 'Database Initialization',
      details: 'System database created and seeded with 30 students, 3 exam halls, and 3 mock exam events.',
    },
  ];

  return {
    users,
    students,
    halls,
    exams,
    allocations: [],
    attendance: [],
    logs,
    settings,
  };
}

export function getDatabaseState(): DatabaseState {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialState = generateInitialState();
      saveDatabaseState(initialState);
      return initialState;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data) as DatabaseState;
  } catch (error) {
    console.error('Error loading database state:', error);
    return generateInitialState();
  }
}

export function saveDatabaseState(state: DatabaseState): void {
  try {
    // Ensure parent directory exists if any
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database state:', error);
  }
}

// Log a system action
export function addAuditLog(userId: string, username: string, role: 'admin' | 'staff' | 'student', action: string, details: string) {
  const state = getDatabaseState();
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    userId,
    username,
    role,
    action,
    details,
  };
  state.logs.unshift(log); // Keep newest logs at the beginning
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500); // Caps history
  }
  saveDatabaseState(state);
}

// Backup and restore helpers
export function createBackup(): string {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const dbState = getDatabaseState();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(dbState, null, 2), 'utf-8');
    return backupFileName;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

export function listBackups(): string[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    return fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

export function restoreBackup(fileName: string): void {
  try {
    const backupFilePath = path.join(BACKUP_DIR, fileName);
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file ${fileName} does not exist`);
    }
    const data = fs.readFileSync(backupFilePath, 'utf-8');
    const restoredState = JSON.parse(data) as DatabaseState;
    saveDatabaseState(restoredState);
  } catch (error) {
    console.error(`Restore failed for ${fileName}:`, error);
    throw error;
  }
}
