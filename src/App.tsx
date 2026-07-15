import React, { useState, useEffect } from 'react';
import { getAuthToken, getLoggedUser, setAuthToken, api } from './lib/api';

// Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import StudentManager from './components/StudentManager';
import HallManager from './components/HallManager';
import ExamManager from './components/ExamManager';
import AllocationWorkspace from './components/AllocationWorkspace';
import AttendanceMarker from './components/AttendanceMarker';
import ReportsViewer from './components/ReportsViewer';
import SettingsManager from './components/SettingsManager';
import StudentDashboard from './components/StudentDashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [universityName, setUniversityName] = useState('Apex Technological University');
  const [isVerifying, setIsVerifying] = useState(true);

  const checkSession = async () => {
    const cachedUser = getLoggedUser();
    const token = getAuthToken();

    if (token && cachedUser) {
      setUser(cachedUser);
      // Fetch university name
      try {
        const settings = await api.getSettings();
        setUniversityName(settings.universityName);
      } catch (e) {
        console.error('Failed to load system settings on app boot', e);
      }
    }
    setIsVerifying(false);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = async (loggedInUser: any) => {
    setUser(loggedInUser);
    try {
      const settings = await api.getSettings();
      setUniversityName(settings.universityName);
    } catch (e) {
      console.error(e);
    }
    
    // Redirect students to student dashboard, and others to overview tab
    if (loggedInUser.role === 'student') {
      setActiveTab('student-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-3 font-sans text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold">Verifying secure ERP credentials...</p>
      </div>
    );
  }

  // Guard: If not logged in, render the login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Guard: If logged in user is a student, direct to student-only portal view
  if (user.role === 'student') {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  // Administrator & Staff Workspace Routing
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-700">
      {/* Dynamic sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        universityName={universityName}
      />

      {/* Main interactive pane container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <DashboardOverview 
            onQuickAction={(tabId) => setActiveTab(tabId)}
            onRefresh={checkSession}
          />
        )}
        {activeTab === 'students' && <StudentManager />}
        {activeTab === 'halls' && <HallManager />}
        {activeTab === 'exams' && <ExamManager />}
        {activeTab === 'allocation' && <AllocationWorkspace />}
        {activeTab === 'attendance' && <AttendanceMarker />}
        {activeTab === 'reports' && <ReportsViewer />}
        {activeTab === 'settings' && <SettingsManager />}
      </main>
    </div>
  );
}
