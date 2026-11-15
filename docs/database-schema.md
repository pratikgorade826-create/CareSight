# CareSight — MongoDB Database Schema Specification

**Database Name:** `carecircle_db`  
**Driver:** PyMongo Async / Motor (`motor.motor_asyncio`)  
**Object Identifiers:** BSON `ObjectId` for `_id` and relationship references  

---

## The 21 Application Collections

1. **`users`**
   - Core identity, credentials, role, status.
   - Fields: `_id`, `email`, `password_hash`, `role` (`elderly`, `family`, `caregiver`), `first_name`, `last_name`, `phone_number`, `is_active`, `is_verified`, `created_at`, `updated_at`.
   - Indexes: `email` (unique), `role`.

2. **`elderly_profiles`**
   - Health profile belonging to the primary elderly user.
   - Fields: `_id`, `user_id` (ObjectId, ref: users), `date_of_birth`, `gender`, `blood_type`, `allergies` (array), `chronic_conditions` (array), `preferred_language` (`en`, `hi`, `mr`), `time_zone`, `accessibility_preferences` (object: `large_font`, `high_contrast`, `voice_enabled`), `emergency_notes`, `created_at`, `updated_at`.
   - Indexes: `user_id` (unique).

3. **`care_circles`**
   - The primary circle linking an elderly user with their family and caregivers.
   - Fields: `_id`, `elderly_user_id` (ObjectId), `circle_name`, `created_at`, `updated_at`.
   - Indexes: `elderly_user_id` (unique).

4. **`care_circle_members`**
   - Association between users and care circles.
   - Fields: `_id`, `care_circle_id` (ObjectId), `user_id` (ObjectId), `role_in_circle` (`family`, `caregiver`), `relationship_label` (e.g. "Daughter", "Primary Nurse"), `joined_at`, `status` (`active`, `revoked`).
   - Indexes: Compound (`care_circle_id`, `user_id`) (unique).

5. **`invitations`**
   - Secure invitation tokens for joining a care circle.
   - Fields: `_id`, `care_circle_id` (ObjectId), `elderly_user_id` (ObjectId), `invited_email`, `invited_role` (`family`, `caregiver`), `relationship_label`, `invitation_code` (unique string), `status` (`pending`, `accepted`, `expired`, `rejected`), `expires_at` (ISODate), `created_at`.
   - Indexes: `invitation_code` (unique), TTL index on `expires_at`.

6. **`permissions`**
   - Granular consent flags granted by the elderly user to a circle member.
   - Fields: `_id`, `elderly_user_id` (ObjectId), `member_user_id` (ObjectId), `can_view_medications` (bool), `can_modify_medications` (bool), `can_confirm_medications` (bool), `can_view_appointments` (bool), `can_manage_appointments` (bool), `can_view_documents` (bool), `can_upload_documents` (bool), `can_receive_alerts` (bool), `can_view_timeline` (bool), `updated_at`.
   - Indexes: Compound (`elderly_user_id`, `member_user_id`) (unique).

7. **`medications`**
   - Master list of prescribed medicines for an elderly user.
   - Fields: `_id`, `elderly_user_id` (ObjectId), `medicine_name`, `dosage`, `frequency` (`daily`, `bid`, `tid`, `custom`), `scheduled_times` (array of strings, e.g. `["08:00", "20:00"]`), `start_date`, `end_date`, `prescribing_doctor`, `instructions`, `refill_quantity`, `remaining_quantity`, `status` (`active`, `discontinued`, `completed`), `created_at`, `updated_at`.
   - Indexes: `elderly_user_id`, compound (`elderly_user_id`, `status`).

8. **`medication_schedules`**
   - Scheduled dose occurrences generated for reminders and tracking.
   - Fields: `_id`, `medication_id` (ObjectId), `elderly_user_id` (ObjectId), `scheduled_date` (YYYY-MM-DD), `scheduled_time` (HH:MM), `status` (`pending`, `taken`, `skipped`, `escalated`), `escalation_stage` (0: pending, 1: initial reminder, 2: follow-up, 3: caregiver alerted), `created_at`.
   - Indexes: Compound (`elderly_user_id`, `scheduled_date`, `status`).

9. **`medication_events`**
   - Actual logged intake records (audit trail of medication).
   - Fields: `_id`, `medication_id` (ObjectId), `schedule_id` (ObjectId, optional), `elderly_user_id` (ObjectId), `confirmed_by_user_id` (ObjectId), `status` (`taken`, `skipped`, `unable_to_confirm`), `notes`, `dose_time`, `confirmed_at`.
   - Indexes: Compound (`elderly_user_id`, `confirmed_at`), `medication_id`.

10. **`appointments`**
    - Doctor and hospital consultations.
    - Fields: `_id`, `elderly_user_id` (ObjectId), `doctor_name`, `specialty`, `hospital_clinic`, `appointment_date` (YYYY-MM-DD), `appointment_time` (HH:MM), `reason`, `status` (`scheduled`, `completed`, `cancelled`), `location`, `reminder_sent`, `created_at`, `updated_at`.
    - Indexes: Compound (`elderly_user_id`, `appointment_date`, `status`).

