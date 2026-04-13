from pydantic import BaseModel, EmailStr
from typing import Optional

class MFASetupResponse(BaseModel):
    qr_code: str
    secret: str
    message: str

class MFAVerifyResponse(BaseModel):
    success: bool
    message: str
    backup_codes: Optional[list[str]] = None

class MFAValidateRequest(BaseModel):
    email: str
    password: str
    mfa_code: str

class MFASetupRequestUnauthenticated(BaseModel):
    email: EmailStr
    password: str

class MFAVerifyRequestUnauthenticated(BaseModel):
    email: EmailStr
    password: str
    code: str

class MFAVerifyTokenRequest(BaseModel):
    code: str