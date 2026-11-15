import logging
from contextlib import asynccontextmanager
from bson import ObjectId
from fastapi import FastAPI
from fastapi.encoders import ENCODERS_BY_TYPE
from fastapi.middleware.cors import CORSMiddleware

# Ensure ObjectId serializes to string globally across all FastAPI endpoints
ENCODERS_BY_TYPE[ObjectId] = str

from app.config.settings import settings
from app.database.connection import MongoManager
from app.routers import (
    auth,
    profiles,
    medications,
    appointments,
    care_circle,
    ai,
    documents,
    notifications,
    emergency,
    analytics,
    routine,
    scheduler,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("caresight.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB Atlas connection & build indexes
    logger.info("Initializing CareSight Platform...")
    await MongoManager.connect()
    await MongoManager.create_indexes()
    logger.info("CareSight Platform ready.")
    yield
    # Shutdown: Close MongoDB connection pool
    logger.info("Shutting down CareSight Platform...")
    await MongoManager.close()

app = FastAPI(
    title="CareSight API",
    description="Intelligent Elderly Care & Family Health Coordination Platform — MongoDB Atlas Exclusive",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(medications.router)
app.include_router(appointments.router)
app.include_router(care_circle.router)
app.include_router(ai.router)
app.include_router(documents.router)
app.include_router(notifications.router)
app.include_router(emergency.router)
app.include_router(analytics.router)
app.include_router(routine.router)
app.include_router(scheduler.router)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CareSight API",
        "database": "MongoDB Atlas",
        "database_name": settings.MONGODB_DATABASE,
        "is_mock_db": MongoManager.is_mock,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