11. **`appointment_notes`**
    - Post-visit notes, summaries, and physician instructions.
    - Fields: `_id`, `appointment_id` (ObjectId), `elderly_user_id` (ObjectId), `author_user_id` (ObjectId), `notes`, `action_items` (array), `prescribed_changes`, `created_at`.
    - Indexes: `appointment_id`, `elderly_user_id`.

12. **`health_observations`**
    - Daily vitals and subjective health observations (blood pressure, glucose, mood, pain).
    - Fields: `_id`, `elderly_user_id` (ObjectId), `observed_by_user_id` (ObjectId), `observation_type` (`blood_pressure`, `blood_sugar`, `heart_rate`, `mood`, `sleep`, `mobility`, `notes`), `value`, `unit`, `notes`, `observed_at`, `created_at`.
    - Indexes: Compound (`elderly_user_id`, `observed_at`).

13. **`healthcare_documents`**
    - Metadata and references for uploaded medical prescriptions, lab reports, and doctor certificates.
    - Fields: `_id`, `elderly_user_id` (ObjectId), `uploaded_by_user_id` (ObjectId), `title`, `document_type` (`prescription`, `lab_report`, `discharge_summary`, `doctor_note`, `imaging`), `file_path`, `storage_type` (`gridfs`, `local`, `gcs`), `file_size_bytes`, `mime_type`, `ai_summary`, `extracted_tags` (array), `created_at`, `updated_at`.
    - Indexes: Compound (`elderly_user_id`, `document_type`, `created_at`).

14. **`caregiver_activities`**
    - Shift logs and assistance events performed by caregivers.
    - Fields: `_id`, `caregiver_user_id` (ObjectId), `elderly_user_id` (ObjectId), `activity_type` (`medication_assisted`, `meal_served`, `mobility_walk`, `vitals_check`, `general_companionship`), `details`, `duration_minutes`, `performed_at`.
    - Indexes: Compound (`elderly_user_id`, `performed_at`), `caregiver_user_id`.

15. **`notifications`**
    - In-app and dispatched notifications.
    - Fields: `_id`, `recipient_user_id` (ObjectId), `elderly_user_id` (ObjectId), `notification_type` (`medication_reminder`, `medication_escalation`, `appointment_reminder`, `permission_update`, `emergency_alert`), `title`, `message`, `priority` (`low`, `normal`, `high`, `emergency`), `is_read`, `delivered_channels` (array: `in_app`, `email`), `metadata` (object), `created_at`.
    - Indexes: Compound (`recipient_user_id`, `is_read`, `created_at`).

16. **`emergency_contacts`**
    - Designated emergency call contacts.
    - Fields: `_id`, `elderly_user_id` (ObjectId), `name`, `relationship`, `phone_number`, `priority_order` (int), `is_notified_on_sos` (bool), `created_at`.
    - Indexes: `elderly_user_id`.

17. **`emergency_events`**
    - Audit log of SOS triggers and responses.
    - Fields: `_id`, `elderly_user_id` (ObjectId), `triggered_by_user_id` (ObjectId), `location` (object: `lat`, `lng`, `address`), `status` (`active`, `acknowledged`, `resolved`), `resolved_by_user_id` (ObjectId), `resolved_notes`, `triggered_at`, `resolved_at`.
    - Indexes: Compound (`elderly_user_id`, `triggered_at`, `status`).

18. **`daily_routines`**
    - Personalized circadian schedule (wake up, meals, rest, exercises).
    - Fields: `_id`, `elderly_user_id` (ObjectId), `wake_up_time`, `breakfast_time`, `lunch_time`, `dinner_time`, `bed_time`, `exercise_preference`, `rest_intervals` (array), `updated_at`.
    - Indexes: `elderly_user_id` (unique).

19. **`audit_logs`**
    - Immutable security and compliance log of all critical consent and access events.
    - Fields: `_id`, `actor_user_id` (ObjectId), `elderly_user_id` (ObjectId), `action` (e.g. `PERMISSION_GRANTED`, `MEDICATION_DELETED`, `SOS_TRIGGERED`), `resource_type`, `resource_id`, `details` (object), `ip_address`, `timestamp`.
    - Indexes: Compound (`elderly_user_id`, `timestamp`), `actor_user_id`.

20. **`chat_conversations`**
    - Conversation sessions with the Gemini AI Care Companion.
    - Fields: `_id`, `user_id` (ObjectId), `elderly_user_id` (ObjectId), `title`, `language` (`en`, `hi`, `mr`), `created_at`, `updated_at`.
    - Indexes: Compound (`user_id`, `updated_at`).

21. **`chat_messages`**
    - Individual messages and responses within a conversation.
    - Fields: `_id`, `conversation_id` (ObjectId), `role` (`user`, `assistant`), `content`, `retrieved_context_summary`, `language`, `created_at`.
    - Indexes: Compound (`conversation_id`, `created_at`).
