# Frontend Business Logic Model

## 0. 음성 대화 모드 (하이브리드 방식)

### 마이크 상태 관리

| 상황 | 마이크 | AI 동작 |
|------|--------|---------|
| 루틴 시작 | OFF | AI가 먼저 안내 ("스트레칭 시작!") |
| 루틴 진행 중 | OFF | 타이머만 동작 (유튜브 시청 등) |
| 루틴 종료 시간 | ON | AI가 먼저 질문 ("끝났나요?") |
| 응답 대기 (5~10초) | ON | 사용자 응답 인식 |
| 비디오 인증 루틴 | ON | 카메라+마이크 계속 ON |

### 상태 전이

```
┌─────────────────────────────────────────┐
│  ROUTINE_START                          │
│  AI: "스트레칭 시작! 링크 열어드릴게요"    │
│  → 마이크 OFF, 타이머 시작               │
└─────────────────────────────────────────┘
                    ↓
            (설정된 소요시간)
                    ↓
┌─────────────────────────────────────────┐
│  ROUTINE_CHECK                          │
│  AI: "스트레칭 끝났나요?"                 │
│  → 마이크 ON (응답 대기 10초)            │
└─────────────────────────────────────────┘
                    ↓
        ┌─────────┴─────────┐
        ↓                   ↓
   "응"/"다 했어"        "조금만"/"아직"
        ↓                   ↓
   ROUTINE_COMPLETE     ROUTINE_EXTEND (+2분)
        ↓                   ↓
   다음 루틴으로         타이머 재시작
```

### 음성 인식 키워드

```typescript
const COMPLETE_KEYWORDS = ["응", "어", "다 했어", "끝났어", "완료", "네", "yes", "done"];
const EXTEND_KEYWORDS = ["조금만", "아직", "잠깐", "더", "wait", "not yet"];
const SKIP_KEYWORDS = ["스킵", "넘어가", "패스", "skip", "next"];
```

## 1. 인증 플로우

```
┌─────────────────────────────────────────────────────────┐
│                    App 시작                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Auth 상태 확인 │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌──────────┐           ┌──────────┐
    │ 로그인됨  │           │ 미로그인  │
    └────┬─────┘           └────┬─────┘
         │                      │
         ▼                      ▼
    ┌──────────┐           ┌──────────┐
    │ 홈 화면   │           │ 로그인   │
    │ (루틴목록)│           │ 화면     │
    └──────────┘           └────┬─────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
              ┌──────────┐           ┌──────────┐
              │ 게스트    │           │ Google   │
              │ 로그인    │           │ 로그인   │
              └──────────┘           └──────────┘
```

### 인증 상태 관리
```typescript
interface AuthState {
  user: User | null
  isLoading: boolean
  isAnonymous: boolean
  error: Error | null
}

// 상태 전이
INITIAL → LOADING → AUTHENTICATED | UNAUTHENTICATED
AUTHENTICATED → LINKING → LINKED (익명→Google 연결)
```

---

## 2. 루틴 관리 플로우

```
┌─────────────────────────────────────────────────────────┐
│                    루틴 목록 화면                         │
├─────────────────────────────────────────────────────────┤
│  [+ 새 루틴 추가]                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 07:00 기상                              [편집]   │   │
│  │ 비디오 인증: 현관문 앞에서 손 흔들기              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 07:00-07:10 스트레칭           🔗 [편집]        │   │
│  │ 링크: youtube.com/...                           │   │
│  └─────────────────────────────────────────────────┘   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### 루틴 CRUD 로직
```typescript
// 생성
validateRoutine(input) → saveToFirestore() → updateLocalState()

// 수정
validateRoutine(input) → updateFirestore() → updateLocalState()

// 삭제
confirmDelete() → deleteFromFirestore() → updateLocalState()

// 정렬
routines.sort((a, b) => a.startTime.localeCompare(b.startTime))
```

---

## 3. Live Session 플로우

```
┌─────────────────────────────────────────────────────────┐
│                 푸시 알림 수신                            │
└─────────────────────┬───────────────────────────────────┘
                      │ 클릭
                      ▼
┌─────────────────────────────────────────────────────────┐
│              PWA 열림 + 세션 시작                         │
├─────────────────────────────────────────────────────────┤
│  1. Ephemeral Token 요청 (Backend)                      │
│  2. Gemini Live API WebSocket 연결                      │
│  3. 마이크/카메라 권한 요청                              │
│  4. 오디오 스트리밍 시작                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              기상 대화                                    │
├─────────────────────────────────────────────────────────┤
│  AI: "좋은 아침이에요! 일어나셨나요?"                     │
│  User: "일어났어" / "5분만"                              │
│                                                         │
│  [일어났어] → 기상 완료 → 첫 루틴 시작                   │
│  [5분만] → 스누즈 카운터++ → 5분 후 재알림               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              루틴 진행                                    │
├─────────────────────────────────────────────────────────┤
│  현재 루틴: 스트레칭 (07:00-07:10)                       │
│  [링크 열기] [완료] [스킵]                               │
│                                                         │
│  타이머: 08:32 / 10:00                                  │
│  진행률: ████████░░ 80%                                 │
└─────────────────────┬───────────────────────────────────┘
                      │ 비디오 인증 루틴
                      ▼
┌─────────────────────────────────────────────────────────┐
│              비디오 인증                                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐                   │
│  │                                 │                   │
│  │      [카메라 프리뷰]            │                   │
│  │                                 │                   │
│  └─────────────────────────────────┘                   │
│  인식 중: "물 마시기"                                    │
│  상태: 🔄 분석 중...                                    │
│                                                         │
│  [수동 완료]                                            │
└─────────────────────────────────────────────────────────┘
```

### Live Session 상태 머신
```typescript
type SessionState = 
  | 'idle'           // 세션 없음
  | 'connecting'     // WebSocket 연결 중
  | 'wake_up'        // 기상 대화 중
  | 'routine'        // 루틴 진행 중
  | 'verification'   // 비디오 인증 중
  | 'report'         // 리포트 표시
  | 'error'          // 에러 상태

// 상태 전이
idle → connecting → wake_up → routine ↔ verification → report → idle
                                  ↓
                               (스킵)
```

---

## 4. 비디오 인증 로직

```typescript
// 비디오 프레임 전송 (1fps로 제한)
const sendVideoFrame = throttle(async (frame: ImageData) => {
  await liveSession.sendVideoFrame(frame)
}, 1000)

// 행동 인식 결과 처리
liveSession.onActionRecognized((result) => {
  if (result.recognized) {
    // 자동 인증 완료
    playPraiseAudio(result.praise)
    completeRoutine('auto')
  }
})

// 타임아웃 처리 (30초)
setTimeout(() => {
  if (!recognized) {
    showManualCompleteButton()
    playHintAudio()
  }
}, 30000)
```

---

## 5. PWA 푸시 알림 로직

```typescript
// Service Worker 등록
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register('/sw.js')
  
  // 푸시 구독
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  })
  
  // 서버에 구독 정보 전송
  await api.registerPushSubscription(subscription)
}

// 푸시 수신 (sw.js)
self.addEventListener('push', (event) => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    data: { url: '/session' }
  })
})

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  clients.openWindow(event.notification.data.url)
})
```
