# Unit of Work Definitions

## 개요

미라클 모닝 AI 코치는 3개의 독립적인 Unit으로 분리됩니다.

---

## Unit 1: Frontend (Next.js PWA)

### 기본 정보
| 항목 | 값 |
|------|-----|
| 이름 | miracle-morning-frontend |
| 유형 | Web Application (PWA) |
| 기술 스택 | Next.js 15, React 19, TypeScript 5.x |
| 배포 대상 | Firebase Hosting |

### 책임 범위
- 사용자 인터페이스 (UI/UX)
- 클라이언트 사이드 상태 관리
- PWA 기능 (Service Worker, Push Notification)
- 실시간 오디오/비디오 스트리밍 (WebSocket 클라이언트)
- Firebase Auth 클라이언트

### 포함 컴포넌트
- FC-1: AuthProvider
- FC-2: RoutineManager
- FC-3: LiveSessionController
- FC-4: RoutineProgressView
- FC-5: VideoVerificationView
- FC-6: DailyReportView
- FC-7: PWAManager

### 디렉토리 구조
```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # 홈 (루틴 목록)
│   │   ├── session/
│   │   │   └── page.tsx        # 실시간 세션
│   │   ├── settings/
│   │   │   └── page.tsx        # 루틴 설정
│   │   └── report/
│   │       └── page.tsx        # 일일 리포트
│   ├── components/
│   │   ├── auth/
│   │   ├── routine/
│   │   ├── session/
│   │   └── report/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLiveSession.ts
│   │   └── useRoutines.ts
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── api.ts
│   │   └── websocket.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── manifest.json
│   └── sw.js
├── next.config.js
├── package.json
└── tsconfig.json
```

### 외부 의존성
- Backend API (REST + WebSocket)
- Firebase Auth
- FCM (Push Notification)

---

## Unit 2: Backend (FastAPI)

### 기본 정보
| 항목 | 값 |
|------|-----|
| 이름 | miracle-morning-backend |
| 유형 | API Server |
| 기술 스택 | Python 3.12, FastAPI, Google GenAI SDK |
| 배포 대상 | Cloud Run |

### 책임 범위
- REST API 제공
- WebSocket 프록시 (Gemini Live API)
- 비즈니스 로직 처리
- 데이터 영속성 (Firestore)
- 파일 저장 (Cloud Storage)
- 푸시 알림 발송 (FCM)

### 포함 컴포넌트
- BC-1: AuthMiddleware
- BC-2: RoutineService
- BC-3: SessionService
- BC-4: GeminiLiveService
- BC-5: ReportService
- BC-6: PushNotificationService
- BC-7: StorageService

### 디렉토리 구조
```
backend/
├── app/
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── config.py               # 설정 관리
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py             # 인증 엔드포인트
│   │   ├── routines.py         # 루틴 CRUD
│   │   ├── session.py          # 세션 관리
│   │   ├── reports.py          # 리포트
│   │   ├── push.py             # 푸시 알림
│   │   └── websocket.py        # WebSocket 핸들러
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── routine.py
│   │   ├── session.py
│   │   ├── gemini_live.py
│   │   ├── report.py
│   │   ├── push.py
│   │   └── storage.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── routine.py
│   │   ├── session.py
│   │   └── report.py
│   └── middleware/
│       ├── __init__.py
│       └── auth.py
├── tests/
│   ├── test_routines.py
│   ├── test_session.py
│   └── test_reports.py
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

### 외부 의존성
- Firestore
- Cloud Storage
- Gemini Live API
- Firebase Auth (Admin SDK)
- FCM

---

## Unit 3: Infrastructure (Terraform)

### 기본 정보
| 항목 | 값 |
|------|-----|
| 이름 | miracle-morning-infra |
| 유형 | Infrastructure as Code |
| 기술 스택 | Terraform 1.x, Google Cloud Provider |
| 배포 대상 | Google Cloud Platform |

### 책임 범위
- GCP 리소스 프로비저닝
- IAM 권한 설정
- 네트워크 설정
- 환경변수/시크릿 관리

### 포함 컴포넌트
- IC-1: CloudRunService
- IC-2: FirestoreDatabase
- IC-3: CloudStorageBucket
- IC-4: FirebaseHosting
- IC-5: IAMConfiguration

### 디렉토리 구조
```
infra/
├── main.tf                     # 메인 설정
├── variables.tf                # 변수 정의
├── outputs.tf                  # 출력 정의
├── terraform.tfvars.example    # 변수 예시
├── modules/
│   ├── cloud-run/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── firestore/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── storage/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── iam/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── README.md                   # 배포 가이드
```

### 외부 의존성
- Google Cloud APIs
- Terraform State Backend (Cloud Storage)

---

## Unit 요약

| Unit | 기술 스택 | 컴포넌트 수 | 배포 대상 |
|------|----------|------------|----------|
| Frontend | Next.js, TypeScript | 7개 | Firebase Hosting |
| Backend | FastAPI, Python | 7개 | Cloud Run |
| Infrastructure | Terraform | 5개 | GCP |

---

## 코드 구조 (전체)

```
miracle-morning-coach/
├── frontend/                   # Unit 1
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/                    # Unit 2
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── ...
├── infra/                      # Unit 3
│   ├── modules/
│   ├── main.tf
│   └── ...
├── docs/                       # 문서
│   ├── architecture.md
│   └── demo-video.md
├── .github/                    # CI/CD (선택)
│   └── workflows/
├── README.md                   # 프로젝트 README
├── .gitignore
└── .env.example                # 환경변수 템플릿
```
