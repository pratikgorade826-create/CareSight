import logging
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config.settings import settings
from app.database import collections
from app.services.permission_service import PermissionService

logger = logging.getLogger("caresight.ai")

SYSTEM_GUARDRAILS = """
You are CareSight AI, an intelligent, empathetic, and respectful elderly care assistant.
Your role is to help the senior user and their family understand their schedule, appointments, medication routines, and daily activities.

STRICT MEDICAL SAFETY RULES:
1. You MUST NEVER diagnose diseases or conditions.
2. You MUST NEVER prescribe medications or suggest modifying prescribed dosages.
3. You MUST NEVER invent or hallucinate healthcare records that are not in the provided facts context.
4. Clearly distinguish verified database records from general conversational assistance.
5. If the user asks about emergency symptoms (e.g. chest pain, shortness of breath, sudden numbness), IMMEDIATELY advise them to press the red SOS button or call emergency services (112 / 911).
6. Always maintain a warm, respectful, dignified, and senior-friendly tone.
7. Support the requested language: English (en), Hindi (hi), or Marathi (mr).
"""

class AIService:
    @staticmethod
    async def gather_context(db: AsyncIOMotorDatabase, elderly_oid: ObjectId) -> Dict[str, Any]:
        """Gathers authorized MongoDB records for the elderly user to form the factual context."""
        today_str = date.today().isoformat()

        # 1. Active medications
        meds_cursor = db[collections.MEDICATIONS_COLLECTION].find({
            "elderly_user_id": elderly_oid,
            "status": "active"
        })
        active_meds = []
        async for m in meds_cursor:
            active_meds.append({
                "name": m.get("medicine_name"),
                "dosage": m.get("dosage"),
                "frequency": m.get("frequency"),
                "times": m.get("scheduled_times", []),
                "instructions": m.get("instructions", "As directed"),
                "remaining": m.get("remaining_quantity", 0)
            })

        # 2. Today's schedules & confirmation status
        schedules_cursor = db[collections.MEDICATION_SCHEDULES_COLLECTION].find({
            "elderly_user_id": elderly_oid,
            "scheduled_date": today_str
        })
        today_schedules = []
        async for s in schedules_cursor:
            today_schedules.append({
                "medicine": s.get("medicine_name"),
                "time": s.get("scheduled_time"),
                "status": s.get("status"),
                "dosage": s.get("dosage")
            })

        # 3. Upcoming appointments
        apts_cursor = db[collections.APPOINTMENTS_COLLECTION].find({
            "elderly_user_id": elderly_oid,
            "appointment_date": {"$gte": today_str},
            "status": "scheduled"
        }).sort([("appointment_date", 1), ("appointment_time", 1)]).limit(3)
        upcoming_apts = []
        async for a in apts_cursor:
            upcoming_apts.append({
                "doctor": a.get("doctor_name"),
                "specialty": a.get("specialty"),
                "hospital": a.get("hospital_clinic"),
                "date": a.get("appointment_date"),
                "time": a.get("appointment_time"),
                "reason": a.get("reason", "Consultation")
            })

        # 4. Recent health observations
        obs_cursor = db[collections.HEALTH_OBSERVATIONS_COLLECTION].find({
            "elderly_user_id": elderly_oid
        }).sort("observed_at", -1).limit(5)
        recent_obs = []
        async for o in obs_cursor:
            recent_obs.append({
                "type": o.get("observation_type"),
                "value": o.get("value"),
                "unit": o.get("unit", ""),
                "date": o.get("observed_at").strftime("%Y-%m-%d %H:%M") if o.get("observed_at") else ""
            })

        # 5. Elderly profile preferences
        profile = await db[collections.ELDERLY_PROFILES_COLLECTION].find_one({"user_id": elderly_oid})

        return {
            "active_medications": active_meds,
            "today_schedules": today_schedules,
            "upcoming_appointments": upcoming_apts,
            "recent_observations": recent_obs,
            "allergies": profile.get("allergies", []) if profile else [],
            "chronic_conditions": profile.get("chronic_conditions", []) if profile else [],
        }

    @classmethod
    async def chat(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        message: str,
        conversation_id: Optional[str] = None,
        elderly_id_str: Optional[str] = None,
        language: str = "en"
    ) -> dict:
        user_role = current_user.get("role")
        current_user_id = str(current_user["_id"])
        target_elderly_str = elderly_id_str or current_user_id

        elderly_oid = await PermissionService.verify_access(
            db, current_user, target_elderly_str,
            required_permission="can_view_medications" if user_role != "elderly" else None,
            action_name="AI_CHAT"
        )

        # Retrieve factual context from MongoDB
        context = await cls.gather_context(db, elderly_oid)

        # Extract verified facts bullet list
        facts_list = []
        if context["today_schedules"]:
            for s in context["today_schedules"]:
                status_icon = "Confirmed Taken" if s['status'] == 'taken' else ("Skipped" if s['status'] == 'skipped' else "Pending")
                facts_list.append(f"Medication: {s['medicine']} ({s['dosage']}) at {s['time']} — {status_icon}")
        else:
            facts_list.append("No medication doses scheduled for today.")

        if context["upcoming_appointments"]:
            next_apt = context["upcoming_appointments"][0]
            facts_list.append(f"Next Appointment: Dr. {next_apt['doctor']} ({next_apt['specialty']}) on {next_apt['date']} at {next_apt['time']} at {next_apt['hospital']}.")
        else:
            facts_list.append("No upcoming appointments scheduled.")

        # Call Gemini or smart fallback
        ai_response_text = await cls._generate_gemini_response(message, context, facts_list, language)

        # Store in chat conversation & messages
        now = datetime.now(timezone.utc)
        if conversation_id and ObjectId.is_valid(conversation_id):
            conv_oid = ObjectId(conversation_id)
        else:
            conv_doc = {
                "user_id": ObjectId(current_user_id),
                "elderly_user_id": elderly_oid,
                "title": message[:40] + ("..." if len(message) > 40 else ""),
                "language": language,
                "created_at": now,
                "updated_at": now,
            }
            conv_res = await db[collections.CHAT_CONVERSATIONS_COLLECTION].insert_one(conv_doc)
            conv_oid = conv_res.inserted_id

        msg_doc = {
            "conversation_id": conv_oid,
            "role": "user",
            "content": message,
            "language": language,
            "created_at": now,
        }
        await db[collections.CHAT_MESSAGES_COLLECTION].insert_one(msg_doc)

        bot_msg_doc = {
            "conversation_id": conv_oid,
            "role": "assistant",
            "content": ai_response_text,
            "retrieved_context_summary": facts_list,
            "language": language,
            "created_at": datetime.now(timezone.utc),
        }
        bot_res = await db[collections.CHAT_MESSAGES_COLLECTION].insert_one(bot_msg_doc)

        # Generate suggested followups
        followups = [
            "What medicines do I have left to take today?",
            "When is my next doctor appointment?",
            "Can you help me prepare questions for my doctor?"
        ]
        if language == "hi":
            followups = [
                "आज मुझे कौन सी दवाइयाँ लेनी हैं?",
                "डॉक्टर के साथ मेरी अगली मुलाक़ात कब है?",
                "डॉक्टर से पूछने के लिए सवाल तैयार करने में मदद करें।"
            ]
        elif language == "mr":
            followups = [
                "आज मला कोणती औषधे घ्यायची आहेत?",
                "माझी पुढची डॉक्टरांची भेट कधी आहे?",
                "डॉक्टरांना विचारण्यासाठी प्रश्नांची तयारी कशी करावी?"
            ]

        return {
            "conversation_id": str(conv_oid),
            "message_id": str(bot_res.inserted_id),
            "response": ai_response_text,
            "language": language,
            "retrieved_facts": facts_list,
            "suggested_followups": followups,
            "created_at": now.isoformat(),
        }

    @classmethod
    async def _generate_gemini_response(
        cls, message: str, context: Dict[str, Any], facts: List[str], language: str
    ) -> str:
        prompt = f"""
        User Query: "{message}"
        Language requested: {language} (en=English, hi=Hindi, mr=Marathi)

        VERIFIED PATIENT HEALTH RECORDS FROM MONGODB:
        - Active Prescriptions: {context['active_medications']}
        - Today's Schedules & Status: {context['today_schedules']}
        - Upcoming Appointments: {context['upcoming_appointments']}
        - Recent Health Observations: {context['recent_observations']}
        - Known Allergies: {context['allergies']}
        - Chronic Conditions: {context['chronic_conditions']}

        Provide a caring, respectful response answering the user's question directly based on these facts.
        """

        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"):
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=[SYSTEM_GUARDRAILS, prompt],
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini API error: {e}. Falling back to rule-based healthcare synthesizer.")

        # Senior-friendly localized fallback engine
        msg_lower = message.lower()
        if language == "hi":
            if "दवा" in message or "medicine" in msg_lower or "today" in msg_lower:
                schedules_summary = "\n".join([f"• {f}" for f in facts if "Medication:" in f]) or "आज के लिए कोई निर्धारित दवा नहीं है।"
                return f"नमस्ते! आपके आज के दवा का विवरण इस प्रकार है:\n{schedules_summary}\n\nयदि आपने अभी तक दवा नहीं ली है, तो कृपया समय पर लें और ऐप में पुष्टि करें।"
            if "अपॉइंटमेंट" in message or "appointment" in msg_lower or "doctor" in msg_lower:
                apt_summary = next((f for f in facts if "Next Appointment:" in f), "वर्तमान में कोई आगामी अपॉइंटमेंट नहीं है।")
                return f"नमस्ते! आपके डॉक्टर अपॉइंटमेंट का विवरण:\n{apt_summary}"
            return f"नमस्ते! मैं आपका केयरसाइट केयर साथी हूँ। आपके स्वास्थ्य रिकॉर्ड्स सुरक्षित हैं। मैं आपकी दवाओं, अपॉइंटमेंट और दैनिक स्वास्थ्य में कैसे मदद कर सकता हूँ?"

        elif language == "mr":
            if "औषध" in message or "medicine" in msg_lower:
                schedules_summary = "\n".join([f"• {f}" for f in facts if "Medication:" in f]) or "आजसाठी कोणतेही औषध निर्धारित नाही."
                return f"नमस्कार! आजच्या आपल्या औषधांचे वेळापत्रक पुढीलप्रमाणे आहे:\n{schedules_summary}\n\nकृपया वेळेवर औषधे घ्या आणि ॲपमध्ये नोंद करा."
            if "भेट" in message or "appointment" in msg_lower or "doctor" in msg_lower:
                apt_summary = next((f for f in facts if "Next Appointment:" in f), "सध्या कोणतीही आगामी अपॉइंटमेंट नाही.")
                return f"नमस्कार! आपल्या डॉक्टरांच्या भेटीचे तपशील:\n{apt_summary}"
            return f"नमस्कार! मी आपला केअरसाईट आरोग्य सहकारी आहे. मी आपल्या औषध वेळापत्रक आणि डॉक्टरांच्या भेटीत कशी मदत करू शकतो?"

        # English Default
        if "medicine" in msg_lower or "medication" in msg_lower or "today" in msg_lower:
            schedules_summary = "\n".join([f"• {f}" for f in facts if "Medication:" in f]) or "No medicines scheduled for today."
            return f"Here is your medication schedule for today:\n\n{schedules_summary}\n\nRemember to click 'Confirm Taken' as soon as you have taken your dose!"
        if "appointment" in msg_lower or "doctor" in msg_lower:
            apt_summary = next((f for f in facts if "Next Appointment:" in f), "You do not have any upcoming appointments scheduled right now.")
            return f"Here are your appointment details:\n\n{apt_summary}\n\nWould you like me to help you prepare questions for your doctor?"
        
        return (
            f"Hello! I am your CareSight Daily Companion. Here is your current health status:\n\n"
            + "\n".join([f"• {f}" for f in facts])
            + "\n\nHow else can I assist you with your health routine today?"
        )

    @classmethod
    async def prepare_appointment(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        appointment_id_str: str,
        patient_concerns: Optional[str] = None,
        language: str = "en"
    ) -> dict:
        """Module 5 & Module 3: Synthesizes appointment preparation guide using MongoDB records."""
        if not ObjectId.is_valid(appointment_id_str):
            raise HTTPException(status_code=400, detail="Invalid appointment ID")
        apt_oid = ObjectId(appointment_id_str)

        apt = await db[collections.APPOINTMENTS_COLLECTION].find_one({"_id": apt_oid})
        if not apt:
            raise HTTPException(status_code=404, detail="Appointment not found")

        elderly_oid = apt["elderly_user_id"]
        await PermissionService.verify_access(
            db, current_user, str(elderly_oid),
            required_permission="can_view_appointments" if current_user.get("role") != "elderly" else None,
            action_name="PREPARE_APPOINTMENT"
        )

        context = await cls.gather_context(db, elderly_oid)

        meds_summary = [f"{m['name']} ({m['dosage']}, {m['frequency']})" for m in context["active_medications"]]
        vitals_summary = [f"{o['type'].replace('_', ' ').title()}: {o['value']} {o['unit']} ({o['date']})" for o in context["recent_observations"]]

        questions = [
            f"Are there any interactions between my active medications ({', '.join([m['name'] for m in context['active_medications'][:2]])})?",
            "Should we adjust any dosages based on my recent vitals?",
            "Are there any dietary or activity modifications recommended at this stage?",
            "When should our next follow-up check-in be scheduled?"
        ]
        if patient_concerns:
            questions.insert(0, f"Regarding my concern: '{patient_concerns}' — what are your recommendations?")

        notes = (
            f"Preparation for consultation with Dr. {apt['doctor_name']} ({apt.get('specialty', 'Physician')}) "
            f"at {apt['hospital_clinic']} on {apt['appointment_date']} at {apt['appointment_time']}. "
            f"Patient brings {len(meds_summary)} active prescription items and {len(vitals_summary)} recent health observations."
        )

        return {
            "appointment_id": appointment_id_str,
            "doctor_name": apt["doctor_name"],
            "hospital_clinic": apt["hospital_clinic"],
            "appointment_date": apt["appointment_date"],
            "appointment_time": apt["appointment_time"],
            "active_medications_summary": meds_summary,
            "recent_vitals_summary": vitals_summary,
            "recommended_questions_for_doctor": questions,
            "key_preparation_notes": notes,
            "disclaimer": "This preparation briefing is synthesized from your CareSight health records to assist your doctor's visit. Always verify with your physician."
        }
