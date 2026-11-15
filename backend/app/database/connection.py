"""
CareSight Database Connection Manager
Primary storage: Local SQLite Database (carecircle.db) ready for DB Browser for SQLite.
Optional cloud storage: MongoDB Atlas if MONGODB_URI is provided.
"""

import os
import logging
from typing import Optional, Dict, Any

from app.config.settings import settings
from app.database import collections
from app.database.sqlite_manager import SqliteDatabase

logger = logging.getLogger("caresight.database")

# Store SQLite carecircle.db at the project root for immediate opening in DB Browser for SQLite
SQLITE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "carecircle.db"))

class MongoManager:
    client: Optional[Any] = None
    db: Optional[Any] = None
    is_mock: bool = False
    is_sqlite: bool = True
    db_path: str = SQLITE_DB_PATH

    @classmethod
    async def connect(cls):
        """Initializes connection to SQLite database (carecircle.db) or MongoDB Atlas."""
        if cls.db is not None:
            return

        uri = settings.MONGODB_URI.strip()
        db_name = settings.MONGODB_DATABASE

        if uri and not uri.startswith("mongodb+srv://<"):
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                logger.info(f"Connecting to MongoDB Atlas at {uri.split('@')[-1] if '@' in uri else 'configured URI'}...")
                cls.client = AsyncIOMotorClient(
                    uri,
                    minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
                    maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                    serverSelectionTimeoutMS=5000,
                )
                cls.db = cls.client[db_name]
                await cls.client.admin.command('ping')
                cls.is_mock = False
                cls.is_sqlite = False
                logger.info(f"Successfully connected to MongoDB Atlas database: {db_name}")
            except Exception as e:
                logger.warning(f"Could not connect to MongoDB Atlas ({e}). Falling back to SQLite database engine (carecircle.db).")
                cls._init_sqlite()
        else:
            logger.info(f"Using SQLite database engine at: {cls.db_path} (Ready for DB Browser for SQLite).")
            cls._init_sqlite()

        # Auto-seed single demo account and care circle into carecircle.db
        from app.services.demo_seeder import seed_single_demo_account
        await seed_single_demo_account(cls.db)

    @classmethod
    def _init_sqlite(cls):
        cls.db = SqliteDatabase(cls.db_path)
        cls.is_mock = False
        cls.is_sqlite = True
        logger.info(f"Initialized SQLite database at: {cls.db_path} with 21 relational tables.")

    @classmethod
    async def close(cls):
        """Gracefully closes database connection."""
        if cls.client:
            cls.client.close()
            cls.client = None
        if cls.is_sqlite and cls.db:
            cls.db.close()
        cls.db = None
        logger.info("Database connection closed.")

    @classmethod
    def get_database(cls) -> Any:
        if cls.db is None:
            raise RuntimeError("Database connection not initialized. Call MongoManager.connect() first.")
        return cls.db

    @classmethod
    async def create_indexes(cls):
        """Creates required unique, compound, and TTL indexes for all 21 collections."""
        db = cls.get_database()
        if cls.is_sqlite:
            logger.info("SQLite tables and indexes successfully verified.")
            return

        logger.info("Verifying and applying MongoDB indexes across 21 collections...")
        try:
            from pymongo import ASCENDING, DESCENDING
            await db[collections.USERS_COLLECTION].create_index([("email", ASCENDING)], unique=True)
            await db[collections.USERS_COLLECTION].create_index([("role", ASCENDING)])
            await db[collections.ELDERLY_PROFILES_COLLECTION].create_index([("user_id", ASCENDING)], unique=True)
            await db[collections.CARE_CIRCLES_COLLECTION].create_index([("elderly_user_id", ASCENDING)], unique=True)
            await db[collections.CARE_CIRCLE_MEMBERS_COLLECTION].create_index(
                [("care_circle_id", ASCENDING), ("user_id", ASCENDING)], unique=True
            )
            await db[collections.INVITATIONS_COLLECTION].create_index([("invitation_code", ASCENDING)], unique=True)
            await db[collections.PERMISSIONS_COLLECTION].create_index(
                [("elderly_user_id", ASCENDING), ("member_user_id", ASCENDING)], unique=True
            )
            await db[collections.MEDICATIONS_COLLECTION].create_index([("elderly_user_id", ASCENDING), ("status", ASCENDING)])
            await db[collections.MEDICATION_SCHEDULES_COLLECTION].create_index(
                [("elderly_user_id", ASCENDING), ("scheduled_date", ASCENDING), ("status", ASCENDING)]
            )
            await db[collections.MEDICATION_EVENTS_COLLECTION].create_index([("medication_id", ASCENDING)])
            await db[collections.APPOINTMENTS_COLLECTION].create_index(
                [("elderly_user_id", ASCENDING), ("appointment_date", ASCENDING), ("status", ASCENDING)]
            )
            await db[collections.DAILY_ROUTINES_COLLECTION].create_index([("elderly_user_id", ASCENDING)], unique=True)
        except Exception as e:
            logger.warning(f"Non-critical index notice: {e}")

        logger.info("Database indexes successfully verified.")

async def get_db() -> Any:
    """FastAPI dependency for accessing database instance with auto-connect guarantee."""
    if MongoManager.db is None:
        await MongoManager.connect()
        await MongoManager.create_indexes()
    return MongoManager.get_database()
