# Infrastructure Design

## 1. 개요

Google Cloud Platform 기반 서버리스 아키텍처로 구성합니다.

## 2. 서비스 매핑

| 논리 컴포넌트 | GCP 서비스 | 설정 |
|--------------|-----------|------|
| Frontend Hosting | Firebase Hosting | CDN, HTTPS |
| Backend API | Cloud Run | 서버리스 컨테이너 |
| Database | Firestore | Native Mode |
| File Storage | Cloud Storage | Standard |
| Auth | Firebase Auth | 익명 + Google |
| Push | Firebase Cloud Messaging | Web Push |
| Scheduler | Cloud Scheduler | 매분 실행 |
| Push Function | Cloud Functions (2nd gen) | Python 3.12 |
| Secrets | Secret Manager | API 키 저장 |
| IaC | Terraform | 전체 인프라 |

## 3. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Google Cloud                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Firebase   │     │   Cloud Run  │     │  Firestore   │    │
│  │   Hosting    │     │   (Backend)  │────▶│  (Database)  │    │
│  │  (Frontend)  │     └──────────────┘     └──────────────┘    │
│  └──────────────┘            │                    ▲             │
│         │                    │                    │             │
│         │                    ▼                    │             │
│         │            ┌──────────────┐             │             │
│         │            │   Secret     │             │             │
│         │            │   Manager    │             │             │
│         │            └──────────────┘             │             │
│         │                                         │             │
│         ▼                                         │             │
│  ┌──────────────┐                                │             │
│  │   Firebase   │                                │             │
│  │     Auth     │────────────────────────────────┘             │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │    Cloud     │────▶│    Cloud     │────▶│   Firebase   │   │
│  │  Scheduler   │     │  Functions   │     │     FCM      │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│                                                                 │
│  ┌──────────────┐                                              │
│  │    Cloud     │  (스냅샷 저장)                                │
│  │   Storage    │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        External Services                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │  Gemini 3    │  (Live API - Frontend 직접 연결)              │
│  │  Flash API   │                                               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. 데이터 흐름

### 4.1 실시간 음성 대화
```
User → Frontend → Gemini Live API (WebSocket)
                      ↓
              음성 응답 스트리밍
```

### 4.2 루틴 데이터 저장
```
Frontend → Firestore (Security Rules로 직접 접근)
```

### 4.3 푸시 알림
```
Cloud Scheduler (매분) → Cloud Functions → FCM → User Device
```

### 4.4 Ephemeral Token 발급
```
Frontend → Cloud Run (Backend) → Secret Manager
                ↓
         Ephemeral Token 반환
```

## 5. 리전 설정

| 서비스 | 리전 | 근거 |
|--------|------|------|
| Cloud Run | asia-northeast3 (서울) | 한국 사용자 대상 |
| Firestore | asia-northeast3 | 데이터 지역성 |
| Cloud Storage | asia-northeast3 | 데이터 지역성 |
| Cloud Functions | asia-northeast3 | 지연시간 최소화 |
| Firebase Hosting | Global CDN | 전역 배포 |

## 6. 비용 추정 (MVP)

| 서비스 | 예상 사용량 | 월 비용 |
|--------|------------|--------|
| Cloud Run | 10,000 요청/월 | ~$0 (무료 티어) |
| Firestore | 50,000 읽기/쓰기 | ~$0 (무료 티어) |
| Cloud Storage | 1GB | ~$0.02 |
| Cloud Functions | 100,000 호출 | ~$0 (무료 티어) |
| Firebase Hosting | 10GB 전송 | ~$0 (무료 티어) |
| **총계** | | **~$1/월** |
