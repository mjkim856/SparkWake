"""
Sessions Router
세션 관리 엔드포인트
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.models.session import Session, SessionComplete, SessionSkip, RoutineResult
from app.services.auth import get_current_user
from app.services.firestore import get_firestore_client

router = APIRouter()


def _get_sessions_ref(db: firestore.Client, user_id: str):
    """사용자의 세션 컬렉션 참조"""
    return db.collection("users").document(user_id).collection("sessions")


def _get_routines_ref(db: firestore.Client, user_id: str):
    """사용자의 루틴 컬렉션 참조"""
    return db.collection("users").document(user_id).collection("routines")


@router.post("", response_model=Session, status_code=status.HTTP_201_CREATED)
async def start_session(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """세션 시작"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sessions_ref = _get_sessions_ref(db, user_id)
    
    # 오늘 이미 활성 세션이 있는지 확인
    existing = list(
        sessions_ref
        .where("date", "==", today)
        .where("status", "==", "active")
        .limit(1)
        .stream()
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active session already exists for today",
        )
    
    # 루틴 목록 가져오기
    routines = list(_get_routines_ref(db, user_id).order_by("start_time").stream())
    
    routine_results = [
        {
            "routine_id": r.id,
            "routine_name": r.to_dict().get("name"),
            "status": "pending",
        }
        for r in routines
    ]
    
    now = datetime.utcnow()
    data = {
        "date": today,
        "status": "active",
        "started_at": now,
        "ended_at": None,
        "snooze_count": 0,
        "routine_results": routine_results,
    }
    
    doc_ref = sessions_ref.document(today)
    doc_ref.set(data)
    
    return Session(id=today, user_id=user_id, **data)


@router.get("/today", response_model=Session)
async def get_today_session(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """오늘 세션 조회"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    doc = _get_sessions_ref(db, user_id).document(today).get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No session found for today",
        )
    
    return Session(id=doc.id, user_id=user_id, **doc.to_dict())


@router.post("/{session_id}/complete", response_model=Session)
async def complete_routine(
    session_id: str,
    data: SessionComplete,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 완료 처리"""
    doc_ref = _get_sessions_ref(db, user_id).document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    session_data = doc.to_dict()
    
    if session_data.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )
    
    # 루틴 결과 업데이트
    routine_results = session_data.get("routine_results", [])
    now = datetime.utcnow()
    
    for result in routine_results:
        if result.get("routine_id") == data.routine_id:
            if result.get("status") != "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Routine already completed or skipped",
                )
            result["status"] = "completed"
            result["completion_method"] = data.completion_method
            result["completed_at"] = now.isoformat()
            if data.snapshot_url:
                result["snapshot_url"] = data.snapshot_url
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found in session",
        )
    
    doc_ref.update({"routine_results": routine_results})
    
    updated_doc = doc_ref.get()
    return Session(id=updated_doc.id, user_id=user_id, **updated_doc.to_dict())


@router.post("/{session_id}/skip", response_model=Session)
async def skip_routine(
    session_id: str,
    data: SessionSkip,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 스킵 처리"""
    doc_ref = _get_sessions_ref(db, user_id).document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    session_data = doc.to_dict()
    
    if session_data.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )
    
    routine_results = session_data.get("routine_results", [])
    
    for result in routine_results:
        if result.get("routine_id") == data.routine_id:
            if result.get("status") != "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Routine already completed or skipped",
                )
            result["status"] = "skipped"
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found in session",
        )
    
    doc_ref.update({"routine_results": routine_results})
    
    updated_doc = doc_ref.get()
    return Session(id=updated_doc.id, user_id=user_id, **updated_doc.to_dict())


@router.post("/{session_id}/end", response_model=Session)
async def end_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """세션 종료 및 리포트 생성"""
    doc_ref = _get_sessions_ref(db, user_id).document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    session_data = doc.to_dict()
    
    if session_data.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )
    
    now = datetime.utcnow()
    
    # 세션 종료
    doc_ref.update({
        "status": "completed",
        "ended_at": now,
    })
    
    # 리포트 생성
    routine_results = session_data.get("routine_results", [])
    total = len(routine_results)
    completed = sum(1 for r in routine_results if r.get("status") == "completed")
    skipped = sum(1 for r in routine_results if r.get("status") == "skipped")
    
    report_data = {
        "date": session_id,
        "total_routines": total,
        "completed_count": completed,
        "skipped_count": skipped,
        "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
        "total_duration": 0,  # TODO: 실제 소요 시간 계산
        "routine_results": routine_results,
        "created_at": now,
    }
    
    reports_ref = db.collection("users").document(user_id).collection("reports")
    reports_ref.document(session_id).set(report_data)
    
    updated_doc = doc_ref.get()
    return Session(id=updated_doc.id, user_id=user_id, **updated_doc.to_dict())


@router.post("/{session_id}/snooze")
async def snooze_alarm(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """스누즈 (5분 연장)"""
    doc_ref = _get_sessions_ref(db, user_id).document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    session_data = doc.to_dict()
    snooze_count = session_data.get("snooze_count", 0)
    
    # 최대 3회 제한
    if snooze_count >= 3:
        return {
            "success": False,
            "message": "Maximum snooze count reached",
            "snooze_count": snooze_count,
        }
    
    doc_ref.update({"snooze_count": snooze_count + 1})
    
    return {
        "success": True,
        "snooze_count": snooze_count + 1,
        "snooze_minutes": 5,
    }
