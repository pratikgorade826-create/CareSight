from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

AppointmentStatus = Literal["scheduled", "completed", "cancelled"]

class AppointmentCreate(BaseModel):
    elderly_user_id: Optional[str] = None
    doctor_name: str = Field(min_length=1)
    specialty: Optional[str] = "General Medicine"
    hospital_clinic: str = Field(min_length=1)
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    reason: Optional[str] = None
    location: Optional[str] = None
    status: AppointmentStatus = "scheduled"

class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    hospital_clinic: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    reason: Optional[str] = None
    location: Optional[str] = None
    status: Optional[AppointmentStatus] = None

class AppointmentNoteCreate(BaseModel):
    notes: str = Field(min_length=1)
    action_items: List[str] = Field(default_factory=list)
    prescribed_changes: Optional[str] = None

class AppointmentNoteResponse(BaseModel):
    id: str
    appointment_id: str
    elderly_user_id: str
    author_user_id: str
    author_name: Optional[str] = None
    notes: str
    action_items: List[str] = Field(default_factory=list)
    prescribed_changes: Optional[str] = None
    created_at: datetime

class AppointmentResponse(BaseModel):
    id: str
    elderly_user_id: str
    doctor_name: str
    specialty: Optional[str] = None
    hospital_clinic: str
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None
    location: Optional[str] = None
    status: AppointmentStatus
    notes: Optional[List[AppointmentNoteResponse]] = None
    created_at: datetime
    updated_at: datetime
