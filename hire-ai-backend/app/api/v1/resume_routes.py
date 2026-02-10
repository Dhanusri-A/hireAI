from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from app.api.v1.deps import get_current_user
from app.services.resume_parser import resume_parser

router = APIRouter(
    prefix="/resume",
    tags=["resume"],
    dependencies=[Depends(get_current_user)],
)

@router.post(
    "/parse",status_code=status.HTTP_200_OK,
)
async def parse_resume(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Parse a resume file (PDF, DOCX, PPTX) and return structured data.
    Requires authentication.
    """

    # Basic validation early, before touching AI or memory
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is missing",
        )

    try:
        # AI parsing (this must be awaited)
        parsed_data = await resume_parser.parse_resume(file)

        if not parsed_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to extract resume data",
            )

        return {
            "user_id": current_user.id,
            "filename": file.filename,
            "data": parsed_data,
        }

    except HTTPException:
        # Re-raise clean HTTP errors untouched
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to parse resume"
        )

    except ValueError as exc:
        # File parsing / unsupported format errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        # Catch-all safety net
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume parsing failed: {str(exc)}",
        )
