"""
Gemini Router
Gemini Live API 관련 엔드포인트
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.services.auth import get_current_user
from app.services.gemini import create_ephemeral_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/ephemeral-token")
async def get_ephemeral_token(user_id: str = Depends(get_current_user)):
    """
    Gemini Live API용 Ephemeral Token 발급
    프론트엔드에서 WebSocket 연결 시 사용
    """
    try:
        token_data = await create_ephemeral_token()
        return token_data
    except Exception as e:
        logger.exception("Failed to create ephemeral token for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create ephemeral token",
        ) from e
