from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_current_user
from app.db.base import get_db
from app.db.crud import UserCRUD, CandidateProfileCRUD, EducationCRUD, WorkExperienceCRUD
from app.schemas.candidate import (
    CandidateCreateResponse,
    CandidateProfileCreate,
    CandidateProfileUpdate,
    CandidateProfileResponse,
    CandidateProfileDetailResponse,
    EducationCreate,
    EducationUpdate,
    EducationResponse,
    WorkExperienceCreate,
    WorkExperienceUpdate,
    WorkExperienceResponse,
)
from app.schemas.user import UserCreate
from app.db.models import UserRole
from pydantic import BaseModel, EmailStr, Field

# Request body for candidate creation
class CandidateCreateRequest(BaseModel):
    """Request body for creating a new candidate with user and profile."""
    email: EmailStr
    first_name: str  = Field(..., max_length=155)
    last_name: str  = Field(..., max_length=155)
    title: str | None = Field(None, max_length=255)
    image_url: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    location: str | None = Field(None, max_length=255)
    skills: str | None = None
    profile_summary: str | None = None
    total_years_experience: str | None = Field(None, max_length=50)
    notice_period: str | None = Field(None, max_length=100)
    expected_salary: str | None = Field(None, max_length=100)
    preferred_mode: str | None = Field(None, max_length=100)
    languages: dict | None = None   # JSON
    profiles: dict | None = None           # JSON
    education: list[EducationCreate] = []
    work_experiences: list[WorkExperienceCreate] = []

router = APIRouter(
    prefix="/candidates",
    tags=["candidates"],
    dependencies=[Depends(get_current_user)],
)


# ======================== CANDIDATE PROFILE ENDPOINTS ========================

@router.post("", response_model=CandidateCreateResponse, status_code=status.HTTP_201_CREATED)
def create_candidate(
    candidate_data: CandidateCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new candidate (user with candidate role and profile)."""
    try:
        # Create user
        user_create = UserCreate(
            email=candidate_data.email,
            username=candidate_data.first_name+' '+candidate_data.last_name,
            password=candidate_data.first_name+'@'+candidate_data.last_name,
            role=UserRole.CANDIDATE,
        )
        db_user = UserCRUD.create_user(db, user_create)

        # Create candidate profile with provided data
        profile_dict = {
            "first_name": candidate_data.first_name,
            "last_name": candidate_data.last_name,
            "title": candidate_data.title,
            "image_url": candidate_data.image_url,
            "phone": candidate_data.phone,
            "location": candidate_data.location,
            "skills": candidate_data.skills,
            "profile_summary": candidate_data.profile_summary,
            "total_years_experience": candidate_data.total_years_experience,
            "notice_period": candidate_data.notice_period,
            "expected_salary": candidate_data.expected_salary,
            "preferred_mode": candidate_data.preferred_mode,
            "languages": candidate_data.languages,
            "profiles": candidate_data.profiles,
            
        }
        # Remove None values
        profile_dict = {k: v for k, v in profile_dict.items() if v is not None}
        db_profile = CandidateProfileCRUD.create_candidate_profile(db, db_user.id, profile_dict)
        created_educations = []
        created_work_experiences = []

        for edu in candidate_data.education:
            db_edu = EducationCRUD.create_education(
                db,
                candidate_profile_id=db_profile.id,
                education_data=edu.model_dump(exclude_unset=True),
            )
            created_educations.append(db_edu)
        for exp in candidate_data.work_experiences:
            db_exp = WorkExperienceCRUD.create_work_experience(
                db,
                candidate_profile_id=db_profile.id,
                experience_data=exp.model_dump(exclude_unset=True),
            )
            created_work_experiences.append(db_exp)

        return {
            "user": db_user,
            "profile": db_profile,
            "education_records": created_educations,
            "work_experiences": created_work_experiences,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to create candidate: {str(e)}"
        )


@router.get("", response_model=list[CandidateProfileResponse])
def get_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Get all candidates with pagination."""
    candidates = CandidateProfileCRUD.get_all_profiles(db, skip=skip, limit=limit)
    return candidates


@router.get("/{candidate_id}", response_model=CandidateProfileDetailResponse)
def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific candidate profile with education and work experience."""
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )
    return db_candidate


@router.put("/{candidate_id}", response_model=CandidateProfileResponse)
def update_candidate(
    candidate_id: str,
    profile_data: CandidateProfileUpdate,
    db: Session = Depends(get_db),
):
    """Update a candidate profile by ID."""
    update_data = profile_data.model_dump(exclude_unset=True)
    db_candidate = CandidateProfileCRUD.update_profile(db, candidate_id, update_data)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )
    return db_candidate


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    """Delete a candidate profile by ID."""
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    # Soft delete the associated user
    success = UserCRUD.delete_user(db, db_candidate.user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete candidate"
        )
    return None


# ======================== EDUCATION ENDPOINTS ========================

@router.post("/{candidate_id}/education", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
def create_education(
    candidate_id: str,
    education_data: EducationCreate,
    db: Session = Depends(get_db),
):
    """Create a new education record for a candidate."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    try:
        db_education = EducationCRUD.create_education(db, candidate_id, education_data.model_dump(exclude_unset=True))
        return db_education
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to create education record: {str(e)}"
        )


