"""
Application Configuration
환경변수에서 설정 로드 - 민감 정보 하드코딩 금지
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # GCP
    google_cloud_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    environment: str = os.getenv("ENVIRONMENT", "dev")
    
    # Gemini API (Secret Manager에서 주입)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS - 프로덕션 도메인은 환경변수로 추가 가능
    cors_extra_origins: str = os.getenv("CORS_EXTRA_ORIGINS", "")
    
    @property
    def allowed_origins(self) -> list[str]:
        """CORS allowed origins - 기본값 + 환경변수 추가"""
        origins = [
            "http://localhost:3000",
            "http://localhost:3002",
            "https://localhost:3000",
        ]
        # 환경변수에서 추가 도메인 로드 (쉼표로 구분)
        if self.cors_extra_origins:
            extra = [o.strip() for o in self.cors_extra_origins.split(",") if o.strip()]
            origins.extend(extra)
        return origins
    
    # Firebase (프로젝트 ID만 - 키는 환경변수)
    firebase_project_id: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()
