from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.db.models import UserRole


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8)
    role: Optional[UserRole] = UserRole.CANDIDATE


class UserUpdate(BaseModel):
    """User update schema."""
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    """User response schema."""
    id: str
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True


class UserLogin(BaseModel):
    """User login schema."""
    email_or_username: str = Field(..., description="Email or username")
    password: str = Field(..., min_length=8)
