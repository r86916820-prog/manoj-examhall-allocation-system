import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Exam, Hall, Student, Allocation } from '../types';
import { 
  Sparkles, 
  Grid3X3, 
  Unlock, 
  Lock as LockIcon, 
  ArrowLeftRight, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  HelpCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function AllocationWorkspace() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  // Selected configuration
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);
  const [activeHallViewId, setActiveHallViewId] = useState('');

  // Allocation processing states
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocProgress, setAllocProgress] = useState(0);
  const [allocStageText, setAllocStageText] = useState('');
  const [allocResults, setAllocResults] = useState<any>(null);

  // Manual interactive editor states
  const [swapSourceSeat, setSwapSourceSeat] = useState<Allocation | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load baseline context
  const loadWorkspaceContext = async () => {
    try {
      const [exs, hls, stds, allocs] = await Promise.all([
        api.getExams(),
        api.getHalls(),
        api.getStudents(),
        api.getAllocations()
      ]);
      setExams(exs);
      
      const activeHalls = hls.filter(h => h.status === 'active');
      setHalls(activeHalls);
      
      // Select default checked halls
      setSelectedHallIds(activeHalls.map(h => h.id));
      
      setStudents(stds);
      setAllocations(allocs);

      if (exs.length > 0 && !selectedExamId) {
        setSelectedExamId(exs[0].id);
      }
    } catch (e) {
      console.error('Failed to initialize allocation context', e);
    }
  };

  useEffect(() => {
    loadWorkspaceContext();
  }, []);

  const activeExam = exams.find(e => e.id === selectedExamId);
  const activeExamAllocations = allocations.filter(a => a.examId === selectedExamId);
  const activeHallView = halls.find(h => h.id === activeHallViewId);

  // Update active room tab when list changes or exam allocations loaded
  useEffect(() => {
    if (activeExamAllocations.length > 0) {
      const allocatedHallIds = Array.from(new Set(activeExamAllocations.map(a => a.hallId)));
      if (allocatedHallIds.length > 0 && !allocatedHallIds.includes(activeHallViewId)) {
        setActiveHallViewId(allocatedHallIds[0]);
      }
    } else if (halls.length > 0 && !activeHallViewId) {
      setActiveHallViewId(halls[0].id);
    }
  }, [selectedExamId, allocations]);

  // Execute staged visual automatic allocation
  const handleTriggerAutoAllocation = async () => {
    if (!selectedExamId || selectedHallIds.length === 0) {
      alert('Please select an exam slot and at least one active hall block.');
      return;
    }

    setIsAllocating(true);
    setAllocProgress(5);
    setAllocStageText('Grouping candidate students by department codes...');

    // Progress bar mock animations
    const stages = [
      { progress: 20, text: 'Executing Round-Robin interleaving to mix departments...' },
      { progress: 45, text: 'Segregating consecutive department roll numbers...' },
      { progress: 70, text: 'Mapping interleaved seating queues into designated halls...' },
      { progress: 90, text: 'Checking seat lock constraints and room boundary audits...' },
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAllocProgress(stages[i].progress);
      setAllocStageText(stages[i].text);
    }

    try {
      const res = await api.performAutoAllocation(selectedExamId, selectedHallIds);
      setAllocProgress(100);
      setAllocStageText('Allocation engine completed successfully!');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setAllocResults({
        allocatedCount: res.allocatedCount,
        unallocatedCount: res.unallocatedCount,
        unallocatedStudentIds: res.unallocatedStudentIds
      });

      // Reload allocations
      const updatedAllocs = await api.getAllocations();
      setAllocations(updatedAllocs);
      
      // Select first hall with allocations
      if (res.allocations.length > 0) {
        setActiveHallViewId(res.allocations[0].hallId);
      }
    } catch (e: any) {
      alert(e.message || 'Auto allocation script failed.');
    } finally {
      setIsAllocating(false);
      setAllocProgress(0);
    }
  };

  const handleResetAllocations = async () => {
    if (window.confirm('Are you sure you want to delete all allocations for this exam slot? This will clear all seat maps.')) {
      try {
        await api.resetAllocations(selectedExamId);
        const updatedAllocs = await api.getAllocations();
        setAllocations(updatedAllocs);
        setAllocResults(null);
      } catch (e: any) {
        alert(e.message || 'Reset failed');
      }
    }
  };

  const handleToggleLock = async (allocationId: string) => {
    try {
      await api.manualSeating({
        action: 'toggle-lock',
        examId: selectedExamId,
        allocationId
      });
      const updatedAllocs = await api.getAllocations();
      setAllocations(updatedAllocs);
    } catch (e: any) {
      alert(e.message || 'Toggle lock failed');
    }
  };

  const handleInitiateSwap = (alloc: Allocation) => {
    setSwapSourceSeat(alloc);
  };

  const handleExecuteSwap = async (targetSeat: { row: number; col: number; studentId?: string; hallId: string }) => {
    if (!swapSourceSeat) return;

    try {
      if (targetSeat.studentId) {
        // Swap student positions
        await api.manualSeating({
          action: 'swap',
          examId: selectedExamId,
          studentId: swapSourceSeat.studentId,
          targetStudentId: targetSeat.studentId
        });
      } else {
        // Move student to vacant seat
        await api.manualSeating({
          action: 'assign',
          examId: selectedExamId,
          studentId: swapSourceSeat.studentId,
          hallId: targetSeat.hallId,
          row: targetSeat.row,
          col: targetSeat.col
        });
      }
      
      const updatedAllocs = await api.getAllocations();
      setAllocations(updatedAllocs);
    } catch (e: any) {
      alert(e.message || 'Manual seat shift failed.');
    } finally {
      setSwapSourceSeat(null);
    }
  };

  const handleCheckboxToggleHall = (hallId: string) => {
    if (selectedHallIds.includes(hallId)) {
      setSelectedHallIds(selectedHallIds.filter(id => id !== hallId));
    } else {
      setSelectedHallIds([...selectedHallIds, hallId]);
    }
  };

  // Helper colors for departments to prove mixing
  const getDeptColorClasses = (dept: string) => {
    switch (dept) {
      case 'CSE':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100';
      case 'ECE':
        return 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-100';
      case 'MECH':
        return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
      default:
        return 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100';
    }
  };

  // Total students enrolled in active exam's subject
  const candidateStudentsForExam = activeExam 
    ? students.filter(s => s.subjects.includes(activeExam.subjectCode))
    : [];

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Title & Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Seating Plan Allocation Workspace
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Configure intelligent automatic layout parameters or override seat map coordinates</p>
        </div>

        {/* Selected Exam Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
            Active Exam:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setSwapSourceSeat(null);
              setAllocResults(null);
            }}
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

      {/* Main body conditional rendering */}
      {isAllocating ? (
        /* Progress loader block */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center max-w-xl mx-auto space-y-6 my-12">
          <div className="inline-flex p-4 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl animate-spin">
            <RefreshCw size={28} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 font-display tracking-tight uppercase tracking-widest font-mono">
              COMPUTING OPTIMAL SEATING MATRICES
            </h3>
            <p className="text-xs text-slate-500 font-medium">{allocStageText}</p>
          </div>

          {/* Graphical progressive line */}
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${allocProgress}%` }}
            ></div>
          </div>
          
          <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider">{allocProgress}% CALCULATED</p>
        </div>
      ) : activeExamAllocations.length === 0 ? (
        /* Setup / Config View for Auto Allocation */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Allocation Setup parameters (Left Column) */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-indigo-600 font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles size={16} />
                Auto-Seating Engine
              </h3>
              <p className="text-xs text-slate-500">Configure parameters for automatic hall assignment</p>
            </div>

            {/* Exam info panel */}
            {activeExam && (
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-900 leading-tight">{activeExam.name}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-medium text-slate-500 pt-1.5 border-t border-slate-100">
                  <p>Subject: <span className="font-bold text-indigo-600">{activeExam.subjectCode}</span></p>
                  <p>Candidates: <span className="font-bold text-slate-900">{candidateStudentsForExam.length}</span></p>
                </div>
              </div>
            )}

            {/* Hall checkboxes selector list */}
            <div className="space-y-2.5">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Select Designated Halls
              </label>

              {halls.length === 0 ? (
                <p className="text-xs text-amber-600 font-medium">No active exam halls available.</p>
              ) : (
                <div className="space-y-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  {halls.map(hall => (
                    <label key={hall.id} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedHallIds.includes(hall.id)}
                        onChange={() => handleCheckboxToggleHall(hall.id)}
                        className="rounded text-indigo-600 outline-none"
                      />
                      <div className="flex-1 flex justify-between">
                        <span>{hall.hallNumber} ({hall.building})</span>
                        <span className="text-slate-400 font-mono font-bold">Cap: {hall.capacity}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleTriggerAutoAllocation}
              disabled={candidateStudentsForExam.length === 0 || selectedHallIds.length === 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all flex items-center justify-center gap-1.5 focus:outline-none"
            >
              <Sparkles size={14} />
              <span>Generate Automatic Seating Plan</span>
            </button>
          </div>

          {/* Setup summary block (Right Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-mono text-indigo-600 mb-1">
                PRE-ALLOCATION COMPLIANCE STATS
              </h3>
              <p className="text-xs text-slate-500">Checking candidate student requirements against available capacities</p>
            </div>

            {/* Verification checklist items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">
                  EXAM CANDIDATES COUNT
                </p>
                <h4 className="text-xl font-bold text-slate-900 font-display">
                  {candidateStudentsForExam.length} Students
                </h4>
                <p className="text-[10px] text-slate-500">
                  Registered under course code <span className="font-bold font-mono text-indigo-600">{activeExam?.subjectCode}</span>
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">
                  PHYSICAL SEAT RESOURCES
                </p>
                <h4 className="text-xl font-bold text-slate-900 font-display">
                  {halls.reduce((sum, h) => sum + (selectedHallIds.includes(h.id) ? h.capacity : 0), 0)} Seats
                </h4>
                <p className="text-[10px] text-slate-500">
                  Across <span className="font-bold text-slate-900">{selectedHallIds.length} designated rooms</span>
                </p>
              </div>

            </div>

            {/* Validation alert banner */}
            {candidateStudentsForExam.length > halls.reduce((sum, h) => sum + (selectedHallIds.includes(h.id) ? h.capacity : 0), 0) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3.5 shadow-sm text-xs">
                <div className="p-1.5 bg-red-100 rounded-xl text-red-600 shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-red-950">Capacity Overflow Warning</h4>
                  <p className="text-red-800 leading-relaxed mt-1">
                    The number of exam candidate students exceeds the combined physical capacity of your selected halls. Excess students will remain unallocated and placed in the overflow queue. Please check additional active halls.
                  </p>
                </div>
              </div>
            )}

            {candidateStudentsForExam.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 shadow-sm text-xs">
                <div className="p-1.5 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950">No Candidates Found</h4>
                  <p className="text-amber-800 leading-relaxed mt-1">
                    There are no students registered for subject <span className="font-bold font-mono">{activeExam?.subjectCode}</span>. Please register students to this code in the Manage Students workspace before initiating allocations.
                  </p>
                </div>
              </div>
            )}

            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs space-y-3">
              <h4 className="font-bold text-indigo-950 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Grid3X3 size={14} className="text-indigo-600" />
                Automatic Seating Core Ruleset (Compliance standard):
              </h4>
              <ul className="list-decimal list-inside space-y-1.5 text-slate-700 font-medium pl-1 leading-relaxed">
                <li>Students are grouped by department and interleaved round-robin.</li>
                <li>Adjacent seats are allocated to different departments to optimize separation.</li>
                <li>Consecutive roll numbers are segregated by at least 1 spacer student.</li>
                <li>Halls are filled sequentially. Any locked manual seat parameters are preserved.</li>
              </ul>
            </div>
          </div>

        </div>
      ) : (
        /* Interactive Layout map workspace (Automatic plan exists) */
        <div className="space-y-6">
          
          {/* Status banner and control bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-bold uppercase tracking-wide flex items-center gap-1">
                <CheckCircle size={12} />
                <span>Plan Active</span>
              </span>
              <p className="text-slate-600 font-semibold font-mono">
                Allocated Seats: <span className="text-indigo-600 font-bold">{activeExamAllocations.length}</span> / Candidates: {candidateStudentsForExam.length}
              </p>
              
              {/* Overflow warning in header if unallocated students exist */}
              {candidateStudentsForExam.length > activeExamAllocations.length && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold">
                  OVERFLOW: {candidateStudentsForExam.length - activeExamAllocations.length} UNALLOCATED
                </span>
              )}
            </div>

            {/* Right side controls: Reallocate / Reset / Print */}
            <div className="flex gap-2">
              <button
                onClick={handleTriggerAutoAllocation}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
                title="Run auto allocation reshuffle"
              >
                <Sparkles size={13} className="text-indigo-600" />
                <span>Reallocate</span>
              </button>

              <button
                onClick={handleResetAllocations}
                className="px-3.5 py-2 border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
              >
                <Trash2 size={13} />
                <span>Reset Map</span>
              </button>
            </div>
          </div>

          {/* Main workspace layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Seating Map view card (Span 8) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Hall selection tabs & view controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                {/* Tabs representing halls active in this exam */}
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(activeExamAllocations.map(a => a.hallId))).map(hId => {
                    const hall = halls.find(h => h.id === hId);
                    if (!hall) return null;
                    const isActive = activeHallViewId === hId;
                    return (
                      <button
                        key={hId}
                        onClick={() => {
                          setActiveHallViewId(hId);
                          setSwapSourceSeat(null);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                            : 'bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {hall.hallNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Scaling / Zoom / Fullscreen controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 bg-white rounded-lg text-slate-500 focus:outline-none cursor-pointer"
                    title="Scale down grid map"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(Math.min(1.2, zoomLevel + 0.1))}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 bg-white rounded-lg text-slate-500 focus:outline-none cursor-pointer"
                    title="Scale up grid map"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              {/* Layout Map Area */}
              {activeHallView ? (
                <div className="space-y-6">
                  {/* Swap Mode Active Warning header */}
                  {swapSourceSeat && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex justify-between items-center text-xs animate-pulse">
                      <p className="font-semibold text-indigo-950 flex items-center gap-1.5">
                        <ArrowLeftRight size={14} className="text-indigo-600" />
                        <span>Swap Mode active. Select target seat coordinates to complete the swap.</span>
                      </p>
                      <button 
                        onClick={() => setSwapSourceSeat(null)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase focus:outline-none cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Physical grid card with zoom */}
                  <div 
                    className="border border-slate-100 bg-slate-50/50 p-6 rounded-3xl space-y-8 relative overflow-hidden transition-transform duration-200 origin-top"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    {/* Entrance door label */}
                    <div className="absolute top-0 right-4 px-3 py-1 bg-amber-100 border border-amber-200 rounded-b-xl text-[10px] font-bold text-amber-800 tracking-wider font-mono">
                      ENTRANCE DOOR
                    </div>

                    {/* Teacher desk block */}
                    <div className="flex justify-center">
                      <div className="w-1/2 max-w-xs py-3.5 bg-slate-900 border border-slate-800 text-white font-mono text-[10px] font-bold tracking-widest text-center rounded-xl shadow-md uppercase">
                        TEACHER'S PODIUM / DESK
                      </div>
                    </div>

                    {/* Layout Grid */}
                    <div className="space-y-4">
                      {Array.from({ length: activeHallView.rows }).map((_, rIdx) => {
                        const rowLetter = String.fromCharCode(65 + rIdx);
                        return (
                          <div key={rIdx} className="flex items-center justify-center gap-4">
                            {/* Row label */}
                            <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                              {rowLetter}
                            </div>

                            {/* Seats container */}
                            <div className="flex gap-3">
                              {Array.from({ length: activeHallView.cols }).map((_, cIdx) => {
                                const seatNumber = `${rowLetter}-${cIdx + 1}`;
                                
                                // Find allocation matching this coordinate-hall-exam
                                const alloc = activeExamAllocations.find(a => 
                                  a.hallId === activeHallView.id && a.row === rIdx && a.col === cIdx
                                );
                                
                                const student = alloc 
                                  ? students.find(s => s.id === alloc.studentId)
                                  : null;

                                const isSwapSource = swapSourceSeat && swapSourceSeat.id === alloc?.id;

                                return (
                                  <div
                                    key={cIdx}
                                    onClick={() => {
                                      if (swapSourceSeat) {
                                        // Complete swap/move
                                        handleExecuteSwap({
                                          row: rIdx,
                                          col: cIdx,
                                          studentId: student?.id,
                                          hallId: activeHallView.id
                                        });
                                      }
                                    }}
                                    className={`w-28 h-28 border rounded-2xl p-2.5 flex flex-col justify-between items-center shadow-sm transition-all select-none relative ${
                                      isSwapSource 
                                        ? 'ring-4 ring-indigo-600 border-transparent scale-105 z-10' 
                                        : student 
                                          ? getDeptColorClasses(student.department)
                                          : 'bg-white border-dashed border-slate-200 text-slate-400 hover:bg-slate-50 cursor-pointer'
                                    }`}
                                  >
                                    {/* Seat badge & Locks */}
                                    <div className="w-full flex justify-between items-center text-[9px] font-bold font-mono">
                                      <span className={student ? 'text-slate-500' : 'text-slate-400'}>{seatNumber}</span>
                                      {alloc && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleLock(alloc.id);
                                          }}
                                          className="text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                                          title={alloc.isLocked ? "Unlock seating slot" : "Lock seating slot"}
                                        >
                                          {alloc.isLocked ? (
                                            <LockIcon size={11} className="text-amber-500" />
                                          ) : (
                                            <Unlock size={11} className="opacity-40" />
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {/* Student Info Body */}
                                    {student ? (
                                      <div className="text-center w-full overflow-hidden">
                                        <p className="text-[10px] font-bold text-slate-900 truncate leading-tight">
                                          {student.name.split(' ')[0]}
                                        </p>
                                        <p className="text-[9px] font-bold font-mono text-indigo-700 tracking-tight mt-0.5">
                                          {student.rollNumber}
                                        </p>
                                        <span className="text-[8px] font-bold uppercase tracking-wider font-mono px-1 py-0.5 bg-white/50 border border-white/20 rounded inline-block mt-1">
                                          {student.department}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-bold tracking-wide uppercase font-mono text-slate-300">
                                        Vacant
                                      </span>
                                    )}

                                    {/* Action footer triggers swap */}
                                    {student && !swapSourceSeat && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleInitiateSwap(alloc!);
                                        }}
                                        className="w-full text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 border-t border-slate-200/40 pt-1 mt-1 cursor-pointer transition-colors"
                                      >
                                        Move / Swap
                                      </button>
                                    )}

                                    {swapSourceSeat && !isSwapSource && (
                                      <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-600 animate-pulse">
                                        {student ? 'Swap here' : 'Assign here'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Row label */}
                            <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                              {rowLetter}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rear identifier */}
                    <div className="text-center text-[9px] uppercase font-bold text-slate-400 tracking-widest font-mono">
                      CLASSROOM REAR ROW
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  Select a room from the checklist tabs above.
                </div>
              )}
            </div>

            {/* Overflow & Queue Sidebar (Span 4) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span>Unallocated Student Queue</span>
                </h3>
                <p className="text-xs text-slate-500">Students pending a seating assignment slot</p>
              </div>

              {/* Check unallocated students count */}
              {(() => {
                const allocatedIds = new Set(activeExamAllocations.map(a => a.studentId));
                const unallocatedStudents = candidateStudentsForExam.filter(s => !allocatedIds.has(s.id));

                if (unallocatedStudents.length === 0) {
                  return (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1.5">
                      <div className="inline-flex p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
                        <UserCheck size={18} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                        100% Seat Utilization
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        All exam candidates have been allocated seat maps!
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-800 leading-relaxed font-semibold">
                      Overflow Active: {unallocatedStudents.length} candidates cannot fit in the currently physical room capacities. Click "Move / Swap" on an allocated seat to switch them!
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-100 p-2.5 bg-slate-50/50 rounded-2xl">
                      {unallocatedStudents.map(student => (
                        <div key={student.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm hover:border-slate-300 transition-all">
                          <div>
                            <p className="text-slate-900">{student.name}</p>
                            <p className="text-[9px] font-mono text-indigo-600 mt-0.5">{student.rollNumber} • {student.department}</p>
                          </div>
                          <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Queue
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
