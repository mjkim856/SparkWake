# Requirements Document

## Intent Analysis

### User Request
Google Gemini Live Agent Challenge 해커톤에 제출할 "미라클 모닝 AI 코치" PWA 웹앱 개발. 실시간 음성 대화와 비디오 인증을 통해 사용자의 아침 루틴을 관리하는 AI 에이전트.

### Request Type
- **Type**: New Project (Greenfield)
- **Category**: Live Agents 🗣️ (Real-time Audio/Vision Interaction)

### Scope Estimate
- **Scope**: System-wide (Full-stack PWA + Backend + IaC)
- **Components**: Frontend (Next.js PWA), Backend (FastAPI), AI (Gemini Live API), Infrastructure (Terraform)

### Complexity Estimate
- **Complexity**: Moderate-Complex
- **Rationale**: 실시간 멀티모달 AI 통합, WebSocket 스트리밍, PWA 푸시 알림 등 복잡한 기술 스택

### Timeline
- **Target**: 1주 (2026-03-09)
- **Maximum**: 2주 (2026-03-16)

---

## Project Decisions (from Q&A)

| Decision | Choice | Notes |
|----------|--------|-------|
| UI Language | English | 추후 다국어 지원 예정 |
| Authentication | Anonymous + Google | 게스트 모드로 빠른 시작 |
| Demo Focus | Voice Alarm + Video Verification | 해커톤 심사 핵심 |
| MVP Scope | Core + Settings UI | Req 2, 3, 4, 5, 6 |
| Video Actions | User-defined | 텍스트 설명 기반 행동 인식 |
| Data Retention | Unlimited | 최소 1년 (YoY 비교 기능) |
| Offline Support | None | 온라인 필수 |
| IaC Tool | Terraform | Google Cloud Provider |

---

## Technical Constraints (2026.03.02 기준)

### AI Models
- **Gemini 2.5 Flash Native Audio** (`gemini-2.5-flash-native-audio-preview-12-2025`): Live API 실시간 음성+비디오 (Function Calling 지원)
- **Gemini 3 Flash** (`gemini-3-flash-preview`): 텍스트 생성 (AI 코칭 메시지)
- **Gemini 3.1 Pro** (`gemini-3.1-pro-preview`): 데이터 분석 및 추천 (Post-MVP)
- ⚠️ Gemini 2.0 Flash는 2026.03.31 종료 예정 - 사용 금지

### Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 15+ |
| Frontend | React | 19+ |
| Frontend | TypeScript | 5.x |
| Frontend | PWA | Workbox |
| Backend | Python | 3.12+ |
| Backend | FastAPI | Latest |
| AI SDK | Google GenAI SDK | Latest |
| Database | Firestore | - |
| Storage | Cloud Storage | - |
| Auth | Firebase Auth | - |
| Hosting (FE) | Firebase Hosting | - |
| Hosting (BE) | Cloud Run | - |
| IaC | Terraform | 1.x |

---

## Functional Requirements

### FR-1: User Authentication
**Priority**: High | **MVP**: Yes

사용자가 앱에 로그인하여 개인 데이터를 안전하게 관리할 수 있다.

| ID | Requirement |
|----|-------------|
| FR-1.1 | 익명 로그인(게스트 모드)으로 즉시 앱 사용 가능 |
| FR-1.2 | Google OAuth 로그인 지원 |
| FR-1.3 | 익명 계정을 Google 계정으로 연결(upgrade) 가능 |
| FR-1.4 | 로그아웃 시 로컬 세션 종료 및 토큰 삭제 |

### FR-2: Routine Configuration
**Priority**: High | **MVP**: Yes

사용자가 자신만의 아침 루틴을 설정하고 관리할 수 있다.

| ID | Requirement |
|----|-------------|
| FR-2.1 | 루틴 생성: 이름, 시작시간, 소요시간, 링크(선택), 비디오인증여부(선택), 인증행동설명(선택) |
| FR-2.2 | 루틴 CRUD (생성, 조회, 수정, 삭제) |
| FR-2.3 | 루틴 목록을 시작시간 순으로 정렬 표시 |
| FR-2.4 | 비디오인증 활성화 시 인증행동설명 입력 필드 표시 |
| FR-2.5 | 루틴 데이터 Firestore 저장 |

### FR-3: Voice Wake-up Alarm
**Priority**: Critical | **MVP**: Yes | **Demo Focus**: ⭐

AI 음성으로 기상 알림을 받고 대화형 인터랙션을 수행한다.

