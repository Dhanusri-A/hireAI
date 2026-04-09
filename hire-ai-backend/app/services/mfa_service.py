import pyotp
import qrcode
import io
import base64
import secrets
from typing import List

class MFAService:
    @staticmethod
    def generate_secret() -> str:
        """Generate a random secret for TOTP."""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(email: str, secret: str, issuer: str = "HireAI") -> str:
        """Generate QR code as base64 string."""
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=email,
            issuer_name=issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_base64}"
    
    @staticmethod
    def verify_code(secret: str, code: str) -> bool:
        """Verify TOTP code."""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
    
    @staticmethod
    def generate_backup_codes(count: int = 8) -> List[str]:
        """Generate backup codes for account recovery."""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    @staticmethod
    def hash_backup_codes(codes: List[str]) -> str:
        """Store backup codes as comma-separated string."""
        from app.core.security import hash_password
        hashed = [hash_password(code) for code in codes]
        return ",".join(hashed)
    
    @staticmethod
    def verify_backup_code(stored_codes: str, code: str) -> bool:
        """Verify a backup code."""
        from app.core.security import verify_password
        hashed_codes = stored_codes.split(",")
        for hashed in hashed_codes:
            if verify_password(code, hashed):
                return True
        return False