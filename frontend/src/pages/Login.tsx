import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Lock, Mail, ArrowRight, Loader2, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { t } = useAccessibility();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('elderly');
  const [email, setEmail] = useState('demo@caresight.com');
  const [password, setPassword] = useState('CareSight123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts: Record<UserRole, { email: string; label: string; desc: string }> = {
    elderly: {
      email: 'demo@caresight.com',
      label: 'Senior User',
      desc: 'Full patient health records, medication guardian, and care circle authority.',
    },
    family: {
      email: 'family.member@caresight.com',
      label: 'Family Member',
      desc: 'Shared calendar, medication adherence tracking, and loved-one updates.',
    },
    caregiver: {
      email: 'caregiver.nurse@caresight.com',
      label: 'Caregiver',
      desc: 'Medication assistance, vital observation logs, and care routine tasks.',
    },
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setError(null);
    setEmail(demoAccounts[selectedRole].email);
    setPassword('CareSight123!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password, role });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await login({
        email: demoAccounts[role].email,
        password: 'CareSight123!',
        role,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
            <Heart className="w-8 h-8 fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Care<span className="text-teal-600">Sight</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {t('tagline')}
          </p>
        </div>

        {/* SELECT YOUR ROLE — Exact Match to CareSight Design */}
        <div>
          <label className="block text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-3">
            SELECT YOUR ROLE
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect('elderly')}
              className={`py-4 px-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                role === 'elderly'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
              }`}
            >
              <span className="text-3xl">👴</span>
              <span className="leading-tight">Senior User</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('family')}
              className={`py-4 px-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                role === 'family'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
              }`}
            >
              <span className="text-3xl">👱‍♀️</span>
              <span className="leading-tight">Family Member</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('caregiver')}
              className={`py-4 px-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                role === 'caregiver'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
              }`}
            >
              <Stethoscope className={`w-8 h-8 ${role === 'caregiver' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span className="leading-tight">Caregiver</span>
            </button>
          </div>
        </div>

        {/* 1-Click Role Demo Login */}
        <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-3.5 space-y-2">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>1-Click Demo Login as {demoAccounts[role].label}</span>
          </button>
          <p className="text-[11px] text-teal-800 dark:text-teal-300 text-center font-medium">
            {demoAccounts[role].desc}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address ({demoAccounts[role].label})
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={demoAccounts[role].email}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 transition outline-none"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 transition outline-none"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In as {demoAccounts[role].label}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-teal-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