@router.get("/{candidate_id}/education", response_model=list[EducationResponse])
def get_educations(
    candidate_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Get all education records for a candidate."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    educations = EducationCRUD.get_educations_by_candidate(db, candidate_id, skip=skip, limit=limit)
    return educations


@router.put("/{candidate_id}/education/{education_id}", response_model=EducationResponse)
def update_education(
    candidate_id: str,
    education_id: str,
    education_data: EducationUpdate,
    db: Session = Depends(get_db),
):
    """Update an education record by ID."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    # Verify education belongs to candidate
    db_education = EducationCRUD.get_education_by_id(db, education_id)
    if not db_education or db_education.candidate_profile_id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Education record with ID {education_id} not found for this candidate"
        )

    update_data = education_data.model_dump(exclude_unset=True)
    db_education = EducationCRUD.update_education(db, education_id, update_data)
    return db_education


@router.delete("/{candidate_id}/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    candidate_id: str,
    education_id: str,
    db: Session = Depends(get_db),
):
    """Delete an education record by ID."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    # Verify education belongs to candidate
    db_education = EducationCRUD.get_education_by_id(db, education_id)
    if not db_education or db_education.candidate_profile_id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Education record with ID {education_id} not found for this candidate"
        )

    success = EducationCRUD.delete_education(db, education_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to delete education record"
        )
    return None


# ======================== WORK EXPERIENCE ENDPOINTS ========================

@router.post("/{candidate_id}/work-experience", response_model=WorkExperienceResponse, status_code=status.HTTP_201_CREATED)
def create_work_experience(
    candidate_id: str,
    experience_data: WorkExperienceCreate,
    db: Session = Depends(get_db),
):
    """Create a new work experience record for a candidate."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    try:
        db_experience = WorkExperienceCRUD.create_work_experience(db, candidate_id, experience_data.model_dump(exclude_unset=True))
        return db_experience
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to create work experience record: {str(e)}"
        )


@router.get("/{candidate_id}/work-experience", response_model=list[WorkExperienceResponse])
def get_work_experiences(
    candidate_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Get all work experience records for a candidate."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    experiences = WorkExperienceCRUD.get_work_experiences_by_candidate(db, candidate_id, skip=skip, limit=limit)
    return experiences


@router.put("/{candidate_id}/work-experience/{experience_id}", response_model=WorkExperienceResponse)
def update_work_experience(
    candidate_id: str,
    experience_id: str,
    experience_data: WorkExperienceUpdate,
    db: Session = Depends(get_db),
):
    """Update a work experience record by ID."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    # Verify work experience belongs to candidate
    db_experience = WorkExperienceCRUD.get_work_experience_by_id(db, experience_id)
    if not db_experience or db_experience.candidate_profile_id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work experience record with ID {experience_id} not found for this candidate"
        )

    update_data = experience_data.model_dump(exclude_unset=True)
    db_experience = WorkExperienceCRUD.update_work_experience(db, experience_id, update_data)
    return db_experience


@router.delete("/{candidate_id}/work-experience/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_experience(
    candidate_id: str,
    experience_id: str,
    db: Session = Depends(get_db),
):
    """Delete a work experience record by ID."""
    # Verify candidate exists
    db_candidate = CandidateProfileCRUD.get_profile_by_id(db, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found"
        )

    # Verify work experience belongs to candidate
    db_experience = WorkExperienceCRUD.get_work_experience_by_id(db, experience_id)
    if not db_experience or db_experience.candidate_profile_id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work experience record with ID {experience_id} not found for this candidate"
        )

    success = WorkExperienceCRUD.delete_work_experience(db, experience_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to delete work experience record"
        )
    return None
