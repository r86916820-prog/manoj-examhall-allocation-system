import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Hall } from '../types';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  DoorOpen, 
  MapPin, 
  Users, 
  Grid,
  Sparkles,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';

export default function HallManager() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHallForPreview, setSelectedHallForPreview] = useState<Hall | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [formFloor, setFormFloor] = useState(0);
  const [formRows, setFormRows] = useState(6);
  const [formCols, setFormCols] = useState(4);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [error, setError] = useState('');

  const fetchHalls = async () => {
    try {
      const res = await api.getHalls();
      setHalls(res);
      if (res.length > 0 && !selectedHallForPreview) {
        setSelectedHallForPreview(res[0]);
      }
    } catch (e) {
      console.error('Failed to fetch halls list', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormNumber('');
    setFormBuilding('');
    setFormFloor(1);
    setFormRows(6);
    setFormCols(4);
    setFormStatus('active');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (hall: Hall) => {
    setEditingId(hall.id);
    setFormNumber(hall.hallNumber);
    setFormBuilding(hall.building);
    setFormFloor(hall.floor);
    setFormRows(hall.rows);
    setFormCols(hall.cols);
    setFormStatus(hall.status);
    setError('');
    setShowForm(true);
  };

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formNumber || !formBuilding || !formRows || !formCols) {
      setError('Please provide all mandatory fields.');
      return;
    }

    if (formRows < 1 || formCols < 1) {
      setError('Dimensions must have at least 1 row and 1 column.');
      return;
    }

    if (formRows * formCols > 100) {
      setError('To ensure visibility, rooms are capped at 100 seats.');
      return;
    }

    const payload = {
      hallNumber: formNumber.toUpperCase(),
      building: formBuilding,
      floor: Number(formFloor),
      rows: Number(formRows),
      cols: Number(formCols),
      capacity: Number(formRows) * Number(formCols),
      status: formStatus
    };

    try {
      if (editingId) {
        const res = await api.updateHall(editingId, payload);
        if (selectedHallForPreview && selectedHallForPreview.id === editingId) {
          setSelectedHallForPreview(res);
        }
      } else {
        const res = await api.createHall(payload);
        setSelectedHallForPreview(res);
      }
      setShowForm(false);
      fetchHalls();
    } catch (err: any) {
      setError(err.message || 'Saving hall failed');
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (window.confirm(`Are you sure you want to delete ${number}? All student seating allocations inside this room will be cleared.`)) {
      try {
        await api.deleteHall(id);
        if (selectedHallForPreview && selectedHallForPreview.id === id) {
          setSelectedHallForPreview(null);
        }
        fetchHalls();
      } catch (err: any) {
        alert(err.message || 'Deletion failed');
      }
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-slate-50 overflow-y-auto space-y-6 font-sans">
      
      {/* Header and Add button */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Hall Management Workspace
          </h1>
          <p className="text-xs text-slate-500">Configure exam hall dimensions, physical floor blocks, and layout dimensions</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none shadow-lg shadow-indigo-600/10"
        >
          <Plus size={14} />
          <span>Add New Hall</span>
        </button>
      </div>

      {/* Main panel layout: split screen (Halls List on Left, Selected Layout preview on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Halls List (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
            <Layers size={14} />
            Registered Rooms ({halls.length})
          </h3>

          {isLoading ? (
            <div className="h-44 flex flex-col justify-center items-center gap-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Gathering room logs...</p>
            </div>
          ) : halls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400 font-medium">No examination halls registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {halls.map((hall) => {
                const isSelected = selectedHallForPreview?.id === hall.id;
                return (
                  <div
                    key={hall.id}
                    onClick={() => setSelectedHallForPreview(hall)}
                    className={`p-4 bg-white border rounded-2xl shadow-sm transition-all flex justify-between items-center cursor-pointer ${
                      isSelected 
                        ? 'ring-2 ring-indigo-600 border-transparent shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 tracking-tight">{hall.hallNumber}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          hall.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {hall.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <p className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span>{hall.building}, Flr {hall.floor}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <Users size={11} className="text-slate-400 shrink-0" />
                          <span>Cap: {hall.capacity} ({hall.rows}x{hall.cols})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(hall)}
                        className="p-1.5 border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(hall.id, hall.hallNumber)}
                        className="p-1.5 border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-600 cursor-pointer focus:outline-none"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Layout Visual Preview (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
            <Grid size={14} />
            Interactive Hall seating grid preview
          </h3>

          {selectedHallForPreview ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header meta */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 tracking-tight font-display">
                    Seating Layout Map: {selectedHallForPreview.hallNumber}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedHallForPreview.building} • Floor {selectedHallForPreview.floor} • Capacity: {selectedHallForPreview.capacity} seats
                  </p>
                </div>
                
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles size={16} />
                </span>
              </div>

              {/* Classroom layout elements */}
              <div className="border border-slate-100 bg-slate-50/50 p-6 rounded-2xl space-y-8 relative overflow-hidden">
                
                {/* Entrance Door Label */}
                <div className="absolute top-0 right-4 px-3 py-1 bg-amber-100 border border-amber-200 rounded-b-xl text-[10px] font-bold text-amber-800 tracking-wider font-mono">
                  ENTRANCE DOOR
                </div>

                {/* Teacher Desk Area (Centered at front) */}
                <div className="flex justify-center">
                  <div className="w-1/2 max-w-xs py-3.5 bg-slate-900 border border-slate-800 text-white font-mono text-[10px] font-bold tracking-widest text-center rounded-xl shadow-md uppercase">
                    TEACHER'S PODIUM / DESK
                  </div>
                </div>

                {/* Grid representation */}
                <div className="space-y-3">
                  {Array.from({ length: selectedHallForPreview.rows }).map((_, rIdx) => {
                    const rowLetter = String.fromCharCode(65 + rIdx);
                    return (
                      <div key={rIdx} className="flex items-center justify-center gap-3">
                        {/* Row letter label (Left side) */}
                        <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                          {rowLetter}
                        </div>

                        {/* Seats */}
                        <div className="flex gap-2.5">
                          {Array.from({ length: selectedHallForPreview.cols }).map((_, cIdx) => {
                            const seatNumber = `${rowLetter}-${cIdx + 1}`;
                            return (
                              <div
                                key={cIdx}
                                className="w-12 h-12 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:scale-105 rounded-xl shadow-sm flex flex-col justify-center items-center text-[10px] font-bold text-slate-700 font-mono select-none cursor-pointer transition-all"
                                title={`Seat ${seatNumber}`}
                              >
                                <span>{seatNumber}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Row letter label (Right side) */}
                        <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                          {rowLetter}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Classroom Rear label */}
                <div className="text-center text-[9px] uppercase font-bold text-slate-400 tracking-widest font-mono">
                  CLASSROOM BACK / REAR ROW
                </div>
              </div>

              {/* Legend panel */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-50/50 rounded-2xl text-[11px] font-medium text-slate-600 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  This visual represents the actual physical grid spacing of <span className="font-bold text-slate-900">{selectedHallForPreview.hallNumber}</span>. Seating allocations will follow row-major placement starting at seat A-1 and snake across rows to maximize department separation.
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm h-64 flex items-center justify-center">
              Select a room from the left list to inspect its physical seating map.
            </div>
          )}
        </div>

      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                <span>{editingId ? 'Modify Room Layout' : 'Register New Exam Hall'}</span>
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHall} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Hall Room Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LH-101, CH-202"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Building Block Block / Campus Block *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Block, Tech Block"
                  value={formBuilding}
                  onChange={(e) => setFormBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Floor No.
                  </label>
                  <input
                    type="number"
                    min="0" max="10"
                    value={formFloor}
                    onChange={(e) => setFormFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Rows (A-Z) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1" max="10"
                    value={formRows}
                    onChange={(e) => setFormRows(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Columns (Seats) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1" max="10"
                    value={formCols}
                    onChange={(e) => setFormCols(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Room Capacity
                </label>
                <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700">
                  Calculated: {formRows * formCols} seats total ({formRows} rows x {formCols} columns)
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Operating Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                >
                  <option value="active">Active (Available for Seating)</option>
                  <option value="inactive">Inactive (Suspended)</option>
                </select>
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
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
