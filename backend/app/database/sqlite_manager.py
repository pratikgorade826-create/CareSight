"""
CareSight SQLite Database Engine
Directly persists all 21 healthcare collections to a local SQLite database (carecircle.db).
Enables seamless inspection and querying directly inside DB Browser for SQLite.
"""

import os
import json
import sqlite3
import threading
import logging
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any, Union
from bson import ObjectId

logger = logging.getLogger("caresight.sqlite")

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    return str(obj)

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class InsertManyResult:
    def __init__(self, inserted_ids):
        self.inserted_ids = inserted_ids

class UpdateResult:
    def __init__(self, matched_count=1, modified_count=1):
        self.matched_count = matched_count
        self.modified_count = modified_count

class DeleteResult:
    def __init__(self, deleted_count=1):
        self.deleted_count = deleted_count

class SqliteCursor:
    def __init__(self, docs: List[dict]):
        self._docs = docs
        self._index = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                rev = (d == -1 or d == "desc")
                self._docs.sort(key=lambda x: (x.get(k) is None, str(x.get(k) or "")), reverse=rev)
        elif isinstance(key_or_list, str):
            rev = (direction == -1 or direction == "desc")
            self._docs.sort(key=lambda x: (x.get(key_or_list) is None, str(x.get(key_or_list) or "")), reverse=rev)
        return self

    def limit(self, n: int):
        if n is not None and n >= 0:
            self._docs = self._docs[:n]
        return self

    def skip(self, n: int):
        if n is not None and n > 0:
            self._docs = self._docs[n:]
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self._docs):
            raise StopAsyncIteration
        item = self._docs[self._index]
        self._index += 1
        return item

    async def to_list(self, length=None):
        if length is not None:
            return self._docs[:length]
        return self._docs

