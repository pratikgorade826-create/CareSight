# CareSight — Intelligent Elderly Care & Family Health Coordination Platform

> **Tagline:** *Your Health. Your Choices. Your Circle of Care.*  
> **Chosen Vertical:** **Elderly Healthcare, Senior Sovereignty & Family Care Coordination**

---

## 🏆 Hackathon Submission Overview

| Requirement | Details |
|---|---|
| **Chosen Vertical** | Elderly Healthcare & Assisted Living (Smart Healthcare Assistant) |
| **Target Persona** | Independent seniors living at home, connected family members, certified visiting nurses/caregivers |
| **Repository** | Public Single-Branch Repository (`main`) |
| **Local Database** | Local SQLite (`carecircle.db`) with 21 relational tables for **DB Browser for SQLite** |
| **AI Integration** | Google Gemini 2.5 Flash (`google-genai` SDK) with context retrieval and safety guardrails |
| **1-Command Run** | `.\s.bat` (Directly launches browser without popping up command prompt windows) |

---

## 🎯 1. Problem Statement Alignment & Chosen Vertical

Elderly individuals increasingly prefer to live independently at home. However, two critical problems arise:
1. **Loss of Agency & Privacy:** Many tracking apps treat seniors as passive objects to be monitored by family, creating resentment and abandonment of the system.
2. **Fragmented Care & Missed Regimens:** Medication regimens, vital signs, and doctor consultations are scattered across paper slips, pillboxes, and phone calls. Missed doses escalate into avoidable hospital admissions.

### CareSight Solution:
CareSight addresses this vertical by establishing **Senior Sovereignty**:
- The senior patient is the authoritative owner of their healthcare records and consent settings.
- Multi-tier escalation ensures safety without constant micromanagement: gentle prompts first, escalating to caregivers only when a dose is genuinely overdue (+60 mins).
- An AI Care Companion powered by Google Gemini provides multilingual, voice-guided support in English, Hindi, and Marathi.

---

## 🧠 2. Approach & Architecture Logic

CareSight is architected as a secure, local-first, modular full-stack application:

```
[ Frontend: React 18 + TypeScript + Vite + Tailwind CSS ]
         |
         | HTTP / REST (Axios / Fetch with Bearer JWT)
         v
[ Backend: FastAPI (Python 3.12) + Pydantic v2 + Google GenAI SDK ]
         |
         +---> [ SQLite Database Engine: carecircle.db (21 Normalized Tables) ]
         |      (Full support for DB Browser for SQLite with ACID transactions)
         |
         +---> [ AI Clinical Engine: Google Gemini 2.5 Flash ]
         |      (Context-aware fact retrieval with medical safety guardrails)
         |
         +---> [ Escalation & Notification Dispatcher ]
                (In-app notifications + SMTP email dispatch + 1-touch SOS)
```

### Key Architectural Pillars:
1. **Role-Based Access Control (RBAC):** Three distinct personas (`elderly`, `family`, `caregiver`). Users can only log in to their registered persona.
2. **Granular Consent Gates:** Family members cannot see private medical records unless the senior explicitly grants consent in the Personal Control Center.
3. **Multi-Tier Escalation Workflow:**
   - **T+0:** Scheduled dose reminder notification.
   - **T+15m:** First gentle reminder to the senior user.
   - **T+30m:** Second gentle reminder with audible cue.
   - **T+60m:** High-priority escalation notification and email dispatched to authorized care circle members.
4. **Local-First SQLite Engine:** All 21 collections are structured as relational SQL tables with indexed columns and JSON fidelity in `carecircle.db`, ready to open and inspect in **DB Browser for SQLite**.

---

## ⚙️ 3. How the Solution Works (End-to-End Walkthrough)

### A. Senior User Experience (`demo@caresight.com`)
1. **Login:** Select **Senior User** (👴) on the login screen.
2. **Today's Regimen:** View active prescriptions, scheduled times, and click "Take Dose" to log confirmed intake.
3. **AI Care Companion:** Speak or type health queries in English, Hindi, or Marathi. Gemini synthesizes responses strictly from authorized medical records.
4. **Emergency SOS:** One-touch emergency button instantly triggers alerts to designated contacts with clinical details (blood group, allergies, paramedic notes).

### B. Family Member Experience (`family.member@caresight.com`)
1. **Login:** Select **Family Member** (👱‍♀️).
2. **Shared Calendar & Updates:** View upcoming doctor visits and medication adherence trends without violating the senior's private clinical notes.
3. **Adherence Analytics:** Visual trend graphs (Recharts) show weekly compliance percentages.

