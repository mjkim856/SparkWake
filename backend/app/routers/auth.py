"""
Auth Router
인증 관련 엔드포인트
"""
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.auth import get_current_user
from app.services.gemini import create_ephemeral_token

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/ephemeral-token")
@limiter.limit("10/minute")
async def get_ephemeral_token(
    request: Request,
    user_id: str = Depends(get_current_user)
):
    """
    Live API용 Ephemeral Token 발급
    Frontend에서 Gemini Live API 연결 시 사용
    Rate limit: 10회/분
    """
    token_data = await create_ephemeral_token()
    return token_data


@router.get("/me")
@limiter.limit("30/minute")
async def get_me(
    request: Request,
    user_id: str = Depends(get_current_user)
):
    """현재 로그인한 사용자 정보"""
    return {"user_id": user_id}
