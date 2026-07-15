import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Student, Exam, Allocation, Attendance } from '../types';
import { 
  UserCircle2, 
  MapPin, 
  CalendarDays, 
  CheckCircle, 
  Printer, 
  HelpCircle, 
  ArrowRight, 
  BookOpenCheck, 
  Bookmark,
  LogOut,
  AlertCircle
} from 'lucide-react';

interface StudentDashboardProps {
  user: { username: string; role: string; email: string; studentId?: string };
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVoucher, setShowVoucher] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.getDashboardReport();
      setData(res);
    } catch (e) {
      console.error('Failed to load student dashboard statistics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTriggerPrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center gap-3 font-sans text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold">Loading your student workspace...</p>
      </div>
    );
  }

  const student: Student = data?.student;
  const exams: Exam[] = data?.exams || [];
  const allocations: Allocation[] = data?.allocations || [];
  const attendance: Attendance[] = data?.attendance || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 sm:p-8 space-y-6 overflow-y-auto print:bg-white print:p-0">
      
      {/* Brand Header (Hidden on print) */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5 print:hidden">
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono tracking-widest leading-none">
            STUDENT COMPLIANCE PORTAL
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display mt-1">
            {data?.universityName || 'Apex Tech University'}
          </h1>
        </div>

        <button
          onClick={onLogout}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
        >
          <LogOut size={13} />
          <span>Logout Session</span>
        </button>
      </div>

      {/* Main Container */}
      {!showVoucher ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
          
          {/* Left Column: Student profile block (Span 4) */}
          <div className="lg:col-span-4 space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="text-center space-y-3 pb-4 border-b border-slate-100">
              {/* Photo placeholder */}
              <div className="inline-flex w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-3xl items-center justify-center text-indigo-600 font-bold font-display text-2xl uppercase">
                {student?.name.split(' ').map(n => n[0]).slice(0,2).join('')}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
                  {student?.name}
                </h3>
                <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
                  {student?.rollNumber}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Reg: {student?.registrationNumber}
                </p>
              </div>
            </div>

            {/* Profiles detail metrics */}
            <div className="space-y-3.5 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-slate-950 font-semibold">{student?.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Branch Name:</span>
                <span className="text-slate-950 font-semibold truncate max-w-[180px]" title={student?.branch}>{student?.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Section:</span>
                <span className="text-slate-950 font-semibold font-mono">Sec {student?.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Year / Semester:</span>
                <span className="text-slate-950 font-semibold">Year {student?.year} / Sem {student?.semester}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Phone:</span>
                <span className="text-slate-950 font-semibold font-mono">{student?.phone}</span>
              </div>
            </div>

            {/* Print Voucher shortcut button */}
            <button
              onClick={() => setShowVoucher(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <Printer size={13} />
              <span>Download / Print Hall Ticket</span>
            </button>
          </div>

          {/* Right Column: Allocated Timetable (Span 8) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <BookOpenCheck size={14} />
              Personal Examination Schedule
            </h3>

            {exams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm">
                No exam dates scheduled for your enrolled subject profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {exams.map(exam => {
                  const alloc = allocations.find(a => a.examId === exam.id);
                  const att = attendance.find(a => a.examId === exam.id);

                  return (
                    <div key={exam.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg">
                            {exam.subjectCode}
                          </span>
                          <span className="text-slate-400">SLOT ID: {exam.id}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight font-display line-clamp-1">
                            {exam.name}
                          </h4>
                        </div>

                        {/* Logistics info */}
                        <div className="grid grid-cols-2 gap-3.5 py-3 border-y border-slate-100 text-[11px] font-medium font-mono text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-slate-400" />
                            <span>{exam.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Bookmark size={12} className="text-slate-400" />
                            <span>{exam.time} Hrs ({exam.duration}m)</span>
                          </div>
                        </div>

                        {/* Seating highlighted results */}
                        {alloc ? (
                          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3.5 shadow-sm text-xs text-emerald-800">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-xl font-mono font-black text-xs shrink-0 select-none shadow-sm shadow-emerald-600/10">
                              {alloc.seatNumber}
                            </div>
                            <div>
                              <p className="font-bold text-emerald-950">Seating Allocated</p>
                              <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                Room Block: <span className="font-bold">{alloc.seatNumber.split('-')[0]}</span> (Newton Block)
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-950">Seating Unassigned</p>
                              <p className="text-[10px] text-amber-700 mt-0.5">Seating maps for this exam slot have not been completed by proctors.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Attendance badge */}
                      {att && (
                        <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold font-mono uppercase tracking-wider">
                          <span className="text-slate-400">Session Attendance:</span>
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            att.status === 'present' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : att.status === 'late' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {att.status}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* HD Printable Hall Ticket Certificate/Voucher (Print View) */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl mx-auto shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
          
          {/* Action header (hidden on print) */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6 print:hidden">
            <button
              onClick={() => setShowVoucher(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 focus:outline-none cursor-pointer"
            >
              <ArrowRight className="rotate-180" size={13} />
              <span>Return to Workspace</span>
            </button>

            <button
              onClick={handleTriggerPrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none shadow-lg shadow-indigo-600/10"
            >
              <Printer size={13} />
              <span>Print Hall Ticket (PDF)</span>
            </button>
          </div>

          {/* Certificate Main Body */}
          <div className="border-4 border-slate-900 p-6 space-y-6 relative rounded-2xl">
            
            {/* Stamp mock circle in background */}
            <div className="absolute bottom-16 right-12 w-28 h-28 rounded-full border-4 border-slate-300/30 flex items-center justify-center text-[9px] font-bold text-slate-300/30 uppercase tracking-widest font-mono select-none pointer-events-none rotate-12">
              APEX UNIVERSITY
            </div>

            {/* University Header */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
              <h2 className="text-lg font-black tracking-tight text-slate-950 font-display">
                APEX TECHNOLOGICAL UNIVERSITY
              </h2>
              <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase">
                EXAMINATION HALL ADMISSION VOUCHER
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                SUMMER TERM SEMESTER EXAMS • OFFICIAL CREDENTIALS
              </p>
            </div>

            {/* Student metadata row */}
            <div className="flex justify-between items-start gap-6 py-2">
              <div className="space-y-2 flex-1 text-xs">
                <p><span className="font-mono text-slate-400 font-bold uppercase tracking-wider text-[10px]">CANDIDATE:</span> <strong className="text-slate-950 font-bold text-sm uppercase">{student?.name}</strong></p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-800 pt-1.5 border-t border-slate-100">
                  <p>Roll No: <span className="font-bold text-slate-950">{student?.rollNumber}</span></p>
                  <p>Reg No: <span className="font-bold text-slate-950">{student?.registrationNumber}</span></p>
                  <p>Branch: <span className="font-bold text-slate-950">{student?.department}</span></p>
                  <p>Section: <span className="font-bold text-slate-950">{student?.section}</span></p>
                </div>
              </div>

              {/* Mock photo block for voucher */}
              <div className="w-20 h-20 bg-slate-50 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center text-[8px] font-bold text-slate-400 font-mono select-none uppercase tracking-widest leading-none">
                <span>PASSPORT</span>
                <span className="mt-1">PHOTO</span>
              </div>
            </div>

            {/* Exam roster slot details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Registered examination schedule & Seat codes:
              </h4>

              <div className="overflow-hidden border border-slate-900 rounded-lg">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-950 uppercase text-[9px]">
                      <th className="p-2">Subject Code</th>
                      <th className="p-2">Exam Description</th>
                      <th className="p-2">Date & Time</th>
                      <th className="p-2 text-center">Room Seat No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {exams.map(ex => {
                      const alloc = allocations.find(a => a.examId === ex.id);
                      return (
                        <tr key={ex.id} className="divide-x divide-slate-200">
                          <td className="p-2 font-bold text-slate-950">{ex.subjectCode}</td>
                          <td className="p-2 font-sans truncate max-w-[150px]">{ex.name}</td>
                          <td className="p-2">{ex.date} @ {ex.time} Hrs</td>
                          <td className="p-2 text-center font-bold font-mono text-slate-950">
                            {alloc ? alloc.seatNumber : 'TBD'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance disclosures and signatures */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[9px] text-slate-500 font-sans leading-relaxed">
                <p className="font-bold text-slate-800 mb-1 flex items-center gap-1 uppercase font-mono">
                  <AlertCircle size={10} />
                  Official Admission Compliance Rules:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Candidate MUST present this physical ticket alongside a valid University photo ID card before entering room blocks.</li>
                  <li>Programmable smart watches, calculators, and communication devices are strictly prohibited within room boundaries.</li>
                  <li>Candidates entering after 15 minutes of session start will be marked as "LATE" or disqualified per supervisor regulations.</li>
                </ol>
              </div>

              {/* Signature lines & barcode */}
              <div className="flex justify-between items-end pt-4">
                {/* CSS simulated barcode */}
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex gap-0.5 select-none bg-slate-900 p-1.5 rounded">
                    {Array.from({ length: 28 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white" 
                        style={{ 
                          width: `${idx % 3 === 0 ? '1px' : idx % 4 === 0 ? '3px' : '2px'}`,
                          height: '24px' 
                        }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-bold font-mono text-slate-400">ATU-SU26-{student?.rollNumber}</span>
                </div>

                {/* Supervisor seal and signature lines */}
                <div className="text-right space-y-1 text-[10px] font-bold text-slate-900 font-mono">
                  <div className="w-36 border-b border-slate-900 py-1 inline-block"></div>
                  <p className="uppercase text-[9px]">EXAMINATION CONTROLLER</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
