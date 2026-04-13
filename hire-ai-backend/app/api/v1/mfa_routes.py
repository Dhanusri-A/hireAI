from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, require_role
from app.db.base import get_db
from app.schemas.mfa import (
    MFASetupResponse, MFAVerifyResponse,
    MFASetupRequestUnauthenticated, MFAVerifyRequestUnauthenticated,
    MFAVerifyTokenRequest,
)
from app.services.mfa_service import MFAService
from app.schemas.user import UserResponse

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


# ── Token-based MFA (for OAuth users who have no password) ──────────────────

@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa_token(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Generate QR code for MFA setup using Bearer token (OAuth flow)."""
    from app.db.crud import UserCRUD
    user = UserCRUD.get_user_by_id(db, current_user.id)
    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled")

    # Guard: if secret already exists but mfa not enabled yet, reuse it
    if not user.mfa_secret:
        secret = MFAService.generate_secret()
        user.mfa_secret = secret
        db.commit()
    else:
        secret = user.mfa_secret

    qr_code = MFAService.generate_qr_code(user.email, secret)

    return MFASetupResponse(qr_code=qr_code, secret=secret, message="Scan QR code with Microsoft Authenticator app")


@router.post("/verify", response_model=MFAVerifyResponse)
async def verify_mfa_token(
    request: MFAVerifyTokenRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Verify MFA code and enable MFA using Bearer token (OAuth flow)."""
    from app.db.crud import UserCRUD
    user = UserCRUD.get_user_by_id(db, current_user.id)

    if not user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA setup not initiated")

    if not MFAService.verify_code(user.mfa_secret, request.code):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    backup_codes = MFAService.generate_backup_codes()
    user.mfa_backup_codes = MFAService.hash_backup_codes(backup_codes)
    user.mfa_enabled = True
    db.commit()

    return MFAVerifyResponse(success=True, message="MFA enabled successfully", backup_codes=backup_codes)


@router.post("/verify-login", response_model=MFAVerifyResponse)
async def verify_mfa_login(
    request: MFAVerifyTokenRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Validate MFA code for an already-enabled OAuth user (no re-enabling)."""
    from app.db.crud import UserCRUD
    user = UserCRUD.get_user_by_id(db, current_user.id)

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA not enabled")

    is_valid = MFAService.verify_code(user.mfa_secret, request.code)

    if not is_valid and user.mfa_backup_codes:
        is_valid = MFAService.verify_backup_code(user.mfa_backup_codes, request.code)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid MFA code")

    return MFAVerifyResponse(success=True, message="MFA verified")