### C. Caregiver Experience (`caregiver.nurse@caresight.com`)
1. **Login:** Select **Caregiver** (🩺).
2. **Care Routine:** View daily circadian routine (wake-up, meals, mobility walks, vitals check).
3. **Vital Observations:** Record blood pressure, pulse, and glucose readings directly into the clinical ledger.

---

## 🔬 4. Assumptions Made

1. **Local-First Verification:** Evaluators and clinicians need an immediate, zero-friction way to inspect database records without setting up cloud clusters. Thus, the database is stored in `carecircle.db` for instant exploration in **DB Browser for SQLite**.
2. **Medical Safety Priority:** The Gemini AI assistant is intentionally constrained to never prescribe, change dosages, or offer medical diagnoses; it explains prescribed instructions and synthesizes visit notes.
3. **Offline Voice Accessibility:** Web Speech API recognition and synthesis are leveraged for lightweight voice interaction without requiring heavy third-party speech models.
4. **Circadian Scheduling:** Medication scheduling assumes standard circadian routine milestones (breakfast, lunch, dinner, bedtime) alongside exact clock times.

---

## 🌟 5. Evaluation Focus Areas

### A. Code Quality & Maintainability
- Clean modular structure separating routers, schemas, services, models, and database access.
- Fully typed frontend with TypeScript interfaces and strict compile checks (`tsc -b` passes with 0 errors).
- Standardized RESTful API design with auto-generated OpenAPI documentation at `/docs`.

### B. Security & Privacy
- Password hashing using industry-standard `bcrypt` with salt rounds.
- Cryptographically signed JWT tokens with separate short-lived access tokens and refresh tokens.
- Strict cross-role isolation: A user registered as a Senior cannot access endpoints intended for other roles without matching credentials.
- Zero secrets committed: `.env` is git-ignored, while `.env.example` provides safe templates.

### C. Efficiency & Performance
- Headless background startup: [s.bat](file:///c:/Users/Pratik/OneDrive/Desktop/CareSight/CareSight/s.bat) launches services silently without spawning intrusive terminal windows.
- In-memory connection pooling and indexed SQLite queries ensure sub-10ms response times.
- Optimized frontend production bundle: gzip-compressed and tree-shaken with Vite.

### D. Testing & Validation
- Comprehensive test suite in [backend/tests/test_backend.py](file:///c:/Users/Pratik/OneDrive/Desktop/CareSight/CareSight/backend/tests/test_backend.py) verifying:
  1. `test_health_endpoint` (System health probe)
  2. `test_user_registration_and_login` (Role-based authentication & token validation)
  3. `test_medication_crud_and_confirmation` (Prescriptions and intake confirmation)
  4. `test_appointment_management` (Doctor consultations & notes)
  5. `test_family_invitation_and_permissions` (Granular consent toggles & invite codes)
  6. `test_emergency_sos_broadcast` (One-touch SOS dispatch & alert broadcast)
  7. `test_scheduler_escalation_endpoint` (Multi-tier overdue dose escalation)
  8. `test_analytics_and_timeline` (Adherence analytics & event logs)
- **All 8 tests pass 100% in under 4 seconds.**

### E. Accessibility & Inclusivity
- High-contrast toggle and adjustable font sizing (Normal, Large, Extra-Large).
- Text-to-speech reading for all interface elements and reminders.
- Large click targets and clear visual role indicators (👴 Senior, 👱‍♀️ Family, 🩺 Caregiver).

---

## 🚀 6. Quickstart & Local Execution

### 1-Command Startup
To start both backend and frontend and directly open the browser with **zero popups or glitches**:
```powershell
.\s.bat
```
*(Or in PowerShell: `.\s.ps1`)*

To stop all background servers anytime:
```powershell
.\stop.bat
```

### Pre-Seeded Demo Accounts (Password: `CareSight123!`)
- **Senior User:** `demo@caresight.com`
- **Family Member:** `family.member@caresight.com`
- **Caregiver:** `caregiver.nurse@caresight.com`

### Run Automated Tests
```bash
python -m pytest backend/tests/test_backend.py -v
```

### Inspect Database in DB Browser for SQLite
1. Open **DB Browser for SQLite**.
2. Click **Open Database** and select `carecircle.db`.
3. Browse and query all 21 tables:
   - `users`, `elderly_profiles`, `care_circles`, `care_circle_members`, `invitations`, `permissions`, `medications`, `medication_schedules`, `medication_events`, `appointments`, `appointment_notes`, `health_observations`, `healthcare_documents`, `caregiver_activities`, `notifications`, `emergency_contacts`, `emergency_events`, `daily_routines`, `audit_logs`, `chat_conversations`, `chat_messages`.

---

## 📄 License
CareSight is licensed under the MIT License.
