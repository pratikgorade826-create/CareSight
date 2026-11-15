from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import collections

class PermissionService:
    @staticmethod
    async def log_audit_event(
        db: AsyncIOMotorDatabase,
        actor_user_id: str,
        elderly_user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ):
        """Records an immutable security audit entry."""
        audit_doc = {
            "actor_user_id": ObjectId(actor_user_id),
            "elderly_user_id": ObjectId(elderly_user_id) if ObjectId.is_valid(elderly_user_id) else None,
            "action": action,
            "resource_type": resource_type,
            "resource_id": ObjectId(resource_id) if resource_id and ObjectId.is_valid(resource_id) else resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc),
        }
        await db[collections.AUDIT_LOGS_COLLECTION].insert_one(audit_doc)

    @classmethod
    async def resolve_target_elderly_id(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: Optional[str] = None
    ) -> Optional[ObjectId]:
        """Resolves the authoritative elderly target for the current user."""
        user_role = current_user.get("role")
        current_user_oid = current_user["_id"]

        if user_role == "elderly":
            return current_user_oid

        if elderly_id_str and ObjectId.is_valid(elderly_id_str):
            return ObjectId(elderly_id_str)

        # Look up active membership
        membership = await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find_one({
            "user_id": current_user_oid,
            "status": "active"
        })
        if membership:
            circle = await db[collections.CARE_CIRCLES_COLLECTION].find_one({"_id": membership["care_circle_id"]})
            if circle:
                return circle["elderly_user_id"]

        return None

    @classmethod
    async def verify_access(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        target_elderly_id_str: str,
        required_permission: Optional[str] = None,
        action_name: str = "ACCESS"
    ) -> ObjectId:
        """
        Enforces server-side authorization:
        - Elderly user has full authority over their own data.
        - Cross-elderly access is strictly denied.
        - Family and Caregivers must be active circle members with the required permission flag.
        """
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")

        if not target_elderly_id_str or not ObjectId.is_valid(target_elderly_id_str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target elderly user ID"
            )
        target_elderly_oid = ObjectId(target_elderly_id_str)

        # 1. Primary Owner Check
        if user_role == "elderly":
            if current_user_id != target_elderly_id_str:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You cannot view or modify health records of another elderly user."
                )
            return target_elderly_oid

        # 2. Family & Caregiver Check
        circle = await db[collections.CARE_CIRCLES_COLLECTION].find_one({"elderly_user_id": target_elderly_oid})
        if not circle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No care circle found for this elderly user"
            )

        # Verify membership
        membership = await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find_one({
            "care_circle_id": circle["_id"],
            "user_id": ObjectId(current_user_id),
            "status": "active"
        })
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not an active member of this elderly user's Care Circle."
            )

        # Check granular permissions
        if required_permission:
            perm_doc = await db[collections.PERMISSIONS_COLLECTION].find_one({
                "elderly_user_id": target_elderly_oid,
                "member_user_id": ObjectId(current_user_id)
            })
            if not perm_doc or not perm_doc.get(required_permission, False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: The elderly user has not granted '{required_permission}' permission to your account."
                )

        return target_elderly_oid
