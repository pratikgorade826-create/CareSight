import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Clock,
  Heart,
  Save,
  CheckCircle,
  Loader2,
  Volume2,
  Type,
  SunMoon,
  Mail,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility, FontSize, Language } from '../context/AccessibilityContext';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const { user, elderlyProfile, activeElderlyId, refreshProfile } = useAuth();
  const {
    language,
    setLanguage,
    fontSize,
    setFontSize,
    highContrast,
    toggleHighContrast,
    t,
  } = useAccessibility();

  // Basic User profile
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');

  // Elderly Clinical Profile
  const [bloodType, setBloodType] = useState(elderlyProfile?.blood_type || 'B+');
  const [allergies, setAllergies] = useState(elderlyProfile?.allergies?.join(', ') || '');
  const [conditions, setConditions] = useState(elderlyProfile?.chronic_conditions?.join(', ') || '');
  const [emergencyNotes, setEmergencyNotes] = useState(elderlyProfile?.emergency_notes || '');

  // Routine
  const [wakeUp, setWakeUp] = useState('07:00');
  const [breakfast, setBreakfast] = useState('08:30');
  const [lunch, setLunch] = useState('13:00');
  const [dinner, setDinner] = useState('20:00');
  const [bedTime, setBedTime] = useState('22:00');
  const [exercise, setExercise] = useState('Morning 20-min gentle walk');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Email Notification Testing
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || 'demo@caresight.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ status: string; message: string; mode?: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await api.sendTestEmail(testEmailAddress, 'CareSight alert delivery test from Settings.');
      setEmailResult(res);
    } catch (e: any) {
      setEmailResult({ status: 'error', message: e.message || 'Failed to dispatch email.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone_number || '');
    }
    if (elderlyProfile) {
      setBloodType(elderlyProfile.blood_type || 'B+');
      setAllergies(elderlyProfile.allergies?.join(', ') || '');
      setConditions(elderlyProfile.chronic_conditions?.join(', ') || '');
      setEmergencyNotes(elderlyProfile.emergency_notes || '');
    }

    const loadRoutine = async () => {
      try {
        const r = await api.getDailyRoutine(activeElderlyId || undefined);
        if (r) {
          setWakeUp(r.wake_up_time || '07:00');
          setBreakfast(r.breakfast_time || '08:30');
          setLunch(r.lunch_time || '13:00');
          setDinner(r.dinner_time || '20:00');
          setBedTime(r.bed_time || '22:00');
          setExercise(r.exercise_preference || 'Morning 20-min gentle walk');
        }
      } catch (e) {
        // quiet fallback
      }
    };
    loadRoutine();
  }, [user, elderlyProfile, activeElderlyId]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      // 1. Update basic account
      await api.updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
      });

      // 2. If elderly user or managing elderly profile, update clinical records
      if (user?.role === 'elderly' && activeElderlyId) {
        const allergiesArr = allergies.split(',').map((s) => s.trim()).filter(Boolean);
        const conditionsArr = conditions.split(',').map((s) => s.trim()).filter(Boolean);
        await api.request(`/profiles/elderly/${activeElderlyId}`, {
          method: 'PUT',
          body: JSON.stringify({
            blood_type: bloodType,
            allergies: allergiesArr,
            chronic_conditions: conditionsArr,
            emergency_notes: emergencyNotes,
          }),
        });
      }

      // 3. Update Routine
      await api.updateDailyRoutine({
        elderly_user_id: activeElderlyId || undefined,
        wake_up_time: wakeUp,
        breakfast_time: breakfast,
        lunch_time: lunch,
        dinner_time: dinner,
        bed_time: bedTime,
        exercise_preference: exercise,
      });

      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Account & Accessibility Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Configure personal profile, elderly clinical records, circadian care routine, and accessibility modes.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        
        {/* Senior Accessibility Preferences */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="w-5 h-5 text-teal-600" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              Senior Accessibility Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Font Sizing */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-teal-600" />
                Font Sizing
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['normal', 'large', 'xlarge'] as FontSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={`py-2 rounded-xl text-xs font-bold transition capitalize ${
                      fontSize === size
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast Mode */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <SunMoon className="w-4 h-4 text-teal-600" />
                Display Contrast
              </label>
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                  highContrast
                    ? 'bg-yellow-400 text-black border-black font-black'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                }`}
              >
                {highContrast ? 'High Contrast: ACTIVE' : 'Standard Contrast'}
              </button>
            </div>

            {/* Language Preference */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300">
                Primary App Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Basic Account Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              Personal Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Clinical Health Records (For Senior Account) */}
        {user?.role === 'elderly' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Heart className="w-5 h-5 text-red-600" />
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                Clinical Health Records & Allergies
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Known Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Dust, Sulfa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Chronic Conditions
                </label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Diabetes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Emergency Medical Instructions / Notes
                </label>
                <textarea
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Has mild hearing loss in left ear. Carries emergency medicine in jacket pocket."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Circadian Care Routine */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-5 h-5 text-teal-600" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              Personalized Circadian Care Routine
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Wake-Up Time
              </label>
              <input
                type="time"
                value={wakeUp}
                onChange={(e) => setWakeUp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Breakfast Time
              </label>
              <input
                type="time"
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Lunch Time
              </label>
              <input
                type="time"
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Dinner Time
              </label>
              <input
                type="time"
                value={dinner}
                onChange={(e) => setDinner(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Bed Time
              </label>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
              Exercise & Activity Preference
            </label>
            <input
              type="text"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="e.g. Morning 20-min garden walk, evening yoga"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Email Notification & SMTP Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Email Notifications & SMTP Delivery
              </h2>
              <p className="text-xs text-slate-500">
                Send test notifications, medication alerts, and care circle invitation emails.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
              Send Test Email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingEmail || !testEmailAddress}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Send Test Email</span>
              </button>
            </div>

            {emailResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                  emailResult.status === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-700 dark:text-red-300'
                    : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 text-teal-800 dark:text-teal-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{emailResult.status === 'error' ? 'Failed' : 'Dispatched'}</p>
                  <p>{emailResult.message}</p>
                  {emailResult.mode === 'simulated_dev_mode' && (
                    <p className="mt-1 text-[11px] opacity-80">
                      💡 Tip: To send real emails to your Gmail/Outlook inbox, configure <code>EMAIL_USERNAME</code> and <code>EMAIL_PASSWORD</code> (Gmail App Password) in <code>.env</code>.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/25 active:scale-95 transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Save All Configuration</span>
          </button>
        </div>

      </form>

    </div>
  );
};
