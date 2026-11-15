import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.schemas.emergency import EmergencyContactCreate, SOSTriggerRequest, LocationPayload
from app.services.permission_service import PermissionService
from app.services.notification_service import NotificationService

logger = logging.getLogger("caresight.emergency")

class EmergencyService:
    @staticmethod
    async def add_emergency_contact(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        data: EmergencyContactCreate
    ) -> dict:
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")
        elderly_id_str = data.elderly_user_id or current_user_id

        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_manage_appointments" if user_role != "elderly" else None,
            action_name="ADD_EMERGENCY_CONTACT"
        )

        contact_doc = {
            "elderly_user_id": elderly_oid,
            "name": data.name.strip(),
            "relationship": data.relationship.strip(),
            "phone_number": data.phone_number.strip(),
            "priority_order": data.priority_order,
            "is_notified_on_sos": data.is_notified_on_sos,
            "created_at": datetime.now(timezone.utc),
        }
        res = await db[collections.EMERGENCY_CONTACTS_COLLECTION].insert_one(contact_doc)
        contact_doc["_id"] = res.inserted_id
        contact_doc["id"] = str(res.inserted_id)
        contact_doc["elderly_user_id"] = str(elderly_oid)

        return contact_doc

    @staticmethod
    async def list_emergency_contacts(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str
    ) -> List[dict]:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission=None,  # All authorized circle members can view emergency contacts
            action_name="LIST_EMERGENCY_CONTACTS"
        )
        cursor = db[collections.EMERGENCY_CONTACTS_COLLECTION].find({
            "elderly_user_id": elderly_oid
        }).sort("priority_order", 1)

        contacts = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["elderly_user_id"] = str(doc["elderly_user_id"])
            contacts.append(doc)
        return contacts

    @staticmethod
    async def trigger_sos(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        request: SOSTriggerRequest
    ) -> dict:
        """Dispatches immediate high-priority emergency broadcast and records emergency event."""
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")
        elderly_id_str = request.elderly_user_id or current_user_id

        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission=None,
            action_name="TRIGGER_SOS"
        )

        elderly_user = await db[collections.USERS_COLLECTION].find_one({"_id": elderly_oid})
        elderly_name = f"{elderly_user.get('first_name', 'Elderly User')} {elderly_user.get('last_name', '')}".strip() if elderly_user else "Elderly User"

        now = datetime.now(timezone.utc)
        event_doc = {
            "elderly_user_id": elderly_oid,
            "triggered_by_user_id": ObjectId(current_user_id),
            "triggered_by_name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
            "location": request.location.model_dump() if request.location else None,
            "status": "active",
            "notes": request.notes or "Urgent Emergency SOS Triggered!",
            "triggered_at": now,
        }
        res = await db[collections.EMERGENCY_EVENTS_COLLECTION].insert_one(event_doc)
        event_id = str(res.inserted_id)

        # Notify all circle members with can_receive_alerts: true
        perm_cursor = db[collections.PERMISSIONS_COLLECTION].find({
            "elderly_user_id": elderly_oid,
            "can_receive_alerts": True
        })
        notified_recipients = []
        async for perm in perm_cursor:
            member_user_id = perm["member_user_id"]
            await NotificationService.create_notification(
                db=db,
                recipient_user_id=member_user_id,
                elderly_user_id=elderly_oid,
                notification_type="emergency_alert",
                title=f"🚨 EMERGENCY SOS: {elderly_name}",
                message=f"EMERGENCY ALERT: {elderly_name} has triggered an SOS alert. Notes: {request.notes or 'Immediate assistance requested'}.",
                priority="emergency",
                metadata={"emergency_event_id": event_id, "location": request.location.model_dump() if request.location else None},
                channels=["in_app", "email"]
            )
            notified_recipients.append(str(member_user_id))

        await PermissionService.log_audit_event(
            db, current_user_id, str(elderly_oid), "EMERGENCY_SOS_TRIGGERED",
            "emergency_events", event_id, {"notes": request.notes}
        )

        logger.critical(f"EMERGENCY SOS TRIGGERED for elderly {elderly_oid} by {current_user_id}. Alerted {len(notified_recipients)} members.")

        return {
            "status": "active",
            "event_id": event_id,
            "elderly_name": elderly_name,
            "notified_members_count": len(notified_recipients),
            "message": "Emergency SOS successfully broadcast to all authorized circle caregivers and family.",
            "triggered_at": now.isoformat(),
        }

    @staticmethod
    async def get_emergency_health_card(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str
    ) -> dict:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission=None,
            action_name="GET_EMERGENCY_HEALTH_CARD"
        )
        user = await db[collections.USERS_COLLECTION].find_one({"_id": elderly_oid})
        profile = await db[collections.ELDERLY_PROFILES_COLLECTION].find_one({"user_id": elderly_oid})
        contacts = await EmergencyService.list_emergency_contacts(db, current_user, elderly_id_str)

        elderly_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() if user else "Senior Patient"

        return {
            "elderly_name": elderly_name,
            "date_of_birth": profile.get("date_of_birth") if profile else None,
            "blood_type": profile.get("blood_type", "Unknown") if profile else "Unknown",
            "allergies": profile.get("allergies", []) if profile else [],
            "chronic_conditions": profile.get("chronic_conditions", []) if profile else [],
            "primary_contacts": contacts,
            "emergency_notes": profile.get("emergency_notes", "Handle with gentle care.") if profile else "",
            "disclaimer": "This health card is generated by CareSight for coordination. In life-threatening emergencies, dial 112 / 911 immediately."
        }
