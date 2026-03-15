"""
Reports Router
리포트 조회 및 AI 코칭 엔드포인트
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from google.cloud import firestore

from app.models.report import DailyReport, WeeklyReport, AICoaching
from app.services.auth import get_current_user
from app.services.firestore import get_firestore_client
from app.services.gemini import generate_ai_coaching, generate_daily_summary

router = APIRouter()


def _get_reports_ref(db: firestore.Client, user_id: str):
    """사용자의 리포트 컬렉션 참조"""
    return db.collection("users").document(user_id).collection("reports")


@router.get("/daily/{date}", response_model=DailyReport)
async def get_daily_report(
    date: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """일일 리포트 조회"""
    doc = _get_reports_ref(db, user_id).document(date).get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    
    return DailyReport(id=doc.id, user_id=user_id, **doc.to_dict())


@router.get("/weekly", response_model=WeeklyReport)
async def get_weekly_report(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """주간 리포트 조회"""
    today = datetime.utcnow()
    start_date = (today - timedelta(days=6)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    reports_ref = _get_reports_ref(db, user_id)
    docs = list(
        reports_ref
        .where("date", ">=", start_date)
        .where("date", "<=", end_date)
        .order_by("date")
        .stream()
    )
    
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reports found for this week",
        )
    
    # 통계 계산
    total_sessions = len(docs)
    completion_rates = [d.to_dict().get("completion_rate", 0) for d in docs]
    avg_completion_rate = sum(completion_rates) / len(completion_rates) if completion_rates else 0
    
    # 루틴별 통계
    routine_stats_map = {}
    for doc in docs:
        for result in doc.to_dict().get("routine_results", []):
            rid = result.get("routine_id")
            if rid not in routine_stats_map:
                routine_stats_map[rid] = {
                    "routine_id": rid,
                    "routine_name": result.get("routine_name"),
                    "completion_count": 0,
                    "skip_count": 0,
                }
            if result.get("status") == "completed":
                routine_stats_map[rid]["completion_count"] += 1
            elif result.get("status") == "skipped":
                routine_stats_map[rid]["skip_count"] += 1
    
    routine_stats = []
    for stats in routine_stats_map.values():
        total = stats["completion_count"] + stats["skip_count"]
        stats["completion_rate"] = round(
            stats["completion_count"] / total * 100, 1
        ) if total > 0 else 0
        routine_stats.append(stats)
    
    return WeeklyReport(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        total_sessions=total_sessions,
        avg_completion_rate=round(avg_completion_rate, 1),
        routine_stats=routine_stats,
        daily_completion_rates=completion_rates,
    )


@router.get("/coaching", response_model=AICoaching)
async def get_ai_coaching(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """AI 코칭 제안 생성"""
    today = datetime.utcnow()
    start_date = (today - timedelta(days=6)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    reports_ref = _get_reports_ref(db, user_id)
    docs = list(
        reports_ref
        .where("date", ">=", start_date)
        .where("date", "<=", end_date)
        .stream()
    )
    
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enough data for AI coaching",
        )
    
    # 주간 데이터 준비
    weekly_data = [
        {
            "date": doc.id,
            "completion_rate": doc.to_dict().get("completion_rate"),
            "routine_results": doc.to_dict().get("routine_results", []),
        }
        for doc in docs
    ]
    
    # AI 코칭 생성
    coaching = await generate_ai_coaching(weekly_data)
    
    return coaching


@router.get("/history")
async def get_report_history(
    limit: int = Query(default=30, le=100),
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """리포트 히스토리 조회"""
    reports_ref = _get_reports_ref(db, user_id)
    docs = list(
        reports_ref
        .order_by("date", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    
    return [
        {
            "date": doc.id,
            "completion_rate": doc.to_dict().get("completion_rate"),
            "completed_count": doc.to_dict().get("completed_count"),
            "total_routines": doc.to_dict().get("total_routines"),
        }
        for doc in docs
    ]


@router.post("/generate-summary")
async def generate_summary(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """
    FR-9: AI Daily Summary 생성
    오늘 루틴 결과와 최근 7일 히스토리를 분석하여 개인화된 코칭 메시지 생성
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # 오늘 리포트 조회
    today_doc = _get_reports_ref(db, user_id).document(today).get()
    if not today_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Today's report not found",
        )
    
    today_data = today_doc.to_dict()
    today_results = today_data.get("routine_results", [])
    
    # 최근 7일 히스토리 조회 (오늘 제외)
    start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    reports_ref = _get_reports_ref(db, user_id)
    history_docs = list(
        reports_ref
        .where("date", ">=", start_date)
        .where("date", "<", today)
        .order_by("date", direction=firestore.Query.DESCENDING)
        .stream()
    )
    
    weekly_history = [
        {
            "date": doc.id,
            "completionRate": doc.to_dict().get("completion_rate", 0),
            "routineResults": doc.to_dict().get("routine_results", []),
        }
        for doc in history_docs
    ]
    
    # AI Summary 생성
    summary = await generate_daily_summary(today_results, weekly_history)
    
    # 오늘 리포트에 aiSummary 업데이트
    _get_reports_ref(db, user_id).document(today).update({
        "aiSummary": summary,
    })
    
    return {"summary": summary}
