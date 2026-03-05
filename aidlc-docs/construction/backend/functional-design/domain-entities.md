# Domain Entities

## Firestore 컬렉션 구조

```
firestore/
├── users/{userId}/
│   ├── routines/{routineId}
│   ├── sessions/{date}        # YYYY-MM-DD
│   ├── reports/{date}         # YYYY-MM-DD
│   └── pushTokens/{tokenId}
```

---

## 1. User (Firebase Auth에서 관리)

```typescript
interface User {
  uid: string                    // Firebase Auth UID
  email?: string                 // Google 로그인 시
  displayName?: string
  photoURL?: string
  isAnonymous: boolean
  createdAt: Timestamp
}
```

---

## 2. Routine

```typescript
interface Routine {
  id: string                     // Firestore document ID
  userId: string                 // 소유자
  name: string                   // 루틴 이름 (예: "스트레칭")
  startTime: string              // HH:mm 형식 (예: "07:00")
  duration: number               // 분 단위 (예: 10)
  link?: string                  // 연결 URL (예: YouTube)
  videoVerification: boolean     // 비디오 인증 여부
  actionDescription?: string     // 인증 행동 설명 (예: "물 한 잔 마시기")
  order: number                  // 정렬 순서 (startTime 기반 자동 계산)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/routines/{routineId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 3. RoutineSession

```typescript
interface RoutineSession {
  id: string                     // date (YYYY-MM-DD)
  userId: string
  date: string                   // YYYY-MM-DD
  startedAt: Timestamp
  endedAt?: Timestamp
  status: 'active' | 'completed' | 'abandoned'
  totalRoutines: number
  routineResults: RoutineResult[]
}

interface RoutineResult {
  routineId: string
  routineName: string
  status: 'completed' | 'skipped'
  startedAt?: Timestamp
  completedAt?: Timestamp
  verificationMethod?: 'auto' | 'manual' | 'skipped'
  snapshotUrl?: string           // Cloud Storage URL
}
```

---

## 4. DailyReport

```typescript
interface DailyReport {
  id: string                     // date (YYYY-MM-DD)
  userId: string
  date: string                   // YYYY-MM-DD
  sessionId: string
  
  // 통계
  completionRate: number         // 0-100
  totalRoutines: number
  completedCount: number
  skippedCount: number
  
  // 시간 분석
  totalPlannedMinutes: number
  totalActualMinutes: number
  timeDifferenceMinutes: number  // 실제 - 계획
  
  // 상세 결과
  routineSummaries: RoutineSummary[]
  
  createdAt: Timestamp
}

interface RoutineSummary {
  routineId: string
  routineName: string
  plannedDuration: number        // 분
  actualDuration?: number        // 분
  status: 'completed' | 'skipped'
  verificationMethod?: 'auto' | 'manual' | 'skipped'
}
```

---

## 5. PushToken

```typescript
interface PushToken {
  id: string                     // FCM token 자체를 ID로 사용
  token: string
  platform: 'web' | 'android' | 'ios'
  createdAt: Timestamp
  lastUsedAt?: Timestamp
}
```

---

## 6. AlarmSchedule (Cloud Scheduler용)

```typescript
// Firestore에 저장하지 않고 Cloud Scheduler Job으로 관리
// 또는 users/{userId}/alarmSettings 컬렉션 사용

interface AlarmSettings {
  userId: string
  wakeUpTime: string             // HH:mm
  enabled: boolean
  timezone: string               // 예: "Asia/Seoul"
  updatedAt: Timestamp
}
```

---

## Pydantic Models (Backend)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal

class RoutineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    duration: int = Field(..., ge=1, le=180)
    link: Optional[str] = None
    video_verification: bool = False
    action_description: Optional[str] = None

class RoutineResult(BaseModel):
    routine_id: str
    status: Literal["completed", "skipped"]
    verification_method: Optional[Literal["auto", "manual", "skipped"]] = None
    snapshot_url: Optional[str] = None

class SessionStart(BaseModel):
    pass  # 추가 파라미터 없음

class SessionComplete(BaseModel):
    routine_id: str
    method: Literal["auto", "manual"]
    snapshot_url: Optional[str] = None

class SessionSkip(BaseModel):
    routine_id: str
    reason: Optional[str] = None

class PushTokenRegister(BaseModel):
    token: str
    platform: Literal["web", "android", "ios"] = "web"
```

---

## 인덱스 설정

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "routines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```
