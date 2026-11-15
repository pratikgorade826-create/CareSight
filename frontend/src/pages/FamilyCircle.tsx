import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle,
  XCircle,
  Copy,
  Loader2,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CareCircle, CircleMember } from '../types';

export const FamilyCircle: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [circle, setCircle] = useState<CareCircle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Member Form
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'family' | 'caregiver'>('family');
  const [relationship, setRelationship] = useState('Daughter');
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Accept Code Form (for family/caregiver accounts)
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const isElderly = user?.role === 'elderly';

  const loadCircle = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCareCircle(activeElderlyId || undefined);
      setCircle(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCircle();
  }, [activeElderlyId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInvite(true);
    try {
      const res = await api.inviteMember({
        email: inviteEmail,
        role: inviteRole,
        relationship_label: relationship,
      });
      setGeneratedInviteCode(res.invitation_code);
      setInviteEmail('');
      loadCircle();
    } catch (err: any) {
      alert(`Invitation failed: ${err.message}`);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const res = await api.acceptInvite(joinCode.trim());
      setJoinSuccess(res.message);
      setJoinCode('');
      loadCircle();
    } catch (err: any) {
      alert(`Join failed: ${err.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleTogglePermission = async (memberUserId: string, permKey: string, currentValue: boolean) => {
    if (!isElderly) return;
    try {
      const member = circle?.members.find((m) => m.user_id === memberUserId);
      if (!member) return;

      const updatedPermissions = {
        ...member.permissions,
        [permKey]: !currentValue,
        member_user_id: memberUserId,
      };

      await api.updatePermissions(updatedPermissions);
      loadCircle();
    } catch (e: any) {
      alert(`Permission update failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Family Circle & Care Coordination
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Collaborate safely with family members and certified caregivers under strict personal consent.
            </p>
          </div>
        </div>

        {isElderly && (
          <button
            onClick={() => {
              setGeneratedInviteCode(null);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/25 active:scale-95 transition"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Join Circle Banner (For Family / Caregiver accounts) */}
      {!isElderly && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Have an Invitation Code?
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Enter the secure 8-character invitation code provided by the senior user to join their circle.
          </p>
          <form onSubmit={handleAcceptInvite} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CARE-XXXX"
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tracking-wider outline-none focus:ring-2 focus:ring-teal-500 uppercase flex-1"
            />
            <button
              type="submit"
              disabled={isJoining || !joinCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Accept Code'}
            </button>
          </form>
          {joinSuccess && (
            <p className="text-xs font-bold text-emerald-600">{joinSuccess}</p>
          )}
        </div>
      )}

      {/* Personal Control Center Notice (Elderly Ownership) */}
      <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-3xl p-5 flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-teal-900 dark:text-teal-200">
            Personal Control Center & Patient Sovereignty
          </h3>
          <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-medium">
            You maintain 100% ownership of your healthcare records. Adding a family member or caregiver does not automatically expose your records. Toggle permissions below to grant or revoke access anytime.
          </p>
        </div>
      </div>

      {/* Circle Members & Granular Consent Roster */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading Care Circle members...</p>
        </div>
      ) : !circle || circle.members.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Members Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Invite your family, adult children, or professional nurses to coordinate daily care.
          </p>
          {isElderly && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md"
            >
              Invite Family Member
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {circle.members.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center text-lg shadow-md">
                    {member.first_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                      {member.first_name} {member.last_name}
                    </h3>
                    <p className="text-xs font-bold text-teal-700 dark:text-teal-300">
                      {member.relationship_label} • {member.role_in_circle.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Active Member
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                  Authorized Permissions ({isElderly ? 'Click to toggle' : 'Managed by Senior'})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'can_view_medications', label: 'View Medications' },
                    { key: 'can_modify_medications', label: 'Edit Prescriptions' },
                    { key: 'can_confirm_medications', label: 'Confirm Doses' },
                    { key: 'can_view_appointments', label: 'View Appointments' },
                    { key: 'can_manage_appointments', label: 'Manage Appointments' },
                    { key: 'can_view_documents', label: 'View Medical Vault' },
                    { key: 'can_upload_documents', label: 'Upload Documents' },
                    { key: 'can_receive_alerts', label: 'Receive Alerts / SOS' },
                    { key: 'can_view_timeline', label: 'View Health Timeline' },
                  ].map((perm) => {
                    const isAllowed = (member.permissions as any)[perm.key];
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        disabled={!isElderly}
                        onClick={() => handleTogglePermission(member.user_id, perm.key, isAllowed)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition ${
                          isAllowed
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                        } ${isElderly ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="truncate">{perm.label}</span>
                        {isAllowed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Invite Circle Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-lg hover:bg-white/20">
                ✕
              </button>
            </div>

            {!generatedInviteCode ? (
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Member's Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="daughter@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Role in Circle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="family">Family Member</option>
                    <option value="caregiver">Professional Caregiver / Nurse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Relationship Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="e.g. Daughter, Son, Primary Nurse"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="w-1/2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="w-1/2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmittingInvite ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Code'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-teal-600 mx-auto" />
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                  Invitation Created!
                </h3>
                <p className="text-xs text-slate-500">
                  Share this secure code with your invitee. They can enter it after creating their account.
                </p>
                <div className="p-4 bg-teal-50 dark:bg-teal-950/50 border-2 border-dashed border-teal-500 rounded-2xl flex items-center justify-between">
                  <span className="font-black text-xl text-teal-900 dark:text-teal-200 tracking-widest">
                    {generatedInviteCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteCode);
                      alert('Code copied to clipboard!');
                    }}
                    className="p-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
