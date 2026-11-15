# CareSight — System Architecture Document

**Tagline:** Your Health. Your Choices. Your Circle of Care.  
**Database:** MongoDB Atlas Exclusive (`carecircle_db`)  
**Backend:** FastAPI (Python 3.12+), Pydantic v2, PyMongo Async / Motor  
**Frontend:** React 19 / Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Query  
**AI:** Google Gemini (Official Google Gen AI SDK)  
**Cloud Deployment:** Google Cloud Run, Cloud Scheduler, Secret Manager, Cloud Logging  

---

## 1. Executive Overview

CareSight is an intelligent elderly care and family health coordination platform built with a **MongoDB-Only architecture**. It empowers elderly individuals to remain the central decision-makers and owners of their healthcare data, while keeping their family members and caregivers synchronized, informed, and capable of escalating emergencies or missed critical medications.

```
                    ┌─────────────────────────────────────────────────────┐
                    │               CareSight React Frontend             │
                    │   (Vite + TypeScript + Tailwind + Recharts + A11y)  │
                    └──────────────────────────┬──────────────────────────┘
                                               │ HTTPS / REST / WebSockets
                                               ▼
                    ┌─────────────────────────────────────────────────────┐
                    │               FastAPI Application Engine            │
                    │  ├── JWT Authentication & Role-Based Access Control │
                    │  ├── 12 Core Business Logic Routers                 │
                    │  ├── Personal Control Center & Consent Guard        │
                    │  ├── Caregiver Escalation & Scheduled Reminders     │
                    │  └── Gemini AI Agent (Healthcare Prep & Summaries)  │
                    └──────────────┬──────────────────────┬───────────────┘
                                   │                      │
           Async PyMongo / Motor   │                      │ Google Gen AI SDK
                                   ▼                      ▼
        ┌───────────────────────────────────┐    ┌─────────────────────────┐
        │       MongoDB Atlas Cluster       │    │     Google Gemini API   │
        │      (carecircle_db Database)     │    │  (gemini-2.5-flash / Pro│
        │     21 Normalized Collections     │    └─────────────────────────┘
        │   Compound & Unique Indexes, TTL  │
        │  Aggregation Pipelines & Analytics│
        └───────────────────────────────────┘
```

---

## 2. Core Pillars & Design Principles

1. **Elderly Centricity & Ownership:** The elderly user is the authoritative owner of their medical profile, permissions, and health data. Access by family members or caregivers is strictly opt-in and granularly revocable.
2. **MongoDB-Only Persistence:** No relational databases, SQLite, Firebase, or Supabase are permitted. All entities, schedules, timeline events, chat messages, and audit trails reside in the 21 collections of `carecircle_db`.
3. **Fail-Safe Medication Escalation:** Multi-tier scheduled notifications (dose time -> initial reminder -> follow-up reminder -> caregiver escalation) ensure that unconfirmed medications trigger alerts without premature assumption of missed doses.
4. **Context-Aware Medical AI with Guardrails:** The Google Gemini integration retrieves authorized MongoDB records to summarize visits and prepare doctor appointments. Strict medical safety prompts prevent the AI from diagnosing, prescribing, or recommending dosage changes.
5. **Accessibility-First Design:** High contrast themes, large touch targets, simplified navigation, screen reader accessibility, and multilingual voice interaction (English, Hindi, Marathi).

---

## 3. Component Details

### 3.1 Backend Architecture (FastAPI + Motor)
- **Modular Routers:** `/api/auth`, `/api/profiles`, `/api/medications`, `/api/appointments`, `/api/care-circle`, `/api/ai`, `/api/documents`, `/api/notifications`, `/api/emergency`, `/api/analytics`, `/api/timeline`, `/api/routine`.
- **Database Connection Manager:** `app.database.connection.MongoManager` provides non-blocking async connection pooling, graceful lifecycle hooks (`lifespan`), and schema index generation.
- **Security Middleware:** Constant-time password hashing with `bcrypt`, HMAC-SHA256 JWT tokens, and strict object-level authorization checking `elderly_user_id` ownership and `permissions` collection flags before any data read/write.

### 3.2 Frontend Architecture (React + TypeScript)
- **Role-Aware Dashboards:** Customized views for Elderly Users (large buttons, daily checklist, one-touch SOS), Family Members (adherence stats, calendar, notifications), and Caregivers (daily shift tasks, assistance logging, vital observations).
- **State & Data Fetching:** TanStack React Query for caching, background revalidation, and optimistic updates.
- **Analytics Visualization:** Recharts for medication adherence breakdowns, weekly compliance, and caregiver activity timelines.

### 3.3 Google Cloud Integration
- **Cloud Run:** Containerized stateless FastAPI service using multi-stage lightweight Docker image.
- **Cloud Scheduler:** Periodic authenticated POST requests to `/api/scheduler/check-reminders` with idempotent task execution to prevent duplicate notifications.
- **Secret Manager & Cloud Logging:** Structured JSON logging and secure environment variable injection.
