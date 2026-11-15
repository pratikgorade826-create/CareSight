from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

MedicationStatus = Literal["active", "discontinued", "completed"]
ConfirmationStatus = Literal["taken", "skipped", "unable_to_confirm"]

class MedicationCreate(BaseModel):
    elderly_user_id: Optional[str] = None  # Optional if logged in user is the elderly user
    medicine_name: str = Field(min_length=1)
    dosage: str = Field(min_length=1)
    frequency: str = "Once daily"
    scheduled_times: List[str] = Field(default_factory=lambda: ["09:00"])
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    instructions: Optional[str] = None
    refill_quantity: int = 30
    remaining_quantity: int = 30
    status: MedicationStatus = "active"

class MedicationUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    scheduled_times: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    instructions: Optional[str] = None
    refill_quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    status: Optional[MedicationStatus] = None

class MedicationResponse(BaseModel):
    id: str
    elderly_user_id: str
    medicine_name: str
    dosage: str
    frequency: str
    scheduled_times: List[str]
    start_date: str
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    instructions: Optional[str] = None
    refill_quantity: int
    remaining_quantity: int
    status: MedicationStatus
    created_at: datetime
    updated_at: datetime

class MedicationConfirmRequest(BaseModel):
    status: ConfirmationStatus = "taken"
    notes: Optional[str] = None
    dose_time: Optional[str] = None  # HH:MM or ISO
    schedule_id: Optional[str] = None

class MedicationScheduleItem(BaseModel):
    id: str
    medication_id: str
    elderly_user_id: str
    medicine_name: str
    dosage: str
    instructions: Optional[str] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    status: str  # "pending", "taken", "skipped", "escalated"
    escalation_stage: int = 0
    confirmed_at: Optional[datetime] = None
