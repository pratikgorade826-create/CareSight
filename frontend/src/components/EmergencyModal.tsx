import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  CheckCircle,
  X,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmergencyHealthCard } from '../types';

export const EmergencyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, activeElderlyId } = useAuth();
  const [healthCard, setHealthCard] = useState<EmergencyHealthCard | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [sosResult, setSosResult] = useState<any | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSosResult(null);
      return;
    }

    // Fetch emergency health card
    const loadCard = async () => {
      try {
        const card = await api.getEmergencyCard(activeElderlyId || undefined);
        setHealthCard(card);
      } catch (e) {
        console.error(e);
      }
    };
    loadCard();

    // Detect GPS location if browser permits
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetectedLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
          });
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err);
          setDetectedLocation({ address: 'Location sharing declined by device' });
        }
      );
    }
  }, [isOpen, activeElderlyId]);

  const handleSendSOS = async () => {
    setIsTriggering(true);
    try {
      const res = await api.triggerSOS({
        elderly_user_id: activeElderlyId || undefined,
        location: detectedLocation || undefined,
        notes: 'Urgent emergency assistance requested through CareSight one-touch SOS button.'
      });
      setSosResult(res);
    } catch (e: any) {
      alert(`SOS Dispatch Failed: ${e.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-4 border-red-500 overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-bounce">
              <AlertTriangle className="w-7 h-7 fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">EMERGENCY ASSISTANCE</h2>
              <p className="text-xs text-red-100 font-semibold">Immediate Caregiver Alert & Medical Safety Card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Statutory Disclaimer */}
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm text-red-800 dark:text-red-200">
                LIFE-THREATENING EMERGENCY?
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Always dial <strong>112 (India)</strong> or <strong>911 (US)</strong> directly for immediate ambulance services. CareSight notifies your family circle and assigned caregivers simultaneously.
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-4 py-2 rounded-xl shadow active:scale-95 transition"
                >
                  <Phone className="w-4 h-4 fill-white" />
                  Call Ambulance (112)
                </a>
              </div>
            </div>
          </div>

          {/* SOS Dispatch Action */}
          {!sosResult ? (
            <div className="text-center py-2">
              <button
                onClick={handleSendSOS}
                disabled={isTriggering}
                className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 transition active:scale-98 disabled:opacity-50"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Broadcasting Alerts to Care Circle...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 fill-white" />
                    SEND SOS ALERT TO ALL CAREGIVERS NOW
                  </>
                )}
              </button>
              {detectedLocation && (
                <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  GPS Status: {detectedLocation.address}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl p-5 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-extrabold text-xl text-emerald-900 dark:text-emerald-100">
                SOS Broadcast Dispatched!
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Notified <strong>{sosResult.notified_members_count}</strong> family members and caregivers via high-priority in-app notification and email.
              </p>
              <p className="text-xs text-slate-500">Event Log ID: {sosResult.event_id}</p>
            </div>
          )}

          {/* Emergency Contacts List */}
          {healthCard?.primary_contacts && healthCard.primary_contacts.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Direct Emergency Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {healthCard.primary_contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.relationship}</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        {contact.phone_number}
                      </p>
                    </div>
                    <a
                      href={`tel:${contact.phone_number}`}
                      className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow transition"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-5 h-5 fill-white" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Senior Health Card Info */}
          {healthCard && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Medical Quick-Card: {healthCard.elderly_name}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Blood Type:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{healthCard.blood_type || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Allergies:</span>{' '}
                  <span className="font-bold text-red-600">
                    {healthCard.allergies.length > 0 ? healthCard.allergies.join(', ') : 'None recorded'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Chronic Conditions:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {healthCard.chronic_conditions.length > 0 ? healthCard.chronic_conditions.join(', ') : 'None'}
                  </span>
                </div>
                {healthCard.emergency_notes && (
                  <div className="col-span-2 mt-1 p-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg text-yellow-900 dark:text-yellow-200">
                    <strong>Note:</strong> {healthCard.emergency_notes}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold text-sm text-slate-800 dark:text-slate-200 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
