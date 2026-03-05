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
    
    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
    ]
    
    # Firebase (프로젝트 ID만 - 키는 환경변수)
    firebase_project_id: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()