| ID | Requirement |
|----|-------------|
| FR-3.1 | 기상 시간에 Web Push 알림 발송 |
| FR-3.2 | 알림 클릭 시 PWA 열림 + Live API 세션 시작 + 기상 환영 메시지 음성 재생 |
| FR-3.3 | 사용자 음성 응답 실시간 인식 및 응답 |
| FR-3.4 | "일어났어" 등 긍정 응답 → 기상 완료 기록 + 첫 루틴 안내 |
| FR-3.5 | "5분만" 등 스누즈 응답 → 5분 후 재알림 |
| FR-3.6 | 3회 이상 스누즈 → 더 강력한 톤으로 기상 독려 |
| FR-3.7 | 모든 음성 응답 내용 및 시간 Firestore 기록 |

### FR-4: Routine Progress Management
**Priority**: High | **MVP**: Yes

AI가 루틴 진행을 안내하고 관리한다.

| ID | Requirement |
|----|-------------|
| FR-4.1 | 루틴 시작 시간 도달 시 음성 안내 |
| FR-4.2 | 링크 설정된 루틴 → 링크 열기 버튼 표시 |
| FR-4.3 | 링크 버튼 클릭 → 새 탭에서 링크 오픈 |
| FR-4.4 | 루틴 소요시간 경과 → 완료 여부 음성 질문 |
| FR-4.5 | "됐어" 등 완료 응답 → 완료 기록 + 다음 루틴 안내 |
| FR-4.6 | "아직" 등 미완료 응답 → "넘어가기" 버튼 표시 |
| FR-4.7 | 넘어가기 클릭 → 스킵 기록 + 다음 루틴 안내 |
| FR-4.8 | 각 루틴의 실제 시작/완료 시간, 완료여부 Firestore 기록 |

### FR-5: Real-time Video Verification
**Priority**: Critical | **MVP**: Yes | **Demo Focus**: ⭐

AI가 실시간 비디오 스트림을 분석하여 루틴 완료를 자동 인증한다.

| ID | Requirement |
|----|-------------|
| FR-5.1 | 비디오인증 루틴 시작 시 카메라 스트리밍 활성화 |
| FR-5.2 | Live API로 실시간 비디오 프레임 분석 |
| FR-5.3 | 사용자 정의 행동(인증행동설명 기반) 인식 |
| FR-5.4 | 행동 인식 시 음성 칭찬 + 자동 인증 완료 (버튼 클릭 불필요) |
| FR-5.5 | 30초 이상 미인식 → 힌트 제공 또는 수동 완료 버튼 표시 |
| FR-5.6 | 수동 완료 선택 → 수동 완료로 기록 + 다음 루틴 진행 |
| FR-5.7 | 인증 시점 비디오 스냅샷 Cloud Storage 저장 |
| FR-5.8 | 인증 결과(자동/수동/스킵) 및 소요시간 Firestore 기록 |

### FR-6: Daily Report
**Priority**: Medium | **MVP**: Yes

하루 루틴 결과를 요약하여 제공한다.

| ID | Requirement |
|----|-------------|
| FR-6.1 | 모든 루틴 종료 시 Daily Report 자동 생성 |
| FR-6.2 | 각 루틴별 완료/스킵 상태 표시 |
| FR-6.3 | 설정 소요시간 vs 실제 소요시간 비교 표시 |
| FR-6.4 | 전체 루틴 완료율 백분율 표시 |
| FR-6.5 | 총 소요시간과 설정 시간 차이 표시 |
| FR-6.6 | 음성으로 오늘 결과 요약 안내 |
| FR-6.7 | Daily Report Firestore 저장 |

### FR-7: Data Analytics (Post-MVP)
**Priority**: Low | **MVP**: No

누적 데이터 기반 패턴 분석 및 개인화 추천.

| ID | Requirement |
|----|-------------|
| FR-7.1 | 루틴별 시작/완료 시간, 완료여부, 요일 정보 누적 저장 |
| FR-7.2 | Gemini 3.1 Pro 기반 패턴 분석 |
| FR-7.3 | 시간 조정 추천 |
| FR-7.4 | 지연 시간대 파악 |
| FR-7.5 | 스킵률 높은 루틴 대체 추천 |
| FR-7.6 | 요일별 완료율 패턴 분석 |
| FR-7.7 | 주간/월간 리포트 제공 |

### FR-8: AI Tool Calling - YouTube 재생 제어
**Priority**: High | **MVP**: Yes | **Demo Focus**: ⭐ (에이전트 차별화)

AI가 음성 명령을 이해하고 YouTube 영상 재생 등 실제 행동을 수행한다.

#### 배경 및 목적
- 해커톤 심사 기준 "AI가 행동한다" 요소 강화
- 단순 대화형 AI → 실제 도구를 사용하는 에이전트로 격상
- Gemini Live API의 Function Calling 기능 활용

