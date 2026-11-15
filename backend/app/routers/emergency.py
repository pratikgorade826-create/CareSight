from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.emergency import SOSTriggerRequest, EmergencyContactCreate
from app.services.emergency_service import EmergencyService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/emergency", tags=["Emergency SOS"])

@router.post("/sos", status_code=status.HTTP_201_CREATED)
async def trigger_emergency_sos(
    request: SOSTriggerRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await EmergencyService.trigger_sos(db, current_user, request)

@router.get("/contacts")
async def get_emergency_contacts(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_id = elderly_id or str(current_user["_id"])
    return await EmergencyService.list_emergency_contacts(db, current_user, target_id)

@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def add_emergency_contact(
    data: EmergencyContactCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await EmergencyService.add_emergency_contact(db, current_user, data)

@router.delete("/contacts/{id}")
async def delete_emergency_contact(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid contact ID")
    contact_oid = ObjectId(id)

    contact = await db[collections.EMERGENCY_CONTACTS_COLLECTION].find_one({"_id": contact_oid})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    elderly_oid = contact["elderly_user_id"]
    await PermissionService.verify_access(
        db, current_user, str(elderly_oid), required_permission=None, action_name="DELETE_EMERGENCY_CONTACT"
    )

    await db[collections.EMERGENCY_CONTACTS_COLLECTION].delete_one({"_id": contact_oid})
    return {"message": "Emergency contact deleted"}

@router.get("/card")
async def get_emergency_health_card(
    elderly_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_id = elderly_id or str(current_user["_id"])
    return await EmergencyService.get_emergency_health_card(db, current_user, target_id)
