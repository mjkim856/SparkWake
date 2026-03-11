# Live API 통합 계획

## 연결 방식: Option A (세션 전체 연결 유지)

```
세션 시작 (푸시 알림 클릭 또는 수동)
    ↓
Ephemeral Token 발급 (Backend)
    ↓
Live API WebSocket 연결 (세션 전체 유지)
    ↓
┌─────────────────────────────────────┐
│  WebSocket 연결 유지                │
│  - 마이크: 상황에 따라 ON/OFF       │
│  - AI 응답 중 사용자 발화 → 즉시 중단│
│  - 비디오 인증 시 카메라 프레임 전송 │
└─────────────────────────────────────┘
    ↓
세션 종료 시 WebSocket 닫힘
```

**선택 이유**: 해커톤 심사 기준 "interruption handling (barge-in)" 충족 필수

---

## 해커톤 필수 요구사항 체크리스트

| 요구사항 | 현재 상태 | 필요 작업 |
|----------|----------|----------|
| 실시간 음성 상호작용 | ⚠️ 코드만 있음 | API 엔드포인트 수정 + 테스트 |
| 실시간 영상 상호작용 | ⚠️ 코드만 있음 | CameraPreview → Live API 연동 |
| 중간에 끊기(interrupt) | ⚠️ 콜백만 정의 | 실제 동작 확인 + UI 피드백 |
| Gemini Live API 사용 | ⚠️ 부분 구현 | 전체 플로우 연결 |
| Google Cloud 호스팅 | ✅ 설계 완료 | 실제 배포 |

---

## 발견된 문제점

### 1. API 인증 누락 (Critical)
- **백엔드**: `Depends(get_current_user)` 인증 필요
- **프론트엔드**: 인증 토큰 없이 fetch 호출
- **해결**: Firebase ID Token을 Authorization 헤더에 포함

```typescript
// 현재 (잘못됨)
const tokenRes = await fetch(`${API_URL}/api/gemini/ephemeral-token`)

// 수정 필요
const idToken = await auth.currentUser?.getIdToken()
const tokenRes = await fetch(`${API_URL}/api/gemini/ephemeral-token`, {
  headers: { Authorization: `Bearer ${idToken}` }
})
```

### 2. 비디오 스트리밍 미연동
- `CameraPreview.tsx`는 프레임 캡처만 하고 Live API로 전송 안 함
- `LiveSessionContext`에서 비디오 데이터 처리 로직 없음

### 3. 음성 인식 키워드 미처리
- `COMPLETE_KEYWORDS`, `SKIP_KEYWORDS` 정의만 있음
- `onMessage` 콜백에서 키워드 매칭 로직 없음

### 4. 인터럽트 UI 피드백 없음
- `onInterrupted` 콜백은 오디오 큐만 클리어
- 사용자에게 인터럽트 발생 시각적 피드백 없음

---

## 구현 계획

### Phase 1: 음성 연동 완성 (우선순위 높음)
- [x] 1.1 프론트엔드 ephemeral-token 호출에 인증 헤더 추가
- [x] 1.2 Live API 연결 성공 확인 (콘솔 로그)
- [x] 1.3 마이크 → Live API 오디오 스트리밍 테스트
- [x] 1.4 AI 음성 응답 재생 테스트
- [x] 1.5 인터럽트(barge-in) 동작 확인
- [x] 1.6 음성 키워드 자동 인식 (완료/스킵/연장)

### Phase 2: 영상 연동 (우선순위 높음)
- [x] 2.1 gemini-live.ts에 비디오 프레임 전송 함수 추가
- [x] 2.2 CameraPreview → LiveSessionContext 연동
- [x] 2.3 비디오 인증 루틴에서 자동 카메라 활성화
- [ ] 2.4 AI 행동 인식 결과 → 자동 완료 처리

### Phase 3: 인터럽트 UI 피드백 (우선순위 중간)
- [x] 3.1 AI 말하는 중 시각적 표시 (AudioVisualizer)
- [x] 3.2 인터럽트 발생 시 UI 피드백
- [x] 3.3 사용자 발화 중 시각적 표시

### Phase 4: 배포 및 테스트 (우선순위 높음)
- [ ] 4.1 로컬 E2E 테스트
- [ ] 4.2 Cloud Run 배포
- [ ] 4.3 Firebase Hosting 배포
- [ ] 4.4 프로덕션 E2E 테스트

### Phase 2: 영상 연동 (우선순위 높음)
- [ ] 2.1 CameraPreview에서 프레임 → Live API 전송 구현
- [ ] 2.2 LiveSessionContext에 비디오 스트리밍 로직 추가
- [ ] 2.3 비디오 인증 루틴에서 자동 카메라 활성화
- [ ] 2.4 행동 인식 결과 처리 (자동 완료)

### Phase 3: 인터럽트 처리 (우선순위 중간)
- [ ] 3.1 인터럽트 발생 시 UI 피드백 추가
- [ ] 3.2 오디오 재생 중 사용자 발화 감지
- [ ] 3.3 인터럽트 후 자연스러운 대화 재개

### Phase 4: 배포 (우선순위 높음)
- [ ] 4.1 Cloud Run 배포
- [ ] 4.2 Firebase Hosting 배포
- [ ] 4.3 E2E 테스트

---

## 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/contexts/LiveSessionContext.tsx` | 인증 헤더 추가, 비디오 연동, 키워드 처리 |
| `frontend/src/components/session/CameraPreview.tsx` | Live API 비디오 전송 콜백 연결 |
| `frontend/src/lib/gemini-live.ts` | 비디오 프레임 전송 함수 추가 |
| `frontend/src/app/session/page.tsx` | 비디오 인증 UI 연동 |

---

## 테스트 시나리오

### 시나리오 1: 음성 기상 알람
1. 세션 시작 → Live API 연결
2. AI: "좋은 아침이에요! 일어나셨나요?"
3. 사용자: "응" (음성)
4. AI: "좋아요! 첫 번째 루틴을 시작해볼까요?"

### 시나리오 2: 비디오 인증
1. 비디오 인증 루틴 시작 → 카메라 활성화
2. 카메라 프레임 → Live API 전송
3. AI가 행동 인식 → "잘하셨어요!" + 자동 완료

### 시나리오 3: 인터럽트
1. AI가 말하는 중
2. 사용자가 끼어들기 → AI 즉시 멈춤
3. 사용자 발화 처리 → 자연스럽게 응답

---

## 예상 소요 시간

| Phase | 예상 시간 |
|-------|----------|
| Phase 1 (음성) | 2-3시간 |
| Phase 2 (영상) | 2-3시간 |
| Phase 3 (인터럽트) | 1시간 |
| Phase 4 (배포) | 1-2시간 |
| **총계** | **6-9시간** |
