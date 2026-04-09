from enum import Enum

class InterviewStatus(str, Enum):
    NOT_STARTED = "Not Started"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    MALPRACTICE = "Malpractice"