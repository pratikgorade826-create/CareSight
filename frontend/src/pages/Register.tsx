import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, User, Mail, Lock, Phone, ArrowRight, Loader2, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('elderly');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register({
        role,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone_number: phoneNumber || undefined,
        preferred_language: language,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md shadow-teal-600/25">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Join CareSight
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Your Health. Your Choices. Your Circle of Care.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SELECT YOUR ROLE */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-2.5">
              SELECT YOUR ROLE
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('elderly')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                  role === 'elderly'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
                }`}
              >
                <span className="text-2xl">👴</span>
                <span className="leading-tight">Senior User</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('family')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                  role === 'family'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
                }`}
              >
                <span className="text-2xl">👱‍♀️</span>
                <span className="leading-tight">Family Member</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                  role === 'caregiver'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-sm'
                }`}
              >
                <Stethoscope className={`w-6 h-6 ${role === 'caregiver' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span className="leading-tight">Caregiver</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98200 00000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password (6+ characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
