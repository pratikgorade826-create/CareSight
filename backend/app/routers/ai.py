from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.schemas.ai import AIChatRequest, AIAppointmentPrepRequest, AIDailySummaryRequest
from app.services.ai_service import AIService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/ai", tags=["AI Care Companion"])

@router.post("/chat")
async def chat_with_care_companion(
    request: AIChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await AIService.chat(
        db=db,
        current_user=current_user,
        message=request.message,
        conversation_id=request.conversation_id,
        elderly_id_str=request.elderly_user_id,
        language=request.language
    )

@router.post("/appointment-preparation")
async def prepare_doctor_appointment(
    request: AIAppointmentPrepRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await AIService.prepare_appointment(
        db=db,
        current_user=current_user,
        appointment_id_str=request.appointment_id,
        patient_concerns=request.patient_concerns,
        language=request.language
    )

@router.get("/conversations")
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db[collections.CHAT_CONVERSATIONS_COLLECTION].find({
        "user_id": current_user["_id"]
    }).sort("updated_at", -1).limit(20)

    convs = []
    async for c in cursor:
        convs.append({
            "id": str(c["_id"]),
            "title": c.get("title", "Care Conversation"),
            "language": c.get("language", "en"),
            "updated_at": c.get("updated_at")
        })
    return convs

@router.get("/conversations/{id}/messages")
async def get_conversation_messages(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    conv_oid = ObjectId(id)

    conv = await db[collections.CHAT_CONVERSATIONS_COLLECTION].find_one({"_id": conv_oid})
    if not conv or str(conv["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized")

    cursor = db[collections.CHAT_MESSAGES_COLLECTION].find({
        "conversation_id": conv_oid
    }).sort("created_at", 1)

    messages = []
    async for m in cursor:
        messages.append({
            "id": str(m["_id"]),
            "role": m["role"],
            "content": m["content"],
            "retrieved_facts": m.get("retrieved_context_summary", []),
            "created_at": m.get("created_at")
        })
    return messages
