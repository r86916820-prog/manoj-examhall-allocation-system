import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  DoorOpen, 
  BookOpenCheck, 
  Grid3X3, 
  CalendarCheck, 
  FilePieChart, 
  Settings, 
  LogOut, 
  UserCircle2, 
  Award,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { username: string; role: string; email: string };
  onLogout: () => void;
  universityName: string;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, universityName }: SidebarProps) {
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff' || isAdmin;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: isStaff },
    { id: 'students', label: 'Manage Students', icon: Users, visible: isStaff },
    { id: 'halls', label: 'Manage Halls', icon: DoorOpen, visible: isStaff },
    { id: 'exams', label: 'Manage Exams', icon: BookOpenCheck, visible: isStaff },
    { id: 'allocation', label: 'Seat Allocation', icon: Grid3X3, visible: isAdmin },
    { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck, visible: isStaff },
    { id: 'reports', label: 'Seat Plans & Reports', icon: FilePieChart, visible: isStaff },
    { id: 'settings', label: 'System Settings', icon: Settings, visible: isAdmin },
  ];

  const filteredItems = menuItems.filter(item => item.visible);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-300 shrink-0 z-10 transition-all font-sans">
      {/* ERP Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
          <Award size={22} className="animate-pulse" />
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none font-mono">
            UNIVERSITY ERP
          </p>
          <h2 className="text-sm font-bold text-white tracking-tight truncate mt-1">
            {universityName || 'Apex Tech University'}
          </h2>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`transition-transform ${
                  isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0'
                }`} 
              />
            </button>
          );
        })}
      </nav>

      {/* Logged in User Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
            <UserCircle2 size={24} />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate font-mono">
              {user.username}
            </h4>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/10 inline-block mt-1">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold border border-red-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all focus:outline-none"
        >
          <LogOut size={14} />
          <span>Sign Out Session</span>
        </button>
      </div>
    </aside>
  );
}