#### 기술 참조
- 공식 문서: https://ai.google.dev/gemini-api/docs/live-api/tools
- 모델: `gemini-2.5-flash-native-audio-preview-12-2025` (Function Calling 지원 ✅)

| ID | Requirement |
|----|-------------|
| FR-8.1 | Live API 세션 설정 시 `tools` 배열에 Function Declaration 정의 |
| FR-8.2 | `play_youtube` 함수: YouTube 영상 재생 (videoId 또는 검색어 파라미터) |
| FR-8.3 | `complete_routine` 함수: 현재 루틴 완료 처리 |
| FR-8.4 | AI가 `toolCall` 메시지 전송 시 클라이언트에서 해당 함수 실행 |
| FR-8.5 | 함수 실행 후 `sendToolResponse`로 결과를 AI에게 전달 |
| FR-8.6 | AI가 결과를 받고 자연스러운 음성 응답 생성 ("네, 요가 영상 재생할게요!") |

#### YouTube 임베드 요구사항

| ID | Requirement |
|----|-------------|
| FR-8.7 | 루틴에 YouTube URL 저장 가능 (기존 `link` 필드 활용 또는 `youtubeUrl` 필드 추가) |
| FR-8.8 | YouTube URL에서 videoId 자동 추출 (youtube.com/watch?v=XXX, youtu.be/XXX 형식 지원) |
| FR-8.9 | `play_youtube` 호출 시 카메라 프리뷰 영역에 YouTube iframe 임베드 표시 |
| FR-8.10 | YouTube 임베드는 autoplay 활성화 |
| FR-8.11 | YouTube 링크와 비디오 인증을 동시에 설정 가능 (PIP UI로 표시, FR-8.12 참조) |

#### Tool Declaration 스키마

```typescript
const tools = [{
  functionDeclarations: [
    {
      name: "play_youtube",
      description: "YouTube 영상을 재생합니다. 루틴에 설정된 영상 또는 검색어로 영상을 찾아 재생합니다.",
      parameters: {
        type: "object",
        properties: {
          videoId: {
            type: "string",
            description: "YouTube 비디오 ID 또는 검색어"
          }
        },
        required: ["videoId"]
      }
    },
    {
      name: "complete_routine",
      description: "현재 진행 중인 루틴을 완료 처리합니다.",
      parameters: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "skip_routine",
      description: "현재 루틴을 건너뛰고 다음 루틴으로 이동합니다.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  ]
}]
```

#### 처리 흐름

```
1. 사용자: "요가 영상 틀어줘" (음성)
2. AI 판단: play_youtube 함수 호출 필요
3. AI → 클라이언트: toolCall 메시지
   { functionCalls: [{ id: "xxx", name: "play_youtube", args: { videoId: "morning_yoga" } }] }
4. 클라이언트: YouTube 플레이어 표시 + 재생
5. 클라이언트 → AI: sendToolResponse({ functionResponses: [{ id: "xxx", name: "play_youtube", response: { result: "재생 시작" } }] })
6. AI: "네, 아침 요가 영상 재생할게요! 천천히 따라해보세요." (음성)
```

#### 인증 요구사항
| 항목 | 필요 여부 | 비고 |
|------|----------|------|
| YouTube API Key | ❌ | 임베드 재생은 API Key 불필요 |
| YouTube OAuth | ❌ | 개인 플레이리스트 접근 안 함 |
| 사용자 로그인 | ❌ | 공개 영상 임베드만 사용 |

#### UI 변경사항
| 화면 | 변경 내용 |
|------|----------|
| RoutineProgressView | 카메라/아이콘 영역에 YouTube 플레이어 조건부 렌더링 |
| Routine 설정 | YouTube URL 입력 필드 (선택) |

#### 예상 구현 시간
- YouTube 임베드만: 2-3시간
- Tool Calling 포함: 4-6시간

---

## Non-Functional Requirements

### NFR-1: Performance
| ID | Requirement |
|----|-------------|
| NFR-1.1 | Live API 응답 지연 < 500ms |
| NFR-1.2 | 비디오 프레임 처리 > 10fps |
| NFR-1.3 | 페이지 초기 로드 < 3초 (LCP) |
| NFR-1.4 | API 응답 시간 < 1초 (p95) |

### NFR-2: Security
| ID | Requirement |
|----|-------------|
| NFR-2.1 | Firebase Auth 토큰 검증 필수 |
| NFR-2.2 | API 키 환경변수 관리 (하드코딩 금지) |
| NFR-2.3 | HTTPS 전송 필수 |
| NFR-2.4 | CORS 정책 엄격 설정 |

### NFR-3: Scalability
| ID | Requirement |
|----|-------------|
| NFR-3.1 | Cloud Run 자동 스케일링 |
| NFR-3.2 | Firestore 자동 확장 |

