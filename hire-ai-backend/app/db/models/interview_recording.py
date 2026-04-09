from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.db.models.interview_section_config import InterviewSectionConfig


class InterviewRecording(Base):
    __tablename__ = "interview_recordings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    section_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("interview_section_configs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    s3_object_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    section: Mapped["InterviewSectionConfig"] = relationship(
        "InterviewSectionConfig",
        back_populates="recordings",
    )

    __table_args__ = (
        UniqueConstraint("section_id", "question_index"),
    )