from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field
from app.models.py_object_id import PyObjectId

UserRole = Literal["elderly", "family", "caregiver"]

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = "en"  # "en", "hi", "mr"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[UserRole] = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    is_active: bool = True
    created_at: datetime
