from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DailyAdherencePoint(BaseModel):
    date: str  # YYYY-MM-DD
    scheduled: int
    taken: int
    skipped: int
    unconfirmed: int
    adherence_rate: float  # Percentage

class AdherenceAnalyticsResponse(BaseModel):
    period_days: int
    total_scheduled: int
    total_taken: int
    total_skipped: int
    total_unconfirmed: int
    overall_adherence_rate: float
    daily_trends: List[DailyAdherencePoint]

class WeeklySummaryResponse(BaseModel):
    week_start: str
    week_end: str
    adherence_rate: float
    doses_taken: int
    doses_missed_or_unconfirmed: int
    appointments_attended: int
    caregiver_hours: float
    health_alerts_count: int
    adherence_status: str  # "Excellent", "Good", "Needs Attention"

class TimelineItem(BaseModel):
    id: str
    category: str  # "medication", "appointment", "observation", "caregiver", "document", "emergency"
    title: str
    description: str
    status: Optional[str] = None
    actor_name: Optional[str] = None
    timestamp: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TimelineResponse(BaseModel):
    total_events: int
    items: List[TimelineItem]
    ai_timeline_summary: Optional[str] = None
