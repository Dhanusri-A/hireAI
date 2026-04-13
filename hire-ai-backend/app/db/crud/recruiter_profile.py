from sqlalchemy.orm import Session
from app.db.models.recruiter_profile import RecruiterProfile


class RecruiterProfileCRUD:

    @staticmethod
    def create(db: Session, user_id: str, data: dict) -> RecruiterProfile:
        profile = RecruiterProfile(user_id=user_id, **data)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def get_by_user_id(db: Session, user_id: str) -> RecruiterProfile | None:
        return db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user_id).first()

    @staticmethod
    def update(db: Session, user_id: str, data: dict) -> RecruiterProfile | None:
        profile = RecruiterProfileCRUD.get_by_user_id(db, user_id)
        if not profile:
            return None
        for key, value in data.items():
            setattr(profile, key, value)
        db.commit()
        db.refresh(profile)
        return profile
