# CONSTRUCTION 통합 설계 계획

## 개요
시간 절약을 위해 3개 Unit (Frontend, Backend, Infrastructure)의 Functional Design, NFR Requirements, Infrastructure Design을 통합하여 진행합니다.

## 진행 상태
- [x] Part 1: 핵심 설계 질문 수집 완료
- [x] Part 2: 기술 스택 확정
- [x] Frontend Functional Design 완료
- [x] Backend Functional Design 완료
- [x] Frontend NFR Requirements 완료
- [x] Backend NFR Requirements 완료
- [x] Infrastructure Design 완료
- [ ] Code Generation (다음 단계)

---

## Part 1: 핵심 설계 질문

아래 질문들에 답변해주세요. 대부분 기본값을 제안했으니, 동의하시면 "OK" 또는 "기본값"이라고 답해주셔도 됩니다.

---

### Q1: Gemini Live API 연결 방식

Live API를 Frontend에서 직접 연결할지, Backend를 거칠지 결정해야 해요.

A) **Frontend 직접 연결** (권장)
   - Frontend → Gemini Live API (WebSocket)
   - 장점: 지연시간 최소화, 구현 단순
   - 단점: API 키 노출 위험 (Ephemeral Token으로 해결)

B) **Backend 프록시**
   - Frontend → Backend → Gemini Live API
   - 장점: API 키 보호, 로깅 용이
   - 단점: 지연시간 증가, 구현 복잡

[Answer]: A (Frontend 직접 연결 - Ephemeral Token 사용)

---

### Q2: 상태 관리 라이브러리

Frontend 상태 관리 방식을 선택해주세요.

A) **React Context + useState** (권장 - 단순함)
B) Zustand (가벼운 상태 관리)
C) Redux Toolkit (복잡한 상태 관리)
D) Jotai (원자적 상태 관리)

[Answer]: A (React Context + useState)

---

### Q3: UI 컴포넌트 라이브러리

A) **Tailwind CSS + shadcn/ui** (권장 - 빠른 개발)
B) Material UI
C) Chakra UI
D) 순수 Tailwind CSS만

[Answer]: A (Tailwind CSS + shadcn/ui)

---

### Q4: 푸시 알림 스케줄링

기상 알람 푸시를 어떻게 스케줄링할까요?

A) **Cloud Scheduler + Cloud Functions** (권장)
   - Cloud Scheduler가 매분 체크 → 해당 시간 사용자에게 푸시

B) Backend Cron Job
   - Cloud Run 내부에서 스케줄러 실행

C) 클라이언트 사이드 (Service Worker)
   - 브라우저가 열려있을 때만 동작

[Answer]: A (Cloud Scheduler + Cloud Functions)

---

### Q5: Firestore 보안 규칙

A) **Firebase Security Rules** (권장)
   - 클라이언트에서 직접 Firestore 접근
   - Security Rules로 userId 기반 접근 제어

B) Backend API만 통해 접근
   - 모든 DB 접근은 Backend를 거침
   - 더 안전하지만 구현 복잡

[Answer]: A (Firebase Security Rules) 

---

### Q6: 에러 모니터링

A) **Console 로깅만** (MVP 단순화)
B) Sentry 연동
C) Google Cloud Error Reporting

[Answer]: A (수정) - 로깅 최소화 + 민감정보 마스킹 철저히

---

### Q7: CI/CD

A) **수동 배포** (MVP - terraform apply, npm run build)
B) GitHub Actions 자동화
C) Cloud Build

[Answer]: A (수동 배포)

---

### Q8: 테스트 범위

A) **E2E 테스트 없음** (MVP - 수동 테스트)
B) 핵심 API만 단위 테스트
C) 전체 테스트 커버리지

[Answer]: B (핵심 API 단위 테스트) 

---

## Part 2: 기술 스택 확정

위 답변을 바탕으로 기술 스택을 확정합니다.

### Frontend
- Framework: Next.js 15 (App Router)
- Language: TypeScript 5.x
- Styling: Tailwind CSS + shadcn/ui
- State: React Context + useState
- PWA: next-pwa (Workbox)
- Auth: Firebase Auth (Client SDK)

### Backend
- Framework: FastAPI
- Language: Python 3.12
- AI SDK: google-genai
- Auth: Firebase Admin SDK
- Push: Firebase Cloud Messaging

### Infrastructure
- IaC: Terraform
- Compute: Cloud Run
- Database: Firestore
- Storage: Cloud Storage
- Hosting: Firebase Hosting
- Scheduler: Cloud Scheduler + Cloud Functions

---

위 질문들에 답변해주시면 상세 설계 문서를 생성하겠습니다.
