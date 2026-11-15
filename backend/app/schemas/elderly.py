from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AccessibilityPreferences(BaseModel):
    large_font: bool = True
    high_contrast: bool = False
    voice_enabled: bool = True
    simplified_view: bool = True

class ElderlyProfileCreate(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    preferred_language: str = "en"  # "en", "hi", "mr"
    time_zone: str = "Asia/Kolkata"
    accessibility_preferences: AccessibilityPreferences = Field(default_factory=AccessibilityPreferences)
    emergency_notes: Optional[str] = None

class ElderlyProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    preferred_language: Optional[str] = None
    time_zone: Optional[str] = None
    accessibility_preferences: Optional[AccessibilityPreferences] = None
    emergency_notes: Optional[str] = None

class ElderlyProfileResponse(BaseModel):
    id: str
    user_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    preferred_language: str = "en"
    time_zone: str = "Asia/Kolkata"
    accessibility_preferences: AccessibilityPreferences = Field(default_factory=AccessibilityPreferences)
    emergency_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
