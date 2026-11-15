from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenRefreshRequest, TokenResponse, UserResponse
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.middleware.auth_middleware import get_current_user
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(request: UserRegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    email_clean = request.email.lower().strip()
    existing = await db[collections.USERS_COLLECTION].find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user account with this email address already exists."
        )

    now = datetime.now(timezone.utc)
    hashed_pw = hash_password(request.password)

    user_doc = {
        "email": email_clean,
        "password_hash": hashed_pw,
        "role": request.role,
        "first_name": request.first_name.strip(),
        "last_name": request.last_name.strip(),
        "phone_number": request.phone_number,
        "is_active": True,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
    }
    res = await db[collections.USERS_COLLECTION].insert_one(user_doc)
    user_id = str(res.inserted_id)

    # If elderly user, initialize elderly_profile and primary care_circle
    if request.role == "elderly":
        profile_doc = {
            "user_id": res.inserted_id,
            "preferred_language": request.preferred_language or "en",
            "time_zone": "Asia/Kolkata",
            "allergies": [],
            "chronic_conditions": [],
            "accessibility_preferences": {
                "large_font": True,
                "high_contrast": False,
                "voice_enabled": True,
                "simplified_view": True,
            },
            "created_at": now,
            "updated_at": now,
        }
        await db[collections.ELDERLY_PROFILES_COLLECTION].insert_one(profile_doc)

        circle_doc = {
            "elderly_user_id": res.inserted_id,
            "circle_name": f"{request.first_name}'s Circle of Care",
            "created_at": now,
            "updated_at": now,
        }
        await db[collections.CARE_CIRCLES_COLLECTION].insert_one(circle_doc)

        routine_doc = {
            "elderly_user_id": res.inserted_id,
            "wake_up_time": "07:00",
            "breakfast_time": "08:30",
            "lunch_time": "13:00",
            "dinner_time": "20:00",
            "bed_time": "22:00",
            "exercise_preference": "Morning 20-min gentle walk",
            "rest_intervals": ["14:30 - 15:30 Afternoon rest"],
            "updated_at": now,
        }
        await db[collections.DAILY_ROUTINES_COLLECTION].insert_one(routine_doc)

    token_data = {"sub": user_id, "email": email_clean, "role": request.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_info = {
        "id": user_id,
        "email": email_clean,
        "role": request.role,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "phone_number": request.phone_number,
    }

    await PermissionService.log_audit_event(
        db, user_id, user_id, "USER_REGISTERED", "users", user_id, {"role": request.role}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_info
    )

@router.post("/login", response_model=TokenResponse)
async def login_user(request: UserLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    email_clean = request.email.lower().strip()
    user = await db[collections.USERS_COLLECTION].find_one({"email": email_clean, "is_active": True})
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate role matching if role was explicitly chosen
    if request.role and user.get("role") != request.role:
        role_labels = {
            "elderly": "Senior User",
            "family": "Family Member",
            "caregiver": "Caregiver"
        }
        actual_label = role_labels.get(user.get("role"), user.get("role"))
        chosen_label = role_labels.get(request.role, request.role)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account is registered as a {actual_label}, not as a {chosen_label}. Please select '{actual_label}' to sign in."
        )

    user_id = str(user["_id"])
    token_data = {"sub": user_id, "email": email_clean, "role": user["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_info = {
        "id": user_id,
        "email": email_clean,
        "role": user["role"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "phone_number": user.get("phone_number"),
    }

    await PermissionService.log_audit_event(
        db, user_id, user_id, "USER_LOGGED_IN", "users", user_id
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_info
    )

@router.post("/refresh")
async def refresh_access_token(request: TokenRefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type: expected refresh token")
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=401, detail="Invalid user ID in refresh token")
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token has expired or is invalid.")

    user = await db[collections.USERS_COLLECTION].find_one({"_id": ObjectId(user_id), "is_active": True})
    if not user:
        raise HTTPException(status_code=401, detail="User account no longer active")

    token_data = {"sub": user_id, "email": user["email"], "role": user["role"]}
    new_access_token = create_access_token(token_data)
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    return {"message": "Logged out successfully from CareSight session."}

@router.get("/me")
async def get_my_account(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "first_name": current_user.get("first_name", ""),
        "last_name": current_user.get("last_name", ""),
        "phone_number": current_user.get("phone_number"),
    }
