import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Exam, Student, Allocation, Attendance } from '../types';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Save, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function AttendanceMarker() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // Selected config
  const [selectedExamId, setSelectedExamId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Local state changes before committing to backend database
  const [localRecords, setLocalRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const loadAttendanceContext = async () => {
    try {
      const [exs, stds, allocs, atts] = await Promise.all([
        api.getExams(),
        api.getStudents(),
        api.getAllocations(),
        api.getAttendance()
      ]);
      setExams(exs);
      setStudents(stds);
      setAllocations(allocs);
      setAttendance(atts);

      if (exs.length > 0 && !selectedExamId) {
        setSelectedExamId(exs[0].id);
      }
    } catch (e) {
      console.error('Failed to load attendance list context', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceContext();
  }, []);

  const activeExam = exams.find(e => e.id === selectedExamId);

  // Initialize local markers when the exam changes
  useEffect(() => {
    if (!selectedExamId) return;

    const examAttendance = attendance.filter(a => a.examId === selectedExamId);
    const initialRecords: Record<string, 'present' | 'absent' | 'late'> = {};
    
    examAttendance.forEach(att => {
      initialRecords[att.studentId] = att.status;
    });

    setLocalRecords(initialRecords);
    setSaveSuccess('');
  }, [selectedExamId, attendance]);

  const handleMarkStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setLocalRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
    setSaveSuccess('');
  };

  const handleSaveAttendance = async () => {
    if (!selectedExamId) return;

    setIsSaving(true);
    setSaveSuccess('');

    try {
      const recordsToPost = Object.entries(localRecords).map(([studentId, status]) => ({
        studentId,
        status: status as 'present' | 'absent' | 'late'
      }));

      await api.markAttendance(selectedExamId, recordsToPost);
      setSaveSuccess('Attendance roster saved successfully!');
      
      // Refresh context
      const freshAttendance = await api.getAttendance();
      setAttendance(freshAttendance);
    } catch (e: any) {
      alert(e.message || 'Saving attendance failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students who are taking this exam (by subjects list)
  const examCandidates = activeExam
    ? students.filter(student => student.subjects.includes(activeExam.subjectCode))
    : [];

  const filteredCandidates = examCandidates.filter(student => {
    const query = search.toLowerCase();
    const matchSearch = student.name.toLowerCase().includes(query) || 
                        student.rollNumber.toLowerCase().includes(query);
    
    const localStatus = localRecords[student.id] || 'unmarked';
    const matchStatus = statusFilter ? localStatus === statusFilter : true;

    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalCount = examCandidates.length;
  const presentCount = Object.values(localRecords).filter(s => s === 'present').length;
  const absentCount = Object.values(localRecords).filter(s => s === 'absent').length;
  const lateCount = Object.values(localRecords).filter(s => s === 'late').length;
  const unmarkedCount = Math.max(0, totalCount - (presentCount + absentCount + lateCount));

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Supervisor Attendance Module
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Audit examination hall attendees, mark absent logs, and generate reports</p>
        </div>

        {/* Dropdown slot */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
            Active Exam:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.subjectCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aggregate stats dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-mono">
            Total Candidates
          </p>
          <h3 className="text-xl font-bold text-slate-900 font-display">{totalCount}</h3>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1 font-mono">
            Present
          </p>
          <h3 className="text-xl font-bold text-emerald-700 font-display">{presentCount}</h3>
        </div>

        <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-red-600 uppercase font-bold tracking-wider mb-1 font-mono">
            Absent
          </p>
          <h3 className="text-xl font-bold text-red-700 font-display">{absentCount}</h3>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider mb-1 font-mono">
            Late Entry
          </p>
          <h3 className="text-xl font-bold text-amber-700 font-display">{lateCount}</h3>
        </div>

        <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl shadow-sm text-center col-span-2 md:col-span-1">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-mono">
            Unmarked Slots
          </p>
          <h3 className="text-xl font-bold text-slate-500 font-display">{unmarkedCount}</h3>
        </div>

      </div>

      {/* Filters and save button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        
        <div className="flex flex-1 gap-2.5 w-full">
          {/* Search bar */}
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search student by name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs transition-all outline-none"
            />
          </div>

          {/* Status Select filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/50"
          >
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="unmarked">Unmarked</option>
          </select>
        </div>

        {/* Save button and alerts */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 font-mono">
              {saveSuccess}
            </span>
          )}

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || examCandidates.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 focus:outline-none shadow-lg shadow-indigo-600/10"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving Roster...' : 'Commit Attendance'}</span>
          </button>
        </div>

      </div>

      {/* Interactive Marking Table */}
      {isLoading ? (
        <div className="h-44 flex flex-col justify-center items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Fetching candidate profiles...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-xs text-slate-400 font-medium">No candidate students match the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-5">Seat No.</th>
                  <th className="py-3 px-5">Candidate Name</th>
                  <th className="py-3 px-5">Roll Code</th>
                  <th className="py-3 px-5">Branch Dept</th>
                  <th className="py-3 px-5 text-center">Supervisor Attendance Marker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredCandidates.map((student) => {
                  // Find student seat number in allocations
                  const alloc = allocations.find(a => a.examId === selectedExamId && a.studentId === student.id);
                  const seatNo = alloc ? alloc.seatNumber : 'Unallocated';
                  const currentStatus = localRecords[student.id];

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                          alloc ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          {seatNo}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900">{student.name}</td>
                      <td className="py-4 px-5 font-mono text-slate-500 font-bold">{student.rollNumber}</td>
                      <td className="py-4 px-5 font-mono text-slate-400">{student.department}</td>
                      <td className="py-4 px-5">
                        <div className="flex justify-center items-center gap-1.5">
                          {/* Present button */}
                          <button
                            onClick={() => handleMarkStatus(student.id, 'present')}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase font-mono cursor-pointer transition-all flex items-center gap-1 focus:outline-none ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 border-transparent text-white shadow-md shadow-emerald-600/15 font-extrabold'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <CheckCircle size={11} />
                            <span>Present</span>
                          </button>

                          {/* Absent button */}
                          <button
                            onClick={() => handleMarkStatus(student.id, 'absent')}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase font-mono cursor-pointer transition-all flex items-center gap-1 focus:outline-none ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 border-transparent text-white shadow-md shadow-red-600/15 font-extrabold'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <XCircle size={11} />
                            <span>Absent</span>
                          </button>

                          {/* Late button */}
                          <button
                            onClick={() => handleMarkStatus(student.id, 'late')}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase font-mono cursor-pointer transition-all flex items-center gap-1 focus:outline-none ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 border-transparent text-white shadow-md shadow-amber-500/15 font-extrabold'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <Clock size={11} />
                            <span>Late</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* supervisor instructions card footer */}
      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-3xl text-xs text-indigo-950 flex items-start gap-3 shadow-sm">
        <AlertCircle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-semibold">
          Marking compliance: All attendance inputs made locally must be saved by clicking <code className="font-bold text-indigo-700">Commit Attendance</code>. This ensures session logs are written to the main university database, generating audit trails for administrators.
        </p>
      </div>

    </div>
  );
}
