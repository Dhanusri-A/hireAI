from datetime import datetime
import enum
import uuid

from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class UserRole(str, enum.Enum):
    RECRUITER = "recruiter"
    CANDIDATE = "candidate"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        index=True,
    )

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        default=UserRole.CANDIDATE,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    candidate_profile: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<User(id={self.id}, email={self.email}, "
            f"username={self.username}, role={self.role})>"
        )


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    job_title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    
    company_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    
    department: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    level: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    tone_style: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    skills: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    responsibilities: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    additional_data: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    input_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    output_description: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user: Mapped["User"] = relationship("User", backref="job_descriptions")

    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<JobDescription(id={self.id}, job_title='{self.job_title}', company_name='{self.company_name}')>"


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    first_name: Mapped[str | None] = mapped_column(
        String(155),
        nullable=True,
    )
    
    last_name: Mapped[str | None] = mapped_column(
        String(155),
        nullable=True,
    )
    
    title: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    skills: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    profile_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    total_years_experience: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    
    notice_period: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    expected_salary: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    preferred_mode: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    profiles: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )
    
    languages: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")
    education_records: Mapped[list["Education"]] = relationship(
        "Education", back_populates="candidate_profile", cascade="all, delete-orphan"
    )
    work_experiences: Mapped[list["WorkExperience"]] = relationship(
        "WorkExperience", back_populates="candidate_profile", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CandidateProfile(id={self.id}, user_id={self.user_id}, first_name='{self.first_name}')>"


class Education(Base):
    __tablename__ = "education"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    candidate_profile_id: Mapped[str] = mapped_column(
        ForeignKey("candidate_profiles.id"),
        nullable=False,
        index=True,
    )
    
    institution_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    degree: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    
    field_of_study: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    start_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    
    end_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    
    gpa: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )
    
    honors: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    candidate_profile: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="education_records"
    )

    def __repr__(self) -> str:
        return f"<Education(id={self.id}, candidate_profile_id={self.candidate_profile_id}, degree='{self.degree}')>"


class WorkExperience(Base):
    __tablename__ = "work_experience"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    candidate_profile_id: Mapped[str] = mapped_column(
        ForeignKey("candidate_profiles.id"),
        nullable=False,
        index=True,
    )
    
    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    job_title: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    candidate_profile: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="work_experiences"
    )

    def __repr__(self) -> str:
        return f"<WorkExperience(id={self.id}, candidate_profile_id={self.candidate_profile_id}, company_name='{self.company_name}')>"
