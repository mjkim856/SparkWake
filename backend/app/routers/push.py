"""
Push Router
푸시 알림 토큰 관리 엔드포인트
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from google.cloud import firestore

from app.services.auth import get_current_user
from app.services.firestore import get_firestore_client

router = APIRouter()


class PushTokenRegister(BaseModel):
    """푸시 토큰 등록 요청"""
    token: str
    device_type: str = "web"
    
    @field_validator("token")
    @classmethod
    def validate_fcm_token(cls, v: str) -> str:
        """FCM 토큰 형식 검증"""
        import re
        if len(v) < 100 or len(v) > 300:
            raise ValueError("Invalid FCM token length")
        if not re.match(r"^[a-zA-Z0-9_:\-]+$", v):
            raise ValueError("Invalid FCM token format")
        return v
    
    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: str) -> str:
        """디바이스 타입 검증"""
        allowed = ["web", "android", "ios"]
        if v not in allowed:
            raise ValueError(f"device_type must be one of {allowed}")
        return v


class AlarmTimeUpdate(BaseModel):
    """알람 시간 설정"""
    alarm_time: str  # HH:mm 형식
    
    @field_validator("alarm_time")
    @classmethod
    def validate_alarm_time(cls, v: str) -> str:
        """HH:mm 형식 검증"""
        import re
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("alarm_time must be in HH:mm format (00:00-23:59)")
        return v


def _get_push_tokens_ref(db: firestore.Client, user_id: str):
    """사용자의 푸시 토큰 컬렉션 참조"""
    return db.collection("users").document(user_id).collection("push_tokens")


@router.post("/register")
async def register_push_token(
    data: PushTokenRegister,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """푸시 토큰 등록"""
    tokens_ref = _get_push_tokens_ref(db, user_id)
    
    # 기존 토큰 확인
    existing = list(tokens_ref.where("token", "==", data.token).limit(1).stream())
    
    if existing:
        # 이미 등록된 토큰 - 업데이트
        existing[0].reference.update({
            "updated_at": datetime.utcnow(),
        })
        return {"status": "updated"}
    
    # 최대 5개 제한 확인
    all_tokens = list(tokens_ref.stream())
    if len(all_tokens) >= 5:
        # 가장 오래된 토큰 삭제
        oldest = min(all_tokens, key=lambda x: x.to_dict().get("created_at", datetime.min))
        oldest.reference.delete()
    
    # 새 토큰 등록
    tokens_ref.document().set({
        "token": data.token,
        "device_type": data.device_type,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    
    return {"status": "registered"}


@router.delete("/unregister")
async def unregister_push_token(
    token: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """푸시 토큰 삭제"""
    tokens_ref = _get_push_tokens_ref(db, user_id)
    
    docs = list(tokens_ref.where("token", "==", token).stream())
    
    for doc in docs:
        doc.reference.delete()
    
    return {"status": "unregistered"}


@router.post("/alarm-time")
async def set_alarm_time(
    data: AlarmTimeUpdate,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """알람 시간 설정"""
    user_ref = db.collection("users").document(user_id)
    
    user_ref.set({
        "alarm_time": data.alarm_time,
        "updated_at": datetime.utcnow(),
    }, merge=True)
    
    return {"status": "updated", "alarm_time": data.alarm_time}


@router.get("/alarm-time")
async def get_alarm_time(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """알람 시간 조회"""
    user_ref = db.collection("users").document(user_id)
    doc = user_ref.get()
    
    if not doc.exists:
        return {"alarm_time": None}
    
    return {"alarm_time": doc.to_dict().get("alarm_time")}
