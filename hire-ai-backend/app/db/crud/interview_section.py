from typing import List, Optional
from sqlalchemy.orm import Session

from app.db.models.interview_section_config import InterviewSectionConfig


class SectionCRUD:

    # ------------------------------------------------
    # CREATE
    # ------------------------------------------------
    @staticmethod
    def create(
        db: Session,
        interview_id: str,
        type: str,
        no_of_questions: int,
        custom_questions: Optional[list[str]] = None,
        is_follow_up: bool = False,
    ) -> InterviewSectionConfig:

        section = InterviewSectionConfig(
            interview_id=interview_id,
            type=type,
            no_of_questions=no_of_questions,
            custom_questions=custom_questions,
            is_follow_up=is_follow_up,
        )

        db.add(section)
        db.commit()
        db.refresh(section)

        return section


    # ------------------------------------------------
    # GET BY ID
    # ------------------------------------------------
    @staticmethod
    def get(
        db: Session,
        section_id: str
    ) -> Optional[InterviewSectionConfig]:

        return (
            db.query(InterviewSectionConfig)
            .filter(InterviewSectionConfig.id == section_id)
            .first()
        )


    # ------------------------------------------------
    # GET ALL SECTIONS FOR INTERVIEW
    # ------------------------------------------------
    @staticmethod
    def get_by_interview(
        db: Session,
        interview_id: str
    ) -> List[InterviewSectionConfig]:

        return (
            db.query(InterviewSectionConfig)
            .filter(
                InterviewSectionConfig.interview_id == interview_id
            )
            .all()
        )


    # ------------------------------------------------
    # UPDATE QUESTIONS
    # ------------------------------------------------
    @staticmethod
    def update_questions(
        db: Session,
        section: InterviewSectionConfig,
        questions: list[str]
    ) -> InterviewSectionConfig:

        section.questions = questions
        section.status = "Ongoing"

        db.commit()
        db.refresh(section)

        return section


    # ------------------------------------------------
    # SAVE ANSWERS
    # ------------------------------------------------
    @staticmethod
    def save_answers(
        db: Session,
        section: InterviewSectionConfig,
        qa: list[dict]
    ) -> InterviewSectionConfig:

        section.qa = qa

        db.commit()
        db.refresh(section)

        return section


    # ------------------------------------------------
    # SAVE AI EVALUATION
    # ------------------------------------------------
    @staticmethod
    def save_evaluation(
        db: Session,
        section: InterviewSectionConfig,
        score: int,
        summary: dict
    ) -> InterviewSectionConfig:

        section.ai_score = score
        section.ai_summary = summary
        section.status = "Completed"

        db.commit()
        db.refresh(section)

        return section


    # ------------------------------------------------
    # UPDATE STATUS
    # ------------------------------------------------
    @staticmethod
    def update_status(
        db: Session,
        section: InterviewSectionConfig,
        status: str
    ) -> InterviewSectionConfig:

        section.status = status

        db.commit()
        db.refresh(section)

        return section
    


    # ------------------------------------------------
    # DELETE
    # ------------------------------------------------
    @staticmethod
    def delete(
        db: Session,
        section: InterviewSectionConfig
    ) -> None:

        db.delete(section)
        db.commit()
