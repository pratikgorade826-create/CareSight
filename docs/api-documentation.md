# CareSight — REST API Documentation

Base URL: `http://localhost:8000/api` (Production: Google Cloud Run URL)  
Authentication: Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Body: `{ email, password, role ("elderly"|"family"|"caregiver"), first_name, last_name, phone_number, language? }`
  - Returns: `{ user, access_token, refresh_token, token_type: "bearer" }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ user, access_token, refresh_token, token_type: "bearer" }`
- `POST /api/auth/refresh`
  - Body: `{ refresh_token }`
  - Returns: `{ access_token, token_type: "bearer" }`
- `POST /api/auth/logout`
  - Header: Bearer Token
  - Returns: `{ message: "Logged out successfully" }`

---

## 2. Profiles (`/api/profiles`)
- `GET /api/profiles/me`
  - Returns: Current user profile and attached `elderly_profile` if role is `elderly`, or linked elderly circles if `family`/`caregiver`.
- `PUT /api/profiles/me`
  - Body: Profile updates (names, phone, preferences).
- `GET /api/profiles/elderly/{elderly_id}`
  - Returns authorized elderly profile details.
- `PUT /api/profiles/elderly/{elderly_id}`
  - Updates elderly health information (blood type, allergies, conditions, preferences).

---

## 3. Medications (`/api/medications`)
- `GET /api/medications?elderly_id={id}&status={active|discontinued}`
  - List medications for authorized elderly user.
- `POST /api/medications`
  - Body: `{ elderly_user_id?, medicine_name, dosage, frequency, scheduled_times, start_date, end_date?, prescribing_doctor?, instructions?, refill_quantity, remaining_quantity }`
- `GET /api/medications/{id}`
- `PUT /api/medications/{id}`
- `DELETE /api/medications/{id}`
- `POST /api/medications/{id}/confirm`
  - Body: `{ status: "taken"|"skipped"|"unable_to_confirm", notes?, dose_time? }`
- `GET /api/medications/schedules/today?elderly_id={id}`
  - Returns today's dose schedule cards with status.

---

## 4. Appointments (`/api/appointments`)
- `GET /api/appointments?elderly_id={id}&status={scheduled|completed|cancelled}`
- `POST /api/appointments`
  - Body: `{ elderly_user_id?, doctor_name, specialty, hospital_clinic, appointment_date, appointment_time, reason, location }`
- `GET /api/appointments/{id}`
- `PUT /api/appointments/{id}`
- `DELETE /api/appointments/{id}`
- `POST /api/appointments/{id}/notes`
  - Body: `{ notes, action_items: [], prescribed_changes }`
- `GET /api/appointments/{id}/notes`

---

## 5. Family & Care Circle (`/api/care-circle`)
- `GET /api/care-circle`
  - Returns circle information, members, and pending invitations.
- `POST /api/care-circle/invite`
  - Body: `{ email, role: "family"|"caregiver", relationship_label }`
  - Returns: `{ invitation_code, expires_at }`
- `POST /api/care-circle/accept-invite`
  - Body: `{ invitation_code }`
- `GET /api/care-circle/permissions/{member_id}`
- `PUT /api/care-circle/permissions`
  - Body: `{ member_user_id, can_view_medications, can_modify_medications, can_confirm_medications, can_view_appointments, can_manage_appointments, can_view_documents, can_upload_documents, can_receive_alerts, can_view_timeline }`
- `DELETE /api/care-circle/members/{member_id}`
  - Revokes membership and access.

---

## 6. AI Daily Care Companion (`/api/ai`)
- `POST /api/ai/chat`
  - Body: `{ message, conversation_id?, language: "en"|"hi"|"mr", elderly_user_id? }`
  - Retrieves authorized records from MongoDB, sends context to Gemini 2.5 Flash, formats answer, stores chat history.
- `POST /api/ai/appointment-preparation`
  - Body: `{ appointment_id, elderly_user_id? }`
  - Generates comprehensive preparation guide: medication summary, recent observations, question checklist.
- `POST /api/ai/daily-summary`
  - Body: `{ elderly_user_id?, date? }`
  - Generates patient-friendly morning/evening digest.

---

## 7. Medical Vault Documents (`/api/documents`)
- `POST /api/documents/upload`
  - Multipart form data: `file`, `document_type`, `title`, `elderly_user_id?`
- `GET /api/documents?elderly_id={id}&document_type={type}`
- `GET /api/documents/{id}`
- `GET /api/documents/{id}/file` (download/stream binary securely)
- `POST /api/documents/{id}/summarize` (Gemini document analysis)
- `DELETE /api/documents/{id}`

---

## 8. Health Timeline (`/api/timeline`)
- `GET /api/timeline?elderly_id={id}&category={category}&date_from={date}&date_to={date}&limit=50`
  - Aggregates medication confirmations, missed doses, appointments, observations, caregiver activities, documents, and emergency events in descending order.

---

## 9. Care Routine (`/api/routine`)
- `GET /api/routine?elderly_id={id}`
- `PUT /api/routine`
  - Body: `{ wake_up_time, breakfast_time, lunch_time, dinner_time, bed_time, exercise_preference, rest_intervals }`
- `POST /api/routine/check-conflicts`
  - Detects overlaps between medication schedule, appointments, and meal times.

---

## 10. Emergency SOS (`/api/emergency`)
- `POST /api/emergency/sos`
  - Body: `{ location?: { lat, lng, address }, notes? }`
  - Dispatches immediate high-priority alerts to all authorized caregivers and family, logs emergency event.
- `GET /api/emergency/contacts?elderly_id={id}`
- `POST /api/emergency/contacts`
- `DELETE /api/emergency/contacts/{id}`
- `GET /api/emergency/events?elderly_id={id}`
- `PUT /api/emergency/events/{id}/resolve`

---

## 11. Caregiver Escalation & Scheduler (`/api/scheduler`)
- `POST /api/scheduler/check-reminders` (Cloud Scheduler target)
  - Checks pending schedules:
    - +15 mins: Initial reminder notification.
    - +30 mins: Follow-up reminder notification.
    - +60 mins: Caregiver escalation alert.
  - Idempotent and duplicate-safe.

---

## 12. Analytics (`/api/analytics`)
- `GET /api/analytics/adherence?elderly_id={id}&days=30`
  - Real MongoDB aggregation pipeline computing taken vs skipped vs unconfirmed percentages and daily trends.
- `GET /api/analytics/weekly-summary?elderly_id={id}`
  - Adherence breakdown, caregiver activity counts, appointment compliance.
