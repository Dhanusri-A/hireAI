from datetime import datetime
import uuid

from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.db.models.user import User


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )

    # ── Step 1: Company Info ──────────────────────────────────────────────────
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    company_size: Mapped[str] = mapped_column(String(50), nullable=False)
    company_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    founded_year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    specializations: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # ── Step 2: Location ─────────────────────────────────────────────────────
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    headquarters: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Social / Web links
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    twitter_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    glassdoor_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Step 3: Recruiter Info ────────────────────────────────────────────────
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    recruiter_linkedin: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Step 4: Hiring Preferences ────────────────────────────────────────────
    hiring_roles: Mapped[list | None] = mapped_column(JSON, nullable=True)
    experience_levels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    employment_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    work_modes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    salary_range_min: Mapped[str | None] = mapped_column(String(50), nullable=True)
    salary_range_max: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", backref="recruiter_profile")
