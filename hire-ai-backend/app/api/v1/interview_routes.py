from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, require_role
from app.db.base import get_db
from app.db.crud.interview import InterviewCRUD
from app.db.crud.interview_recording import InterviewRecordingCRUD
from app.db.crud.user import UserCRUD
from app.db.models.user import User
from app.db.models.user_role import UserRole
from app.db.models.interview_status import InterviewStatus
from app.schemas.interview import (
    CompleteInterviewRecordingRequest, FollowUpRequest, InterviewBulkCreate,
    InterviewCreate, InterviewUpdate, InterviewResponse, InterviewVideoResponse,
    PresignedUrlRequest, PresignedUrlResponse, SectionAnswerRequest,
)
from app.services.ai_interview import (
    evaluate_section_answers, generate_follow_up_question,
    generate_section_questions, validate_interview_time,
)
from app.services.email_sender import send_interview_completed_email
from app.schemas.interview import InterviewQARequest

from app.db.crud.interview import InterviewCRUD
from app.db.crud.interview_section import SectionCRUD
from app.db.crud.job_description import JobDescriptionCRUD

from datetime import datetime, timedelta
import uuid

import boto3
from botocore.config import Config
from app.core.config import AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4"),
)


router = APIRouter(
    prefix="/interviews",
    tags=["interviews"],
    dependencies=[Depends(get_current_user)],
)



# ── POST /interviews ─────────────────────────────────────────────────────────────

@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    interview_data: InterviewCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "recruiter")),
):
    try:
        db_interview = InterviewCRUD.create_interview(
            db, interview_data, recruiter_id=current_user.id, background_tasks=background_tasks,
        )
        return db_interview
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to create interview: {str(e)}")


@router.post(
    "/bulk",
    response_model=list[InterviewResponse],
    status_code=status.HTTP_201_CREATED
)
def bulk_create_interviews(
    interview_data: InterviewBulkCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "recruiter")),
):
    created_interviews = []

    try:
        for candidate in interview_data.candidates:
            db_interview = InterviewCRUD.create_interview(
                db=db,
                interview_data=InterviewCreate(
                    job_id=interview_data.job_id,
                    candidate_name=candidate.candidate_name,
                    candidate_email=candidate.candidate_email,
                    job_title=interview_data.job_title,
                    interview_type=interview_data.interview_type,
                    date=interview_data.date,
                    time=interview_data.time,
                    duration=interview_data.duration,
                    meeting_location=interview_data.meeting_location,
                    notes=interview_data.notes,
                    sections=interview_data.sections,
                ),
                recruiter_id=current_user.id,
                background_tasks=background_tasks,
            )

            created_interviews.append(db_interview)

        return created_interviews

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to bulk create interviews: {str(e)}"
        )
    

# ── GET /interviews ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[InterviewResponse])
def get_all_interviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(require_role("admin")),
):
    return InterviewCRUD.get_all_interviews(db, skip=skip, limit=limit)


# ── GET /interviews/candidate/{candidate_id} ────────────────────────────────────

@router.get("/candidate/{candidate_id}", response_model=list[InterviewResponse])
def get_interviews_by_candidate(
    candidate_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "candidate")),
):
    
    if user.id != candidate_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this candidate's interviews")

    interviews = InterviewCRUD.get_by_candidate_id(db, candidate_id, skip=skip, limit=limit)
    if not interviews:
        raise HTTPException(status_code=404, detail=f"No interviews found for candidate ID {candidate_id}")
    return interviews


# ── GET /interviews/recruiter/{recruiter_id} ────────────────────────────────────

@router.get("/recruiter/{recruiter_id}", response_model=list[InterviewResponse])
def get_interviews_by_recruiter(
    recruiter_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "recruiter")),
):
    if user.id != recruiter_id:
        raise HTTPException(status_code=403, detail="Not authorized to access other recruiter's interviews")

    interviews = InterviewCRUD.get_by_recruiter_id(db, recruiter_id, skip=skip, limit=limit)
    if not interviews:
        raise HTTPException(status_code=404, detail=f"No interviews found for recruiter ID {recruiter_id}")
    return interviews


# ── GET /interviews/jobs/{job_id} ────────────────────────────────────

@router.get("/job/{job_id}", response_model=list[InterviewResponse])
def get_interviews_by_job(
    job_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "recruiter")),
):
    
    job = JobDescriptionCRUD.get_job_by_id(db=db,job_id=job_id)
    if not job:
        raise ValueError("Invalid job_id")
    
    interviews = InterviewCRUD.get_by_job_id(db, job_id, skip, limit)

    if not interviews:
        raise HTTPException(
            status_code=404,
            detail=f"No interviews found for job ID {job_id}"
        )

    return interviews


# ── GET /interviews/{interview_id} ───────────────────────────────────────────────

@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "recruiter", "candidate")),
):
    db_interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail=f"Interview with ID {interview_id} not found")
    return db_interview


# ── PUT /interviews/{interview_id} ───────────────────────────────────────────────

@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: str,
    interview_data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "recruiter")),
):
    db_interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail=f"Interview with ID {interview_id} not found")
    if db_interview.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update interviews you created.")
    update_payload = interview_data.model_dump(exclude_unset=True)
    return InterviewCRUD.update_interview(db, interview_id, update_payload)


# ── DELETE /interviews/{interview_id} ────────────────────────────────────────────

@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user=Depends(require_role("admin", "recruiter")),
):
    db_interview = InterviewCRUD.get_interview_by_id(db, interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail=f"Interview with ID {interview_id} not found")
    if db_interview.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete interviews you created.")
    InterviewCRUD.delete_interview(db, interview_id)
    return None

