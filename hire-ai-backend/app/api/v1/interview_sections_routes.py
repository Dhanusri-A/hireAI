
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta, timezone

from app.api.v1.deps import get_current_user, require_role
from app.db.base import get_db

from app.db.models.user import User
from app.db.models.user_role import UserRole
from app.db.models.interview_status import InterviewStatus

from app.db.crud.interview import InterviewCRUD
from app.db.crud.interview_section import SectionCRUD
from app.db.crud.interview_recording import InterviewRecordingCRUD
from app.db.crud.job_description import JobDescriptionCRUD

from app.schemas.interview import (
    FollowUpRequest,
    SectionAnswerRequest,
    PresignedUrlRequest,
    PresignedUrlResponse,
    CompleteInterviewRecordingRequest,
    InterviewVideoResponse,
)

from app.services.ai_interview import (
    generate_section_questions,
    generate_follow_up_question,
    evaluate_section_answers,
    validate_interview_time,
)

from botocore.config import Config
import boto3

from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    S3_BUCKET_NAME,
)

router = APIRouter(
    prefix="/interviews/{interview_id}/sections",
    tags=["interview-sections"],
)

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4"),
)



    

@router.get("/{section_id}/questions")
def get_section_questions(
    interview_id: str,
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "candidate")),
):
    interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(404, "Interview not found")

    if user.role == UserRole.CANDIDATE and interview.candidate_id != current_user.id:
        raise HTTPException(403, "Unauthorized")
    
    try:
        validate_interview_time(interview)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    section = SectionCRUD.get(db, section_id)
    if not section or section.interview_id != interview_id:
        raise HTTPException(404, "Section not found")

    if interview.status == InterviewStatus.NOT_STARTED:
        InterviewCRUD.update_status(db, interview, InterviewStatus.ONGOING)

    if section.questions:
        return {"type": section.type, "questions": section.questions}

    job = JobDescriptionCRUD.get_job_by_id(db, interview.job_id)

    if not job:
        raise HTTPException(404, "Job not found")

    result = generate_section_questions(
        job_title=interview.job_title,
        job_level=job.level, 
        skills=job.skills, 
        section_type=section.type,
        no_of_questions=section.no_of_questions,
        custom_questions=section.custom_questions,
    )

    SectionCRUD.update_questions(db, section=section, questions=result["questions"])

    return result


@router.post("/{section_id}/follow-up")
def generate_section_follow_up(
    interview_id: str,
    section_id: str,
    payload: FollowUpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "candidate")),
):
    interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(404, "Interview not found")

    section = SectionCRUD.get(db, section_id)
    if not section or section.interview_id != interview_id:
        raise HTTPException(404, "Section not found")

    if not section.is_follow_up:
        raise HTTPException(400, "Follow-up disabled for this section")
    
    job = JobDescriptionCRUD.get_job_by_id(db, interview.job_id)

    if not job:
        raise HTTPException(404, "Job not found")

    follow_up = generate_follow_up_question(
        job_title=interview.job_title,
        job_level=job.level,
        skills=job.skills,
        question=payload.question,
        answer=payload.answer,
    )

    return {"follow_up": follow_up}


@router.post("/{section_id}/evaluate")
def evaluate_section(
    interview_id: str,
    section_id: str,
    payload: SectionAnswerRequest,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "candidate", "recruiter")),
):
    interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(404, "Interview not found")

    section = SectionCRUD.get(db, section_id)
    if not section:
        raise HTTPException(404, "Section not found")
    
    job = JobDescriptionCRUD.get_job_by_id(db, interview.job_id)

    if not job:
        raise HTTPException(404, "Job not found")

    qa_data = [qa.model_dump() for qa in payload.qa]

    result = evaluate_section_answers(
        job_title=interview.job_title,
        job_level=job.level,
        skills=job.skills,
        section_type=section.type,
        qa=qa_data,
    )

    SectionCRUD.save_answers(db, section=section, qa=qa_data)

    SectionCRUD.save_evaluation(
        db,
        section=section,
        score=result["score"],
        summary=result,
    )

    return result


# ── Recording: Get all interview recordings for a section ─────────────────────

@router.get("/{section_id}/recordings")
async def get_all_recordings_for_section(
    interview_id: str,
    section_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "recruiter")),
):
    section = SectionCRUD.get(db, section_id)
    if not section or section.interview_id != interview_id:
        raise HTTPException(404, "Section not found")
    return InterviewRecordingCRUD.get_all_by_section(db, section_id)