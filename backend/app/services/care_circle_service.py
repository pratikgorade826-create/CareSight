import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.schemas.care_circle import InviteMemberRequest, PermissionSettings, PermissionUpdateRequest
from app.services.permission_service import PermissionService
from app.services.notification_service import NotificationService

class CareCircleService:
    @staticmethod
    async def get_or_create_circle(db: AsyncIOMotorDatabase, elderly_user: dict) -> dict:
        elderly_oid = elderly_user["_id"]
        circle = await db[collections.CARE_CIRCLES_COLLECTION].find_one({"elderly_user_id": elderly_oid})
        if not circle:
            elderly_name = f"{elderly_user.get('first_name', '')} {elderly_user.get('last_name', '')}".strip()
            circle_doc = {
                "elderly_user_id": elderly_oid,
                "circle_name": f"{elderly_name}'s Circle of Care",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            res = await db[collections.CARE_CIRCLES_COLLECTION].insert_one(circle_doc)
            circle_doc["_id"] = res.inserted_id
            circle = circle_doc
        return circle

    @classmethod
    async def get_care_circle_details(
        cls, db: AsyncIOMotorDatabase, current_user: dict, elderly_id_str: Optional[str] = None
    ) -> dict:
        user_role = current_user.get("role")
        current_user_id = str(current_user["_id"])

        if user_role == "elderly":
            elderly_oid = current_user["_id"]
        else:
            if not elderly_id_str:
                # Find circle where current user is a member
                membership = await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find_one({
                    "user_id": ObjectId(current_user_id),
                    "status": "active"
                })
                if not membership:
                    raise HTTPException(status_code=404, detail="You are not a member of any care circle yet.")
                circle = await db[collections.CARE_CIRCLES_COLLECTION].find_one({"_id": membership["care_circle_id"]})
                elderly_oid = circle["elderly_user_id"]
            else:
                elderly_oid = await PermissionService.verify_access(
                    db, current_user, elderly_id_str, required_permission=None, action_name="GET_CARE_CIRCLE"
                )

        elderly_user = await db[collections.USERS_COLLECTION].find_one({"_id": elderly_oid})
        circle = await cls.get_or_create_circle(db, elderly_user)
        circle_id = circle["_id"]

        # Fetch active members
        members_cursor = db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find({
            "care_circle_id": circle_id,
            "status": "active"
        })
        members = []
        async for m in members_cursor:
            u = await db[collections.USERS_COLLECTION].find_one({"_id": m["user_id"]})
            perm = await db[collections.PERMISSIONS_COLLECTION].find_one({
                "elderly_user_id": elderly_oid,
                "member_user_id": m["user_id"]
            })
            perm_settings = PermissionSettings(**(perm or {}))
            members.append({
                "id": str(m["_id"]),
                "user_id": str(m["user_id"]),
                "first_name": u.get("first_name", "") if u else "User",
                "last_name": u.get("last_name", "") if u else "",
                "email": u.get("email", "") if u else "",
                "phone_number": u.get("phone_number") if u else None,
                "role_in_circle": m.get("role_in_circle", "family"),
                "relationship_label": m.get("relationship_label", "Member"),
                "joined_at": m.get("joined_at", datetime.now(timezone.utc)),
                "status": m.get("status", "active"),
                "permissions": perm_settings.model_dump(),
            })

        # Fetch pending invitations
        inv_cursor = db[collections.INVITATIONS_COLLECTION].find({
            "care_circle_id": circle_id,
            "status": "pending"
        })
        invitations = []
        async for inv in inv_cursor:
            invitations.append({
                "id": str(inv["_id"]),
                "care_circle_id": str(inv["care_circle_id"]),
                "elderly_user_id": str(inv["elderly_user_id"]),
                "invited_email": inv["invited_email"],
                "invited_role": inv["invited_role"],
                "relationship_label": inv["relationship_label"],
                "invitation_code": inv["invitation_code"],
                "status": inv["status"],
                "expires_at": inv["expires_at"],
                "created_at": inv["created_at"],
            })

        elderly_name = f"{elderly_user.get('first_name', '')} {elderly_user.get('last_name', '')}".strip()
        return {
            "id": str(circle["_id"]),
            "elderly_user_id": str(elderly_oid),
            "elderly_name": elderly_name,
            "circle_name": circle.get("circle_name", f"{elderly_name}'s Circle"),
            "members": members,
            "pending_invitations": invitations,
            "created_at": circle.get("created_at", datetime.now(timezone.utc)),
        }

    @classmethod
    async def invite_member(
        cls, db: AsyncIOMotorDatabase, current_user: dict, request: InviteMemberRequest
    ) -> dict:
        if current_user.get("role") != "elderly":
            raise HTTPException(
                status_code=403, detail="Only the elderly profile owner can issue care circle invitations."
            )
        elderly_oid = current_user["_id"]
        elderly_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        circle = await cls.get_or_create_circle(db, current_user)

        # Generate secure random code
        invitation_code = f"CARE-{secrets.token_hex(4).upper()}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        inv_doc = {
            "care_circle_id": circle["_id"],
            "elderly_user_id": elderly_oid,
            "invited_email": request.email.lower().strip(),
            "invited_role": request.role,
            "relationship_label": request.relationship_label.strip(),
            "initial_permissions": request.initial_permissions.model_dump() if request.initial_permissions else PermissionSettings().model_dump(),
            "invitation_code": invitation_code,
            "status": "pending",
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }
        res = await db[collections.INVITATIONS_COLLECTION].insert_one(inv_doc)

        await PermissionService.log_audit_event(
            db, str(elderly_oid), str(elderly_oid), "INVITATION_CREATED",
            "invitations", str(res.inserted_id), {"email": request.email, "role": request.role}
        )

        # Notify via email if configured
        NotificationService.send_email(
            to_email=request.email,
            subject=f"CareSight Invitation from {elderly_name}",
            body_html=f"""
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Join {elderly_name}'s Circle of Care on CareSight</h2>
                <p>You have been invited to collaborate as a <strong>{request.role.title()} ({request.relationship_label})</strong>.</p>
                <div style="margin: 20px 0; padding: 15px; background: #f0fdfa; border: 1px solid #0d9488; border-radius: 8px;">
                    <span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #0f766e;">{invitation_code}</span>
                </div>
                <p>Enter this code in your CareSight application to join.</p>
            </div>
            """
        )

        return {
            "id": str(res.inserted_id),
            "care_circle_id": str(circle["_id"]),
            "elderly_user_id": str(elderly_oid),
            "invited_email": request.email,
            "invited_role": request.role,
            "relationship_label": request.relationship_label,
            "invitation_code": invitation_code,
            "status": "pending",
            "expires_at": expires_at,
            "created_at": inv_doc["created_at"],
        }

    @classmethod
    async def accept_invitation(
        cls, db: AsyncIOMotorDatabase, current_user: dict, invitation_code: str
    ) -> dict:
        code = invitation_code.strip().upper()
        now = datetime.now(timezone.utc)

        inv = await db[collections.INVITATIONS_COLLECTION].find_one({
            "invitation_code": code,
            "status": "pending"
        })
        if not inv:
            raise HTTPException(status_code=404, detail="Invitation code not found or already used.")

        # Check expiration
        exp = inv.get("expires_at")
        if isinstance(exp, str):
            try:
                exp = datetime.fromisoformat(exp)
            except Exception:
                exp = None
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < now:
            await db[collections.INVITATIONS_COLLECTION].update_one({"_id": inv["_id"]}, {"$set": {"status": "expired"}})
            raise HTTPException(status_code=400, detail="This invitation code has expired.")

        current_user_oid = current_user["_id"]
        care_circle_id = inv["care_circle_id"]
        elderly_oid = inv["elderly_user_id"]

        # Insert or update circle membership
        await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].update_one(
            {"care_circle_id": care_circle_id, "user_id": current_user_oid},
            {"$set": {
                "role_in_circle": inv["invited_role"],
                "relationship_label": inv["relationship_label"],
                "status": "active",
                "joined_at": now
            }},
            upsert=True
        )

        # Set initial permissions in permissions collection
        initial_perms = inv.get("initial_permissions") or PermissionSettings().model_dump()
        initial_perms["elderly_user_id"] = elderly_oid
        initial_perms["member_user_id"] = current_user_oid
        initial_perms["updated_at"] = now
        await db[collections.PERMISSIONS_COLLECTION].update_one(
            {"elderly_user_id": elderly_oid, "member_user_id": current_user_oid},
            {"$set": initial_perms},
            upsert=True
        )

        # Mark invitation accepted
        await db[collections.INVITATIONS_COLLECTION].update_one(
            {"_id": inv["_id"]},
            {"$set": {"status": "accepted", "accepted_by_user_id": current_user_oid, "accepted_at": now}}
        )

        await PermissionService.log_audit_event(
            db, str(current_user_oid), str(elderly_oid), "INVITATION_ACCEPTED",
            "care_circle_members", str(care_circle_id), {"role": inv["invited_role"]}
        )

        return {"message": "You have successfully joined the Care Circle!"}

    @classmethod
    async def update_permissions(
        cls, db: AsyncIOMotorDatabase, current_user: dict, request: PermissionUpdateRequest
    ) -> dict:
        """Personal Control Center: Only the elderly user can update permissions for circle members."""
        if current_user.get("role") != "elderly":
            raise HTTPException(
                status_code=403,
                detail="Access denied: Only the elderly user has authority over personal consent and member permissions."
            )

        elderly_oid = current_user["_id"]
        if not ObjectId.is_valid(request.member_user_id):
            raise HTTPException(status_code=400, detail="Invalid member user ID")
        member_oid = ObjectId(request.member_user_id)

        update_fields = request.model_dump(exclude={"member_user_id"})
        update_fields["updated_at"] = datetime.now(timezone.utc)

        await db[collections.PERMISSIONS_COLLECTION].update_one(
            {"elderly_user_id": elderly_oid, "member_user_id": member_oid},
            {"$set": update_fields},
            upsert=True
        )

        await PermissionService.log_audit_event(
            db, str(elderly_oid), str(elderly_oid), "PERMISSION_UPDATED",
            "permissions", str(member_oid), update_fields
        )

        return {"message": "Member permissions updated successfully in your Personal Control Center."}
