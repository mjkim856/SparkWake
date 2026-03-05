# Application Components

## 개요
미라클 모닝 AI 코치의 주요 컴포넌트 정의

---

## Frontend Components (Next.js PWA)

### FC-1: AuthProvider
**목적**: 사용자 인증 상태 관리
**책임**:
- Firebase Auth 초기화 및 상태 관리
- 익명/Google 로그인 처리
- 인증 토큰 관리
- 로그인/로그아웃 UI 제공

### FC-2: RoutineManager
**목적**: 루틴 설정 CRUD UI
**책임**:
- 루틴 목록 표시 (시작시간 순 정렬)
- 루틴 생성/수정/삭제 폼
- 비디오 인증 설정 (행동 설명 입력)
- 링크 설정

### FC-3: LiveSessionController
**목적**: 실시간 AI 세션 관리
**책임**:
- Gemini Live API WebSocket 연결 관리
- 오디오 스트리밍 (마이크 입력 → API → 스피커 출력)
- 비디오 스트리밍 (카메라 → API)
- 세션 상태 표시 (연결중/활성/종료)
- 재연결 로직

### FC-4: RoutineProgressView
**목적**: 루틴 진행 상황 UI
**책임**:
- 현재 루틴 표시
- 링크 열기 버튼
- 완료/스킵/넘어가기 버튼
- 타이머 표시
- 진행률 표시

### FC-5: VideoVerificationView
**목적**: 실시간 비디오 인증 UI
**책임**:
- 카메라 프리뷰 표시
- 인증 상태 표시 (대기/인식중/완료)
- 수동 완료 버튼
- 인증 결과 피드백

### FC-6: DailyReportView
**목적**: 일일 리포트 UI
**책임**:
- 루틴별 완료/스킵 상태 표시
- 시간 비교 차트
- 완료율 표시
- 음성 요약 재생

### FC-7: PWAManager
**목적**: PWA 기능 관리
**책임**:
- Service Worker 등록
- 푸시 알림 권한 요청
- 푸시 알림 수신 처리
- 홈 화면 추가 프롬프트

---

## Backend Components (FastAPI)

### BC-1: AuthMiddleware
**목적**: API 인증 처리
**책임**:
- Firebase ID 토큰 검증
- 사용자 컨텍스트 주입
- 익명 사용자 처리

### BC-2: RoutineService
**목적**: 루틴 비즈니스 로직
**책임**:
- 루틴 CRUD 처리
- Firestore 연동
- 루틴 유효성 검증

### BC-3: SessionService
**목적**: 루틴 세션 관리
**책임**:
- 세션 시작/종료 처리
- 루틴 진행 상태 추적
- 완료/스킵 기록
- 시간 기록

### BC-4: GeminiLiveService
**목적**: Gemini Live API 통합
**책임**:
- Live API 세션 생성
- 오디오/비디오 스트림 처리
- 응답 스트리밍
- 행동 인식 결과 처리

### BC-5: ReportService
**목적**: 리포트 생성
**책임**:
- Daily Report 생성
- 통계 계산
- Firestore 저장

### BC-6: PushNotificationService
**목적**: 푸시 알림 발송
**책임**:
- FCM 토큰 관리
- 기상 알람 스케줄링
- 푸시 알림 발송

### BC-7: StorageService
**목적**: 파일 저장 관리
**책임**:
- Cloud Storage 연동
- 비디오 스냅샷 저장
- 파일 URL 생성

---

## Infrastructure Components (Terraform)

### IC-1: CloudRunService
**목적**: Backend 호스팅
**책임**:
- FastAPI 컨테이너 배포
- 자동 스케일링 설정
- 환경변수 관리

### IC-2: FirestoreDatabase
**목적**: 데이터 저장소
**책임**:
- 컬렉션 구조 정의
- 보안 규칙 설정
- 인덱스 설정

### IC-3: CloudStorageBucket
**목적**: 파일 저장소
**책임**:
- 버킷 생성
- CORS 설정
- 라이프사이클 정책

### IC-4: FirebaseHosting
**목적**: Frontend 호스팅
**책임**:
- Next.js 정적 파일 배포
- CDN 설정
- 커스텀 도메인 (선택)

### IC-5: IAMConfiguration
**목적**: 권한 관리
**책임**:
- 서비스 계정 생성
- 역할 할당
- 최소 권한 원칙 적용

---

## 컴포넌트 요약

| Layer | 컴포넌트 수 | 주요 역할 |
|-------|------------|----------|
| Frontend | 7개 | UI, 실시간 세션, PWA |
| Backend | 7개 | API, 비즈니스 로직, AI 통합 |
| Infrastructure | 5개 | GCP 리소스 프로비저닝 |
| **Total** | **19개** | |
