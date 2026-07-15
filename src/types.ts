export interface Student {
  id: string;
  rollNumber: string;
  registrationNumber: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  year: number; // 1, 2, 3, 4
  semester: number; // 1 to 8
  branch: string; // e.g. "Computer Science", "Information Technology", etc.
  gender: 'Male' | 'Female' | 'Other';
  section: string; // "A", "B", "C"
  subjects: string[]; // Subject codes
  photoUrl?: string; // Base64 or image path
}

export interface Hall {
  id: string;
  hallNumber: string; // Room designation, e.g., "LH-101"
  building: string; // e.g., "Science Block"
  floor: number; // 0 for ground, 1, 2...
  capacity: number; // Rows * Columns
  rows: number;
  cols: number;
  availableSeats: number;
  status: 'active' | 'inactive';
}

export interface Exam {
  id: string;
  name: string; // e.g. "Data Structures Midterm"
  subjectCode: string; // e.g. "CS201"
  department: string; // e.g. "CSE"
  semester: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour style)
  duration: number; // In minutes, e.g., 180
  instructions: string;
}

export interface Allocation {
  id: string;
  examId: string;
  studentId: string;
  hallId: string;
  row: number; // 0-indexed row position in the hall layout grid
  col: number; // 0-indexed col position in the hall layout grid
  seatNumber: string; // formatted identifier, e.g., "R1-C3"
  isLocked: boolean; // if true, automatic shuffle won't touch this seat assignment
}

export interface Attendance {
  id: string;
  examId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  markedBy: string; // Username of the staff/admin who marked it
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  role: 'admin' | 'staff' | 'student';
  action: string;
  details: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'student';
  studentId?: string; // links to student ID if student role
  passwordHash: string;
}

export interface SystemSettings {
  universityName: string;
  currentTerm: string;
  autoBackupEnabled: boolean;
  theme: 'light' | 'dark';
}

export interface DatabaseState {
  users: User[];
  students: Student[];
  halls: Hall[];
  exams: Exam[];
  allocations: Allocation[];
  attendance: Attendance[];
  logs: AuditLog[];
  settings: SystemSettings;
}
