"""
Authentication Service
Firebase ID Token 검증
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, initialize_app

# Firebase Admin 초기화 (한 번만)
_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if not _firebase_initialized:
        try:
            # GCP 환경에서는 자동 인증
            initialize_app()
            _firebase_initialized = True
        except ValueError:
            # 이미 초기화됨
            _firebase_initialized = True


_init_firebase()

security = HTTPBearer()


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Firebase ID Token 검증
    Returns: decoded token with user info
    """
    token = credentials.credentials
    
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_user(
    token: dict = Depends(verify_firebase_token)
) -> str:
    """
    현재 사용자 ID 반환
    """
    return token.get("uid")
