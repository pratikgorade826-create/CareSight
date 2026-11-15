from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentNoteCreate
from app.services.appointment_service import AppointmentService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.get("")
async def get_appointments(
    elderly_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_oid = await PermissionService.resolve_target_elderly_id(db, current_user, elderly_id)
    if not target_oid:
        return []
    return await AppointmentService.list_appointments(db, current_user, str(target_oid), status)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await AppointmentService.create_appointment(db, current_user, data)

@router.get("/{id}")
async def get_appointment_detail(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    apt_oid = ObjectId(id)
    apt = await db[collections.APPOINTMENTS_COLLECTION].find_one({"_id": apt_oid})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    await PermissionService.verify_access(
        db, current_user, str(apt["elderly_user_id"]),
        required_permission="can_view_appointments" if current_user.get("role") != "elderly" else None,
        action_name="GET_APPOINTMENT"
    )

    apt["id"] = str(apt["_id"])
    apt["elderly_user_id"] = str(apt["elderly_user_id"])

    # Fetch attached notes
    notes_cursor = db[collections.APPOINTMENT_NOTES_COLLECTION].find({"appointment_id": apt_oid}).sort("created_at", -1)
    notes = []
    async for n in notes_cursor:
        n["id"] = str(n["_id"])
        n["appointment_id"] = str(n["appointment_id"])
        n["elderly_user_id"] = str(n["elderly_user_id"])
        n["author_user_id"] = str(n["author_user_id"])
        notes.append(n)
    apt["notes"] = notes

    return apt

@router.put("/{id}")
async def update_appointment(
    id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    apt_oid = ObjectId(id)
    apt = await db[collections.APPOINTMENTS_COLLECTION].find_one({"_id": apt_oid})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    await PermissionService.verify_access(
        db, current_user, str(apt["elderly_user_id"]),
        required_permission="can_manage_appointments" if current_user.get("role") != "elderly" else None,
        action_name="UPDATE_APPOINTMENT"
    )

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db[collections.APPOINTMENTS_COLLECTION].update_one({"_id": apt_oid}, {"$set": updates})

    return {"message": "Appointment updated successfully"}

@router.delete("/{id}")
async def delete_appointment(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    apt_oid = ObjectId(id)
    apt = await db[collections.APPOINTMENTS_COLLECTION].find_one({"_id": apt_oid})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    await PermissionService.verify_access(
        db, current_user, str(apt["elderly_user_id"]),
        required_permission="can_manage_appointments" if current_user.get("role") != "elderly" else None,
        action_name="DELETE_APPOINTMENT"
    )

    await db[collections.APPOINTMENTS_COLLECTION].delete_one({"_id": apt_oid})
    return {"message": "Appointment deleted successfully"}

@router.post("/{id}/notes", status_code=status.HTTP_201_CREATED)
async def add_note_to_appointment(
    id: str,
    note_data: AppointmentNoteCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await AppointmentService.add_appointment_note(db, current_user, id, note_data)
