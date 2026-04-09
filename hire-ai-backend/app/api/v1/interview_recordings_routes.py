# app/api/v1/routes/interview_recordings.py
# FIX #1: Per-section question_index (0-based within each section) is correct.
# The frontend resets sectionRecQIdxRef to 0 at each section start,
# so recordings are keyed (section_id, 0), (section_id, 1), etc. — unique per section.
# Camera backup recordings use offset +10000 on the same section_id.
# UniqueConstraint on (section_id, question_index) handles both primary + backup rows.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import boto3
from botocore.config import Config

from app.api.v1.deps import get_current_user, require_role
from app.db.base import get_db

from app.db.crud.interview import InterviewCRUD
from app.db.crud.interview_section import SectionCRUD
from app.db.crud.interview_recording import InterviewRecordingCRUD

from app.db.models.user import User

from app.schemas.interview import (
    PresignedUrlResponse,
    CompleteInterviewRecordingRequest,
    InterviewVideoResponse,
)

from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    S3_BUCKET_NAME,
)

router = APIRouter(
    prefix="/interviews/{interview_id}/sections/{section_id}/questions/{question_index}/recordings",
    tags=["interview-recordings"],
)

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4"),
)


@router.post("/presigned-url", response_model=PresignedUrlResponse)
def generate_presigned_url(
    interview_id: str,
    section_id: str,
    question_index: int,
    db: Session = Depends(get_db),
):
    """
    Generate a presigned S3 PUT URL for a recording.
    
    question_index is 0-based within the section.
    Camera backup recordings use question_index + 10000 (applied on the frontend).
    
    Object key format:
      Primary:  recordings/{interview_id}/{section_id}/q{qi:02d}/{uuid}.webm
      Backup:   recordings/{interview_id}/{section_id}/q{qi:02d}_cam/{uuid}.webm  (qi = index - 10000)
    """
    section = SectionCRUD.get(db, section_id)
    if not section or section.interview_id != interview_id:
        raise HTTPException(404, "Section not found")

    # Differentiate primary vs camera backup keys for clarity in S3
    if question_index >= 10000:
        actual_idx = question_index - 10000
        object_key = (
            f"recordings/{interview_id}/{section_id}/"
            f"q{actual_idx:02d}_cam/{uuid.uuid4()}.webm"
        )
    else:
        object_key = (
            f"recordings/{interview_id}/{section_id}/"
            f"q{question_index:02d}/{uuid.uuid4()}.webm"
        )

    presigned_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": S3_BUCKET_NAME,
            "Key": object_key,
        },
        ExpiresIn=600,
    )

    return PresignedUrlResponse(
        presigned_url=presigned_url,
        object_key=object_key,
    )


@router.post("")
def save_recording(
    interview_id: str,
    section_id: str,
    question_index: int,
    req: CompleteInterviewRecordingRequest,
    db: Session = Depends(get_db),
):
    """
    Mark a recording as complete by storing its S3 object key.
    Uses upsert — safe to call multiple times (e.g. retry on upload failure).
    """
    InterviewRecordingCRUD.upsert(
        db=db,
        section_id=section_id,
        question_index=question_index,
        s3_object_key=req.object_key,
    )
    return {"status": "saved"}


@router.get("/video", response_model=InterviewVideoResponse)
def get_video(
    interview_id: str,
    section_id: str,
    question_index: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "recruiter")),
):
    """
    Get a presigned S3 GET URL for playback.
    Only primary recordings (question_index < 10000) are exposed to recruiters here.
    Camera backups (question_index >= 10000) can be fetched by passing the offset index
    but are not shown in the default recruiter UI.
    """
    recording = InterviewRecordingCRUD.get_by_section_and_question(
        db, section_id, question_index
    )

    if not recording:
        raise HTTPException(404, "Video not found")

    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": S3_BUCKET_NAME,
            "Key": recording.s3_object_key,
        },
        ExpiresIn=3600,  # 1 hour for viewing
    )

    return {"video_url": presigned_url}