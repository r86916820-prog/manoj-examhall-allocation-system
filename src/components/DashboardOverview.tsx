import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Users, 
  DoorOpen, 
  BookOpenCheck, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  Compass, 
  FolderLock, 
  DatabaseBackup,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

interface DashboardOverviewProps {
  onQuickAction: (tabId: string) => void;
  onRefresh: () => void;
}

export default function DashboardOverview({ onQuickAction, onRefresh }: DashboardOverviewProps) {
  const [data, setData] = useState<any>(null);
  const [time, setTime] = useState(new Date());
  const [countdownStr, setCountdownStr] = useState('00d:00h:00m:00s');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await api.getDashboardReport();
      setData(res);
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!data || !data.upcomingExams || data.upcomingExams.length === 0) {
      setCountdownStr('No upcoming exams');
      return;
    }

    const updateCountdown = () => {
      const nextExam = data.upcomingExams[0];
      const examDateTime = new Date(`${nextExam.date}T${nextExam.time}`);
      const now = new Date();
      const diff = examDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownStr('Exam in progress');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownStr(
        `${String(days).padStart(2, '0')}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6 flex flex-col justify-center items-center h-full">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Gathering dynamic dashboard statistics...</p>
      </div>
    );
  }

  const { totals, departmentBreakdown, upcomingExams } = data || {
    totals: { students: 0, halls: 0, exams: 0, allocated: 0, vacantSeats: 0, capacity: 0 },
    departmentBreakdown: {},
    upcomingExams: []
  };

  // Safe Math for radial gauge
  const allocationPercentage = totals.capacity > 0 
    ? Math.round((totals.allocated / totals.capacity) * 100) 
    : 0;

  // Render variables for custom SVG charts
  const maxDeptCount = Math.max(...(Object.values(departmentBreakdown) as number[]), 1);
  const deptList = Object.entries(departmentBreakdown).map(([name, count]) => ({
    name,
    count: count as number,
    percent: Math.round(((count as number) / maxDeptCount) * 100)
  }));

  return (
    <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 bg-slate-50 font-sans">
      
      {/* Dynamic Header & Live Clock */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Administrator Workspace
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Running Term: <span className="text-indigo-600 font-semibold">{data?.currentTerm}</span> • {data?.universityName}
          </p>
        </div>

        {/* Live Digital Clock Block */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-2xl">
          <Clock className="text-indigo-600 animate-pulse shrink-0" size={20} />
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 font-mono tracking-tight leading-none">
              {time.toLocaleTimeString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-none">
              {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* System Safety Flags / Notifications Banner */}
      {totals.allocated === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 shadow-sm">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">Seating Allocation Pending</h4>
            <p className="text-xs text-amber-800 mt-1">
              There are currently no students allocated to halls for any upcoming exams. You can initiate automatic seating plans in the Seating workspace with 1 click.
            </p>
            <button
              onClick={() => onQuickAction('allocation')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-600 hover:underline mt-2.5 block focus:outline-none cursor-pointer"
            >
              Generate Seating Plan Now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Total Enrolled</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">{totals.students}</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Students</span>
          </div>
          <div className="p-3 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl text-indigo-600 transition-colors">
            <Users size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Exam Halls</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">{totals.halls}</h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Active Rooms</span>
          </div>
          <div className="p-3 bg-emerald-50 group-hover:bg-emerald-100 rounded-xl text-emerald-600 transition-colors">
            <DoorOpen size={20} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Exams Scheduled</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">{totals.exams}</h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Events</span>
          </div>
          <div className="p-3 bg-blue-50 group-hover:bg-blue-100 rounded-xl text-blue-600 transition-colors">
            <BookOpenCheck size={20} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Allocated Seats</p>
            <h3 className="text-2xl font-bold text-indigo-700 tracking-tight font-display">{totals.allocated}</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Assigned</span>
          </div>
          <div className="p-3 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl text-indigo-700 transition-colors">
            <UserCheck size={20} />
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Vacant Seats</p>
            <h3 className="text-2xl font-bold text-amber-600 tracking-tight font-display">{totals.vacantSeats}</h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Available</span>
          </div>
          <div className="p-3 bg-amber-50 group-hover:bg-amber-100 rounded-xl text-amber-600 transition-colors">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Countdown + Visual Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming exam Countdown block (Left column, full height) */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between border border-indigo-950">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/20 font-mono tracking-wider">
                Exam Clock
              </span>
              <span className="text-[11px] text-indigo-300/80 font-medium">Next Event Countdown</span>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="space-y-1">
                <h3 className="text-base font-bold tracking-tight text-white line-clamp-1">
                  {upcomingExams[0].name}
                </h3>
                <p className="text-xs text-indigo-200/70 font-mono">
                  Code: {upcomingExams[0].subjectCode} • Dept: {upcomingExams[0].department}
                </p>
              </div>
            ) : (
              <p className="text-sm text-indigo-200/60 font-medium">No scheduled exams on record.</p>
            )}

            <div className="py-4 border-y border-white/10 my-4 text-center">
              <p className="text-xs text-indigo-300 uppercase tracking-widest font-bold font-mono">
                T-MINUS COUNTDOWN
              </p>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-indigo-400 tracking-tight mt-2.5 animate-pulse">
                {countdownStr}
              </h2>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {upcomingExams.length > 0 && (
              <div className="text-xs text-indigo-200/80 space-y-1.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                <p className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-semibold text-white">{upcomingExams[0].date}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="font-semibold text-white">{upcomingExams[0].time} Hrs</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-semibold text-white">{upcomingExams[0].duration} minutes</span>
                </p>
              </div>
            )}

            <button
              onClick={() => onQuickAction('exams')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Compass size={14} />
              <span>Manage Schedules</span>
            </button>
          </div>
        </div>

        {/* Visual Analytics Block 2: Department breakdown SVG bar chart (Middle Column) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-mono text-indigo-600 mb-1">
              STUDENT PROFILE BREAKDOWN
            </h3>
            <p className="text-xs text-slate-500">Distribution of enrolled students by department code</p>

            {deptList.length > 0 ? (
              <div className="mt-6 space-y-4">
                {deptList.map((dept, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700 font-mono">{dept.name}</span>
                      <span className="text-slate-900 font-bold">{dept.count} <span className="text-slate-400 font-medium">({Math.round(dept.count / totals.students * 100 || 0)}%)</span></span>
                    </div>
                    {/* SVG Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                        style={{ width: `${dept.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                No profiles uploaded.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-semibold font-mono uppercase">
              COUNT: {deptList.length} DEPTS
            </span>
            <button
              onClick={() => onQuickAction('students')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
            >
              <span>Manage Students</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Visual Analytics Block 3: Seat capacity radial percentage gauge (Right Column) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-mono text-indigo-600 mb-1">
              SEATING UTILIZATION INDEX
            </h3>
            <p className="text-xs text-slate-500">Active seat assignments vs. total physical capacity</p>

            <div className="flex flex-col items-center justify-center py-6">
              {/* Custom SVG Radial Gauge */}
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track ring */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-slate-100 fill-none" 
                    strokeWidth="8"
                  />
                  {/* Gauge Ring */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-indigo-600 fill-none transition-all duration-1000" 
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * allocationPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 font-display">
                    {allocationPercentage}%
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                    Allocated
                  </span>
                </div>
              </div>

              <div className="mt-5 text-center text-xs text-slate-600 space-y-0.5">
                <p>Physical Capacity: <span className="font-semibold text-slate-900">{totals.capacity} seats</span></p>
                <p>Allocated Students: <span className="font-semibold text-indigo-600">{totals.allocated}</span></p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-semibold font-mono uppercase">
              STATUS: {totals.vacantSeats} VACANCIES
            </span>
            <button
              onClick={() => onQuickAction('halls')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
            >
              <span>Manage Halls</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

      </div>

      {/* Row of Quick Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-mono text-indigo-600 mb-4">
          ADMINISTRATOR QUICK WORKSPACE SHORTCUTS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onQuickAction('allocation')}
            className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-left rounded-2xl group transition-all flex items-center gap-3.5 cursor-pointer"
          >
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <FolderLock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">Auto Allocator</p>
              <p className="text-[9px] text-slate-400 mt-1">1-Click Seating</p>
            </div>
          </button>

          <button
            onClick={() => onQuickAction('attendance')}
            className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-left rounded-2xl group transition-all flex items-center gap-3.5 cursor-pointer"
          >
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <FileCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">Attendance Log</p>
              <p className="text-[9px] text-slate-400 mt-1">Mark Student Presence</p>
            </div>
          </button>

          <button
            onClick={() => onQuickAction('reports')}
            className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-left rounded-2xl group transition-all flex items-center gap-3.5 cursor-pointer"
          >
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
              <Users size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">Print Seating</p>
              <p className="text-[9px] text-slate-400 mt-1">Export Plans & PDF</p>
            </div>
          </button>

          <button
            onClick={() => onQuickAction('settings')}
            className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-left rounded-2xl group transition-all flex items-center gap-3.5 cursor-pointer"
          >
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors">
              <DatabaseBackup size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">Backup Database</p>
              <p className="text-[9px] text-slate-400 mt-1">Save Snapshots</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}
