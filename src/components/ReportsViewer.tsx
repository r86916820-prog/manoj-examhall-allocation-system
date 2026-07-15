import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Exam, Student, Hall, Allocation } from '../types';
import { 
  FilePieChart, 
  Printer, 
  Download, 
  Grid, 
  Layout, 
  Tag, 
  Users, 
  Hash, 
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function ReportsViewer() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [reportType, setReportType] = useState<'hall' | 'row' | 'dept' | 'roll'>('hall');
  const [isLoading, setIsLoading] = useState(true);

  const loadReportsContext = async () => {
    try {
      const [exs, hls, stds, allocs] = await Promise.all([
        api.getExams(),
        api.getHalls(),
        api.getStudents(),
        api.getAllocations()
      ]);
      setExams(exs);
      setHalls(hls);
      setStudents(stds);
      setAllocations(allocs);

      if (exs.length > 0 && !selectedExamId) {
        setSelectedExamId(exs[0].id);
      }
    } catch (e) {
      console.error('Failed to load reports metadata', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportsContext();
  }, []);

  const activeExam = exams.find(e => e.id === selectedExamId);
  const activeAllocations = allocations.filter(a => a.examId === selectedExamId);

  // Group allocations based on reportType
  const getProcessedReportData = () => {
    if (activeAllocations.length === 0) return [];

    // Map allocations with full student and hall metadata for filtering
    const enrichedAllocations = activeAllocations.map(alloc => {
      const student = students.find(s => s.id === alloc.studentId);
      const hall = halls.find(h => h.id === alloc.hallId);
      return {
        ...alloc,
        studentName: student?.name || 'Unknown',
        studentRoll: student?.rollNumber || 'N/A',
        studentDept: student?.department || 'N/A',
        hallNumber: hall?.hallNumber || 'N/A'
      };
    });

    if (reportType === 'hall') {
      // Group by Hall designation
      const hallGroups: Record<string, typeof enrichedAllocations> = {};
      enrichedAllocations.forEach(a => {
        if (!hallGroups[a.hallNumber]) hallGroups[a.hallNumber] = [];
        hallGroups[a.hallNumber].push(a);
      });
      // Sort within each hall by row then col
      Object.keys(hallGroups).forEach(k => {
        hallGroups[k].sort((a, b) => a.row - b.row || a.col - b.col);
      });
      return Object.entries(hallGroups).map(([title, list]) => ({ title: `Hall Layout Map: ${title}`, list }));
    }

    if (reportType === 'row') {
      // Group by Row alphabet (A-Z)
      const rowGroups: Record<string, typeof enrichedAllocations> = {};
      enrichedAllocations.forEach(a => {
        const rowLetter = a.seatNumber.split('-')[0];
        const titleKey = `${a.hallNumber} - Row ${rowLetter}`;
        if (!rowGroups[titleKey]) rowGroups[titleKey] = [];
        rowGroups[titleKey].push(a);
      });
      Object.keys(rowGroups).forEach(k => {
        rowGroups[k].sort((a, b) => a.col - b.col);
      });
      return Object.entries(rowGroups).map(([title, list]) => ({ title, list }));
    }

    if (reportType === 'dept') {
      // Group by department code (CSE, ECE etc)
      const deptGroups: Record<string, typeof enrichedAllocations> = {};
      enrichedAllocations.forEach(a => {
        if (!deptGroups[a.studentDept]) deptGroups[a.studentDept] = [];
        deptGroups[a.studentDept].push(a);
      });
      Object.keys(deptGroups).forEach(k => {
        deptGroups[k].sort((a, b) => a.studentRoll.localeCompare(b.studentRoll));
      });
      return Object.entries(deptGroups).map(([title, list]) => ({ title: `Department Roster: ${title}`, list }));
    }

    if (reportType === 'roll') {
      // Sort globally by Roll Number
      const list = [...enrichedAllocations].sort((a, b) => a.studentRoll.localeCompare(b.studentRoll));
      return [{ title: 'Global Roll Number-wise Seating Chart', list }];
    }

    return [];
  };

  const reportData = getProcessedReportData();

  // Export the actively compiled report structure as a physical CSV sheet
  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    let csvContent = 'Report Section,Seat Number,Hall Room,Student Name,Roll Number,Department\n';
    
    reportData.forEach(group => {
      group.list.forEach(item => {
        csvContent += `"${group.title}","${item.seatNumber}","${item.hallNumber}","${item.studentName}","${item.studentRoll}","${item.studentDept}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `seating-report-${reportType}-${selectedExamId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans print:bg-white print:p-0">
      
      {/* Title & Selector Block (hidden on print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Print Seating Charts & Reports
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Generate beautifully structured seating arrangements, printable PDFs, and CSVs</p>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
          >
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.subjectCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports navigation filters (hidden on print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {/* Hall wise tab */}
          <button
            onClick={() => setReportType('hall')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportType === 'hall'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Grid size={14} />
            <span>Hall-wise Seating</span>
          </button>

          {/* Row wise tab */}
          <button
            onClick={() => setReportType('row')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportType === 'row'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Layout size={14} />
            <span>Row-wise Seating</span>
          </button>

          {/* Dept wise tab */}
          <button
            onClick={() => setReportType('dept')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportType === 'dept'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Users size={14} />
            <span>Dept-wise Seating</span>
          </button>

          {/* Roll number wise tab */}
          <button
            onClick={() => setReportType('roll')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportType === 'roll'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Hash size={14} />
            <span>Roll-wise Index</span>
          </button>
        </div>

        {/* Exporters */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={13} />
            <span>Download CSV (Excel)</span>
          </button>

          <button
            onClick={handleTriggerPrint}
            disabled={reportData.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-40 shadow-lg shadow-indigo-600/10 focus:outline-none"
          >
            <Printer size={13} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Compiled visual report layouts (Visible to user and beautifully formatted on print) */}
      {isLoading ? (
        <div className="h-44 flex flex-col justify-center items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Compiling dynamic charts...</p>
        </div>
      ) : reportData.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm text-slate-400">
          No seating allocations exist for the selected exam. Ensure you generate allocations in the Seating workspace.
        </div>
      ) : (
        <div className="space-y-8 font-sans">
          
          {/* Header metadata specifically styled for PDF/Printer outputs */}
          <div className="hidden print:flex flex-col items-center justify-center p-6 border-b-2 border-slate-900 text-center space-y-2 mb-8">
            <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-950 font-display">
              APEX TECHNOLOGICAL UNIVERSITY
            </h1>
            <p className="text-xs uppercase font-semibold font-mono text-slate-600 tracking-widest">
              OFFICIAL EXAMINATION SEATING PLAN REGISTER
            </p>
            <div className="w-1/3 border-b border-slate-300 py-1"></div>
            {activeExam && (
              <div className="text-xs font-mono font-bold text-slate-900 space-y-1 pt-2">
                <p>Exam: {activeExam.name} ({activeExam.subjectCode})</p>
                <p>Scheduled: {activeExam.date} @ {activeExam.time} Hrs • Duration: {activeExam.duration} min</p>
              </div>
            )}
          </div>

          {/* Group sections */}
          {reportData.map((group, gIdx) => (
            <div 
              key={gIdx} 
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0 print:break-inside-avoid"
            >
              {/* Group Title */}
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center print:border-b-2 print:border-slate-800">
                <h3 className="text-sm font-bold text-indigo-700 uppercase font-mono tracking-wider print:text-slate-905 print:text-base">
                  {group.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold font-mono uppercase print:hidden">
                  {group.list.length} Students Allocated
                </span>
              </div>

              {/* Grid layout tables */}
              <div className="overflow-hidden border border-slate-100 rounded-2xl print:border-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono print:bg-slate-100 print:text-slate-950 print:border-b-2 print:border-slate-900">
                      <th className="py-2.5 px-4 w-28">Seat Position</th>
                      <th className="py-2.5 px-4 w-32">Room Designation</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4 w-36">Roll Number</th>
                      <th className="py-2.5 px-4 w-24">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700 print:divide-slate-900">
                    {group.list.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-slate-50/40 print:hover:bg-transparent">
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] print:bg-transparent print:text-slate-900 print:border-none print:p-0">
                            {item.seatNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 font-bold print:text-slate-900">{item.hallNumber}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.studentName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 font-bold print:text-slate-900">{item.studentRoll}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400 font-bold print:text-slate-900">{item.studentDept}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Official Signatures Bar on print */}
          <div className="hidden print:flex justify-between items-center pt-20 text-xs font-bold text-slate-900 font-mono">
            <div className="text-center w-40 border-t border-slate-900 pt-2">
              EXAM CONTROLLER
            </div>
            <div className="text-center w-40 border-t border-slate-900 pt-2">
              HALL SUPERVISOR
            </div>
            <div className="text-center w-40 border-t border-slate-900 pt-2">
              DATE OF ISSUANCE
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
