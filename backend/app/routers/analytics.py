from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.analytics_service import AnalyticsService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Timeline"])

@router.get("/adherence")
async def get_medication_adherence(
    elderly_id: Optional[str] = Query(None),
    days: int = Query(14, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return {
            "period_days": days,
            "total_scheduled": 0,
            "total_taken": 0,
            "total_skipped": 0,
            "total_unconfirmed": 0,
            "overall_adherence_rate": 100.0,
            "daily_trends": []
        }
    return await AnalyticsService.get_adherence_analytics(db, current_user, str(target_oid), days)

@router.get("/weekly-summary")
async def get_weekly_health_summary(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return {
            "week_start": "",
            "week_end": "",
            "adherence_rate": 100.0,
            "doses_taken": 0,
            "doses_missed_or_unconfirmed": 0,
            "appointments_attended": 0,
            "caregiver_hours": 0.0,
            "health_alerts_count": 0,
            "adherence_status": "Good",
        }
    return await AnalyticsService.get_weekly_summary(db, current_user, str(target_oid))

@router.get("/timeline")
async def get_health_timeline(
    elderly_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=5, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return {
            "total_events": 0,
            "items": [],
            "ai_timeline_summary": "No activities recorded yet."
        }
    return await AnalyticsService.get_health_timeline(db, current_user, str(target_oid), category, limit)
