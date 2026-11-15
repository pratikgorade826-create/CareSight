import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.config.settings import settings
from app.database import collections

logger = logging.getLogger("caresight.notifications")

class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncIOMotorDatabase,
        recipient_user_id: ObjectId,
        elderly_user_id: ObjectId,
        notification_type: str,
        title: str,
        message: str,
        priority: str = "normal",  # low, normal, high, emergency
        metadata: Optional[Dict[str, Any]] = None,
        channels: Optional[List[str]] = None,
    ) -> dict:
        """Stores in-app notification and optionally dispatches via email."""
        delivered_channels = channels or ["in_app"]
        notif_doc = {
            "recipient_user_id": recipient_user_id,
            "elderly_user_id": elderly_user_id,
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
            "is_read": False,
            "delivered_channels": delivered_channels,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }
        res = await db[collections.NOTIFICATIONS_COLLECTION].insert_one(notif_doc)
        notif_doc["_id"] = res.inserted_id
        notif_doc["id"] = str(res.inserted_id)

        # Dispatch email if requested and credentials configured
        if "email" in delivered_channels:
            user = await db[collections.USERS_COLLECTION].find_one({"_id": recipient_user_id})
            if user and user.get("email"):
                NotificationService.send_email(
                    to_email=user["email"],
                    subject=f"[CareSight Alert] {title}",
                    body_html=f"""
                    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                        <h2 style="color: #0f766e;">CareSight Notification</h2>
                        <h3 style="margin-top: 10px;">{title}</h3>
                        <p style="font-size: 16px; line-height: 1.5;">{message}</p>
                        <p style="margin-top: 25px; font-size: 13px; color: #64748b;">
                            Priority: <strong>{priority.upper()}</strong> | Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
                        </p>
                    </div>
                    """
                )
        return notif_doc

    @staticmethod
    def send_email(to_email: str, subject: str, body_html: str) -> bool:
        """Dispatches an email via SMTP (or logs in dev environment)."""
        if not settings.EMAIL_PASSWORD:
            logger.info(f"[DEV NOTIFICATION] Simulated email to {to_email} | Subject: {subject}")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email
            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
            logger.info(f"Dispatched email alert to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise
