import React, { useState } from 'react';
import { api, setAuthToken, setLoggedUser } from '../lib/api';
import { User, School, Lock, ArrowRight, RefreshCw, KeyRound, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Register states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regRole, setRegRole] = useState<'student' | 'staff'>('student');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('CSE');
  const [regYear, setRegYear] = useState('1');
  const [regSemester, setRegSemester] = useState('1');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regName) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.register({
        role: regRole,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        name: regName,
        phone: regPhone,
        department: regRole === 'student' ? regDepartment : undefined,
        year: regRole === 'student' ? Number(regYear) : undefined,
        semester: regRole === 'student' ? Number(regSemester) : undefined,
      });

      setAuthToken(res.token);
      setLoggedUser(res.user);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details or choose a different username/email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.login(username, password);
      setAuthToken(res.token);
      setLoggedUser(res.user);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !newPassword) {
      setError('Please provide your email and the desired new password.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResetSuccess('');

    try {
      const res = await api.resetPassword(forgotEmail, newPassword);
      setResetSuccess(res.message);
      setTimeout(() => {
        setIsForgotPassword(false);
        setUsername(forgotEmail);
        setPassword(newPassword);
        setResetSuccess('');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8">
        
        {/* University Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
            <School size={36} />
          </div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Apex Technological University
          </h1>
          <p className="text-xs text-indigo-300/70 uppercase tracking-widest mt-1 font-mono">
            Exam Seating Workspace
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-start gap-2">
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
            <CheckCircle className="text-emerald-400" size={18} />
            <span>{resetSuccess}</span>
          </div>
        )}

        {isRegistering ? (
          /* Registration Form */
          <form onSubmit={handleRegister} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => setRegRole('student')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  regRole === 'student'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRegRole('staff')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  regRole === 'staff'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Staff
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {regRole === 'student' ? 'Roll Number (Username)' : 'Username'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={regRole === 'student' ? 'e.g. CSE26055' : 'e.g. jane_staff'}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. jane@examhall.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            {regRole === 'student' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Dept
                  </label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-white/10 focus:border-indigo-500 rounded-xl text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Year
                  </label>
                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-white/10 focus:border-indigo-500 rounded-xl text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="1">1st Yr</option>
                    <option value="2">2nd Yr</option>
                    <option value="3">3rd Yr</option>
                    <option value="4">4th Yr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sem
                  </label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-white/10 focus:border-indigo-500 rounded-xl text-white text-xs outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors focus:outline-none py-1 cursor-pointer"
            >
              Return to Sign In
            </button>
          </form>
        ) : !isForgotPassword ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, CS26001, email"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-slate-400">
              New to the portal?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline cursor-pointer"
              >
                Create an Account
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password / Reset Form */
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-slate-300 text-xs leading-relaxed mb-2">
              Enter your email and the new password. The mock system will instantly update your credential credentials for direct login verification.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Account Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User size={18} />
                </span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. admin@examhall.edu"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Secure Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <KeyRound size={18} />
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Reset & Autocomplete</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
            >
              Return to Login Screen
            </button>
          </form>
        )}



      </div>
    </div>
  );
}
