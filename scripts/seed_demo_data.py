"""
CareSight Single Demo Account Seeder Script
Initializes carecircle_db with only ONE demo account:
demo@caresight.com ("Demo User")
Completely removes legacy names (Ramesh, Sunita, Pooja).
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database.connection import MongoManager
from app.database import collections
from app.services.demo_seeder import seed_single_demo_account, DEMO_EMAIL, DEMO_PASSWORD

async def seed_data(db=None):
    if db is None:
        db = MongoManager.get_database()

    # Clean legacy demo emails if any existed
    legacy_emails = [
        "ramesh@caresight.example.com",
        "pooja@caresight.example.com",
        "sunita@caresight.example.com"
    ]
    await db[collections.USERS_COLLECTION].delete_many({"email": {"$in": legacy_emails}})

    # Force fresh seed of single demo account
    await db[collections.USERS_COLLECTION].delete_many({"email": DEMO_EMAIL})
    await seed_single_demo_account(db)

async def main():
    print("=" * 60)
    print("CareSight — Seeding Single Demo Healthcare Account")
    print("=" * 60)
    await MongoManager.connect()
    await seed_data()

    print("\n" + "=" * 60)
    print("Demo Role Accounts Ready:")
    print(f"  1. Senior User:    {DEMO_EMAIL}           / {DEMO_PASSWORD}")
    print(f"  2. Family Member:  family.member@caresight.com   / {DEMO_PASSWORD}")
    print(f"  3. Caregiver:      caregiver.nurse@caresight.com / {DEMO_PASSWORD}")
    print("=" * 60)
    await MongoManager.close()

if __name__ == "__main__":
    asyncio.run(main())
