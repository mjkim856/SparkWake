"""
Routine Models
루틴 관련 Pydantic 모델
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class RoutineBase(BaseModel):
    """루틴 기본 필드"""
    name: str = Field(..., min_length=1, max_length=100)
    start_time: str = Field(..., description="HH:mm 형식")
    duration: int = Field(..., ge=1, le=180, description="분 단위")
    link: Optional[str] = Field(None, description="연결 URL")
    video_verification: bool = Field(False)
    action_description: Optional[str] = Field(None, description="비디오 인증 시 행동 설명")
    icon: Optional[str] = Field(None, description="아이콘 이름")
    
    @field_validator("start_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("시간 형식은 HH:mm이어야 합니다")
        return v
    
    @field_validator("action_description")
    @classmethod
    def validate_action_description(cls, v: Optional[str], info) -> Optional[str]:
        # video_verification이 True면 action_description 필수
        if info.data.get("video_verification") and not v:
            raise ValueError("비디오 인증 시 행동 설명이 필요합니다")
        return v


class RoutineCreate(RoutineBase):
    """루틴 생성 요청"""
    pass


class RoutineUpdate(BaseModel):
    """루틴 수정 요청 (부분 업데이트)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    start_time: Optional[str] = None
    duration: Optional[int] = Field(None, ge=1, le=180)
    link: Optional[str] = None
    video_verification: Optional[bool] = None
    action_description: Optional[str] = None
    icon: Optional[str] = None


class Routine(RoutineBase):
    """루틴 응답 모델"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
