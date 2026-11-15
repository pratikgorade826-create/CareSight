import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  Plus,
  ShieldAlert,
  MapPin,
  CheckCircle,
  X,
  Loader2,
  Trash2,
  Heart,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmergencyContact, EmergencyHealthCard } from '../types';

export const Emergency: React.FC<{ onOpenSOS: () => void }> = ({ onOpenSOS }) => {
  const { user, activeElderlyId } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [healthCard, setHealthCard] = useState<EmergencyHealthCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEmergencyData = async () => {
    setIsLoading(true);
    try {
      const elderlyId = activeElderlyId || undefined;
      const [cRes, cardRes] = await Promise.all([
        api.getEmergencyContacts(elderlyId),
        api.getEmergencyCard(elderlyId),
      ]);
      setContacts(cRes || []);
      setHealthCard(cardRes || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmergencyData();
  }, [activeElderlyId]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.addEmergencyContact({
        elderly_user_id: activeElderlyId || undefined,
        name,
        relationship,
        phone_number: phone,
        priority_order: Number(priority),
        is_notified_on_sos: true,
      });
      setShowAddContact(false);
      setName('');
      setRelationship('');
      setPhone('');
      loadEmergencyData();
    } catch (err: any) {
      alert(`Could not save contact: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Emergency SOS Command Center
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage designated emergency contacts, review clinical safety card, and broadcast emergency SOS alerts.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSOS}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-base px-6 py-3.5 rounded-2xl shadow-xl shadow-red-600/30 active:scale-95 transition animate-pulse"
        >
          <AlertTriangle className="w-6 h-6 fill-white" />
          <span>TRIGGER SOS NOW</span>
        </button>
      </div>

      {/* Statutory Emergency Disclaimer */}
      <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-red-900 dark:text-red-200">
              Immediate Emergency Services Disclaimer
            </h3>
            <p className="text-xs text-red-800 dark:text-red-300 max-w-xl font-medium leading-relaxed">
              CareSight is an intelligent coordination platform and <strong>not a replacement for public emergency dispatchers</strong>. In any life-threatening situation (chest pressure, severe shortness of breath, sudden numbness, stroke symptoms), dial emergency dispatch directly.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <a
            href="tel:112"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-md transition"
          >
            <Phone className="w-4 h-4 fill-white" />
            <span>Call 112 (Ambulance)</span>
          </a>
        </div>
      </div>

      {/* Grid: Emergency Health Card & Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Emergency Medical Health Card */}
        {healthCard && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Heart className="w-6 h-6 text-red-600" />
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Medical Safety Card
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Verified Profile
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 font-bold block">Patient Name:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">{healthCard.elderly_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Blood Group:</span>
                  <span className="font-black text-sm text-teal-600">{healthCard.blood_type || 'Unknown'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Known Allergies:</span>
                {healthCard.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {healthCard.allergies.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold text-[11px]">
                        ⚠️ {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">None recorded</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Chronic Medical Conditions:</span>
                {healthCard.chronic_conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {healthCard.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">None recorded</span>
                )}
              </div>

              {healthCard.emergency_notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold block mb-1">Paramedic / Emergency Clinical Note:</span>
                  <p className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl text-yellow-900 dark:text-yellow-200 font-medium">
                    {healthCard.emergency_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contacts List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Designated Emergency Contacts
            </h3>
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                        {contact.priority_order}
                      </span>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {contact.name}
                      </h4>
                    </div>
                    <p className="text-xs text-teal-600 font-semibold">{contact.relationship}</p>
                    <p className="text-xs text-slate-500 font-medium">{contact.phone_number}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${contact.phone_number}`}
                      className="p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow transition"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-5 h-5 fill-white" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Add Emergency Contact</h2>
              <button onClick={() => setShowAddContact(false)} className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Primary Contact"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Daughter, Neighbor, Primary Doctor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Call Priority Order
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={1}>1 — Primary Contact</option>
                  <option value={2}>2 — Secondary Contact</option>
                  <option value={3}>3 — Physician / Ambulance</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
