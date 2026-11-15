import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB Atlas Settings
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "carecircle_db"
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_POOL_SIZE: int = 50

    # JWT Authentication
    JWT_SECRET_KEY: str = "caresight_super_secret_jwt_key_change_in_production_32bytes_min!"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_SECRET_KEY: str = "caresight_super_secret_refresh_jwt_key_change_in_production!"
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Email Notifications
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = "notifications@caresight.example.com"
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = "CareSight Notifications <notifications@caresight.example.com>"

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = "caresight-production"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GCS_BUCKET_NAME: str = ""

    # URLs and Environment
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # File storage
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
