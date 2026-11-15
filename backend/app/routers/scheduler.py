from fastapi import APIRouter, Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.services.escalation_service import EscalationService

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler & Escalation Engine"])

@router.post("/check-reminders")
async def trigger_reminder_escalation_check(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Cloud Scheduler / Background worker trigger:
    Evaluates pending medication doses and applies 15-min reminder, 30-min follow-up, and 60-min caregiver escalation.
    Idempotent and safe to run every 5 or 15 minutes.
    """
    result = await EscalationService.process_escalation_cycle(db)
    return {
        "status": "success",
        "result": result
    }
