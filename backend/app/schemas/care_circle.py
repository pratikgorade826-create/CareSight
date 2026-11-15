from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field

CircleRole = Literal["family", "caregiver"]
InvitationStatus = Literal["pending", "accepted", "expired", "rejected"]

class PermissionSettings(BaseModel):
    can_view_medications: bool = True
    can_modify_medications: bool = False
    can_confirm_medications: bool = False
    can_view_appointments: bool = True
    can_manage_appointments: bool = False
    can_view_documents: bool = False
    can_upload_documents: bool = False
    can_receive_alerts: bool = True
    can_view_timeline: bool = True

class PermissionUpdateRequest(PermissionSettings):
    member_user_id: str

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: CircleRole
    relationship_label: str = Field(min_length=1, description="e.g. Daughter, Primary Nurse, Son")
    initial_permissions: Optional[PermissionSettings] = None

class AcceptInviteRequest(BaseModel):
    invitation_code: str

class CircleMemberResponse(BaseModel):
    id: str
    user_id: str
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    role_in_circle: CircleRole
    relationship_label: str
    joined_at: datetime
    status: str
    permissions: PermissionSettings

class InvitationResponse(BaseModel):
    id: str
    care_circle_id: str
    elderly_user_id: str
    invited_email: str
    invited_role: CircleRole
    relationship_label: str
    invitation_code: str
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime

class CareCircleResponse(BaseModel):
    id: str
    elderly_user_id: str
    elderly_name: str
    circle_name: str
    members: List[CircleMemberResponse]
    pending_invitations: List[InvitationResponse]
    created_at: datetime
