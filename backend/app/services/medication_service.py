from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationConfirmRequest
from app.services.permission_service import PermissionService

class MedicationService:
    @staticmethod
    async def create_medication(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        data: MedicationCreate
    ) -> dict:
        user_role = current_user.get("role")
        current_user_id = str(current_user["_id"])

        elderly_id_str = data.elderly_user_id or current_user_id
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_modify_medications" if user_role != "elderly" else None,
            action_name="CREATE_MEDICATION"
        )

        med_doc = {
            "elderly_user_id": elderly_oid,
            "medicine_name": data.medicine_name.strip(),
            "dosage": data.dosage.strip(),
            "frequency": data.frequency,
            "scheduled_times": data.scheduled_times,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "prescribing_doctor": data.prescribing_doctor,
            "instructions": data.instructions,
            "refill_quantity": data.refill_quantity,
            "remaining_quantity": data.remaining_quantity,
            "status": data.status,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = await db[collections.MEDICATIONS_COLLECTION].insert_one(med_doc)
        med_id = res.inserted_id
        med_doc["_id"] = med_id
        med_doc["id"] = str(med_id)

        # Generate schedule occurrences for today
        today_str = date.today().isoformat()
        for sched_time in data.scheduled_times:
            sched_doc = {
                "medication_id": med_id,
                "elderly_user_id": elderly_oid,
                "medicine_name": med_doc["medicine_name"],
                "dosage": med_doc["dosage"],
                "instructions": med_doc["instructions"],
                "scheduled_date": today_str,
                "scheduled_time": sched_time,
                "status": "pending",
                "escalation_stage": 0,
                "created_at": datetime.now(timezone.utc),
            }
            await db[collections.MEDICATION_SCHEDULES_COLLECTION].insert_one(sched_doc)

        await PermissionService.log_audit_event(
            db, current_user_id, str(elderly_oid), "MEDICATION_CREATED",
            "medications", str(med_id), {"medicine_name": data.medicine_name}
        )

        med_doc["elderly_user_id"] = str(elderly_oid)
        return med_doc

    @staticmethod
    async def list_medications(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str,
        status_filter: Optional[str] = None
    ) -> List[dict]:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_medications" if current_user.get("role") != "elderly" else None,
            action_name="LIST_MEDICATIONS"
        )
        query = {"elderly_user_id": elderly_oid}
        if status_filter:
            query["status"] = status_filter

        cursor = db[collections.MEDICATIONS_COLLECTION].find(query).sort("created_at", -1)
        medications = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["elderly_user_id"] = str(doc["elderly_user_id"])
            medications.append(doc)
        return medications

    @staticmethod
    async def confirm_intake(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        medication_id_str: str,
        confirm_data: MedicationConfirmRequest
    ) -> dict:
        if not ObjectId.is_valid(medication_id_str):
            raise HTTPException(status_code=400, detail="Invalid medication ID")
        med_oid = ObjectId(medication_id_str)

        med = await db[collections.MEDICATIONS_COLLECTION].find_one({"_id": med_oid})
        if not med:
            raise HTTPException(status_code=404, detail="Medication not found")

        elderly_oid = med["elderly_user_id"]
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")

        await PermissionService.verify_access(
            db, current_user, str(elderly_oid),
            required_permission="can_confirm_medications" if user_role != "elderly" else None,
            action_name="CONFIRM_MEDICATION"
        )

        now = datetime.now(timezone.utc)
        today_str = date.today().isoformat()

        # Update remaining quantity if taken
        if confirm_data.status == "taken" and med.get("remaining_quantity", 0) > 0:
            await db[collections.MEDICATIONS_COLLECTION].update_one(
                {"_id": med_oid},
                {"$inc": {"remaining_quantity": -1}, "$set": {"updated_at": now}}
            )

        # Record medication event in MongoDB
        event_doc = {
            "medication_id": med_oid,
            "schedule_id": ObjectId(confirm_data.schedule_id) if confirm_data.schedule_id and ObjectId.is_valid(confirm_data.schedule_id) else None,
            "elderly_user_id": elderly_oid,
            "confirmed_by_user_id": ObjectId(current_user_id),
            "status": confirm_data.status,
            "notes": confirm_data.notes,
            "dose_time": confirm_data.dose_time or now.strftime("%H:%M"),
            "confirmed_at": now,
        }
        event_res = await db[collections.MEDICATION_EVENTS_COLLECTION].insert_one(event_doc)

        # Update schedule if available
        if confirm_data.schedule_id and ObjectId.is_valid(confirm_data.schedule_id):
            await db[collections.MEDICATION_SCHEDULES_COLLECTION].update_one(
                {"_id": ObjectId(confirm_data.schedule_id)},
                {"$set": {"status": confirm_data.status, "confirmed_at": now}}
            )
        else:
            # Update earliest pending schedule today for this medication
            await db[collections.MEDICATION_SCHEDULES_COLLECTION].update_one(
                {"medication_id": med_oid, "scheduled_date": today_str, "status": "pending"},
                {"$set": {"status": confirm_data.status, "confirmed_at": now}}
            )

        await PermissionService.log_audit_event(
            db, current_user_id, str(elderly_oid), "MEDICATION_CONFIRMED",
            "medication_events", str(event_res.inserted_id),
            {"medicine_name": med["medicine_name"], "status": confirm_data.status}
        )

        return {
            "message": f"Medication '{med['medicine_name']}' confirmed as {confirm_data.status}.",
            "event_id": str(event_res.inserted_id),
            "status": confirm_data.status,
            "confirmed_at": now.isoformat(),
        }

    @staticmethod
    async def get_today_schedules(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str
    ) -> List[dict]:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_medications" if current_user.get("role") != "elderly" else None,
            action_name="GET_TODAY_SCHEDULES"
        )
        today_str = date.today().isoformat()

        cursor = db[collections.MEDICATION_SCHEDULES_COLLECTION].find({
            "elderly_user_id": elderly_oid,
            "scheduled_date": today_str,
        }).sort("scheduled_time", 1)

        schedules = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["medication_id"] = str(doc["medication_id"])
            doc["elderly_user_id"] = str(doc["elderly_user_id"])
            schedules.append(doc)
        return schedules
