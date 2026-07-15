import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Student } from '../types';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  CheckCircle, 
  User, 
  Phone, 
  Mail, 
  BookOpen, 
  Activity,
  Plus,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formReg, setFormReg] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('CSE');
  const [formYear, setFormYear] = useState(1);
  const [formSem, setFormSem] = useState(1);
  const [formBranch, setFormBranch] = useState('Computer Science');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formSection, setFormSection] = useState('A');
  const [formSubjects, setFormSubjects] = useState('CS301, CS302, CS303');
  
  // Bulk import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res);
    } catch (e) {
      console.error('Failed to load students list', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormRoll('');
    setFormReg('');
    setFormEmail('');
    setFormPhone('');
    setFormDept('CSE');
    setFormYear(1);
    setFormSem(1);
    setFormBranch('Computer Science & Engineering');
    setFormGender('Male');
    setFormSection('A');
    setFormSubjects('CS301, CS302, CS303');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingId(student.id);
    setFormName(student.name);
    setFormRoll(student.rollNumber);
    setFormReg(student.registrationNumber);
    setFormEmail(student.email);
    setFormPhone(student.phone);
    setFormDept(student.department);
    setFormYear(student.year);
    setFormSem(student.semester);
    setFormBranch(student.branch);
    setFormGender(student.gender);
    setFormSection(student.section);
    setFormSubjects(student.subjects.join(', '));
    setError('');
    setShowForm(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formName || !formRoll || !formDept || !formEmail) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const payload = {
      name: formName,
      rollNumber: formRoll.toUpperCase(),
      registrationNumber: formReg || `REG2026${formRoll.toUpperCase()}`,
      email: formEmail,
      phone: formPhone || '+91 99999 99999',
      department: formDept,
      year: Number(formYear),
      semester: Number(formSem),
      branch: formBranch,
      gender: formGender,
      section: formSection,
      subjects: formSubjects.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };

    try {
      if (editingId) {
        await api.updateStudent(editingId, payload);
      } else {
        await api.createStudent(payload);
      }
      setShowForm(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will purge their seating records and login accounts.`)) {
      try {
        await api.deleteStudent(id);
        fetchStudents();
      } catch (err: any) {
        alert(err.message || 'Deletion failed');
      }
    }
  };

  // Parsing pasted CSV and executing import
  const handleBulkImport = async () => {
    setError('');
    setImportStatus('');

    if (!csvPasteText.trim()) {
      setError('Please paste comma-separated CSV rows to import.');
      return;
    }

    try {
      const lines = csvPasteText.split('\n');
      const studentsList: any[] = [];
      
      lines.forEach((line, idx) => {
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts.length < 3 || idx === 0 && parts[0].toLowerCase().includes('name')) {
          // Skip header or empty rows
          return;
        }

        const [name, roll, dept, email, phone, year, sem, branch, section, subjects] = parts;
        studentsList.push({
          name: name || `Imported Student ${idx}`,
          rollNumber: roll || `IMP${idx}`,
          registrationNumber: `REG2026${roll || idx}`,
          department: dept || 'CSE',
          email: email || `${roll ? roll.toLowerCase() : idx}@examhall.edu`,
          phone: phone || '+91 99999 99999',
          year: Number(year) || 1,
          semester: Number(sem) || 1,
          branch: branch || `${dept || 'CSE'} Engineering`,
          section: section || 'A',
          subjects: subjects ? subjects.split(';').map(s => s.trim()) : ['CS301']
        });
      });

      if (studentsList.length === 0) {
        setError('No valid student records found. Check format guidelines.');
        return;
      }

      const res = await api.importStudents(studentsList);
      setImportStatus(`Ingested successfully! Imported: ${res.imported} students. Skipped (duplicates): ${res.duplicates}.`);
      setCsvPasteText('');
      fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Bulk import failed.');
    }
  };

  const filteredStudents = students.filter(s => {
    const query = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(query) || 
                        s.rollNumber.toLowerCase().includes(query) || 
                        s.email.toLowerCase().includes(query);
    const matchDept = deptFilter ? s.department === deptFilter : true;
    const matchYear = yearFilter ? s.year === Number(yearFilter) : true;
    return matchSearch && matchDept && matchYear;
  });

  const uniqueDepartments = Array.from(new Set(students.map(s => s.department)));

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Student Management Workspace
          </h1>
          <p className="text-xs text-slate-500">Configure core student records, export logs, and load rosters</p>
        </div>

        {/* Top actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
          >
            <Upload size={14} />
            <span>Excel / CSV Import</span>
          </button>
          
          <a
            href={api.exportStudentsUrl()}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 focus:outline-none"
          >
            <Download size={14} />
            <span>Roster Export (CSV)</span>
          </a>

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none shadow-lg shadow-indigo-600/10"
          >
            <UserPlus size={14} />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3.5 shadow-sm">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by student name, roll number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm transition-all outline-none"
          />
        </div>

        <div className="flex gap-2.5">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Filter size={14} />
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/50"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100/50"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
      </div>

      {/* Grid of Student Cards (Detailed Profiles) */}
      {isLoading ? (
        <div className="h-64 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Loading student rosters...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-sm text-slate-400 font-medium">No students match your query filters.</p>
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setYearFilter(''); }}
            className="text-xs font-semibold text-indigo-600 hover:underline mt-2 cursor-pointer focus:outline-none"
          >
            Clear Active Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => (
            <div 
              key={student.id} 
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-4">
                {/* Photo Mock / Initials */}
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0 font-display text-base uppercase">
                  {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                    {student.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">{student.rollNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span>Sec {student.section}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-1">
                    Reg: {student.registrationNumber}
                  </p>
                </div>
              </div>

              {/* Attributes block */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-[11px] font-medium text-slate-600">
                <p className="flex items-center gap-1.5 truncate">
                  <Mail size={12} className="text-slate-400" />
                  <span className="truncate">{student.email}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Phone size={12} className="text-slate-400" />
                  <span>{student.phone}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <BookOpen size={12} className="text-slate-400" />
                  <span className="truncate">{student.branch}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Activity size={12} className="text-slate-400" />
                  <span>Year {student.year}, Sem {student.semester}</span>
                </p>
              </div>

              {/* Registered Subjects Badges */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                  Registered Codes
                </p>
                <div className="flex flex-wrap gap-1">
                  {student.subjects.map((sub) => (
                    <span key={sub} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold font-mono">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action row */}
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-50">
                <button
                  onClick={() => handleOpenEdit(student)}
                  className="p-1.5 border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                  title="Modify Profile"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(student.id, student.name)}
                  className="p-1.5 border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-600 cursor-pointer focus:outline-none"
                  title="Purge Record"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                <span>{editingId ? 'Modify Student Record' : 'Register New Student Profile'}</span>
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Smith"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE26005"
                    value={formRoll}
                    onChange={(e) => setFormRoll(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REG2026CSE005"
                    value={formReg}
                    onChange={(e) => setFormReg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. student@examhall.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    placeholder="+91 99999 99999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Dept Code *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={formGender}
                    onChange={(e: any) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    min="1" max="4"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Sem
                  </label>
                  <input
                    type="number"
                    min="1" max="8"
                    value={formSem}
                    onChange={(e) => setFormSem(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Sec
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-center"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Code Branch
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Registered Subjects (Comma-separated Subject Codes)
                </label>
                <input
                  type="text"
                  placeholder="CS301, CS302, CS303"
                  value={formSubjects}
                  onChange={(e) => setFormSubjects(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
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
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal Dialog */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span>Roster Bulk CSV Ingestion Workspace</span>
              </h3>
              <button 
                onClick={() => { setShowImportModal(false); setError(''); setImportStatus(''); }} 
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-4 rounded-2xl leading-relaxed">
                <p className="font-bold text-slate-800 mb-1">Format Guideline Layout (CSV column sequence):</p>
                <p className="font-mono text-[10px] bg-white border border-slate-200 p-2 rounded-lg leading-loose overflow-x-auto text-indigo-600">
                  name, rollNumber, department, email, phone, year, semester, branch, section, subjects<br />
                  Liam Smith, CSE26040, CSE, liam@examhall.edu, +91 91111 22222, 2, 3, Computer Science, A, CS301;CS302
                </p>
                <p className="mt-2.5 text-slate-400 text-[10px]">
                  * Use semicolons (<code className="font-bold">;</code>) to separate multiple subjects list inside the column segment.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {error}
                </div>
              )}

              {importStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="text-emerald-600" size={16} />
                  <span>{importStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Paste Raw Comma-Separated Data Rows:
                </label>
                <textarea
                  value={csvPasteText}
                  onChange={(e) => setCsvPasteText(e.target.value)}
                  placeholder="Paste table cells or CSV logs here..."
                  className="w-full h-36 p-3 font-mono text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setError(''); setImportStatus(''); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-semibold text-xs cursor-pointer focus:outline-none"
                >
                  Close Panel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl cursor-pointer focus:outline-none flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                >
                  <CheckCircle size={14} />
                  <span>Trigger Import Process</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
