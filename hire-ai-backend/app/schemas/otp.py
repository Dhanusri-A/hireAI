from pydantic import BaseModel, EmailStr, Field

class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(..., description="'signup' or 'reset_password'")

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    purpose: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)
