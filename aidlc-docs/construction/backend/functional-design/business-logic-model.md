# Backend Business Logic Model

## 1. API 엔드포인트 설계

### REST API

```
POST   /api/auth/token          # Ephemeral Token 발급
GET    /api/routines            # 루틴 목록 (Firestore 직접 접근으로 대체 가능)
POST   /api/session/start       # 세션 시작
POST   /api/session/end         # 세션 종료
POST   /api/session/complete    # 루틴 완료
POST   /api/session/skip        # 루틴 스킵
GET    /api/reports/{date}      # 일일 리포트 (Firestore 직접 접근으로 대체 가능)
POST   /api/push/register       # FCM 토큰 등록
DELETE /api/push/unregister     # FCM 토큰 해제
```

### WebSocket API

```
WS /ws/live                     # Gemini Live API 프록시 (선택적)
```

---

## 2. 인증 플로우

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend                                 │
│  Firebase Auth로 로그인 → ID Token 획득                  │
└─────────────────────┬───────────────────────────────────┘
                      │ Authorization: Bearer {idToken}
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Backend                                  │
│  1. ID Token 검증 (Firebase Admin SDK)                  │
│  2. User Context 추출 (uid, email, isAnonymous)         │
│  3. 요청 처리                                           │
└─────────────────────────────────────────────────────────┘
```

### AuthMiddleware 로직

```python
from firebase_admin import auth