### NFR-4: Usability
| ID | Requirement |
|----|-------------|
| NFR-4.1 | 모바일/데스크톱 반응형 UI |
| NFR-4.2 | 마이크/카메라 권한 거부 시 대체 UI 제공 |
| NFR-4.3 | 영어 UI (추후 다국어 지원 구조) |

### NFR-5: Reliability
| ID | Requirement |
|----|-------------|
| NFR-5.1 | 네트워크 불안정 시 재연결 시도 |
| NFR-5.2 | Live API 세션 최대 2분 유지; 세션 재연결/복구는 post-MVP (Issue #20)로 처리 |
| NFR-5.3 | 에러 발생 시 사용자 친화적 메시지 |

---

## Hackathon Requirements

### Mandatory
| ID | Requirement | Status |
|----|-------------|--------|
| HK-1 | Gemini 모델 사용 | ✅ Gemini 3 Flash + 3.1 Pro |
| HK-2 | Google GenAI SDK 또는 ADK 사용 | ✅ GenAI SDK |
| HK-3 | Google Cloud 서비스 1개 이상 | ✅ Cloud Run, Firestore, Cloud Storage |
| HK-4 | 실시간 멀티모달 인터랙션 | ✅ Live API (Audio + Video) |

### Bonus Points
| ID | Requirement | Status |
|----|-------------|--------|
| HK-5 | IaC 자동 배포 | ✅ Terraform |
| HK-6 | 블로그/영상 콘텐츠 | 📝 TBD |
| HK-7 | GDG 프로필 | 📝 TBD |

### Submission Deliverables
| ID | Deliverable |
|----|-------------|
| SUB-1 | 텍스트 설명 (기능, 기술, 학습 내용) |
| SUB-2 | 공개 GitHub 저장소 + README 배포 가이드 |
| SUB-3 | Google Cloud 배포 증명 (콘솔 녹화 또는 코드 링크) |
| SUB-4 | 아키텍처 다이어그램 |
| SUB-5 | 4분 이내 데모 영상 |

---

## MVP Scope Summary

**1주 목표 (2026-03-09)**:
- ✅ FR-1: User Authentication
- ✅ FR-2: Routine Configuration
- ✅ FR-3: Voice Wake-up Alarm ⭐
- ✅ FR-4: Routine Progress Management
- ✅ FR-5: Real-time Video Verification ⭐
- ✅ FR-6: Daily Report
- ❌ FR-7: Data Analytics (Post-MVP)
- 🆕 FR-8: AI Tool Calling - YouTube 재생 제어 ⭐ (에이전트 차별화)

**핵심 데모 시나리오**:
1. 기상 알람 → 음성 대화로 기상
2. 루틴 진행 → 비디오로 행동 자동 인식
3. **🆕 "영상 틀어줘" → AI가 YouTube 재생** (Tool Calling)
4. 일일 리포트 확인

**에이전트 차별화 포인트**:
- 단순 대화 AI가 아닌 "행동하는 AI"
- Gemini Live API Function Calling 활용
- 심사 기준 "Technical Implementation" 점수 향상 기대


### FR-8.12: YouTube + 비디오 인증 동시 지원 (PIP UI)
**Priority**: Medium | **MVP**: Yes

YouTube 영상을 보면서 동시에 비디오 인증을 수행할 수 있다.

| ID | Requirement |
|----|-------------|
| FR-8.12.1 | YouTube 링크 + 비디오 인증이 모두 설정된 루틴 지원 |
| FR-8.12.2 | 해당 루틴에서 YouTube가 메인 화면, 카메라가 PIP(Picture-in-Picture)로 표시 |
| FR-8.12.3 | PIP 카메라는 우측 하단에 작은 크기로 오버레이 |
| FR-8.12.4 | PIP 카메라에서도 비디오 프레임 전송하여 AI 인증 가능 |
| FR-8.12.5 | YouTube만 있는 루틴 → YouTube 전체 화면 |
| FR-8.12.6 | 비디오 인증만 있는 루틴 → 카메라 전체 화면 |
| FR-8.12.7 | 둘 다 없는 루틴 → 아이콘 표시 (기존 동작) |

#### UI 조건별 표시

| YouTube 링크 | 비디오 인증 | 화면 구성 |
|-------------|------------|----------|
| ❌ | ❌ | 아이콘만 |
| ❌ | ✅ | 카메라 (전체) |
| ✅ | ❌ | YouTube (전체) |
| ✅ | ✅ | YouTube (메인) + 카메라 (PIP) |

#### PIP 디자인 스펙
- 위치: 우측 하단
- 크기: 약 120x160px (3:4 비율)
- 스타일: 둥근 모서리, 그림자, 테두리
- 인증 완료 시: 초록색 체크 오버레이
