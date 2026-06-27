from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

UserRole = Literal["admin", "editor", "viewer"]
AccessRequestStatus = Literal["pending", "approved", "rejected"]


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    username: str
    displayName: str
    role: UserRole
    isActive: bool


class LoginResponse(BaseModel):
    accessToken: str
    user: UserOut


class AccessRequestCreate(BaseModel):
    requestedUsername: str = Field(min_length=1, max_length=80)
    displayName: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=120)
    reason: str = Field(min_length=1, max_length=1200)


class AccessRequestOut(BaseModel):
    id: str
    requestedUsername: str
    displayName: str
    department: str
    email: str
    reason: str
    status: AccessRequestStatus
    createdAt: datetime
    updatedAt: datetime


class AccessRequestUpdate(BaseModel):
    status: AccessRequestStatus


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8)
    displayName: str = Field(min_length=1, max_length=120)
    role: UserRole = "viewer"
    isActive: bool = True


class UserUpdate(BaseModel):
    password: Optional[str] = Field(default=None, min_length=8)
    displayName: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role: Optional[UserRole] = None
    isActive: Optional[bool] = None


BoardData = dict[str, Any]
