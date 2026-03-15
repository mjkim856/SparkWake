# FR-8: AI Tool Calling - YouTube 재생 제어 구현 완료

## 구현 일자
2026-03-15

## 구현 내용

### 1. 타입 정의 (`frontend/src/types/index.ts`)
- `ToolCall`, `FunctionCall`, `FunctionResponse` 타입 추가

### 2. Gemini Live API Tool Declaration (`frontend/src/lib/gemini-live.ts`)
- `play_youtube`: YouTube 영상 재생
- `complete_routine`: 루틴 완료 처리
- `skip_routine`: 루틴 스킵
- `onToolCall` 콜백 추가
- `sendToolResponse` 메서드 추가
- `systemInstruction` 버그 수정 (config에 포함)

### 3. Tool 콜백 핸들러 (`frontend/src/contexts/LiveSessionContext.tsx`)
- `youtubeVideoId` 상태 추가
- `handleToolCall` 핸들러 구현
- `closeYouTube` 함수 추가
- `extractYouTubeVideoId` 유틸리티 함수 추가
- 시스템 프롬프트에 Tool 사용 안내 및 자동 재생 규칙 추가

### 4. YouTubePlayer 컴포넌트 (`frontend/src/components/session/YouTubePlayer.tsx`)
- YouTube iframe 임베드 컴포넌트 신규 생성
- 닫기 버튼 포함

### 5. RoutineProgressView 수정 (`frontend/src/components/session/RoutineProgressView.tsx`)
- YouTube 플레이어 조건부 렌더링 (카메라/YouTube/아이콘)
- YouTube 힌트 문구 추가

### 6. 세션 페이지 수정 (`frontend/src/app/session/page.tsx`)
- `youtubeVideoId`, `closeYouTube` props 전달

## 테스트 결과
- ✅ "영상 틀어줘" 음성 명령 → YouTube 임베드 표시
- ✅ AI가 "재생할게요" 음성 응답
- ✅ "완료" 음성 명령 → 루틴 완료 처리
- ✅ "스킵" 음성 명령 → 다음 루틴으로 이동
- ✅ 루틴에 YouTube 링크 있으면 자동 재생
- ✅ 빌드 성공

## 관련 요구사항
- FR-8: AI Tool Calling - YouTube 재생 제어
