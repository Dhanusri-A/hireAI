from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.schemas.mfa import (
    MFASetupResponse, MFAVerifyResponse, 
    MFASetupRequestUnauthenticated, MFAVerifyRequestUnauthenticated
)
from app.services.mfa_service import MFAService

router = APIRouter(prefix="/mfa", tags=["mfa"])

@router.post("/setup/unauthenticated", response_model=MFASetupResponse)
async def setup_mfa_unauthenticated(
    request: MFASetupRequestUnauthenticated,
    db: Session = Depends(get_db)
):
    """Generate QR code for MFA setup during login (no auth required)."""
    from app.db.models.user import User
    from app.db.crud import UserCRUD
    
    # Authenticate user
    user = UserCRUD.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    secret = MFAService.generate_secret()
    qr_code = MFAService.generate_qr_code(user.email, secret)
    
    user.mfa_secret = secret
    db.commit()
    
    return MFASetupResponse(
        qr_code=qr_code,
        secret=secret,
        message="Scan QR code with Microsoft Authenticator app"
    )

@router.post("/verify/unauthenticated", response_model=MFAVerifyResponse)
async def verify_mfa_unauthenticated(
    request: MFAVerifyRequestUnauthenticated,
    db: Session = Depends(get_db)
):
    """Verify MFA code and enable MFA during login (no auth required)."""
    from app.db.models.user import User
    from app.db.crud import UserCRUD
    
    # Authenticate user
    user = UserCRUD.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated"
        )
    
    if not MFAService.verify_code(user.mfa_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )
    
    backup_codes = MFAService.generate_backup_codes()
    user.mfa_backup_codes = MFAService.hash_backup_codes(backup_codes)
    user.mfa_enabled = True
    db.commit()
    
    return MFAVerifyResponse(
        success=True,
        message="MFA enabled successfully",
        backup_codes=backup_codes
    )