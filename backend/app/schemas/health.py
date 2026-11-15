from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

ObservationType = Literal[
    "blood_pressure",
    "blood_sugar",
    "heart_rate",
    "mood",
    "sleep",
    "mobility",
    "weight",
    "general_notes"
]

class HealthObservationCreate(BaseModel):
    elderly_user_id: Optional[str] = None
    observation_type: ObservationType
    value: str = Field(min_length=1, description="e.g. 120/80, 110 mg/dL, 72 bpm, Calm & cheerful")
    unit: Optional[str] = None
    notes: Optional[str] = None
    observed_at: Optional[datetime] = None

class HealthObservationResponse(BaseModel):
    id: str
    elderly_user_id: str
    observed_by_user_id: str
    observer_name: Optional[str] = None
    observation_type: ObservationType
    value: str
    unit: Optional[str] = None
    notes: Optional[str] = None
    observed_at: datetime
    created_at: datetime

class CaregiverActivityCreate(BaseModel):
    elderly_user_id: str
    activity_type: str = Field(description="medication_assisted, meal_served, mobility_walk, vitals_check, companionship")
    details: str = Field(min_length=1)
    duration_minutes: int = Field(default=30, ge=1)
    performed_at: Optional[datetime] = None

class CaregiverActivityResponse(BaseModel):
    id: str
    elderly_user_id: str
    caregiver_user_id: str
    caregiver_name: Optional[str] = None
    activity_type: str
    details: str
    duration_minutes: int
    performed_at: datetime

class DailyRoutineCreateUpdate(BaseModel):
    elderly_user_id: Optional[str] = None
    wake_up_time: str = "07:00"
    breakfast_time: str = "08:30"
    lunch_time: str = "13:00"
    dinner_time: str = "20:00"
    bed_time: str = "22:00"
    exercise_preference: str = "Morning 20-min garden walk"
    rest_intervals: List[str] = Field(default_factory=lambda: ["14:30 - 15:30 Afternoon rest"])

class DailyRoutineResponse(DailyRoutineCreateUpdate):
    id: str
    elderly_user_id: str
    updated_at: datetime

class ScheduleConflict(BaseModel):
    conflict_type: str  # "medication_meal_overlap", "appointment_routine_clash", etc.
    description: str
    suggested_alternative: str
