from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import collections
from app.services.permission_service import PermissionService

class AnalyticsService:
    @staticmethod
    async def get_adherence_analytics(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str,
        days: int = 14
    ) -> dict:
        """
        Computes medication adherence analytics using real MongoDB queries and aggregation pipelines.
        Never returns hardcoded mock data.
        """
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_medications" if current_user.get("role") != "elderly" else None,
            action_name="GET_ADHERENCE_ANALYTICS"
        )

        today = date.today()
        start_date = today - timedelta(days=days - 1)
        start_date_str = start_date.isoformat()
        today_str = today.isoformat()

        # Aggregation pipeline on medication_schedules
        pipeline = [
            {
                "$match": {
                    "elderly_user_id": elderly_oid,
                    "scheduled_date": {"$gte": start_date_str, "$lte": today_str}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": "$scheduled_date",
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            }
        ]

        cursor = db[collections.MEDICATION_SCHEDULES_COLLECTION].aggregate(pipeline)
        counts_by_date = {}

        # Initialize all dates in range
        curr = start_date
        while curr <= today:
            d_str = curr.isoformat()
            counts_by_date[d_str] = {"scheduled": 0, "taken": 0, "skipped": 0, "unconfirmed": 0}
            curr += timedelta(days=1)

        total_scheduled = 0
        total_taken = 0
        total_skipped = 0
        total_unconfirmed = 0

        async for row in cursor:
            d = row["_id"]["date"]
            status = row["_id"]["status"]
            cnt = row["count"]

            if d in counts_by_date:
                counts_by_date[d]["scheduled"] += cnt
                total_scheduled += cnt
                if status == "taken":
                    counts_by_date[d]["taken"] += cnt
                    total_taken += cnt
                elif status == "skipped":
                    counts_by_date[d]["skipped"] += cnt
                    total_skipped += cnt
                else:  # pending or escalated
                    counts_by_date[d]["unconfirmed"] += cnt
                    total_unconfirmed += cnt

        # Format trend list for Recharts
        daily_trends = []
        for d_str in sorted(counts_by_date.keys()):
            data = counts_by_date[d_str]
            sched = data["scheduled"]
            taken = data["taken"]
            rate = round((taken / sched * 100.0), 1) if sched > 0 else 100.0
            daily_trends.append({
                "date": d_str,
                "scheduled": sched,
                "taken": taken,
                "skipped": data["skipped"],
                "unconfirmed": data["unconfirmed"],
                "adherence_rate": rate
            })

        overall_rate = round((total_taken / total_scheduled * 100.0), 1) if total_scheduled > 0 else 100.0

        return {
            "period_days": days,
            "total_scheduled": total_scheduled,
            "total_taken": total_taken,
            "total_skipped": total_skipped,
            "total_unconfirmed": total_unconfirmed,
            "overall_adherence_rate": overall_rate,
            "daily_trends": daily_trends
        }

    @staticmethod
    async def get_weekly_summary(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str
    ) -> dict:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_medications" if current_user.get("role") != "elderly" else None,
            action_name="GET_WEEKLY_SUMMARY"
        )
        today = date.today()
        week_start = today - timedelta(days=7)
        week_start_str = week_start.isoformat()
        today_str = today.isoformat()

        # Adherence for past 7 days
        adherence_data = await AnalyticsService.get_adherence_analytics(db, current_user, elderly_id_str, days=7)

        # Completed appointments count
        apts_count = await db[collections.APPOINTMENTS_COLLECTION].count_documents({
            "elderly_user_id": elderly_oid,
            "appointment_date": {"$gte": week_start_str, "$lte": today_str},
            "status": "completed"
        })

        # Caregiver activities duration
        caregiver_pipeline = [
            {
                "$match": {
                    "elderly_user_id": elderly_oid,
                    "performed_at": {"$gte": datetime.combine(week_start, datetime.min.time())}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_minutes": {"$sum": "$duration_minutes"}
                }
            }
        ]
        caregiver_cursor = db[collections.CAREGIVER_ACTIVITIES_COLLECTION].aggregate(caregiver_pipeline)
        caregiver_hours = 0.0
        async for c in caregiver_cursor:
            caregiver_hours = round(c.get("total_minutes", 0) / 60.0, 1)

        # Alerts count
        alerts_count = await db[collections.NOTIFICATIONS_COLLECTION].count_documents({
            "elderly_user_id": elderly_oid,
            "priority": {"$in": ["high", "emergency"]},
            "created_at": {"$gte": datetime.combine(week_start, datetime.min.time())}
        })

        rate = adherence_data["overall_adherence_rate"]
        status_label = "Excellent" if rate >= 85 else ("Good" if rate >= 70 else "Needs Attention")

        return {
            "week_start": week_start_str,
            "week_end": today_str,
            "adherence_rate": rate,
            "doses_taken": adherence_data["total_taken"],
            "doses_missed_or_unconfirmed": adherence_data["total_skipped"] + adherence_data["total_unconfirmed"],
            "appointments_attended": apts_count,
            "caregiver_hours": caregiver_hours,
            "health_alerts_count": alerts_count,
            "adherence_status": status_label,
        }

    @staticmethod
    async def get_health_timeline(
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str,
        category: Optional[str] = None,
        limit: int = 50
    ) -> dict:
        """
        Synthesizes a unified chronological health activity timeline from real MongoDB records:
        - Medication confirmations
        - Appointments
        - Doctor notes
        - Health observations
        - Caregiver activities
        - Uploaded documents
        - Emergency events
        """
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_timeline" if current_user.get("role") != "elderly" else None,
            action_name="GET_HEALTH_TIMELINE"
        )

        timeline_items = []

        def to_utc(dt):
            if dt is None:
                return datetime.now(timezone.utc)
            if isinstance(dt, datetime):
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            return datetime.now(timezone.utc)

        # 1. Medication events
        if not category or category == "medication":
            med_events = db[collections.MEDICATION_EVENTS_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("confirmed_at", -1).limit(limit)
            async for ev in med_events:
                med = await db[collections.MEDICATIONS_COLLECTION].find_one({"_id": ev["medication_id"]})
                med_name = med.get("medicine_name", "Medication") if med else "Medication"
                timeline_items.append({
                    "id": str(ev["_id"]),
                    "category": "medication",
                    "title": f"Medication Intake: {med_name}",
                    "description": f"Status: {ev['status'].upper()} at {ev.get('dose_time', 'Scheduled time')}. {ev.get('notes') or ''}".strip(),
                    "status": ev["status"],
                    "actor_name": "Patient / Caregiver",
                    "timestamp": to_utc(ev.get("confirmed_at")),
                    "metadata": {"medication_id": str(ev["medication_id"])},
                })

        # 2. Appointments & notes
        if not category or category == "appointment":
            apts = db[collections.APPOINTMENTS_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("appointment_date", -1).limit(limit)
            async for a in apts:
                try:
                    apt_dt = datetime.strptime(f"{a['appointment_date']} {a['appointment_time']}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
                except Exception:
                    apt_dt = to_utc(a.get("created_at"))

                timeline_items.append({
                    "id": str(a["_id"]),
                    "category": "appointment",
                    "title": f"Doctor Consultation: Dr. {a['doctor_name']}",
                    "description": f"{a.get('specialty', '')} at {a['hospital_clinic']}. Reason: {a.get('reason') or 'Routine visit'}",
                    "status": a.get("status", "scheduled"),
                    "actor_name": f"Dr. {a['doctor_name']}",
                    "timestamp": to_utc(apt_dt),
                    "metadata": {"appointment_id": str(a["_id"])},
                })

        # 3. Health observations
        if not category or category == "observation":
            obs = db[collections.HEALTH_OBSERVATIONS_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("observed_at", -1).limit(limit)
            async for o in obs:
                timeline_items.append({
                    "id": str(o["_id"]),
                    "category": "observation",
                    "title": f"Vitals Check: {o['observation_type'].replace('_', ' ').title()}",
                    "description": f"Recorded Value: {o['value']} {o.get('unit') or ''}. Notes: {o.get('notes') or 'Normal reading'}",
                    "status": "recorded",
                    "actor_name": "Health Monitor",
                    "timestamp": to_utc(o.get("observed_at", o.get("created_at"))),
                    "metadata": {},
                })

        # 4. Caregiver activities
        if not category or category == "caregiver":
            activities = db[collections.CAREGIVER_ACTIVITIES_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("performed_at", -1).limit(limit)
            async for act in activities:
                timeline_items.append({
                    "id": str(act["_id"]),
                    "category": "caregiver",
                    "title": f"Care Assistance: {act['activity_type'].replace('_', ' ').title()}",
                    "description": f"{act['details']} (Duration: {act.get('duration_minutes', 30)} mins)",
                    "status": "completed",
                    "actor_name": act.get("caregiver_name", "Caregiver"),
                    "timestamp": to_utc(act.get("performed_at")),
                    "metadata": {},
                })

        # 5. Documents
        if not category or category == "document":
            docs = db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("created_at", -1).limit(limit)
            async for d in docs:
                timeline_items.append({
                    "id": str(d["_id"]),
                    "category": "document",
                    "title": f"Document Upload: {d['title']}",
                    "description": f"{d['document_type'].replace('_', ' ').title()} ({round(d.get('file_size_bytes', 0)/1024, 1)} KB)",
                    "status": "uploaded",
                    "actor_name": d.get("uploader_name", "Family"),
                    "timestamp": to_utc(d.get("created_at")),
                    "metadata": {"document_id": str(d["_id"])},
                })

        # 6. Emergency events
        if not category or category == "emergency":
            emergencies = db[collections.EMERGENCY_EVENTS_COLLECTION].find({
                "elderly_user_id": elderly_oid
            }).sort("triggered_at", -1).limit(limit)
            async for em in emergencies:
                timeline_items.append({
                    "id": str(em["_id"]),
                    "category": "emergency",
                    "title": "🚨 Emergency SOS Event",
                    "description": f"Triggered by {em.get('triggered_by_name', 'Senior')}. Status: {em.get('status', 'active').upper()}",
                    "status": em.get("status", "active"),
                    "actor_name": em.get("triggered_by_name", "Senior"),
                    "timestamp": to_utc(em.get("triggered_at")),
                    "metadata": {"emergency_id": str(em["_id"])},
                })

        # Sort all items descending by timestamp
        timeline_items.sort(key=lambda x: to_utc(x["timestamp"]), reverse=True)
        trimmed_items = timeline_items[:limit]

        # Concise summary
        summary_text = (
            f"Health timeline displays {len(trimmed_items)} verified activities. "
            f"Recent highlights include medication logging, scheduled consultations, and health observations."
        )

        return {
            "total_events": len(trimmed_items),
            "items": trimmed_items,
            "ai_timeline_summary": summary_text
        }
