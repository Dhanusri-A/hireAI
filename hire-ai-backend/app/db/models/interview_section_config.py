import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.db.models.interview import Interview
    from app.db.models.interview_recording import InterviewRecording


class InterviewSectionConfig(Base):
    __tablename__ = "interview_section_configs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    interview_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    type: Mapped[str] = mapped_column(String(100), nullable=False)

    no_of_questions: Mapped[int] = mapped_column(Integer, nullable=False)

    custom_questions: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    is_follow_up: Mapped[bool] = mapped_column(Boolean, default=False)

    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    seconds_per_question: Mapped[int] = mapped_column(Integer, default=40, nullable=False)

    questions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    qa: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)

    ai_score: Mapped[int | None] = mapped_column(nullable=True)

    ai_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    status: Mapped[str] = mapped_column(
        String(50),
        default="Not Started"
    )

    interview: Mapped["Interview"] = relationship(
        "Interview",
        back_populates="sections"
    )

    recordings: Mapped[list["InterviewRecording"]] = relationship(
        "InterviewRecording",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="InterviewRecording.question_index",
    )