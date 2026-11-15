export type UserRole = 'elderly' | 'family' | 'caregiver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export interface ElderlyProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies: string[];
  chronic_conditions: string[];
  preferred_language: 'en' | 'hi' | 'mr';
  time_zone: string;
  accessibility_preferences: {
    large_font: boolean;
    high_contrast: boolean;
    voice_enabled: boolean;
    simplified_view: boolean;
  };
  emergency_notes?: string;
}

export interface Medication {
  id: string;
  elderly_user_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  scheduled_times: string[];
  start_date: string;
  end_date?: string;
  prescribing_doctor?: string;
  instructions?: string;
  refill_quantity: number;
  remaining_quantity: number;
  status: 'active' | 'discontinued' | 'completed';
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  elderly_user_id: string;
  medicine_name: string;
  dosage: string;
  instructions?: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'skipped' | 'escalated';
  escalation_stage: number;
}

export interface Appointment {
  id: string;
  elderly_user_id: string;
  doctor_name: string;
  specialty?: string;
  hospital_clinic: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: AppointmentNote[];
}

export interface AppointmentNote {
  id: string;
  appointment_id: string;
  author_name?: string;
  notes: string;
  action_items: string[];
  prescribed_changes?: string;
  created_at: string;
}

export interface CircleMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role_in_circle: 'family' | 'caregiver';
  relationship_label: string;
  joined_at: string;
  status: string;
  permissions: {
    can_view_medications: boolean;
    can_modify_medications: boolean;
    can_confirm_medications: boolean;
    can_view_appointments: boolean;
    can_manage_appointments: boolean;
    can_view_documents: boolean;
    can_upload_documents: boolean;
    can_receive_alerts: boolean;
    can_view_timeline: boolean;
  };
}

export interface CareCircle {
  id: string;
  elderly_user_id: string;
  elderly_name: string;
  circle_name: string;
  members: CircleMember[];
  pending_invitations: {
    id: string;
    invited_email: string;
    invited_role: string;
    relationship_label: string;
    invitation_code: string;
    status: string;
    expires_at: string;
  }[];
}

export interface HealthObservation {
  id: string;
  elderly_user_id: string;
  observer_name?: string;
  observation_type: string;
  value: string;
  unit?: string;
  notes?: string;
  observed_at: string;
}

export interface HealthcareDocument {
  id: string;
  title: string;
  document_type: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  ai_summary?: string;
  extracted_tags: string[];
  uploader_name?: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  priority_order: number;
  is_notified_on_sos: boolean;
}

export interface EmergencyHealthCard {
  elderly_name: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies: string[];
  chronic_conditions: string[];
  primary_contacts: EmergencyContact[];
  emergency_notes?: string;
  disclaimer: string;
}

export interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  is_read: boolean;
  created_at: string;
}

export interface TimelineItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status?: string;
  actor_name?: string;
  timestamp: string;
}

export interface DailyAdherencePoint {
  date: string;
  scheduled: number;
  taken: number;
  skipped: number;
  unconfirmed: number;
  adherence_rate: number;
}

export interface AdherenceAnalytics {
  period_days: number;
  total_scheduled: number;
  total_taken: number;
  total_skipped: number;
  total_unconfirmed: number;
  overall_adherence_rate: number;
  daily_trends: DailyAdherencePoint[];
}
