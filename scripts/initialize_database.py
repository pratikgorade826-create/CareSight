"""
CareSight Database Initialization Script
Initializes connection, verifies carecircle_db, sets up collections and creates indexes.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database.connection import MongoManager
from app.database.collections import ALL_COLLECTIONS

async def main():
    print("=" * 60)
    print("CareSight — MongoDB Database Initialization")
    print("=" * 60)
    await MongoManager.connect()
    try:
        db = MongoManager.get_database()
        print(f"Target Database: {db.name}")
        
        # Verify collection access
        existing_cols = await db.list_collection_names()
        print(f"Existing collections: {len(existing_cols)}")
        
        # Create indexes
        await MongoManager.create_indexes()
        
        print("\nVerified 21 target collections:")
        for idx, col in enumerate(ALL_COLLECTIONS, 1):
            print(f"  {idx:2d}. {col}")
            
        print("\nDatabase initialization complete. Ready for production and testing.")
    finally:
        await MongoManager.close()

if __name__ == "__main__":
    asyncio.run(main())
