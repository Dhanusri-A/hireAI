from typing import Optional, List
from sqlalchemy.orm import Session

from app.db.models.interview_recording import InterviewRecording


class InterviewRecordingCRUD:

    # GET by section + question
    @staticmethod
    def get_by_section_and_question(
        db: Session,
        section_id: str,
        question_index: int,
    ) -> Optional[InterviewRecording]:
        return (
            db.query(InterviewRecording)
            .filter(
                InterviewRecording.section_id == section_id,
                InterviewRecording.question_index == question_index,
            )
            .first()
        )

    # GET ALL by section
    @staticmethod
    def get_all_by_section(
        db: Session,
        section_id: str,
    ) -> List[InterviewRecording]:
        return (
            db.query(InterviewRecording)
            .filter(InterviewRecording.section_id == section_id)
            .order_by(InterviewRecording.question_index)
            .all()
        )

    # UPSERT — insert or update by section + question index
    @staticmethod
    def upsert(
        db: Session,
        section_id: str,
        question_index: int,
        s3_object_key: str,
    ) -> InterviewRecording:
        recording = InterviewRecordingCRUD.get_by_section_and_question(
            db, section_id, question_index
        )

        if recording:
            recording.s3_object_key = s3_object_key
        else:
            recording = InterviewRecording(
                section_id=section_id,
                question_index=question_index,
                s3_object_key=s3_object_key,
            )
            db.add(recording)

        db.commit()
        db.refresh(recording)
        return recording

    # DELETE one
    @staticmethod
    def delete(
        db: Session,
        section_id: str,
        question_index: int,
    ) -> bool:
        recording = InterviewRecordingCRUD.get_by_section_and_question(
            db, section_id, question_index
        )
        if not recording:
            return False
        db.delete(recording)
        db.commit()
        return True