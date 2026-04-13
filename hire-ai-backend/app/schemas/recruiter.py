from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.db.models.user_role import UserRole


# ── Recruiter Company Profile ──────────────────────────────────────────────────

class RecruiterProfileCreate(BaseModel):
    # Step 1: Company Info
    company_name: str = Field(..., max_length=255)
    industry: str = Field(..., max_length=100)
    company_size: str = Field(..., max_length=50)
    company_type: Optional[str] = Field(None, max_length=50)
    founded_year: Optional[str] = Field(None, max_length=10)
    description: Optional[str] = None
    specializations: Optional[list[str]] = None
    # Step 2: Location
    country: str = Field(..., max_length=100)
    city: str = Field(..., max_length=100)
    headquarters: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    twitter_url: Optional[str] = Field(None, max_length=500)
    glassdoor_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    # Step 3: Recruiter Info
    job_title: str = Field(..., max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    recruiter_linkedin: Optional[str] = Field(None, max_length=500)
    profile_photo_url: Optional[str] = Field(None, max_length=500)
    # Step 4: Hiring Preferences
    hiring_roles: Optional[list[str]] = None
    experience_levels: Optional[list[str]] = None
    employment_types: Optional[list[str]] = None
    work_modes: Optional[list[str]] = None
    salary_range_min: Optional[str] = Field(None, max_length=50)
    salary_range_max: Optional[str] = Field(None, max_length=50)


class RecruiterProfileResponse(RecruiterProfileCreate):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Recruiter User ─────────────────────────────────────────────────────────────

class RecruiterBase(BaseModel):
    """Base recruiter schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)


class RecruiterCreate(RecruiterBase):
    """Recruiter creation schema."""
    password: str = Field(..., min_length=8)


class RecruiterUpdate(BaseModel):
    """Recruiter update schema."""
    full_name: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None


class RecruiterResponse(RecruiterBase):
    """Recruiter response schema."""
    id: str
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)