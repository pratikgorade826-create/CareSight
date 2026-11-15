"""
CareSight Single Demo Account Seeder
Creates only one primary demo account: demo@caresight.com ("Demo User")
Completely removes any legacy names (Ramesh, Pooja, Sunita).
"""

import logging
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.utils.security import hash_password

logger = logging.getLogger("caresight.demo_seeder")

DEMO_EMAIL = "demo@caresight.com"
DEMO_PASSWORD = "CareSight123!"

async def seed_single_demo_account(db: AsyncIOMotorDatabase):
    """Ensures the single demo account and its clinical records exist."""
    existing = await db[collections.USERS_COLLECTION].find_one({"email": DEMO_EMAIL})
    if existing:
        return existing

    logger.info("Seeding single demo account: demo@caresight.com...")
    now = datetime.now(timezone.utc)
    today = date.today()
    today_str = today.isoformat()
    pw_hash = hash_password(DEMO_PASSWORD)

    demo_user_id = ObjectId()
    family_user_id = ObjectId()
    caregiver_user_id = ObjectId()

    # Clean any leftover demo accounts to prevent duplicate key errors
    demo_emails = [DEMO_EMAIL, "family.member@caresight.com", "caregiver.nurse@caresight.com"]
    await db[collections.USERS_COLLECTION].delete_many({"email": {"$in": demo_emails}})

    demo_user = {
        "_id": demo_user_id,
        "email": DEMO_EMAIL,
        "password_hash": pw_hash,
        "role": "elderly",
        "first_name": "Demo",
        "last_name": "User",
        "phone_number": "+1 800-555-0199",
        "is_active": True,
        "is_verified": True,
        "created_at": now - timedelta(days=60),
        "updated_at": now,
    }
    await db[collections.USERS_COLLECTION].insert_one(demo_user)

    # 2. Elderly Clinical Profile
    profile_doc = {
        "user_id": demo_user_id,
        "date_of_birth": "1954-04-12",
        "gender": "Other",
        "blood_type": "B+",
        "allergies": ["Penicillin", "Dust & Pollen"],
        "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
        "preferred_language": "en",
        "time_zone": "Asia/Kolkata",
        "accessibility_preferences": {
            "large_font": True,
            "high_contrast": False,
            "voice_enabled": True,
            "simplified_view": True,
        },
        "emergency_notes": "Carries emergency medication in jacket pocket. Mild hearing loss in left ear.",
        "created_at": now - timedelta(days=60),
        "updated_at": now,
    }
    await db[collections.ELDERLY_PROFILES_COLLECTION].replace_one({"user_id": demo_user_id}, profile_doc, upsert=True)

    # 3. Care Circle
    circle_id = ObjectId()
    circle_doc = {
        "_id": circle_id,
        "elderly_user_id": demo_user_id,
        "circle_name": "Demo Circle of Care",
        "created_at": now - timedelta(days=55),
        "updated_at": now,
    }
    await db[collections.CARE_CIRCLES_COLLECTION].replace_one({"elderly_user_id": demo_user_id}, circle_doc, upsert=True)

    # 4. Helper Circle Members (Generic labels, no Ramesh/Sunita/Pooja)
    family_user = {
        "_id": family_user_id,
        "email": "family.member@caresight.com",
        "password_hash": pw_hash,
        "role": "family",
        "first_name": "Family",
        "last_name": "Member",
        "phone_number": "+1 800-555-0188",
        "is_active": True,
        "is_verified": True,
        "created_at": now - timedelta(days=50),
        "updated_at": now,
    }
    caregiver_user = {
        "_id": caregiver_user_id,
        "email": "caregiver.nurse@caresight.com",
        "password_hash": pw_hash,
        "role": "caregiver",
        "first_name": "Caregiver",
        "last_name": "Nurse",
        "phone_number": "+1 800-555-0177",
        "is_active": True,
        "is_verified": True,
        "created_at": now - timedelta(days=40),
        "updated_at": now,
    }
    await db[collections.USERS_COLLECTION].replace_one({"email": "family.member@caresight.com"}, family_user, upsert=True)
    await db[collections.USERS_COLLECTION].replace_one({"email": "caregiver.nurse@caresight.com"}, caregiver_user, upsert=True)

    # Add as members
    member_family = {
        "care_circle_id": circle_id,
        "user_id": family_user_id,
        "role_in_circle": "family",
        "relationship_label": "Family Member",
        "status": "active",
        "joined_at": now - timedelta(days=50),
    }
    member_caregiver = {
        "care_circle_id": circle_id,
        "user_id": caregiver_user_id,
        "role_in_circle": "caregiver",
        "relationship_label": "Primary Nurse Caregiver",
        "status": "active",
        "joined_at": now - timedelta(days=40),
    }
    await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].insert_many([member_family, member_caregiver])

    # Granular Permissions
    perm_family = {
        "elderly_user_id": demo_user_id,
        "member_user_id": family_user_id,
        "can_view_medications": True,
        "can_modify_medications": False,
        "can_confirm_medications": True,
        "can_view_appointments": True,
        "can_manage_appointments": True,
        "can_view_documents": True,
        "can_upload_documents": True,
        "can_receive_alerts": True,
        "can_view_timeline": True,
        "updated_at": now,
    }
    perm_caregiver = {
        "elderly_user_id": demo_user_id,
        "member_user_id": caregiver_user_id,
        "can_view_medications": True,
        "can_modify_medications": True,
        "can_confirm_medications": True,
        "can_view_appointments": True,
        "can_manage_appointments": True,
        "can_view_documents": True,
        "can_upload_documents": True,
        "can_receive_alerts": True,
        "can_view_timeline": True,
        "updated_at": now,
    }
    await db[collections.PERMISSIONS_COLLECTION].insert_many([perm_family, perm_caregiver])

    # 5. Prescriptions
    med1_id = ObjectId()
    med2_id = ObjectId()
    med3_id = ObjectId()

    meds = [
        {
            "_id": med1_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "frequency": "Twice daily",
            "scheduled_times": ["08:30", "20:30"],
            "start_date": (today - timedelta(days=90)).isoformat(),
            "prescribing_doctor": "Dr. Sarah Jenkins",
            "instructions": "Take with meals to minimize stomach upset.",
            "refill_quantity": 60,
            "remaining_quantity": 42,
            "status": "active",
            "created_at": now - timedelta(days=90),
            "updated_at": now,
        },
        {
            "_id": med2_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Amlodipine Besylate",
            "dosage": "5 mg",
            "frequency": "Once daily",
            "scheduled_times": ["09:00"],
            "start_date": (today - timedelta(days=120)).isoformat(),
            "prescribing_doctor": "Dr. Michael Chen",
            "instructions": "Take every morning with a full glass of water.",
            "refill_quantity": 30,
            "remaining_quantity": 18,
            "status": "active",
            "created_at": now - timedelta(days=120),
            "updated_at": now,
        },
        {
            "_id": med3_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Atorvastatin Calcium",
            "dosage": "10 mg",
            "frequency": "Once daily at bedtime",
            "scheduled_times": ["21:00"],
            "start_date": (today - timedelta(days=60)).isoformat(),
            "prescribing_doctor": "Dr. Michael Chen",
            "instructions": "Take at night before bed.",
            "refill_quantity": 30,
            "remaining_quantity": 25,
            "status": "active",
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        }
    ]
    await db[collections.MEDICATIONS_COLLECTION].insert_many(meds)

    # 6. Today's Schedules
    schedules = [
        {
            "_id": ObjectId(),
            "medication_id": med1_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "instructions": "Take with breakfast",
            "scheduled_date": today_str,
            "scheduled_time": "08:30",
            "status": "taken",
            "escalation_stage": 0,
            "confirmed_at": now.replace(hour=8, minute=35),
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "medication_id": med2_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Amlodipine Besylate",
            "dosage": "5 mg",
            "instructions": "Take with morning water",
            "scheduled_date": today_str,
            "scheduled_time": "09:00",
            "status": "pending",
            "escalation_stage": 0,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "medication_id": med1_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "instructions": "Take with dinner",
            "scheduled_date": today_str,
            "scheduled_time": "20:30",
            "status": "pending",
            "escalation_stage": 0,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "medication_id": med3_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Atorvastatin Calcium",
            "dosage": "10 mg",
            "instructions": "Take before bed",
            "scheduled_date": today_str,
            "scheduled_time": "21:00",
            "status": "pending",
            "escalation_stage": 0,
            "created_at": now,
        }
    ]
    await db[collections.MEDICATION_SCHEDULES_COLLECTION].insert_many(schedules)

    # 7. Past 14 days of compliance events for Recharts analytics
    past_events = []
    past_schedules = []
    for d_offset in range(1, 15):
        past_date = today - timedelta(days=d_offset)
        p_str = past_date.isoformat()
        is_skipped = (d_offset % 6 == 0)

        past_schedules.append({
            "medication_id": med1_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "scheduled_date": p_str,
            "scheduled_time": "08:30",
            "status": "taken",
            "escalation_stage": 0,
            "created_at": now - timedelta(days=d_offset),
        })
        past_events.append({
            "medication_id": med1_id,
            "elderly_user_id": demo_user_id,
            "confirmed_by_user_id": demo_user_id,
            "status": "taken",
            "dose_time": "08:35",
            "notes": "Taken with breakfast",
            "confirmed_at": datetime.combine(past_date, datetime.min.time()).replace(hour=8, minute=35, tzinfo=timezone.utc),
        })

        past_schedules.append({
            "medication_id": med2_id,
            "elderly_user_id": demo_user_id,
            "medicine_name": "Amlodipine Besylate",
            "dosage": "5 mg",
            "scheduled_date": p_str,
            "scheduled_time": "09:00",
            "status": "skipped" if is_skipped else "taken",
            "escalation_stage": 0,
            "created_at": now - timedelta(days=d_offset),
        })
        past_events.append({
            "medication_id": med2_id,
            "elderly_user_id": demo_user_id,
            "confirmed_by_user_id": demo_user_id,
            "status": "skipped" if is_skipped else "taken",
            "dose_time": "09:05",
            "notes": "Skipped due to fasting" if is_skipped else "Taken smoothly",
            "confirmed_at": datetime.combine(past_date, datetime.min.time()).replace(hour=9, minute=5, tzinfo=timezone.utc),
        })

    await db[collections.MEDICATION_SCHEDULES_COLLECTION].insert_many(past_schedules)
    await db[collections.MEDICATION_EVENTS_COLLECTION].insert_many(past_events)

    # 8. Appointments
    apts = [
        {
            "_id": ObjectId(),
            "elderly_user_id": demo_user_id,
            "doctor_name": "Michael Chen",
            "specialty": "Cardiology",
            "hospital_clinic": "Metropolitan Medical Center",
            "appointment_date": (today + timedelta(days=3)).isoformat(),
            "appointment_time": "10:30",
            "reason": "Routine 3-month blood pressure review.",
            "location": "Suite 400, Clinic Tower",
            "status": "scheduled",
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": ObjectId(),
            "elderly_user_id": demo_user_id,
            "doctor_name": "Sarah Jenkins",
            "specialty": "Endocrinology",
            "hospital_clinic": "Central Health Pavilion",
            "appointment_date": (today + timedelta(days=10)).isoformat(),
            "appointment_time": "14:00",
            "reason": "HbA1c follow-up and glycemic check.",
            "location": "Building B",
            "status": "scheduled",
            "created_at": now,
            "updated_at": now,
        }
    ]
    await db[collections.APPOINTMENTS_COLLECTION].insert_many(apts)

    # 9. Health Observations (Vitals)
    observations = [
        {
            "elderly_user_id": demo_user_id,
            "observed_by_user_id": caregiver_user_id,
            "observation_type": "blood_pressure",
            "value": "120/80",
            "unit": "mmHg",
            "notes": "Resting blood pressure within optimal target.",
            "observed_at": now - timedelta(hours=2),
            "created_at": now,
        },
        {
            "elderly_user_id": demo_user_id,
            "observed_by_user_id": caregiver_user_id,
            "observation_type": "blood_sugar",
            "value": "110",
            "unit": "mg/dL",
            "notes": "Fasting blood sugar stable.",
            "observed_at": now - timedelta(hours=3),
            "created_at": now,
        },
        {
            "elderly_user_id": demo_user_id,
            "observed_by_user_id": caregiver_user_id,
            "observation_type": "heart_rate",
            "value": "72",
            "unit": "bpm",
            "notes": "Normal sinus rhythm.",
            "observed_at": now - timedelta(hours=2),
            "created_at": now,
        }
    ]
    await db[collections.HEALTH_OBSERVATIONS_COLLECTION].insert_many(observations)

    # 10. Emergency Contacts
    contacts = [
        {
            "elderly_user_id": demo_user_id,
            "name": "Family Member",
            "relationship": "Primary Family Contact",
            "phone_number": "+1 800-555-0188",
            "priority_order": 1,
            "is_notified_on_sos": True,
            "created_at": now,
        },
        {
            "elderly_user_id": demo_user_id,
            "name": "Caregiver Nurse",
            "relationship": "Certified Home Nurse",
            "phone_number": "+1 800-555-0177",
            "priority_order": 2,
            "is_notified_on_sos": True,
            "created_at": now,
        },
        {
            "elderly_user_id": demo_user_id,
            "name": "Dr. Michael Chen",
            "relationship": "Cardiologist",
            "phone_number": "+1 800-555-0199",
            "priority_order": 3,
            "is_notified_on_sos": False,
            "created_at": now,
        }
    ]
    await db[collections.EMERGENCY_CONTACTS_COLLECTION].insert_many(contacts)

    # 11. Daily Routine
    routine_doc = {
        "elderly_user_id": demo_user_id,
        "wake_up_time": "07:00",
        "breakfast_time": "08:30",
        "lunch_time": "13:00",
        "dinner_time": "20:00",
        "bed_time": "22:00",
        "exercise_preference": "Morning 20-min gentle walk",
        "rest_intervals": ["14:30 - 15:30 Afternoon quiet rest"],
        "updated_at": now,
    }
    await db[collections.DAILY_ROUTINES_COLLECTION].replace_one({"elderly_user_id": demo_user_id}, routine_doc, upsert=True)

    logger.info("Successfully seeded single demo account demo@caresight.com with full clinical records.")
    return demo_user
