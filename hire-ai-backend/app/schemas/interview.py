from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Dict, Optional
from datetime import datetime, date as dt_date, time as dt_time


class InterviewBase(BaseModel):
    candidate_id: str
    job_id: str
    candidate_name: str = Field(..., min_length=1, max_length=255)
    candidate_email: EmailStr = Field(..., max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    interview_type: str = Field(..., min_length=1, max_length=100)
    date: dt_date                          # YYYY-MM-DD
    time: dt_time                          # HH:MM:SS
    duration: str = Field(..., max_length=100)
    meeting_location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)
    

class InterviewSection(BaseModel):

    type: str
    no_of_questions: int
    custom_questions: Optional[list[str]] = None
    is_follow_up: bool = False
    seconds_per_question: int = 40
    order_index: int


class InterviewCreate(BaseModel):
    """Fields required to schedule an interview.
    recruiter_id is injected from the current authenticated user — not sent by client.
    """
    job_id: str
    candidate_name: str = Field(..., min_length=1, max_length=255)
    candidate_email: EmailStr = Field(..., max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    interview_type: str = Field(..., min_length=1, max_length=100)
    date: dt_date                          # YYYY-MM-DD
    time: dt_time                          # HH:MM:SS
    duration: str = Field(..., max_length=100)
    meeting_location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)

    sections: list[InterviewSection]


# For Bulk Imports
class CandidateInput(BaseModel):
    candidate_name: str = Field(..., min_length=1, max_length=255)
    candidate_email: EmailStr = Field(..., max_length=255)

class InterviewBulkCreate(BaseModel):
    job_id: str
    job_title: str = Field(..., min_length=1, max_length=255)
    interview_type: str = Field(..., min_length=1, max_length=100)
    date: dt_date
    time: dt_time
    duration: str = Field(..., max_length=100)
    meeting_location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)

    candidates: list[CandidateInput]
    sections: list[InterviewSection]

    

class InterviewUpdate(BaseModel):
    """All fields optional for partial update."""
    job_id: str
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = Field(None, min_length=1, max_length=255)
    candidate_email: Optional[EmailStr] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, min_length=1, max_length=255)
    interview_type: Optional[str] = Field(None, max_length=100)
    date: Optional[dt_date] = None
    time: Optional[dt_time] = None
    duration: Optional[str] = Field(None, max_length=100)
    meeting_location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)
    scores: Optional[int] = Field(None, ge=0, le=100)
    ai_summary : Optional[str] = Field(None, max_length=2000)




class InterviewRecordingBase(BaseModel):
    section_id: str 
    question_index: int 
    s3_object_key: str 


class InterviewRecordingCreate(InterviewRecordingBase):
    pass


class InterviewRecordingUpdate(BaseModel):
    question_index: Optional[int]
    s3_object_key: Optional[str] 


class InterviewRecordingRead(InterviewRecordingBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewRecordingList(BaseModel):
    items: list[InterviewRecordingRead]
    total: int



class InterviewSectionResponse(BaseModel):
    id: str
    interview_id: str
    type: str
    no_of_questions: int
    custom_questions: list[str] | None = None
    is_follow_up: bool
    order_index: int
    seconds_per_question: int
    questions: list[str] | None = None
    qa: list[dict] | None = None
    ai_score: int | None = None
    ai_summary: dict | None = None
    status: str

    recordings : list[InterviewRecordingRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class InterviewResponse(InterviewBase):
    """What the frontend receives."""
    id: str
    recruiter_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    sections: list[InterviewSectionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)



class QuestionAnswer(BaseModel):
    question: str
    answer: str

class InterviewQARequest(BaseModel):
    qa: list[QuestionAnswer]


class SectionAnswerRequest(BaseModel):
    qa: list[QuestionAnswer]


class FollowUpRequest(BaseModel):
    question: str
    answer: str



class PresignedUrlRequest(BaseModel):
    question_index: int


class PresignedUrlResponse(BaseModel):
    presigned_url: str
    object_key: str


class CompleteInterviewRecordingRequest(BaseModel):
    object_key: str


class InterviewVideoResponse(BaseModel):
    video_url: str