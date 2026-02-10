from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, Any
from datetime import datetime

from app.schemas.user import UserResponse


class EducationBase(BaseModel):
    """Base education schema."""
    institution_name: Optional[str] = Field(None, max_length=255)
    degree: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=255)
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    gpa: Optional[str] = Field(None, max_length=10)
    honors: Optional[str] = Field(None, max_length=255)


class EducationCreate(EducationBase):
    """Education creation schema."""
    pass


class EducationUpdate(BaseModel):
    """Education update schema."""
    institution_name: Optional[str] = Field(None, max_length=255)
    degree: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=255)
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    gpa: Optional[str] = Field(None, max_length=10)
    honors: Optional[str] = Field(None, max_length=255)


class EducationResponse(EducationBase):
    """Education response schema."""
    id: str
    candidate_profile_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkExperienceBase(BaseModel):
    """Base work experience schema."""
    company_name: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


class WorkExperienceCreate(WorkExperienceBase):
    """Work experience creation schema."""
    pass


class WorkExperienceUpdate(BaseModel):
    """Work experience update schema."""
    company_name: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


class WorkExperienceResponse(WorkExperienceBase):
    """Work experience response schema."""
    id: str
    candidate_profile_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateProfileBase(BaseModel):
    """Base candidate profile schema."""
    first_name: Optional[str] = Field(None, max_length=155)
    last_name: Optional[str] = Field(None, max_length=155)
    title: Optional[str] = Field(None, max_length=255)
    image_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)
    skills: Optional[str] = None
    profile_summary: Optional[str] = None
    total_years_experience: Optional[str] = Field(None, max_length=50)
    notice_period: Optional[str] = Field(None, max_length=100)
    expected_salary: Optional[str] = Field(None, max_length=100)
    preferred_mode: Optional[str] = Field(None, max_length=100)
    profiles: Optional[Any] = None
    languages: Optional[Any] = None


class CandidateProfileCreate(CandidateProfileBase):
    """Candidate profile creation schema - used with user creation."""
    pass




class CandidateProfileUpdate(BaseModel):
    """Candidate profile update schema."""
    first_name: Optional[str] = Field(None, max_length=155)
    last_name: Optional[str] = Field(None, max_length=155)
    title: Optional[str] = Field(None, max_length=255)
    image_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)
    skills: Optional[str] = None
    profile_summary: Optional[str] = None
    total_years_experience: Optional[str] = Field(None, max_length=50)
    notice_period: Optional[str] = Field(None, max_length=100)
    expected_salary: Optional[str] = Field(None, max_length=100)
    preferred_mode: Optional[str] = Field(None, max_length=100)
    profiles: Optional[Any] = None
    languages: Optional[Any] = None


class CandidateProfileResponse(CandidateProfileBase):
    """Candidate profile response schema."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateCreateResponse(BaseModel):
    user: UserResponse
    profile: CandidateProfileResponse
    work_experiences: list[WorkExperienceResponse] = []
    education_records: list[EducationResponse] = []
    model_config = ConfigDict(from_attributes=True)



class CandidateProfileDetailResponse(CandidateProfileResponse):
    """Candidate profile detail response schema with education and experience."""
    education_records: Optional[list[EducationResponse]] = []
    work_experiences: Optional[list[WorkExperienceResponse]] = []



