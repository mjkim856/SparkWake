# Miracle Morning AI Coach - Frontend

Next.js 16 기반 PWA 프론트엔드

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS
- Firebase Auth & Firestore
- @google/genai (Gemini Live API)

## Setup

1. 환경변수 설정:
```bash
cp .env.local.example .env.local
# .env.local 파일에 Firebase 설정 입력
```

2. 의존성 설치:
```bash
npm install
```

3. 개발 서버 실행:
```bash
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx           # 홈 (루틴 목록)
│   ├── session/page.tsx   # 세션 진행
│   └── report/page.tsx    # 리포트
├── components/
│   ├── ui/                # 기본 UI 컴포넌트
│   ├── routine/           # 루틴 관련 컴포넌트
│   ├── session/           # 세션 관련 컴포넌트
│   └── report/            # 리포트 관련 컴포넌트
├── contexts/              # React Context
│   ├── AuthContext.tsx    # 인증 상태
│   └── LiveSessionContext.tsx # 세션 상태
├── lib/                   # 유틸리티
│   ├── firebase.ts        # Firebase 초기화
│   └── utils.ts           # 헬퍼 함수
└── types/                 # TypeScript 타입
```

## Features

- 익명 로그인 + Google 로그인
- 루틴 CRUD (Firestore 실시간 동기화)
- 하이브리드 음성 대화 모드
- 비디오 인증
- AI 코칭 (주간 리포트)
- PWA 지원

## Environment Variables

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=
```
