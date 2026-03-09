"""
Gemini Router
Gemini Live API 관련 엔드포인트
"""
from fastapi import APIRouter, HTTPException, status

from app.services.gemini import create_ephemeral_token

router = APIRouter()


@router.get("/ephemeral-token")
async def get_ephemeral_token():
    """
    Gemini Live API용 Ephemeral Token 발급
    프론트엔드에서 WebSocket 연결 시 사용
    """
    try:
        token_data = await create_ephemeral_token()
        return token_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ephemeral token: {str(e)}",
        )
