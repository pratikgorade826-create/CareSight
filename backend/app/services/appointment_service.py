from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentNoteCreate
from app.services.permission_service import PermissionService

class AppointmentService:
    @staticmethod
    async def create_appointment(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        data: AppointmentCreate
    ) -> dict:
        user_role = current_user.get("role")
        current_user_id = str(current_user["_id"])
        elderly_id_str = data.elderly_user_id or current_user_id

        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_manage_appointments" if user_role != "elderly" else None,
            action_name="CREATE_APPOINTMENT"
        )

        apt_doc = {
            "elderly_user_id": elderly_oid,
            "doctor_name": data.doctor_name.strip(),
            "specialty": data.specialty.strip() if data.specialty else "General Medicine",
            "hospital_clinic": data.hospital_clinic.strip(),
            "appointment_date": data.appointment_date,
            "appointment_time": data.appointment_time,
            "reason": data.reason,
            "location": data.location,
            "status": data.status,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = await db[collections.APPOINTMENTS_COLLECTION].insert_one(apt_doc)
        apt_doc["_id"] = res.inserted_id
        apt_doc["id"] = str(res.inserted_id)
        apt_doc["elderly_user_id"] = str(elderly_oid)

        await PermissionService.log_audit_event(
            db, current_user_id, str(elderly_oid), "APPOINTMENT_CREATED",
            "appointments", str(res.inserted_id), {"doctor_name": data.doctor_name}
        )
        return apt_doc

    @staticmethod
    async def list_appointments(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str,
        status_filter: Optional[str] = None
    ) -> List[dict]:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_appointments" if current_user.get("role") != "elderly" else None,
            action_name="LIST_APPOINTMENTS"
        )
        query = {"elderly_user_id": elderly_oid}
        if status_filter:
            query["status"] = status_filter

        cursor = db[collections.APPOINTMENTS_COLLECTION].find(query).sort([
            ("appointment_date", 1),
            ("appointment_time", 1)
        ])
        results = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["elderly_user_id"] = str(doc["elderly_user_id"])
            results.append(doc)
        return results

    @staticmethod
    async def add_appointment_note(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        appointment_id_str: str,
        note_data: AppointmentNoteCreate
    ) -> dict:
        if not ObjectId.is_valid(appointment_id_str):
            raise HTTPException(status_code=400, detail="Invalid appointment ID")
        apt_oid = ObjectId(appointment_id_str)

        apt = await db[collections.APPOINTMENTS_COLLECTION].find_one({"_id": apt_oid})
        if not apt:
            raise HTTPException(status_code=404, detail="Appointment not found")

        elderly_oid = apt["elderly_user_id"]
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")

        await PermissionService.verify_access(
            db, current_user, str(elderly_oid),
            required_permission="can_manage_appointments" if user_role != "elderly" else None,
            action_name="ADD_APPOINTMENT_NOTE"
        )

        author_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        note_doc = {
            "appointment_id": apt_oid,
            "elderly_user_id": elderly_oid,
            "author_user_id": ObjectId(current_user_id),
            "author_name": author_name,
            "notes": note_data.notes.strip(),
            "action_items": note_data.action_items,
            "prescribed_changes": note_data.prescribed_changes,
            "created_at": datetime.now(timezone.utc),
        }
        res = await db[collections.APPOINTMENT_NOTES_COLLECTION].insert_one(note_doc)
        note_doc["_id"] = res.inserted_id
        note_doc["id"] = str(res.inserted_id)
        note_doc["appointment_id"] = str(apt_oid)
        note_doc["elderly_user_id"] = str(elderly_oid)
        note_doc["author_user_id"] = current_user_id

        return note_doc
