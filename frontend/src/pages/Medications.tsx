import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Medication } from '../types';

export const Medications: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [time1, setTime1] = useState('09:00');
  const [time2, setTime2] = useState('21:00');
  const [isTwice, setIsTwice] = useState(false);
  const [doctor, setDoctor] = useState('');
  const [instructions, setInstructions] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [refill, setRefill] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMeds = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMedications(activeElderlyId || undefined);
      setMedications(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeds();
  }, [activeElderlyId]);

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const times = isTwice ? [time1, time2] : [time1];
      await api.createMedication({
        elderly_user_id: activeElderlyId || undefined,
        medicine_name: name,
        dosage,
        frequency,
        scheduled_times: times,
        start_date: new Date().toISOString().split('T')[0],
        prescribing_doctor: doctor || undefined,
        instructions: instructions || undefined,
        remaining_quantity: Number(remaining),
        refill_quantity: Number(refill),
      });
      setShowAddModal(false);
      setName('');
      setDosage('');
      setInstructions('');
      loadMeds();
    } catch (err: any) {
      alert(`Failed to add medication: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmIntake = async (medId: string) => {
    try {
      await api.confirmMedication(medId, {
        status: 'taken',
        notes: 'Confirmed from Medications roster',
      });
      loadMeds();
    } catch (e: any) {
      alert(`Could not log dose: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <Pill className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Medication Guardian
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage prescriptions, refill thresholds, scheduled doses, and intake confirmations.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/25 active:scale-95 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Prescription</span>
        </button>
      </div>

      {/* Medication Cards List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading active prescriptions...</p>
        </div>
      ) : medications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Pill className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Prescriptions Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Keep all prescribed medications, dosages, and refill quantities safely recorded in MongoDB.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md"
          >
            Add First Medicine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => {
            const isLow = med.remaining_quantity <= 7;
            return (
              <div
                key={med.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md">
                        {med.status}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {med.medicine_name}
                      </h3>
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        {med.dosage} • {med.frequency}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                      <Pill className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-1.5 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      <strong>Instructions:</strong> {med.instructions || 'As prescribed by physician.'}
                    </p>
                    {med.prescribing_doctor && (
                      <p className="text-slate-500">
                        <strong>Prescriber:</strong> {med.prescribing_doctor}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold pt-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Scheduled Times: {med.scheduled_times.join(', ')}</span>
                    </div>
                  </div>

                  {/* Refill Pill Counter */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Remaining Supply:</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded-md ${
                        isLow ? 'bg-red-100 text-red-700 font-extrabold' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {med.remaining_quantity} / {med.refill_quantity} pills
                    </span>
                  </div>
                  {isLow && (
                    <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Supply running low. Refill recommended soon.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => handleConfirmIntake(med.id)}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Log Dose Intake
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Add New Prescription</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateMedication} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metformin, Amlodipine"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500 mg, 1 tablet"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => {
                      setFrequency(e.target.value);
                      setIsTwice(e.target.value === 'Twice daily');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="As needed">As needed (SOS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Dose Time 1
                  </label>
                  <input
                    type="time"
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {isTwice && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Dose Time 2
                    </label>
                    <input
                      type="time"
                      value={time2}
                      onChange={(e) => setTime2(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="Dr. Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take after breakfast with warm water"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Remaining Supply (pills)
                  </label>
                  <input
                    type="number"
                    value={remaining}
                    onChange={(e) => setRemaining(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Full Bottle Quantity
                  </label>
                  <input
                    type="number"
                    value={refill}
                    onChange={(e) => setRefill(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
