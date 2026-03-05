"""
Miracle Morning AI Coach - Backend API
FastAPI 기반 REST API 서버
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routers import auth, routines, sessions, reports, push

settings = get_settings()

# Rate Limiter 설정
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Miracle Morning AI Coach API",
    description="미라클 모닝 AI 코치 백엔드 API",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "dev" else None,
    redoc_url=None,
)

# Rate Limiter 등록
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 설정 - 프로덕션에서는 와일드카드 제거
cors_origins = (
    settings.allowed_origins 
    if settings.environment == "prod" 
    else settings.allowed_origins + ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(routines.router, prefix="/api/routines", tags=["routines"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(push.router, prefix="/api/push", tags=["push"])


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Miracle Morning AI Coach API",
        "version": "1.0.0",
    }
