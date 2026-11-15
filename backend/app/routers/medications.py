from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationConfirmRequest
from app.services.medication_service import MedicationService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/medications", tags=["Medications"])

@router.get("")
async def get_medications(
    elderly_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return []
    return await MedicationService.list_medications(db, current_user, str(target_oid), status)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_medication(
    data: MedicationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await MedicationService.create_medication(db, current_user, data)

@router.get("/schedules/today")
async def get_today_schedules(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return []
    return await MedicationService.get_today_schedules(db, current_user, str(target_oid))

@router.get("/{id}")
async def get_medication_detail(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid medication ID")
    med = await db[collections.MEDICATIONS_COLLECTION].find_one({"_id": ObjectId(id)})
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    await PermissionService.verify_access(
        db, current_user, str(med["elderly_user_id"]),
        required_permission="can_view_medications" if current_user.get("role") != "elderly" else None,
        action_name="GET_MEDICATION"
    )

    med["id"] = str(med["_id"])
    med["elderly_user_id"] = str(med["elderly_user_id"])
    return med

@router.put("/{id}")
async def update_medication(
    id: str,
    data: MedicationUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid medication ID")
    med_oid = ObjectId(id)
    med = await db[collections.MEDICATIONS_COLLECTION].find_one({"_id": med_oid})
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    await PermissionService.verify_access(
        db, current_user, str(med["elderly_user_id"]),
        required_permission="can_modify_medications" if current_user.get("role") != "elderly" else None,
        action_name="UPDATE_MEDICATION"
    )

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db[collections.MEDICATIONS_COLLECTION].update_one({"_id": med_oid}, {"$set": updates})

    return {"message": "Medication updated successfully"}

@router.delete("/{id}")
async def delete_medication(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid medication ID")
    med_oid = ObjectId(id)
    med = await db[collections.MEDICATIONS_COLLECTION].find_one({"_id": med_oid})
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    await PermissionService.verify_access(
        db, current_user, str(med["elderly_user_id"]),
        required_permission="can_modify_medications" if current_user.get("role") != "elderly" else None,
        action_name="DELETE_MEDICATION"
    )

    await db[collections.MEDICATIONS_COLLECTION].delete_one({"_id": med_oid})
    await db[collections.MEDICATION_SCHEDULES_COLLECTION].delete_many({"medication_id": med_oid, "status": "pending"})

    return {"message": "Medication removed successfully"}

@router.post("/{id}/confirm")
async def confirm_medication_intake(
    id: str,
    confirm_data: MedicationConfirmRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await MedicationService.confirm_intake(db, current_user, id, confirm_data)