TABLE_DEFINITIONS = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            role TEXT,
            first_name TEXT,
            last_name TEXT,
            phone_number TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "elderly_profiles": """
        CREATE TABLE IF NOT EXISTS elderly_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE,
            date_of_birth TEXT,
            gender TEXT,
            blood_type TEXT,
            preferred_language TEXT,
            time_zone TEXT,
            emergency_notes TEXT,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "care_circles": """
        CREATE TABLE IF NOT EXISTS care_circles (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT UNIQUE,
            circle_name TEXT,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "care_circle_members": """
        CREATE TABLE IF NOT EXISTS care_circle_members (
            id TEXT PRIMARY KEY,
            care_circle_id TEXT,
            user_id TEXT,
            role_in_circle TEXT,
            relationship_label TEXT,
            status TEXT,
            joined_at TEXT,
            data TEXT
        );
    """,
    "invitations": """
        CREATE TABLE IF NOT EXISTS invitations (
            id TEXT PRIMARY KEY,
            care_circle_id TEXT,
            elderly_user_id TEXT,
            invited_by_user_id TEXT,
            email TEXT,
            role TEXT,
            invitation_code TEXT UNIQUE,
            status TEXT,
            expires_at TEXT,
            created_at TEXT,
            data TEXT
        );
    """,
    "permissions": """
        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            member_user_id TEXT,
            can_view_medications INTEGER DEFAULT 1,
            can_modify_medications INTEGER DEFAULT 0,
            can_confirm_medications INTEGER DEFAULT 1,
            can_view_appointments INTEGER DEFAULT 1,
            can_manage_appointments INTEGER DEFAULT 0,
            can_view_documents INTEGER DEFAULT 1,
            can_upload_documents INTEGER DEFAULT 0,
            can_receive_alerts INTEGER DEFAULT 1,
            can_view_timeline INTEGER DEFAULT 1,
            updated_at TEXT,
            data TEXT
        );
    """,
    "medications": """
        CREATE TABLE IF NOT EXISTS medications (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            medicine_name TEXT,
            dosage TEXT,
            frequency TEXT,
            start_date TEXT,
            instructions TEXT,
            refill_quantity INTEGER,
            remaining_quantity INTEGER,
            status TEXT,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "medication_schedules": """
        CREATE TABLE IF NOT EXISTS medication_schedules (
            id TEXT PRIMARY KEY,
            medication_id TEXT,
            elderly_user_id TEXT,
            medicine_name TEXT,
            dosage TEXT,
            scheduled_date TEXT,
            scheduled_time TEXT,
            status TEXT,
            escalation_stage INTEGER DEFAULT 0,
            confirmed_at TEXT,
            created_at TEXT,
            data TEXT
        );
    """,
    "medication_events": """
        CREATE TABLE IF NOT EXISTS medication_events (
            id TEXT PRIMARY KEY,
            medication_id TEXT,
            elderly_user_id TEXT,
            confirmed_by_user_id TEXT,
            status TEXT,
            dose_time TEXT,
            notes TEXT,
            confirmed_at TEXT,
            data TEXT
        );
    """,
    "appointments": """
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            doctor_name TEXT,
            specialty TEXT,
            hospital_clinic TEXT,
            appointment_date TEXT,
            appointment_time TEXT,
            reason TEXT,
            location TEXT,
            status TEXT,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "appointment_notes": """
        CREATE TABLE IF NOT EXISTS appointment_notes (
            id TEXT PRIMARY KEY,
            appointment_id TEXT,
            author_user_id TEXT,
            notes TEXT,
            action_items TEXT,
            created_at TEXT,
            data TEXT
        );
    """,
    "health_observations": """
        CREATE TABLE IF NOT EXISTS health_observations (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            observed_by_user_id TEXT,
            observation_type TEXT,
            value TEXT,
            unit TEXT,
            notes TEXT,
            observed_at TEXT,
            created_at TEXT,
            data TEXT
        );
    """,
    "healthcare_documents": """
        CREATE TABLE IF NOT EXISTS healthcare_documents (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            uploaded_by_user_id TEXT,
            uploader_name TEXT,
            title TEXT,
            document_type TEXT,
            file_name TEXT,
            file_path TEXT,
            file_size_bytes INTEGER,
            mime_type TEXT,
            ai_summary TEXT,
            created_at TEXT,
            data TEXT
        );
    """,
    "caregiver_activities": """
        CREATE TABLE IF NOT EXISTS caregiver_activities (
            id TEXT PRIMARY KEY,
            caregiver_user_id TEXT,
            elderly_user_id TEXT,
            activity_type TEXT,
            description TEXT,
            duration_minutes INTEGER,
            logged_at TEXT,
            data TEXT
        );
    """,
    "notifications": """
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            elderly_user_id TEXT,
            notification_type TEXT,
            title TEXT,
            message TEXT,
            severity TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT,
            data TEXT
        );
    """,
    "emergency_contacts": """
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            name TEXT,
            relationship TEXT,
            phone_number TEXT,
            priority_order INTEGER,
            is_notified_on_sos INTEGER DEFAULT 1,
            created_at TEXT,
            data TEXT
        );
    """,
    "emergency_events": """
        CREATE TABLE IF NOT EXISTS emergency_events (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT,
            triggered_by_user_id TEXT,
            event_type TEXT,
            status TEXT,
            notes TEXT,
            location TEXT,
            triggered_at TEXT,
            resolved_at TEXT,
            data TEXT
        );
    """,
    "daily_routines": """
        CREATE TABLE IF NOT EXISTS daily_routines (
            id TEXT PRIMARY KEY,
            elderly_user_id TEXT UNIQUE,
            wake_up_time TEXT,
            breakfast_time TEXT,
            lunch_time TEXT,
            dinner_time TEXT,
            bed_time TEXT,
            exercise_preference TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "audit_logs": """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            actor_user_id TEXT,
            target_elderly_id TEXT,
            action TEXT,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            timestamp TEXT,
            data TEXT
        );
    """,
    "chat_conversations": """
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            elderly_user_id TEXT,
            title TEXT,
            language TEXT,
            created_at TEXT,
            updated_at TEXT,
            data TEXT
        );
    """,
    "chat_messages": """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT,
            role TEXT,
            content TEXT,
            language TEXT,
            created_at TEXT,
            data TEXT
        );
    """
}

class SqliteCollection:
    def __init__(self, conn: sqlite3.Connection, lock: threading.Lock, name: str):
        self.conn = conn
        self.lock = lock
        self.name = name

    def _deserialize_doc(self, raw_data: str) -> dict:
        doc = json.loads(raw_data)
        # Restore ObjectId for _id and foreign key references
        if "_id" in doc and isinstance(doc["_id"], str) and ObjectId.is_valid(doc["_id"]):
            doc["_id"] = ObjectId(doc["_id"])
        return doc

    def _doc_matches(self, doc: dict, filt: dict) -> bool:
        if not filt:
            return True
        for key, cond in filt.items():
            val = doc.get(key)
            if key == "_id" and val is not None:
                if isinstance(cond, (str, ObjectId)):
                    if str(val) != str(cond):
                        return False
                    continue
            if key in ("user_id", "elderly_user_id", "member_user_id", "care_circle_id", "medication_id", "appointment_id") and val is not None:
                if isinstance(cond, (str, ObjectId)):
                    if str(val) != str(cond):
                        return False
                    continue

            if isinstance(cond, dict):
                for op, op_val in cond.items():
                    if op == "$in":
                        op_strs = [str(x) for x in op_val]
                        if str(val) not in op_strs and val not in op_val:
                            return False
                    elif op == "$nin":
                        op_strs = [str(x) for x in op_val]
                        if str(val) in op_strs or val in op_val:
                            return False
                    elif op == "$gte":
                        if val is None:
                            return False
                        comp_val = op_val.isoformat() if isinstance(op_val, (datetime, date)) else op_val
                        val_cmp = val.isoformat() if isinstance(val, (datetime, date)) else val
                        if val_cmp < comp_val:
                            return False
                    elif op == "$lte":
                        if val is None:
                            return False
                        comp_val = op_val.isoformat() if isinstance(op_val, (datetime, date)) else op_val
                        val_cmp = val.isoformat() if isinstance(val, (datetime, date)) else val
                        if val_cmp > comp_val:
                            return False
                    elif op == "$gt":
                        if val is None or val <= op_val:
                            return False
                    elif op == "$lt":
                        if val is None or val >= op_val:
                            return False
                    elif op == "$ne":
                        if str(val) == str(op_val):
                            return False
            else:
                if str(val) != str(cond) and val != cond:
                    return False
        return True

    def _get_all_docs(self) -> List[dict]:
        with self.lock:
            cur = self.conn.cursor()
            cur.execute(f"SELECT data FROM {self.name}")
            rows = cur.fetchall()
            return [self._deserialize_doc(r[0]) for r in rows if r[0]]

    def _extract_column_values(self, doc: dict) -> tuple:
        doc_id = str(doc.get("_id", ""))
        data_json = json.dumps(doc, default=json_serial)

        if self.name == "users":
            return (
                doc_id,
                doc.get("email"),
                doc.get("role"),
                doc.get("first_name"),
                doc.get("last_name"),
                doc.get("phone_number"),
                1 if doc.get("is_active", True) else 0,
                json_serial(doc.get("created_at")),
                json_serial(doc.get("updated_at")),
                data_json
            )
        elif self.name == "elderly_profiles":
            return (
                doc_id,
                str(doc.get("user_id", "")),
                doc.get("date_of_birth"),
                doc.get("gender"),
                doc.get("blood_type"),
                doc.get("preferred_language", "en"),
                doc.get("time_zone", "Asia/Kolkata"),
                doc.get("emergency_notes", ""),
                json_serial(doc.get("created_at")),
                json_serial(doc.get("updated_at")),
                data_json
            )
        elif self.name == "care_circles":
            return (
                doc_id,
                str(doc.get("elderly_user_id", "")),
                doc.get("circle_name"),
                json_serial(doc.get("created_at")),
                json_serial(doc.get("updated_at")),
                data_json
            )
        elif self.name == "medications":
            return (
                doc_id,
                str(doc.get("elderly_user_id", "")),
                doc.get("medicine_name"),
                doc.get("dosage"),
                doc.get("frequency"),
                doc.get("start_date"),
                doc.get("instructions"),
                doc.get("refill_quantity", 0),
                doc.get("remaining_quantity", 0),
                doc.get("status", "active"),
                json_serial(doc.get("created_at")),
                json_serial(doc.get("updated_at")),
                data_json
            )
        elif self.name == "medication_schedules":
            return (
                doc_id,
                str(doc.get("medication_id", "")),
                str(doc.get("elderly_user_id", "")),
                doc.get("medicine_name"),
                doc.get("dosage"),
                doc.get("scheduled_date"),
                doc.get("scheduled_time"),
                doc.get("status", "pending"),
                doc.get("escalation_stage", 0),
                json_serial(doc.get("confirmed_at")),
                json_serial(doc.get("created_at")),
                data_json
            )
        elif self.name == "appointments":
            return (
                doc_id,
                str(doc.get("elderly_user_id", "")),
                doc.get("doctor_name"),
                doc.get("specialty"),
                doc.get("hospital_clinic"),
                doc.get("appointment_date"),
                doc.get("appointment_time"),
                doc.get("reason"),
                doc.get("location"),
                doc.get("status", "scheduled"),
                json_serial(doc.get("created_at")),
                json_serial(doc.get("updated_at")),
                data_json
            )
        else:
            return (doc_id, data_json)

    async def insert_one(self, doc: dict) -> InsertOneResult:
        if "_id" not in doc or not doc["_id"]:
            doc["_id"] = ObjectId()
        doc_id = str(doc["_id"])

        with self.lock:
            cur = self.conn.cursor()
            cols = [col[1] for col in cur.execute(f"PRAGMA table_info({self.name})").fetchall()]
            row_data = {}
            for col in cols:
                if col == "id":
                    row_data[col] = doc_id
                elif col == "data":
                    row_data[col] = json.dumps(doc, default=json_serial)
                elif col in doc:
                    val = doc[col]
                    if isinstance(val, (datetime, date)):
                        row_data[col] = val.isoformat()
                    elif isinstance(val, ObjectId):
                        row_data[col] = str(val)
                    elif isinstance(val, (dict, list)):
                        row_data[col] = json.dumps(val, default=json_serial)
                    elif isinstance(val, bool):
                        row_data[col] = 1 if val else 0
                    else:
                        row_data[col] = val
                else:
                    row_data[col] = None

            keys = list(row_data.keys())
            placeholders = ", ".join(["?"] * len(keys))
            sql = f"INSERT INTO {self.name} ({', '.join(keys)}) VALUES ({placeholders})"
            cur.execute(sql, [row_data[k] for k in keys])
            self.conn.commit()

        return InsertOneResult(doc["_id"])

    async def insert_many(self, docs: List[dict]) -> InsertManyResult:
        inserted_ids = []
        for doc in docs:
            res = await self.insert_one(doc)
            inserted_ids.append(res.inserted_id)
        return InsertManyResult(inserted_ids)

    async def find_one(self, filt: Optional[dict] = None) -> Optional[dict]:
        all_docs = self._get_all_docs()
        for doc in all_docs:
            if self._doc_matches(doc, filt or {}):
                return doc
        return None

    def find(self, filt: Optional[dict] = None) -> SqliteCursor:
        all_docs = self._get_all_docs()
        matched = [d for d in all_docs if self._doc_matches(d, filt or {})]
        return SqliteCursor(matched)

    async def update_one(self, filt: dict, update: dict, upsert: bool = False) -> UpdateResult:
        all_docs = self._get_all_docs()
        target = None
        for doc in all_docs:
            if self._doc_matches(doc, filt):
                target = doc
                break

        if not target:
            if upsert:
                new_doc = dict(filt)
                if "$set" in update:
                    new_doc.update(update["$set"])
                await self.insert_one(new_doc)
                return UpdateResult(1, 1)
            return UpdateResult(0, 0)

        # Apply update
        if "$set" in update:
            for k, v in update["$set"].items():
                target[k] = v
        if "$inc" in update:
            for k, v in update["$inc"].items():
                target[k] = target.get(k, 0) + v
        if "$push" in update:
            for k, v in update["$push"].items():
                if k not in target or not isinstance(target[k], list):
                    target[k] = []
                target[k].append(v)
        if "$pull" in update:
            for k, v in update["$pull"].items():
                if k in target and isinstance(target[k], list):
                    target[k] = [x for x in target[k] if x != v]

        doc_id = str(target["_id"])
        with self.lock:
            cur = self.conn.cursor()
            cols = [col[1] for col in cur.execute(f"PRAGMA table_info({self.name})").fetchall()]
            set_clauses = ["data = ?"]
            vals = [json.dumps(target, default=json_serial)]
            for col in cols:
                if col in ("id", "data"):
                    continue
                if col in target:
                    val = target[col]
                    if isinstance(val, (datetime, date)):
                        vals.append(val.isoformat())
                    elif isinstance(val, ObjectId):
                        vals.append(str(val))
                    elif isinstance(val, bool):
                        vals.append(1 if val else 0)
                    elif isinstance(val, (dict, list)):
                        vals.append(json.dumps(val, default=json_serial))
                    else:
                        vals.append(val)
                    set_clauses.append(f"{col} = ?")

            vals.append(doc_id)
            sql = f"UPDATE {self.name} SET {', '.join(set_clauses)} WHERE id = ?"
            cur.execute(sql, vals)
            self.conn.commit()

        return UpdateResult(1, 1)

    async def update_many(self, filt: dict, update: dict, upsert: bool = False) -> UpdateResult:
        all_docs = self._get_all_docs()
        count = 0
        for doc in all_docs:
            if self._doc_matches(doc, filt):
                await self.update_one({"_id": doc["_id"]}, update, upsert=False)
                count += 1
        return UpdateResult(count, count)

    async def replace_one(self, filt: dict, replacement: dict, upsert: bool = False) -> UpdateResult:
        existing = await self.find_one(filt)
        if existing:
            if "_id" not in replacement:
                replacement["_id"] = existing["_id"]
            await self.delete_one({"_id": existing["_id"]})
            await self.insert_one(replacement)
            return UpdateResult(1, 1)
        elif upsert:
            await self.insert_one(replacement)
            return UpdateResult(1, 1)
        return UpdateResult(0, 0)

    async def delete_one(self, filt: dict) -> DeleteResult:
        doc = await self.find_one(filt)
        if not doc:
            return DeleteResult(0)
        doc_id = str(doc["_id"])
        with self.lock:
            cur = self.conn.cursor()
            cur.execute(f"DELETE FROM {self.name} WHERE id = ?", (doc_id,))
            self.conn.commit()
        return DeleteResult(1)

    async def delete_many(self, filt: dict) -> DeleteResult:
        all_docs = self._get_all_docs()
        count = 0
        with self.lock:
            cur = self.conn.cursor()
            for doc in all_docs:
                if self._doc_matches(doc, filt):
                    cur.execute(f"DELETE FROM {self.name} WHERE id = ?", (str(doc["_id"]),))
                    count += 1
            self.conn.commit()
        return DeleteResult(count)

    async def count_documents(self, filt: Optional[dict] = None) -> int:
        all_docs = self._get_all_docs()
        return sum(1 for d in all_docs if self._doc_matches(d, filt or {}))

    async def create_index(self, keys, unique=False):
        pass

    def aggregate(self, pipeline: List[dict]) -> SqliteCursor:
        docs = self._get_all_docs()
        result = docs

        for stage in pipeline:
            if "$match" in stage:
                match_filter = stage["$match"]
                result = [d for d in result if self._doc_matches(d, match_filter)]
            elif "$group" in stage:
                group_spec = stage["$group"]
                id_spec = group_spec.get("_id")
                grouped = {}
                for d in result:
                    if isinstance(id_spec, dict):
                        key_parts = []
                        for k, field_ref in id_spec.items():
                            f_name = field_ref.lstrip("$")
                            key_parts.append((k, d.get(f_name)))
                        grp_key = tuple(key_parts)
                    elif isinstance(id_spec, str):
                        grp_key = d.get(id_spec.lstrip("$"))
                    else:
                        grp_key = None

                    if grp_key not in grouped:
                        grouped[grp_key] = {"items": [], "count": 0, "sums": {}}
                    grouped[grp_key]["items"].append(d)
                    grouped[grp_key]["count"] += 1

                    for out_field, accum in group_spec.items():
                        if out_field == "_id":
                            continue
                        if isinstance(accum, dict) and "$sum" in accum:
                            val = accum["$sum"]
                            if isinstance(val, (int, float)):
                                grouped[grp_key]["sums"][out_field] = grouped[grp_key]["sums"].get(out_field, 0) + val
                            elif isinstance(val, str) and val.startswith("$"):
                                field_val = d.get(val.lstrip("$"), 0) or 0
                                grouped[grp_key]["sums"][out_field] = grouped[grp_key]["sums"].get(out_field, 0) + field_val

                agg_result = []
                for grp_key, grp_data in grouped.items():
                    res_item = {}
                    if isinstance(id_spec, dict):
                        res_item["_id"] = dict(grp_key)
                    else:
                        res_item["_id"] = grp_key
                    if "count" in group_spec:
                        res_item["count"] = grp_data["count"]
                    for out_field, total in grp_data["sums"].items():
                        res_item[out_field] = total
                    agg_result.append(res_item)
                result = agg_result

        return SqliteCursor(result)


class SqliteDatabase:
    """Represents the SQLite Database instance providing collection access via db['users']."""
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.name = os.path.basename(db_path)
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self._collections: Dict[str, SqliteCollection] = {}
        self._init_schema()

    async def list_collection_names(self) -> List[str]:
        with self._lock:
            cur = self.conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            return [r[0] for r in cur.fetchall()]

    def _init_schema(self):
        with self._lock:
            for table_name, create_sql in TABLE_DEFINITIONS.items():
                self.conn.execute(create_sql)
            self.conn.commit()

    def __getitem__(self, name: str) -> SqliteCollection:
        if name not in self._collections:
            # Auto-create generic table if not pre-defined
            if name not in TABLE_DEFINITIONS:
                with self._lock:
                    self.conn.execute(f"CREATE TABLE IF NOT EXISTS {name} (id TEXT PRIMARY KEY, data TEXT);")
                    self.conn.commit()
            self._collections[name] = SqliteCollection(self.conn, self._lock, name)
        return self._collections[name]

    def close(self):
        with self._lock:
            self.conn.close()
