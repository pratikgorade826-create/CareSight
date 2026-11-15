import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  FileText,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Appointment } from '../types';

export const Appointments: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiPrepData, setAiPrepData] = useState<any | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [selectedAptForPrep, setSelectedAptForPrep] = useState<Appointment | null>(null);

  // Form State
  const [doctor, setDoctor] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor Note state
  const [selectedAptForNote, setSelectedAptForNote] = useState<Appointment | null>(null);
  const [noteText, setNoteText] = useState('');

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAppointments(activeElderlyId || undefined);
      setAppointments(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [activeElderlyId]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createAppointment({
        elderly_user_id: activeElderlyId || undefined,
        doctor_name: doctor,
        specialty,
        hospital_clinic: hospital,
        appointment_date: date,
        appointment_time: time,
        reason: reason || undefined,
        location: location || undefined,
      });
      setShowAddModal(false);
      setDoctor('');
      setHospital('');
      setReason('');
      loadAppointments();
    } catch (err: any) {
      alert(`Failed to schedule appointment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIPrepare = async (apt: Appointment) => {
    setSelectedAptForPrep(apt);
    setIsPrepping(true);
    try {
      const prep = await api.prepareAppointment({
        appointment_id: apt.id,
      });
      setAiPrepData(prep);
    } catch (e: any) {
      alert(`AI Preparation error: ${e.message}`);
    } finally {
      setIsPrepping(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedAptForNote || !noteText.trim()) return;
    try {
      await api.addAppointmentNote(selectedAptForNote.id, {
        notes: noteText,
        action_items: ['Follow doctor prescribed routine'],
      });
      setSelectedAptForNote(null);
      setNoteText('');
      loadAppointments();
    } catch (e: any) {
      alert(`Could not save note: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Smart Appointment Manager
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Schedule physician consultations, record visit notes, and generate AI preparation briefs.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/25 active:scale-95 transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Appointment Cards */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Appointments Scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Schedule hospital check-ups and doctor consultations to keep your Care Circle synchronized.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md"
          >
            Schedule Consultation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded-md">
                      {apt.status}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      Dr. {apt.doctor_name}
                    </h3>
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {apt.specialty || 'General Medicine'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>
                      {apt.appointment_date} at {apt.appointment_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{apt.hospital_clinic} {apt.location ? `(${apt.location})` : ''}</span>
                  </div>
                  {apt.reason && (
                    <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => handleAIPrepare(apt)}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-extrabold text-xs border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  AI Prep Guide
                </button>
                <button
                  onClick={() => setSelectedAptForNote(apt)}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  Visit Notes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Appointment Preparation Modal */}
      {selectedAptForPrep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-teal-600 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-teal-200" />
                <h2 className="text-xl font-black">AI Doctor Visit Preparation</h2>
              </div>
              <button
                onClick={() => {
                  setSelectedAptForPrep(null);
                  setAiPrepData(null);
                }}
                className="p-1 rounded-lg hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {isPrepping ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Retrieving authorized MongoDB health records and synthesizing briefing...
                  </p>
                </div>
              ) : aiPrepData ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl">
                    <p className="font-bold text-teal-900 dark:text-teal-200 text-sm">
                      Consultation with Dr. {aiPrepData.doctor_name} ({aiPrepData.hospital_clinic})
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {aiPrepData.appointment_date} at {aiPrepData.appointment_time}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                      Active Prescriptions Summary
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      {aiPrepData.active_medications_summary.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                      Recent Vitals & Observations
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      {aiPrepData.recent_vitals_summary.map((v: string, i: number) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                      Recommended Questions for Doctor:
                    </h4>
                    <ul className="space-y-1.5">
                      {aiPrepData.recommended_questions_for_doctor.map((q: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                          <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {aiPrepData.disclaimer}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-right">
              <button
                onClick={() => {
                  setSelectedAptForPrep(null);
                  setAiPrepData(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold text-xs"
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Schedule Doctor Consultation</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Doctor's Name *
                </label>
                <input
                  type="text"
                  required
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="e.g. Dr. Arvind Mehta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Medical Specialty
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Endocrinology"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Hospital / Clinic *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    placeholder="e.g. Lilavati Hospital"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Visit
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. 3-month blood pressure and cardiac review"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Visit Notes Modal */}
      {selectedAptForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-slate-800 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Doctor Consultation Notes</h2>
              <button onClick={() => setSelectedAptForNote(null)} className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Record physician instructions, action items, or dosage changes after visiting Dr. {selectedAptForNote.doctor_name}.
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Doctor advised maintaining daily 20-min walking routine and reducing dietary salt..."
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAptForNote(null)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="w-1/2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md"
                >
                  Save Doctor Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
