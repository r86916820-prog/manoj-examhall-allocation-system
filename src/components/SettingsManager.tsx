import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SystemSettings, AuditLog } from '../types';
import { 
  Settings, 
  Database, 
  History, 
  Plus, 
  CheckCircle, 
  Download, 
  Trash2, 
  RefreshCw, 
  FileCheck,
  Search,
  School,
  ToggleLeft,
  CalendarDays
} from 'lucide-react';

export default function SettingsManager() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchLog, setSearchLog] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBackupSaving, setIsBackupSaving] = useState(false);
  const [isBackupRestoring, setIsBackupRestoring] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [univName, setUnivName] = useState('');
  const [term, setTerm] = useState('');
  const [autoBackup, setAutoBackup] = useState(true);

  const fetchSettingsAndData = async () => {
    try {
      const [sets, bks, logs] = await Promise.all([
        api.getSettings(),
        api.getBackups(),
        api.getAuditLogs()
      ]);
      setSettings(sets);
      setBackups(bks.backups);
      setAuditLogs(logs);

      setUnivName(sets.universityName);
      setTerm(sets.currentTerm);
      setAutoBackup(sets.autoBackupEnabled);
    } catch (e) {
      console.error('Failed to load settings data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndData();
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      const updated = await api.updateSettings({
        universityName: univName,
        currentTerm: term,
        autoBackupEnabled: autoBackup
      });
      setSettings(updated);
      setSuccessMsg('System configurations updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Settings update failed.');
    }
  };

  const handleCreateBackup = async () => {
    setIsBackupSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.triggerBackup();
      const freshBackups = await api.getBackups();
      setBackups(freshBackups.backups);
      const freshLogs = await api.getAuditLogs();
      setAuditLogs(freshLogs);
      setSuccessMsg(`Database snapshot compiled successfully: ${res.backupFileName}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    } finally {
      setIsBackupSaving(false);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (window.confirm(`Are you sure you want to restore database snapshot "${fileName}"? This will overwrite the current database state completely.`)) {
      setIsBackupRestoring(true);
      try {
        await api.restoreBackup(fileName);
        alert('Database restored successfully! Reloading system state...');
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'Restoration failed');
      } finally {
        setIsBackupRestoring(false);
      }
    }
  };

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const query = searchLog.toLowerCase();
    return log.action.toLowerCase().includes(query) ||
           log.username.toLowerCase().includes(query) ||
           log.details.toLowerCase().includes(query) ||
           log.role.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col justify-center items-center gap-3">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Gathering audit logs...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
          System Settings & Control Panel
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Configure general ERP parameters, generate system snapshots, and check audit history</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="text-emerald-600" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left column: Configurations + Backups */}
        <div className="space-y-6">
          
          {/* Form settings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Settings size={14} className="text-indigo-600" />
              General ERP Configurations
            </h3>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  University Name Display Label
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <School size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={univName}
                    onChange={(e) => setUnivName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Current Session Term Designation
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <CalendarDays size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto Database Backup</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Snapshot database files automatically during allocation reshuffles</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="rounded text-indigo-600 outline-none w-4 h-4 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all focus:outline-none"
              >
                Apply Customizations
              </button>
            </form>
          </div>

          {/* Backup Database recovery block */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database size={14} className="text-indigo-600" />
                Database Backup & Restoration
              </h3>

              <button
                onClick={handleCreateBackup}
                disabled={isBackupSaving}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-[10px] uppercase font-mono rounded-xl cursor-pointer focus:outline-none flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Compile Snapshot</span>
              </button>
            </div>

            {backups.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No system backups compiled yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto border border-slate-100 p-2 rounded-2xl bg-slate-50/50">
                {backups.map((bk, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm hover:border-slate-300 transition-all">
                    <div>
                      <p className="text-slate-950 font-mono text-[11px] truncate w-60" title={bk}>{bk}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Physical File Snapshot</p>
                    </div>
                    <button
                      onClick={() => handleRestoreBackup(bk)}
                      disabled={isBackupRestoring}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold text-[9px] uppercase font-mono rounded-lg transition-all focus:outline-none cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right column: Audit Logs / System Trail */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <History size={14} className="text-indigo-600" />
              Real-time System Audit History
            </h3>

            {/* Search audit log */}
            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 pointer-events-none">
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder="Search actions/users..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-[11px] outline-none"
              />
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No actions matches search.</p>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto border border-slate-100 p-2 rounded-2xl bg-slate-50/50">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-sm hover:border-slate-300 transition-all space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-700 font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">{log.details}</p>

                  <div className="flex justify-between items-center text-[9px] font-bold font-mono text-slate-400 uppercase pt-1 border-t border-slate-100/50">
                    <span>user: {log.username} ({log.role})</span>
                    <span>ID: {log.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
