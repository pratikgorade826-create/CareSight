from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.elderly import ElderlyProfileCreate, ElderlyProfileUpdate, ElderlyProfileResponse
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

@router.get("/me")
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    current_user_id = str(current_user["_id"])
    role = current_user.get("role")

    elderly_profile = None
    linked_elderly = []

    if role == "elderly":
        p = await db[collections.ELDERLY_PROFILES_COLLECTION].find_one({"user_id": current_user["_id"]})
        if p:
            elderly_profile = {
                "id": str(p["_id"]),
                "user_id": current_user_id,
                "first_name": current_user.get("first_name"),
                "last_name": current_user.get("last_name"),
                "date_of_birth": p.get("date_of_birth"),
                "gender": p.get("gender"),
                "blood_type": p.get("blood_type"),
                "allergies": p.get("allergies", []),
                "chronic_conditions": p.get("chronic_conditions", []),
                "preferred_language": p.get("preferred_language", "en"),
                "time_zone": p.get("time_zone", "Asia/Kolkata"),
                "accessibility_preferences": p.get("accessibility_preferences", {}),
                "emergency_notes": p.get("emergency_notes", ""),
                "created_at": p.get("created_at"),
                "updated_at": p.get("updated_at"),
            }
    else:
        # Find active memberships for family/caregiver
        cursor = db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find({
            "user_id": current_user["_id"],
            "status": "active"
        })
        async for m in cursor:
            circle = await db[collections.CARE_CIRCLES_COLLECTION].find_one({"_id": m["care_circle_id"]})
            if circle:
                elderly_user = await db[collections.USERS_COLLECTION].find_one({"_id": circle["elderly_user_id"]})
                if elderly_user:
                    linked_elderly.append({
                        "elderly_id": str(circle["elderly_user_id"]),
                        "elderly_name": f"{elderly_user.get('first_name', '')} {elderly_user.get('last_name', '')}".strip(),
                        "circle_name": circle.get("circle_name", "Circle of Care"),
                        "relationship_label": m.get("relationship_label", "Member"),
                        "role_in_circle": m.get("role_in_circle"),
                    })

    return {
        "user": {
            "id": current_user_id,
            "email": current_user["email"],
            "role": role,
            "first_name": current_user.get("first_name", ""),
            "last_name": current_user.get("last_name", ""),
            "phone_number": current_user.get("phone_number"),
        },
        "elderly_profile": elderly_profile,
        "linked_elderly": linked_elderly
    }

@router.put("/me")
async def update_my_profile(
    updates: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    current_user_id = current_user["_id"]
    allowed = {}
    for key in ["first_name", "last_name", "phone_number"]:
        if key in updates:
            allowed[key] = updates[key].strip()

    if allowed:
        allowed["updated_at"] = datetime.now(timezone.utc)
        await db[collections.USERS_COLLECTION].update_one({"_id": current_user_id}, {"$set": allowed})

    return {"message": "Profile updated successfully"}

@router.get("/elderly/{elderly_id}")
async def get_elderly_profile_by_id(
    elderly_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    elderly_oid = await PermissionService.verify_access(
        db, current_user, elderly_id, required_permission=None, action_name="GET_ELDERLY_PROFILE"
    )
    user = await db[collections.USERS_COLLECTION].find_one({"_id": elderly_oid})
    p = await db[collections.ELDERLY_PROFILES_COLLECTION].find_one({"user_id": elderly_oid})
    if not p:
        raise HTTPException(status_code=404, detail="Elderly profile not found")

    return {
        "id": str(p["_id"]),
        "user_id": str(elderly_oid),
        "first_name": user.get("first_name", "") if user else "",
        "last_name": user.get("last_name", "") if user else "",
        "date_of_birth": p.get("date_of_birth"),
        "gender": p.get("gender"),
        "blood_type": p.get("blood_type"),
        "allergies": p.get("allergies", []),
        "chronic_conditions": p.get("chronic_conditions", []),
        "preferred_language": p.get("preferred_language", "en"),
        "time_zone": p.get("time_zone", "Asia/Kolkata"),
        "accessibility_preferences": p.get("accessibility_preferences", {}),
        "emergency_notes": p.get("emergency_notes", ""),
        "created_at": p.get("created_at"),
        "updated_at": p.get("updated_at"),
    }

@router.put("/elderly/{elderly_id}")
async def update_elderly_profile(
    elderly_id: str,
    data: ElderlyProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Only the elderly user themselves or authorized primary caregiver can modify profile
    elderly_oid = await PermissionService.verify_access(
        db, current_user, elderly_id, required_permission=None, action_name="UPDATE_ELDERLY_PROFILE"
    )

    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if "accessibility_preferences" in update_dict and update_dict["accessibility_preferences"]:
        update_dict["accessibility_preferences"] = data.accessibility_preferences.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)

    await db[collections.ELDERLY_PROFILES_COLLECTION].update_one(
        {"user_id": elderly_oid},
        {"$set": update_dict},
        upsert=True
    )
    return {"message": "Elderly healthcare profile updated successfully"}
