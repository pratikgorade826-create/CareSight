from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.care_circle import InviteMemberRequest, AcceptInviteRequest, PermissionUpdateRequest
from app.services.care_circle_service import CareCircleService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/care-circle", tags=["Care Circle"])

@router.get("")
async def get_care_circle(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await CareCircleService.get_care_circle_details(db, current_user, elderly_id)

@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    request: InviteMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await CareCircleService.invite_member(db, current_user, request)

@router.post("/accept-invite")
async def accept_invitation(
    request: AcceptInviteRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await CareCircleService.accept_invitation(db, current_user, request.invitation_code)

@router.put("/permissions")
async def update_member_permissions(
    request: PermissionUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await CareCircleService.update_permissions(db, current_user, request)

@router.delete("/members/{id}")
async def remove_circle_member(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.get("role") != "elderly":
        raise HTTPException(
            status_code=403,
            detail="Only the elderly profile owner can revoke Care Circle memberships."
        )

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid member record ID")
    member_oid = ObjectId(id)

    member_doc = await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].find_one({"_id": member_oid})
    if not member_doc:
        raise HTTPException(status_code=404, detail="Member record not found")

    elderly_oid = current_user["_id"]
    await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].update_one(
        {"_id": member_oid},
        {"$set": {"status": "revoked"}}
    )
    # Revoke all permissions
    await db[collections.PERMISSIONS_COLLECTION].delete_one({
        "elderly_user_id": elderly_oid,
        "member_user_id": member_doc["user_id"]
    })

    await PermissionService.log_audit_event(
        db, str(elderly_oid), str(elderly_oid), "MEMBER_REVOKED",
        "care_circle_members", id, {"member_user_id": str(member_doc["user_id"])}
    )

    return {"message": "Care Circle member access has been successfully revoked."}
