# Component Dependencies

## 의존성 매트릭스

### Frontend → Backend 의존성

| Frontend Component | Backend Endpoint | 의존성 유형 |
|-------------------|------------------|-------------|
| AuthProvider | /api/auth/verify | REST |
| RoutineManager | /api/routines/* | REST |
| LiveSessionController | /ws/live | WebSocket |
| LiveSessionController | /api/session/* | REST |
| RoutineProgressView | /api/session/complete, /api/session/skip | REST |
| VideoVerificationView | /ws/live | WebSocket |
| DailyReportView | /api/reports/{date} | REST |
| PWAManager | /api/push/* | REST |

### Backend → External Services 의존성

| Backend Component | External Service | 의존성 유형 |
|-------------------|------------------|-------------|
| AuthMiddleware | Firebase Auth | SDK |
| RoutineService | Firestore | SDK |
| SessionService | Firestore | SDK |
| GeminiLiveService | Gemini Live API | WebSocket |
| ReportService | Firestore | SDK |
| PushNotificationService | FCM | SDK |
| PushNotificationService | Firestore | SDK |
| StorageService | Cloud Storage | SDK |

---

## 컴포넌트 간 통신 패턴

### 1. 동기 통신 (REST API)
```
Frontend ──HTTP Request──> Backend ──Response──> Frontend
```
- 루틴 CRUD
- 세션 시작/종료
- 리포트 조회
- 푸시 토큰 등록

### 2. 실시간 통신 (WebSocket)
```
Frontend <──Bidirectional──> Backend <──Bidirectional──> Gemini Live API
```
- 오디오 스트리밍 (16kHz PCM → 24kHz PCM)
- 비디오 프레임 스트리밍 (JPEG)
- 실시간 응답/인식 결과

### 3. 푸시 통신 (FCM)
```
Cloud Scheduler ──Trigger──> Backend ──FCM──> Device
```
- 기상 알람 푸시 알림

---

## 데이터 흐름 다이어그램

### 기상 알람 → 루틴 완료 전체 흐름

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. 기상 알람                                                      │
├──────────────────────────────────────────────────────────────────┤
│ Cloud Scheduler → PushNotificationService → FCM → Device         │
│                                                                   │
│ [기상 시간 도달] → [알림 발송] → [푸시 알림 표시]                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. PWA 열림 + Live Session 시작                                   │
├──────────────────────────────────────────────────────────────────┤
│ User Click → PWA Open → LiveSessionController → Backend          │
│           → GeminiLiveService → Gemini Live API                  │
│                                                                   │
│ [알림 클릭] → [앱 열림] → [세션 시작] → [환영 메시지 음성 재생]    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. 음성 대화 (기상 확인)                                          │
├──────────────────────────────────────────────────────────────────┤
│ User Voice → Mic → LiveSessionController → Backend               │
│           → GeminiLiveService → Gemini Live API                  │
│           → Response Audio → Speaker                             │
│                                                                   │
│ ["일어났어"] → [음성 인식] → [기상 완료 기록] → ["좋아요! 첫 루틴~"]│
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. 루틴 진행 + 비디오 인증                                        │
├──────────────────────────────────────────────────────────────────┤
│ Camera → VideoVerificationView → LiveSessionController           │
│       → Backend → GeminiLiveService → Gemini Live API            │
│       → Action Recognition → Voice Praise                        │
│                                                                   │
│ [카메라 ON] → [비디오 스트림] → [행동 인식] → ["잘했어요!"]        │
│            → [스냅샷 저장] → [완료 기록]                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. 일일 리포트                                                    │
├──────────────────────────────────────────────────────────────────┤
│ All Routines Done → SessionService → ReportService               │
│                  → Firestore → DailyReportView                   │
│                  → Voice Summary                                  │
│                                                                   │
│ [모든 루틴 완료] → [리포트 생성] → [UI 표시] → [음성 요약]         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 에러 처리 의존성

| 에러 상황 | 처리 컴포넌트 | 폴백 동작 |
|----------|--------------|----------|
| Firebase Auth 실패 | AuthProvider | 재로그인 요청 |
| Firestore 연결 실패 | RoutineService | 에러 메시지 표시 |
| Live API 연결 실패 | GeminiLiveService | 재연결 시도 (3회) |
| 비디오 인식 실패 | VideoVerificationView | 수동 완료 버튼 표시 |
| 푸시 알림 실패 | PushNotificationService | 로그 기록 |
| Cloud Storage 실패 | StorageService | 스냅샷 저장 스킵 |

---

## 보안 의존성

| 컴포넌트 | 보안 요구사항 | 구현 방법 |
|----------|--------------|----------|
| AuthMiddleware | 토큰 검증 | Firebase Admin SDK |
| All Backend APIs | 인증 필수 | AuthMiddleware 데코레이터 |
| GeminiLiveService | API 키 보호 | 환경변수 (Secret Manager) |
| StorageService | 접근 제어 | Firebase Security Rules |
| Firestore | 데이터 격리 | Security Rules (userId 기반) |
