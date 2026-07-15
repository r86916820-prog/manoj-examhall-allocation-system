import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Exam } from '../types';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Bookmark, 
  FileText,
  X,
  HelpCircle,
  FileCheck
} from 'lucide-react';

export default function ExamManager() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDept, setFormDept] = useState('CSE');
  const [formSem, setFormSem] = useState(3);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:30');
  const [formDuration, setFormDuration] = useState(180);
  const [formInstructions, setFormInstructions] = useState('');
  const [error, setError] = useState('');

  const fetchExams = async () => {
    try {
      const res = await api.getExams();
      setExams(res);
    } catch (e) {
      console.error('Failed to fetch exams list', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormDept('CSE');
    setFormSem(3);
    setFormDate('');
    setFormTime('09:30');
    setFormDuration(180);
    setFormInstructions('');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setFormName(exam.name);
    setFormCode(exam.subjectCode);
    setFormDept(exam.department);
    setFormSem(exam.semester);
    setFormDate(exam.date);
    setFormTime(exam.time);
    setFormDuration(exam.duration);
    setFormInstructions(exam.instructions);
    setError('');
    setShowForm(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formName || !formCode || !formDept || !formDate || !formTime) {
      setError('Please provide all mandatory scheduling criteria.');
      return;
    }

    const payload = {
      name: formName,
      subjectCode: formCode.toUpperCase().trim(),
      department: formDept,
      semester: Number(formSem),
      date: formDate,
      time: formTime,
      duration: Number(formDuration),
      instructions: formInstructions
    };

    try {
      if (editingId) {
        await api.updateExam(editingId, payload);
      } else {
        await api.createExam(payload);
      }
      setShowForm(false);
      fetchExams();
    } catch (err: any) {
      setError(err.message || 'Saving exam failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? All student seating allocations and attendance lists for this exam event will be deleted.`)) {
      try {
        await api.deleteExam(id);
        fetchExams();
      } catch (err: any) {
        alert(err.message || 'Deletion failed');
      }
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Exam Schedules Workspace
          </h1>
          <p className="text-xs text-slate-500 font-medium">Create exam calendar slots, subject mappings, and proctor instructions</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none shadow-lg shadow-indigo-600/10"
        >
          <Plus size={14} />
          <span>Schedule Exam Slot</span>
        </button>
      </div>

      {/* Main lists */}
      {isLoading ? (
        <div className="h-64 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Fetching active timeline slots...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-sm text-slate-400 font-medium">No exam slots scheduled yet.</p>
          <button
            onClick={handleOpenCreate}
            className="text-xs font-semibold text-indigo-600 hover:underline mt-2 focus:outline-none cursor-pointer"
          >
            Create Your First Exam Schedule Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div 
              key={exam.id} 
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3.5">
                {/* Meta details */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold font-mono">
                      {exam.subjectCode}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold font-mono">
                      Dept: {exam.department}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold font-mono">
                      Sem: {exam.semester}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(exam)}
                      className="p-1.5 border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id, exam.name)}
                      className="p-1.5 border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-600 cursor-pointer focus:outline-none"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight font-display line-clamp-1">
                    {exam.name}
                  </h3>
                </div>

                {/* Logistics section */}
                <div className="grid grid-cols-2 gap-3.5 py-3 border-y border-slate-100 text-[11px] text-slate-600 font-medium font-mono">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{exam.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span>{exam.time} Hrs ({exam.duration} Min)</span>
                  </div>
                </div>

                {/* Supervisor Notes section */}
                {exam.instructions && (
                  <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-2xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                      <FileText size={10} />
                      Proctor/Student Instructions
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-2">
                      {exam.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Status footer bar */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono pt-3 border-t border-slate-50 uppercase tracking-wider">
                <span>SLOT ID: {exam.id}</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <FileCheck size={12} />
                  <span>Configured</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                <span>{editingId ? 'Modify Scheduled Slot' : 'Schedule New Examination'}</span>
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Examination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms Midterm"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS301"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Target Dept *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                  >
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="ECE">ECE (Electronics)</option>
                    <option value="MECH">MECH (Mechanical)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Semester
                  </label>
                  <input
                    type="number"
                    min="1" max="8"
                    value={formSem}
                    onChange={(e) => setFormSem(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="30" max="360"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Exam Time (24h) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Proctor / Candidate Instructions
                </label>
                <textarea
                  placeholder="e.g. Bring scientific calculator. Standard scratchpad sheets will be distributed by supervisors..."
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-semibold text-xs cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl cursor-pointer focus:outline-none"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