async def verify_firebase_token(token: str) -> dict:
    """Firebase ID Token 검증"""
    try:
        decoded = auth.verify_id_token(token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
            "is_anonymous": decoded.get("firebase", {}).get("sign_in_provider") == "anonymous"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 3. Ephemeral Token 발급

Frontend가 Gemini Live API에 직접 연결할 때 사용하는 임시 토큰.

```python
# POST /api/auth/token
async def get_ephemeral_token(user: UserContext):
    """Gemini Live API용 Ephemeral Token 발급"""
    
    # Google GenAI SDK로 토큰 생성
    from google import genai
    
    client = genai.Client()
    token = await client.auth.create_ephemeral_token(
        config={
            "model": "gemini-3-flash-preview",
            "expires_in": 3600  # 1시간
        }
    )
    
    return {"token": token.token, "expires_at": token.expires_at}
```

---

## 4. 세션 관리 로직

### 세션 시작

```python
# POST /api/session/start
async def start_session(user: UserContext, db: Firestore):
    """루틴 세션 시작"""
    
    today = date.today().isoformat()
    
    # 오늘 세션이 이미 있는지 확인
    existing = await db.collection("users").document(user.uid) \
        .collection("sessions").document(today).get()
    
    if existing.exists and existing.to_dict().get("status") == "active":
        raise HTTPException(400, "Session already active")
    
    # 루틴 목록 조회
    routines = await db.collection("users").document(user.uid) \
        .collection("routines").order_by("startTime").get()
    
    # 세션 생성
    session_data = {
        "userId": user.uid,
        "date": today,
        "startedAt": datetime.now(),
        "status": "active",
        "routineResults": [],
        "totalRoutines": len(routines)
    }
    
    await db.collection("users").document(user.uid) \
        .collection("sessions").document(today).set(session_data)
    
    return {"sessionId": today, "routines": [r.to_dict() for r in routines]}
```

### 루틴 완료

```python
# POST /api/session/complete
async def complete_routine(
    user: UserContext,
    routine_id: str,
    method: Literal["auto", "manual"],
    snapshot_url: Optional[str] = None,
    db: Firestore
):
    """루틴 완료 처리"""
    
    today = date.today().isoformat()
    session_ref = db.collection("users").document(user.uid) \
        .collection("sessions").document(today)
    
    result = {
        "routineId": routine_id,
        "status": "completed",
        "completedAt": datetime.now(),
        "verificationMethod": method,
        "snapshotUrl": snapshot_url
    }
    
    await session_ref.update({
        "routineResults": firestore.ArrayUnion([result])
    })
    
    return {"success": True}
```

### 세션 종료 + 리포트 생성

```python
# POST /api/session/end
async def end_session(user: UserContext, db: Firestore):
    """세션 종료 및 리포트 생성"""
    
    today = date.today().isoformat()
    session_ref = db.collection("users").document(user.uid) \
        .collection("sessions").document(today)
    
    session = await session_ref.get()
    session_data = session.to_dict()
    
    # 세션 종료
    await session_ref.update({
        "status": "completed",
        "endedAt": datetime.now()
    })
    
    # 리포트 생성
    report = generate_daily_report(session_data)
    
    await db.collection("users").document(user.uid) \
        .collection("reports").document(today).set(report)
    
    return report
```

---

## 5. 리포트 생성 로직

```python
def generate_daily_report(session: dict) -> dict:
    """일일 리포트 생성"""
    
    results = session.get("routineResults", [])
    total = session.get("totalRoutines", 0)
    
    completed = [r for r in results if r["status"] == "completed"]
    skipped = [r for r in results if r["status"] == "skipped"]
    
    # 완료율 계산
    completion_rate = len(completed) / total * 100 if total > 0 else 0
    
    # 시간 비교 (실제 구현 시 루틴 정보와 조인 필요)
    
    return {
        "date": session["date"],
        "sessionId": session["date"],
        "completionRate": round(completion_rate, 1),
        "totalRoutines": total,
        "completedCount": len(completed),
        "skippedCount": len(skipped),
        "routineSummaries": results,
        "createdAt": datetime.now()
    }
```

---

## 6. 푸시 알림 로직

### FCM 토큰 등록

```python
# POST /api/push/register
async def register_push_token(
    user: UserContext,
    token: str,
    db: Firestore
):
    """FCM 토큰 등록"""
    
    await db.collection("users").document(user.uid) \
        .collection("pushTokens").document(token).set({
            "token": token,
            "createdAt": datetime.now(),
            "platform": "web"
        })
    
    return {"success": True}
```

### 알람 발송 (Cloud Function에서 호출)

```python
async def send_wake_up_notification(user_id: str, db: Firestore):
    """기상 알람 푸시 발송"""
    
    from firebase_admin import messaging
    
    # 사용자의 FCM 토큰 조회
    tokens = await db.collection("users").document(user_id) \
        .collection("pushTokens").get()
    
    if not tokens:
        return
    
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title="☀️ Good Morning!",
            body="Time to start your miracle morning routine!"
        ),
        data={
            "type": "wake_up",
            "url": "/session"
        },
        tokens=[t.to_dict()["token"] for t in tokens]
    )
    
    response = messaging.send_multicast(message)
    
    # 실패한 토큰 정리
    for idx, result in enumerate(response.responses):
        if not result.success:
            # 토큰 삭제
            pass
```

---

## 7. 보안 로깅 가이드라인 ⚠️

```python
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# ❌ 절대 금지
logger.info(f"API Key: {api_key}")
logger.debug(f"Token: {token}")
logger.error(f"User data: {user_dict}")

# ✅ 올바른 방법
logger.info(f"User {user.uid[:8]}... authenticated")
logger.debug(f"Session started for date: {today}")
logger.error(f"Failed to process routine {routine_id}")

# 프로덕션 로깅 레벨
# DEBUG 로그는 프로덕션에서 비활성화
if os.getenv("ENV") == "production":
    logging.getLogger().setLevel(logging.INFO)
```

### 민감 정보 마스킹 유틸리티

```python
def mask_sensitive(data: dict, keys: list[str]) -> dict:
    """민감 정보 마스킹"""
    masked = data.copy()
    for key in keys:
        if key in masked:
            value = str(masked[key])
            masked[key] = value[:4] + "****" + value[-4:] if len(value) > 8 else "****"
    return masked

# 사용 예시
safe_data = mask_sensitive(user_data, ["email", "token", "apiKey"])
logger.info(f"Processing: {safe_data}")
```
