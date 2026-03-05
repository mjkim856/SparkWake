"""
Report Models
리포트 관련 Pydantic 모델
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RoutineStats(BaseModel):
    """루틴별 통계"""
    routine_id: str
    routine_name: str
    completion_count: int
    skip_count: int
    avg_duration: Optional[float] = None
    completion_rate: float


class DailyReport(BaseModel):
    """일일 리포트"""
    id: str
    user_id: str
    date: str  # YYYY-MM-DD
    total_routines: int
    completed_count: int
    skipped_count: int
    completion_rate: float
    total_duration: int  # 분 단위
    routine_results: list[dict]
    created_at: datetime


class WeeklyReport(BaseModel):
    """주간 리포트"""
    user_id: str
    start_date: str
    end_date: str
    total_sessions: int
    avg_completion_rate: float
    routine_stats: list[RoutineStats]
    daily_completion_rates: list[float]  # 7일간 완료율


class AICoachingSuggestion(BaseModel):
    """AI 코칭 제안"""
    id: str
    type: str  # time_adjust, routine_swap, encouragement
    message: str
    action: Optional[dict] = None  # 적용 가능한 액션


class AICoaching(BaseModel):
    """AI 코칭 응답"""
    suggestions: list[AICoachingSuggestion]
    generated_at: datetime
