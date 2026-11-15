import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Pill,
  CheckCircle2,
  Calendar,
  Sparkles,
  Clock,
  AlertTriangle,
  Volume2,
  Activity,
  Heart,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { api } from '../services/api';
import { MedicationSchedule, Appointment, HealthObservation, DailyAdherencePoint } from '../types';

export const Dashboard: React.FC<{ onOpenSOS: () => void }> = ({ onOpenSOS }) => {
  const { user, activeElderlyId, elderlyProfile, linkedElderly } = useAuth();
  const { speakText, t, language } = useAccessibility();

  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vitals, setVitals] = useState<HealthObservation[]>([]);
  const [adherenceData, setAdherenceData] = useState<any | null>(null);
  const [routine, setRoutine] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isElderly = user?.role === 'elderly';
  const isCaregiver = user?.role === 'caregiver';

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const elderlyId = activeElderlyId || undefined;
      const [schedRes, aptRes, adhRes, routineRes] = await Promise.all([
        api.getTodaySchedules(elderlyId),
        api.getAppointments(elderlyId),
        api.getAdherenceAnalytics(elderlyId, 7),
        api.getDailyRoutine(elderlyId),
      ]);
      setSchedules(schedRes || []);
      setAppointments(aptRes || []);
      setAdherenceData(adhRes || null);
      setRoutine(routineRes || null);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeElderlyId]);

  const handleConfirmDose = async (medicationId: string, scheduleId: string) => {
    try {
      await api.confirmMedication(medicationId, {
        status: 'taken',
        schedule_id: scheduleId,
        notes: isElderly ? 'Confirmed by senior user' : `Assisted by ${user?.first_name}`,
      });
      loadDashboardData();
    } catch (e: any) {
      alert(`Could not confirm medication: ${e.message}`);
    }
  };

  const handleReadScheduleAloud = () => {
    if (schedules.length === 0) {
      speakText('You have no medication scheduled for today.');
      return;
    }
    const pendingCount = schedules.filter((s) => s.status === 'pending').length;
    const takenCount = schedules.filter((s) => s.status === 'taken').length;
    let speech = `Hello ${user?.first_name}. Today you have ${schedules.length} scheduled doses. ${takenCount} confirmed taken, and ${pendingCount} pending. `;
    schedules.forEach((s) => {
      speech += `At ${s.scheduled_time}, ${s.medicine_name}, ${s.dosage}, status is ${s.status}. `;
    });
    speakText(speech);
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CareSight Intelligent Health Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-teal-100 text-sm sm:text-base max-w-xl">
              {isElderly
                ? "Here is your personalized care summary for today. Take your medicines on time and stay healthy."
                : isCaregiver
                ? "Here are your scheduled care tasks and medication assistance responsibilities for today."
                : "Monitoring your loved one's health routines, adherence records, and upcoming appointments."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Audio Read-Out Button */}
            <button
              onClick={handleReadScheduleAloud}
              className="flex items-center gap-2 bg-white text-teal-900 font-extrabold text-sm sm:text-base px-5 py-3 rounded-2xl shadow-lg hover:bg-teal-50 active:scale-95 transition"
              title="Listen to today's schedule aloud"
            >
              <Volume2 className="w-5 h-5 text-teal-700" />
              <span>Listen to Schedule</span>
            </button>

            {/* Emergency SOS button */}
            <button
              onClick={onOpenSOS}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-sm sm:text-base px-5 py-3 rounded-2xl shadow-lg shadow-red-600/30 active:scale-95 transition"
            >
              <AlertTriangle className="w-5 h-5 fill-white" />
              <span>SOS EMERGENCY</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Onboarding Banner for newly registered Family / Caregiver */}
      {!isElderly && (!activeElderlyId || linkedElderly.length === 0) && (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-teal-400 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Link with a Senior Patient
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              You are signed in as a {user?.role}. To view medication schedules and appointment records, enter the Invitation Code shared by your senior patient.
            </p>
          </div>
          <Link
            to="/family-circle"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition"
          >
            Enter Invitation Code
          </Link>
        </div>
      )}

      {/* Grid: Medications & Next Appointment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Medications Checklist (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Today's Medication Routine
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {schedules.filter((s) => s.status === 'taken').length} of {schedules.length} doses confirmed taken
                </p>
              </div>
            </div>
            <Link
              to="/medications"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Manage Prescriptions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {schedules.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No medication doses scheduled for today.</p>
              <Link to="/medications" className="text-xs text-teal-600 font-bold hover:underline mt-1 inline-block">
                Add a new prescription
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const isTaken = schedule.status === 'taken';
                const isSkipped = schedule.status === 'skipped';
                return (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                      isTaken
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : isSkipped
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center px-2 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-w-[70px]">
                        <span className="block text-xs font-bold text-teal-700 dark:text-teal-300">
                          {schedule.scheduled_time}
                        </span>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Time</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {schedule.medicine_name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {schedule.dosage} • {schedule.instructions || 'Take as prescribed'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isTaken ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Taken
                        </span>
                      ) : isSkipped ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs">
                          Skipped
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmDose(schedule.medication_id, schedule.id)}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition"
                        >
                          Confirm Taken
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Next Appointment & Adherence Badge */}
        <div className="space-y-6">
          
          {/* Adherence Score Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                7-Day Adherence
              </h3>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-teal-600 flex items-center justify-center font-black text-2xl text-teal-700 dark:text-teal-300">
                {adherenceData?.overall_adherence_rate || 90}%
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-base">
                  {adherenceData?.overall_adherence_rate >= 80 ? 'Excellent Adherence' : 'Needs Care Attention'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {adherenceData?.total_taken || 0} of {adherenceData?.total_scheduled || 0} prescribed doses confirmed.
                </p>
              </div>
            </div>
            <Link
              to="/analytics"
              className="mt-4 block text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
            >
              View Detailed Analytics
            </Link>
          </div>

          {/* Upcoming Appointment */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Next Appointment
                </h3>
              </div>
              <Link to="/appointments" className="text-xs font-bold text-teal-600 hover:underline">
                View All
              </Link>
            </div>

            {appointments.length > 0 ? (
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-2">
                <p className="font-extrabold text-slate-900 dark:text-white text-base">
                  Dr. {appointments[0].doctor_name}
                </p>
                <p className="text-xs text-teal-800 dark:text-teal-200 font-semibold">
                  {appointments[0].specialty} • {appointments[0].hospital_clinic}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {appointments[0].appointment_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {appointments[0].appointment_time}
                  </span>
                </div>
                <Link
                  to="/ai-companion"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 dark:text-teal-300 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Prepare Doctor Questions with AI
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">No upcoming appointments scheduled.</p>
            )}
          </div>

          {/* Circadian Routine Summary */}
          {routine && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Daily Care Routine
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block font-semibold">Wake-up:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{routine.wake_up_time}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block font-semibold">Breakfast:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{routine.breakfast_time}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block font-semibold">Lunch:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{routine.lunch_time}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block font-semibold">Bed Time:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{routine.bed_time}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
