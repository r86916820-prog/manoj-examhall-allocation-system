import { Student, Hall, Exam, Allocation, Attendance, AuditLog, User, SystemSettings } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('exam_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('exam_auth_token', token);
  } else {
    localStorage.removeItem('exam_auth_token');
    localStorage.removeItem('exam_auth_user');
  }
}

export function getLoggedUser() {
  const userStr = localStorage.getItem('exam_auth_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function setLoggedUser(user: any) {
  if (user) {
    localStorage.setItem('exam_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('exam_auth_user');
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  // Handle file downloads (like export CSV)
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob as any;
  }

  return response.json();
}

export const api = {
  // Authentication
  login: (username: string, password: string) => 
    apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
    
  resetPassword: (email: string, newPassword: string) =>
    apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword })
    }),

  register: (registrationData: any) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    }),

  // Students
  getStudents: () => apiRequest<Student[]>('/students'),
  createStudent: (student: Omit<Student, 'id'>) =>
    apiRequest<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(student)
    }),
  updateStudent: (id: string, student: Partial<Student>) =>
    apiRequest<Student>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student)
    }),
  deleteStudent: (id: string) =>
    apiRequest<{ success: boolean }>(`/students/${id}`, {
      method: 'DELETE'
    }),
  importStudents: (studentsList: any[]) =>
    apiRequest<{ success: boolean; imported: number; duplicates: number }>('/students/import', {
      method: 'POST',
      body: JSON.stringify({ studentsList })
    }),
  exportStudentsUrl: () => `${API_BASE}/students/export`,

  // Halls
  getHalls: () => apiRequest<Hall[]>('/halls'),
  createHall: (hall: Omit<Hall, 'id' | 'availableSeats'>) =>
    apiRequest<Hall>('/halls', {
      method: 'POST',
      body: JSON.stringify(hall)
    }),
  updateHall: (id: string, hall: Partial<Hall>) =>
    apiRequest<Hall>(`/halls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(hall)
    }),
  deleteHall: (id: string) =>
    apiRequest<{ success: boolean }>(`/halls/${id}`, {
      method: 'DELETE'
    }),

  // Exams
  getExams: () => apiRequest<Exam[]>('/exams'),
  createExam: (exam: Omit<Exam, 'id'>) =>
    apiRequest<Exam>('/exams', {
      method: 'POST',
      body: JSON.stringify(exam)
    }),
  updateExam: (id: string, exam: Partial<Exam>) =>
    apiRequest<Exam>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exam)
    }),
  deleteExam: (id: string) =>
    apiRequest<{ success: boolean }>(`/exams/${id}`, {
      method: 'DELETE'
    }),

  // Allocations
  getAllocations: () => apiRequest<Allocation[]>('/allocations'),
  performAutoAllocation: (examId: string, hallIds: string[]) =>
    apiRequest<{
      success: boolean;
      allocatedCount: number;
      unallocatedCount: number;
      unallocatedStudentIds: string[];
      allocations: Allocation[];
    }>('/allocations/auto', {
      method: 'POST',
      body: JSON.stringify({ examId, hallIds })
    }),
  manualSeating: (params: {
    action: 'assign' | 'swap' | 'toggle-lock';
    examId: string;
    studentId?: string;
    targetStudentId?: string;
    hallId?: string;
    row?: number;
    col?: number;
    allocationId?: string;
  }) =>
    apiRequest<{ success: boolean; allocations?: Allocation[]; allocation?: Allocation }>('/allocations/manual', {
      method: 'POST',
      body: JSON.stringify(params)
    }),
  resetAllocations: (examId: string) =>
    apiRequest<{ success: boolean; purgedCount: number }>('/allocations/reset', {
      method: 'POST',
      body: JSON.stringify({ examId })
    }),

  // Attendance
  getAttendance: () => apiRequest<Attendance[]>('/attendance'),
  markAttendance: (examId: string, records: { studentId: string; status: 'present' | 'absent' | 'late' }[]) =>
    apiRequest<{ success: boolean; updatedCount: number }>('/attendance', {
      method: 'POST',
      body: JSON.stringify({ examId, records })
    }),

  // Reports
  getDashboardReport: () => apiRequest<any>('/reports/dashboard'),

  // Settings & Logs & Backups
  getSettings: () => apiRequest<SystemSettings>('/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    apiRequest<SystemSettings>('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }),
  getBackups: () => apiRequest<{ backups: string[] }>('/settings/backup'),
  triggerBackup: () => apiRequest<{ success: boolean; backupFileName: string }>('/settings/backup', {
    method: 'POST'
  }),
  restoreBackup: (fileName: string) =>
    apiRequest<{ success: boolean }>('/settings/restore', {
      method: 'POST',
      body: JSON.stringify({ fileName })
    }),
  getAuditLogs: () => apiRequest<AuditLog[]>('/logs'),
};
