"""
Session Models
세션 관련 Pydantic 모델
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class RoutineResult(BaseModel):
    """개별 루틴 결과"""
    routine_id: str
    routine_name: str
    status: Literal["completed", "skipped", "pending"]
    completion_method: Optional[Literal["auto", "manual", "voice"]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    actual_duration: Optional[int] = None  # 분 단위
    snapshot_url: Optional[str] = None  # 비디오 인증 스냅샷


class SessionCreate(BaseModel):
    """세션 시작 요청"""
    pass  # 현재 루틴 목록 기반으로 자동 생성


class SessionComplete(BaseModel):
    """루틴 완료 요청"""
    routine_id: str
    completion_method: Literal["auto", "manual", "voice"] = "manual"
    snapshot_url: Optional[str] = None


class SessionSkip(BaseModel):
    """루틴 스킵 요청"""
    routine_id: str


class SessionEnd(BaseModel):
    """세션 종료 요청"""
    pass


class Session(BaseModel):
    """세션 응답 모델"""
    id: str
    user_id: str
    date: str  # YYYY-MM-DD
    status: Literal["active", "completed", "abandoned"]
    started_at: datetime
    ended_at: Optional[datetime] = None
    snooze_count: int = 0
    routine_results: list[RoutineResult] = []
    
    class Config:
        from_attributes = True
