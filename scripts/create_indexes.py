"""
CareSight MongoDB Index Initialization Script
Executes asynchronous index creation across all 21 collections in carecircle_db.
"""

import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database.connection import MongoManager

async def main():
    print("Connecting to MongoDB for index setup...")
    await MongoManager.connect()
    try:
        await MongoManager.create_indexes()
        print("All 21 MongoDB collection indexes successfully created and verified!")
    finally:
        await MongoManager.close()

if __name__ == "__main__":
    asyncio.run(main())
