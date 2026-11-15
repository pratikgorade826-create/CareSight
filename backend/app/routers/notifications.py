from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
async def list_my_notifications(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    current_user_oid = current_user["_id"]
    cursor = db[collections.NOTIFICATIONS_COLLECTION].find({
        "recipient_user_id": current_user_oid
    }).sort("created_at", -1).limit(50)

    notifs = []
    unread_count = 0
    async for n in cursor:
        is_read = n.get("is_read", False)
        if not is_read:
            unread_count += 1
        notifs.append({
            "id": str(n["_id"]),
            "recipient_user_id": str(n["recipient_user_id"]),
            "elderly_user_id": str(n.get("elderly_user_id", "")),
            "notification_type": n.get("notification_type"),
            "title": n.get("title"),
            "message": n.get("message"),
            "priority": n.get("priority", "normal"),
            "is_read": is_read,
            "metadata": n.get("metadata", {}),
            "created_at": n.get("created_at")
        })

    return {
        "unread_count": unread_count,
        "notifications": notifs
    }

@router.put("/{id}/read")
async def mark_notification_read(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    notif_oid = ObjectId(id)

    await db[collections.NOTIFICATIONS_COLLECTION].update_one(
        {"_id": notif_oid, "recipient_user_id": current_user["_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Notification marked as read"}

@router.put("/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await db[collections.NOTIFICATIONS_COLLECTION].update_many(
        {"recipient_user_id": current_user["_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"message": "All notifications marked as read"}

from pydantic import BaseModel, EmailStr
from typing import Optional
from app.services.notification_service import NotificationService
from app.config.settings import settings

class TestEmailRequest(BaseModel):
    to_email: EmailStr
    subject: Optional[str] = "CareSight Notification Test"
    message: Optional[str] = "This is a test notification from the CareSight platform."

@router.post("/test-email")
async def send_test_email(
    request: TestEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sends a real or simulated email to verify SMTP configuration."""
    body_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; color: white; padding: 14px 20px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px;">CareSight Alert</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Your Health. Your Choices. Your Circle of Care.</p>
        </div>
        <h3 style="color: #0f172a; margin-top: 0;">{request.subject}</h3>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">{request.message}</p>
        <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            Triggered by: <strong>{current_user.get('first_name', '')} {current_user.get('last_name', '')}</strong> ({current_user.get('role', 'user')})
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">CareSight Elderly Care & Family Coordination Platform • SMTP Service</p>
    </div>
    """
    try:
        sent = NotificationService.send_email(
            to_email=request.to_email,
            subject=f"[CareSight] {request.subject}",
            body_html=body_html
        )
        return {
            "status": "success",
            "delivered": sent,
            "mode": "real_smtp" if sent else "simulated_dev_mode",
            "message": f"Email successfully sent to {request.to_email}" if sent else f"Email simulated in development mode to {request.to_email} (Configure EMAIL_PASSWORD in .env for real SMTP delivery)."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dispatch email via SMTP: {str(e)}"
        )

