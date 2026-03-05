"""
Push Alarm Cloud Function
매분 실행되어 해당 시간에 기상 알람이 설정된 사용자에게 푸시 발송
"""
import os
import functions_framework
from datetime import datetime
from google.cloud import firestore
from firebase_admin import messaging, initialize_app

# Firebase Admin 초기화
initialize_app()

db = firestore.Client()


@functions_framework.http
def send_push_alarms(request):
    """Cloud Scheduler에서 매분 호출"""
    now = datetime.now()
    current_time = now.strftime("%H:%M")
    
    # 해당 시간에 알람 설정된 사용자 조회
    users_ref = db.collection("users")
    
    # 첫 번째 루틴 시작 시간이 현재 시간인 사용자 찾기
    # (실제로는 사용자별 알람 시간 필드 필요)
    
    sent_count = 0
    errors = []
    
    try:
        # 모든 사용자의 루틴 확인
        for user_doc in users_ref.stream():
            user_id = user_doc.id
            user_data = user_doc.to_dict()
            
            # 알람 시간 확인
            alarm_time = user_data.get("alarm_time")
            if alarm_time != current_time:
                continue
            
            # 푸시 토큰 조회
            tokens_ref = users_ref.document(user_id).collection("push_tokens")
            tokens = [doc.to_dict().get("token") for doc in tokens_ref.stream()]
            
            if not tokens:
                continue
            
            # 푸시 메시지 생성
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title="🌅 미라클 모닝 시간이에요!",
                    body="오늘도 멋진 하루를 시작해볼까요?",
                ),
                data={
                    "type": "wake_up_alarm",
                    "user_id": user_id,
                },
                tokens=tokens,
            )
            
            # 푸시 발송
            response = messaging.send_each_for_multicast(message)
            sent_count += response.success_count
            
            # 실패한 토큰 정리
            for idx, send_response in enumerate(response.responses):
                if not send_response.success:
                    # 유효하지 않은 토큰 삭제
                    if "UNREGISTERED" in str(send_response.exception):
                        _delete_invalid_token(user_id, tokens[idx])
                        
    except Exception as e:
        # 민감 정보 로깅 방지
        errors.append("Push sending failed")
    
    return {
        "status": "ok",
        "sent_count": sent_count,
        "errors_count": len(errors),
        "timestamp": now.isoformat(),
    }


def _delete_invalid_token(user_id: str, token: str):
    """유효하지 않은 푸시 토큰 삭제"""
    try:
        tokens_ref = db.collection("users").document(user_id).collection("push_tokens")
        for doc in tokens_ref.where("token", "==", token).stream():
            doc.reference.delete()
    except Exception:
        pass  # 삭제 실패해도 무시
