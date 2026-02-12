from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.models import User, UserRole, JobDescription, CandidateProfile, Education, WorkExperience
from app.core.security import hash_password, verify_password
from app.schemas.job import JobDescriptionCreate
from app.schemas.user import UserCreate, UserUpdate, UserResponse


class UserCRUD:
    """CRUD operations for User model."""

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> User:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_user_by_email_or_username(db: Session, email_or_username: str) -> User:
        """Get user by email or username."""
        return db.query(User).filter(
            or_(User.email == email_or_username, User.username == email_or_username)
        ).first()

    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
        """Get all users with pagination."""
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if email or username already exists
        if UserCRUD.get_user_by_email(db, user_data.email):
            raise ValueError(f"Email {user_data.email} already registered")
        if UserCRUD.get_user_by_username(db, user_data.username):
            raise ValueError(f"Username {user_data.username} already taken")

        # Create user with hashed password
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hash_password(user_data.password),
            role=user_data.role or UserRole.CANDIDATE,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_user(db: Session, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user details."""
        db_user = UserCRUD.get_user_by_id(db, user_id)
        if not db_user:
            return None

        update_data = user_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if key == "password":
                    setattr(db_user, "hashed_password", hash_password(value))
                else:
                    setattr(db_user, key, value)

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def delete_user(db: Session, user_id: str) -> bool:
        """Delete a user (soft delete by setting is_active to False)."""
        db_user = UserCRUD.get_user_by_id(db, user_id)
        if not db_user:
            return False

        db_user.is_active = False
        db.add(db_user)
        db.commit()
        return True

    @staticmethod
    def authenticate_user(db: Session, email_or_username: str, password: str) -> Optional[User]:
        """Authenticate user and return user object if valid."""
        db_user = UserCRUD.get_user_by_email_or_username(db, email_or_username)
        if not db_user:
            return None
        if not verify_password(password, db_user.hashed_password):
            return None
        if not db_user.is_active:
            return None
        return db_user

    @staticmethod
    def get_users_by_role(db: Session, role: UserRole) -> list[User]:
        """Get all users with a specific role."""
        return db.query(User).filter(User.role == role).all()


# ======================== JOB DESCRIPTION CRUD ========================

class JobDescriptionCRUD:
    """CRUD operations for JobDescription model."""

    @staticmethod
    def create_job(db: Session, job_data: JobDescriptionCreate,generated_description: dict, user_id: str) -> JobDescription:
        """Create a new job description."""
        payload = job_data.model_dump()
        payload["output_description"] = generated_description
        payload["user_id"] = user_id
        db_job = JobDescription(**payload)
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        return db_job

    @staticmethod
    def get_job_by_id(db: Session, job_id: str) -> Optional[JobDescription]:
        """Get job description by ID."""
        return db.query(JobDescription).filter(JobDescription.id == job_id).first()

    @staticmethod
    def get_all_jobs(db: Session, skip: int = 0, limit: int = 100) -> list[JobDescription]:
        """Get all job descriptions with pagination."""
        return db.query(JobDescription).offset(skip).limit(limit).all()

    @staticmethod
    def update_job(db: Session, job_id: str, job_data: dict) -> Optional[JobDescription]:
        """Update job description by ID."""
        db_job = JobDescriptionCRUD.get_job_by_id(db, job_id)
        if not db_job:
            return None

        for key, value in job_data.items():
            if value is not None:
                setattr(db_job, key, value)

        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        return db_job

    @staticmethod
    def delete_job(db: Session, job_id: str) -> bool:
        """Delete job description by ID."""
        db_job = JobDescriptionCRUD.get_job_by_id(db, job_id)
        if not db_job:
            return False

        db.delete(db_job)
        db.commit()
        return True
    
    @staticmethod
    def get_user_jobs(db: Session, user_id: str):
        return db.query(JobDescription).filter(JobDescription.user_id == user_id).all()



# ======================== CANDIDATE PROFILE CRUD ========================

class CandidateProfileCRUD:
    """CRUD operations for CandidateProfile model."""

    @staticmethod
    def create_candidate_profile(db: Session, user_id: str, profile_data: dict) -> CandidateProfile:
        """Create a new candidate profile."""
        db_profile = CandidateProfile(user_id=user_id, **profile_data)
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    @staticmethod
    def get_profile_by_id(db: Session, profile_id: str) -> Optional[CandidateProfile]:
        """Get candidate profile by ID."""
        return db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()

    @staticmethod
    def get_profile_by_user_id(db: Session, user_id: str) -> Optional[CandidateProfile]:
        """Get candidate profile by user ID."""
        return db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()

    @staticmethod
    def get_all_profiles(db: Session, skip: int = 0, limit: int = 100) -> list[CandidateProfile]:
        """Get all candidate profiles with pagination."""
        return db.query(CandidateProfile).offset(skip).limit(limit).all()

    @staticmethod
    def update_profile(db: Session, profile_id: str, profile_data: dict) -> Optional[CandidateProfile]:
        """Update candidate profile by ID."""
        db_profile = CandidateProfileCRUD.get_profile_by_id(db, profile_id)
        if not db_profile:
            return None

        for key, value in profile_data.items():
            if value is not None:
                setattr(db_profile, key, value)

        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    @staticmethod
    def delete_profile(db: Session, profile_id: str) -> bool:
        """Delete candidate profile by ID."""
        db_profile = CandidateProfileCRUD.get_profile_by_id(db, profile_id)
        if not db_profile:
            return False

        db.delete(db_profile)
        db.commit()
        return True


# ======================== EDUCATION CRUD ========================

class EducationCRUD:
    """CRUD operations for Education model."""

    @staticmethod
    def create_education(db: Session, candidate_profile_id: str, education_data: dict) -> Education:
        """Create a new education record."""
        db_education = Education(candidate_profile_id=candidate_profile_id, **education_data)
        db.add(db_education)
        db.commit()
        db.refresh(db_education)
        return db_education

    @staticmethod
    def get_education_by_id(db: Session, education_id: str) -> Optional[Education]:
        """Get education record by ID."""
        return db.query(Education).filter(Education.id == education_id).first()

    @staticmethod
    def get_educations_by_candidate(db: Session, candidate_profile_id: str, skip: int = 0, limit: int = 100) -> list[Education]:
        """Get all education records for a candidate."""
        return db.query(Education).filter(Education.candidate_profile_id == candidate_profile_id).offset(skip).limit(limit).all()

    @staticmethod
    def update_education(db: Session, education_id: str, education_data: dict) -> Optional[Education]:
        """Update education record by ID."""
        db_education = EducationCRUD.get_education_by_id(db, education_id)
        if not db_education:
            return None

        for key, value in education_data.items():
            if value is not None:
                setattr(db_education, key, value)

        db.add(db_education)
        db.commit()
        db.refresh(db_education)
        return db_education

    @staticmethod
    def delete_education(db: Session, education_id: str) -> bool:
        """Delete education record by ID."""
        db_education = EducationCRUD.get_education_by_id(db, education_id)
        if not db_education:
            return False

        db.delete(db_education)
        db.commit()
        return True


# ======================== WORK EXPERIENCE CRUD ========================

class WorkExperienceCRUD:
    """CRUD operations for WorkExperience model."""

    @staticmethod
    def create_work_experience(db: Session, candidate_profile_id: str, experience_data: dict) -> WorkExperience:
        """Create a new work experience record."""
        db_experience = WorkExperience(candidate_profile_id=candidate_profile_id, **experience_data)
        db.add(db_experience)
        db.commit()
        db.refresh(db_experience)
        return db_experience

    @staticmethod
    def get_work_experience_by_id(db: Session, experience_id: str) -> Optional[WorkExperience]:
        """Get work experience record by ID."""
        return db.query(WorkExperience).filter(WorkExperience.id == experience_id).first()

    @staticmethod
    def get_work_experiences_by_candidate(db: Session, candidate_profile_id: str, skip: int = 0, limit: int = 100) -> list[WorkExperience]:
        """Get all work experience records for a candidate."""
        return db.query(WorkExperience).filter(WorkExperience.candidate_profile_id == candidate_profile_id).offset(skip).limit(limit).all()

    @staticmethod
    def update_work_experience(db: Session, experience_id: str, experience_data: dict) -> Optional[WorkExperience]:
        """Update work experience record by ID."""
        db_experience = WorkExperienceCRUD.get_work_experience_by_id(db, experience_id)
        if not db_experience:
            return None

        for key, value in experience_data.items():
            if value is not None:
                setattr(db_experience, key, value)

        db.add(db_experience)
        db.commit()
        db.refresh(db_experience)
        return db_experience

    @staticmethod
    def delete_work_experience(db: Session, experience_id: str) -> bool:
        """Delete work experience record by ID."""
        db_experience = WorkExperienceCRUD.get_work_experience_by_id(db, experience_id)
        if not db_experience:
            return False

        db.delete(db_experience)
        db.commit()
        return True

