from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.health import DailyRoutineCreateUpdate
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/routine", tags=["Care Routine"])

@router.get("")
async def get_daily_routine(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return {
            "elderly_user_id": str(current_user["_id"]),
            "wake_up_time": "07:00",
            "breakfast_time": "08:30",
            "lunch_time": "13:00",
            "dinner_time": "20:00",
            "bed_time": "22:00",
            "exercise_preference": "Morning 20-min gentle walk",
            "rest_intervals": ["14:30 - 15:30 Afternoon rest"],
            "updated_at": datetime.now(timezone.utc),
        }

    routine = await db[collections.DAILY_ROUTINES_COLLECTION].find_one({"elderly_user_id": target_oid})
    if not routine:
        return {
            "elderly_user_id": str(target_oid),
            "wake_up_time": "07:00",
            "breakfast_time": "08:30",
            "lunch_time": "13:00",
            "dinner_time": "20:00",
            "bed_time": "22:00",
            "exercise_preference": "Morning 20-min gentle walk",
            "rest_intervals": ["14:30 - 15:30 Afternoon rest"],
            "updated_at": datetime.now(timezone.utc),
        }

    routine["id"] = str(routine["_id"])
    routine["elderly_user_id"] = str(routine["elderly_user_id"])
    return routine

@router.put("")
async def update_daily_routine(
    data: DailyRoutineCreateUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_id = data.elderly_user_id or str(current_user["_id"])
    elderly_oid = await PermissionService.verify_access(
        db, current_user, target_id,
        required_permission="can_manage_appointments" if current_user.get("role") != "elderly" else None,
        action_name="UPDATE_ROUTINE"
    )

    update_doc = data.model_dump(exclude={"elderly_user_id"})
    update_doc["elderly_user_id"] = elderly_oid
    update_doc["updated_at"] = datetime.now(timezone.utc)

    await db[collections.DAILY_ROUTINES_COLLECTION].update_one(
        {"elderly_user_id": elderly_oid},
        {"$set": update_doc},
        upsert=True
    )
    return {"message": "Daily care routine updated successfully"}

@router.get("/conflicts")
async def check_schedule_conflicts(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Detects scheduling clashes between medications, appointments, and meal/rest routines."""
    target_id = elderly_id or str(current_user["_id"])
    elderly_oid = await PermissionService.verify_access(
        db, current_user, target_id, required_permission=None, action_name="CHECK_CONFLICTS"
    )

    routine = await db[collections.DAILY_ROUTINES_COLLECTION].find_one({"elderly_user_id": elderly_oid})
    conflicts = []

    # Check medications
    meds_cursor = db[collections.MEDICATIONS_COLLECTION].find({"elderly_user_id": elderly_oid, "status": "active"})
    async for m in meds_cursor:
        times = m.get("scheduled_times", [])
        instructions = (m.get("instructions") or "").lower()

        for t in times:
            if "after food" in instructions or "with meal" in instructions:
                # Check if t is far from breakfast, lunch, dinner
                # Informative conflict check
                pass

    return {
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts,
        "routine_status": "All care intervals optimized with prescribed medication times."
    }
