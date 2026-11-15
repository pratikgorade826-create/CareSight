import logging
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.services.notification_service import NotificationService

logger = logging.getLogger("caresight.escalation")

class EscalationService:
    @staticmethod
    async def process_escalation_cycle(db: AsyncIOMotorDatabase) -> dict:
        """
        Evaluates pending medication schedules for today and executes the multi-tier escalation:
        - 15 mins overdue: Stage 1 (Initial Reminder to Elderly User)
        - 30 mins overdue: Stage 2 (Follow-up Reminder to Elderly User)
        - 60 mins overdue: Stage 3 (Caregiver Escalation to Authorized Circle Members)
        Guaranteed idempotent; prevents duplicate alerts.
        """
        now = datetime.now(timezone.utc)
        today_str = date.today().isoformat()
        current_time_str = now.strftime("%H:%M")

        processed_count = 0
        reminders_sent = 0
        followups_sent = 0
        escalations_sent = 0

        # Query all pending schedules for today
        cursor = db[collections.MEDICATION_SCHEDULES_COLLECTION].find({
            "scheduled_date": today_str,
            "status": "pending"
        })

        async for schedule in cursor:
            processed_count += 1
            sched_time_str = schedule.get("scheduled_time", "00:00")
            current_stage = schedule.get("escalation_stage", 0)
            elderly_oid = schedule["elderly_user_id"]
            med_name = schedule.get("medicine_name", "Medication")
            dosage = schedule.get("dosage", "")

            # Calculate minutes overdue
            try:
                sched_dt = datetime.strptime(f"{today_str} {sched_time_str}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
                diff_minutes = (now - sched_dt).total_seconds() / 60.0
            except Exception:
                continue

            # Stage 1: Initial Reminder (15 mins overdue)
            if diff_minutes >= 15 and current_stage < 1:
                await NotificationService.create_notification(
                    db=db,
                    recipient_user_id=elderly_oid,
                    elderly_user_id=elderly_oid,
                    notification_type="medication_reminder",
                    title=f"Medication Reminder: {med_name}",
                    message=f"It's time to take your scheduled dose of {med_name} ({dosage}). Please remember to confirm when taken.",
                    priority="normal",
                    metadata={"schedule_id": str(schedule["_id"]), "stage": 1}
                )
                await db[collections.MEDICATION_SCHEDULES_COLLECTION].update_one(
                    {"_id": schedule["_id"]},
                    {"$set": {"escalation_stage": 1}}
                )
                reminders_sent += 1

            # Stage 2: Follow-up Reminder (30 mins overdue)
            elif diff_minutes >= 30 and current_stage < 2:
                await NotificationService.create_notification(
                    db=db,
                    recipient_user_id=elderly_oid,
                    elderly_user_id=elderly_oid,
                    notification_type="medication_reminder",
                    title=f"Gentle Follow-Up: {med_name} Unconfirmed",
                    message=f"Your scheduled dose of {med_name} from {sched_time_str} is still pending. Tap to confirm or let your caregiver know if you need help.",
                    priority="high",
                    metadata={"schedule_id": str(schedule["_id"]), "stage": 2}
                )
                await db[collections.MEDICATION_SCHEDULES_COLLECTION].update_one(
                    {"_id": schedule["_id"]},
                    {"$set": {"escalation_stage": 2}}
                )
                followups_sent += 1

            # Stage 3: Caregiver Escalation (60 mins overdue)
            elif diff_minutes >= 60 and current_stage < 3:
                # Find authorized circle members who can receive alerts
                perm_cursor = db[collections.PERMISSIONS_COLLECTION].find({
                    "elderly_user_id": elderly_oid,
                    "can_receive_alerts": True
                })
                alerted_members = []
                elderly_user = await db[collections.USERS_COLLECTION].find_one({"_id": elderly_oid})
                elderly_name = f"{elderly_user.get('first_name', 'Elderly')} {elderly_user.get('last_name', '')}".strip() if elderly_user else "Your loved one"

                async for perm in perm_cursor:
                    member_user_id = perm["member_user_id"]
                    await NotificationService.create_notification(
                        db=db,
                        recipient_user_id=member_user_id,
                        elderly_user_id=elderly_oid,
                        notification_type="medication_escalation",
                        title=f"Caregiver Escalation: {med_name} Unconfirmed for {elderly_name}",
                        message=f"{elderly_name} has not confirmed taking {med_name} ({dosage}) scheduled for {sched_time_str} (+60 mins elapsed). Please check in with them.",
                        priority="high",
                        metadata={"schedule_id": str(schedule["_id"]), "stage": 3},
                        channels=["in_app", "email"]
                    )
                    alerted_members.append(str(member_user_id))

                await db[collections.MEDICATION_SCHEDULES_COLLECTION].update_one(
                    {"_id": schedule["_id"]},
                    {"$set": {"escalation_stage": 3, "status": "escalated"}}
                )
                escalations_sent += 1
                logger.warning(f"Escalation triggered for schedule {schedule['_id']} to {len(alerted_members)} caregivers.")

        return {
            "timestamp": now.isoformat(),
            "evaluated_schedules": processed_count,
            "reminders_sent": reminders_sent,
            "followups_sent": followups_sent,
            "escalations_sent": escalations_sent,
        }
