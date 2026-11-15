from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

LanguageCode = Literal["en", "hi", "mr"]

class AIChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[str] = None
    elderly_user_id: Optional[str] = None
    language: LanguageCode = "en"

class AIChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    language: LanguageCode
    retrieved_facts: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    created_at: datetime

class AIAppointmentPrepRequest(BaseModel):
    appointment_id: str
    elderly_user_id: Optional[str] = None
    patient_concerns: Optional[str] = None
    language: LanguageCode = "en"

class AIAppointmentPrepResponse(BaseModel):
    appointment_id: str
    doctor_name: str
    hospital_clinic: str
    appointment_date: str
    appointment_time: str
    active_medications_summary: List[str]
    recent_vitals_summary: List[str]
    recommended_questions_for_doctor: List[str]
    key_preparation_notes: str
    disclaimer: str = "This preparation briefing is synthesized from your CareSight health records to assist your doctor's visit. Always verify with your physician."

class AIDailySummaryRequest(BaseModel):
    elderly_user_id: Optional[str] = None
    target_date: Optional[str] = None  # YYYY-MM-DD
    language: LanguageCode = "en"

class AIDailySummaryResponse(BaseModel):
    summary_date: str
    greeting: str
    medications_overview: str
    appointments_overview: str
    lifestyle_tips: str
    language: LanguageCode
