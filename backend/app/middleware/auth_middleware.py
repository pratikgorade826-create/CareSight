from typing import Optional, List
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.config.settings import settings
from app.database.connection import get_db
from app.database import collections
from app.utils.security import decode_token

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db = Depends(get_db)
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type: expected access token",
            )
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user identifier in token",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please refresh your session.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = await db[collections.USERS_COLLECTION].find_one({"_id": ObjectId(user_id), "is_active": True})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account does not exist or has been deactivated",
        )
    user["id"] = str(user["_id"])
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} role(s)",
            )
        return current_user
    return role_checker
