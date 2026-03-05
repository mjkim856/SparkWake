# Unit of Work Dependencies

## 의존성 매트릭스

```
                    ┌──────────────┐
                    │   Frontend   │
                    │   (Unit 1)   │
                    └──────┬───────┘
                           │
                           │ REST API
                           │ WebSocket
                           ▼
                    ┌──────────────┐
                    │   Backend    │
                    │   (Unit 2)   │
                    └──────┬───────┘
                           │
                           │ Terraform 배포
                           ▼
                    ┌──────────────┐
                    │Infrastructure│
                    │   (Unit 3)   │
                    └──────────────┘
```

## 상세 의존성

### Unit 1 (Frontend) → Unit 2 (Backend)
| 의존성 유형 | 설명 |
|------------|------|
| REST API | /api/* 엔드포인트 호출 |
| WebSocket | /ws/live 실시간 스트리밍 |
| 환경변수 | NEXT_PUBLIC_API_URL |

### Unit 2 (Backend) → Unit 3 (Infrastructure)
| 의존성 유형 | 설명 |
|------------|------|
| Cloud Run | 백엔드 컨테이너 호스팅 |
| Firestore | 데이터 저장소 |
| Cloud Storage | 파일 저장소 |
| IAM | 서비스 계정 권한 |

### Unit 1 (Frontend) → Unit 3 (Infrastructure)
| 의존성 유형 | 설명 |
|------------|------|
| Firebase Hosting | 프론트엔드 정적 파일 호스팅 |
| Firebase Auth | 인증 서비스 |

---

## 배포 순서

```
1. Infrastructure (Unit 3)
   └── GCP 리소스 프로비저닝
   └── 서비스 계정 생성
   └── Firestore/Storage 설정
   
2. Backend (Unit 2)
   └── Docker 이미지 빌드
   └── Cloud Run 배포
   └── 환경변수 설정
   
3. Frontend (Unit 1)
   └── Next.js 빌드
   └── Firebase Hosting 배포
   └── API URL 설정
```

---

## 개발 순서 (권장)

1주 타임라인 기준:

| Day | Unit | 작업 |
|-----|------|------|
| 1 | Unit 3 | Terraform 기본 구조 + Cloud Run + Firestore |
| 2 | Unit 2 | FastAPI 기본 구조 + Auth + Routine API |
| 3 | Unit 2 | Gemini Live Service + WebSocket |
| 4 | Unit 1 | Next.js 기본 구조 + Auth + Routine UI |
| 5 | Unit 1 | Live Session UI + Video Verification |
| 6 | Unit 1+2 | 통합 테스트 + 버그 수정 |
| 7 | All | 배포 + 데모 영상 촬영 |

---

## 통합 포인트

### API 계약
```yaml
# Backend가 제공해야 하는 API
- POST /api/auth/verify
- GET/POST/PUT/DELETE /api/routines
- POST /api/session/start
- POST /api/session/end
- POST /api/session/complete
- POST /api/session/skip
- GET /api/reports/{date}
- POST /api/push/register
- WebSocket /ws/live
```

### 환경변수 계약
```bash
# Frontend 필요
NEXT_PUBLIC_API_URL=https://backend-xxx.run.app
NEXT_PUBLIC_FIREBASE_CONFIG=...

# Backend 필요
GOOGLE_CLOUD_PROJECT=...
GEMINI_API_KEY=...
FIREBASE_SERVICE_ACCOUNT=...
```

### 데이터 스키마 계약
```typescript
// Frontend와 Backend가 공유하는 타입
interface Routine { ... }
interface RoutineSession { ... }
interface DailyReport { ... }
```

---

## 독립 개발 가능 여부

| Unit | 독립 개발 | 조건 |
|------|----------|------|
| Frontend | ⚠️ 부분적 | Mock API 서버 필요 |
| Backend | ✅ 가능 | Firestore 에뮬레이터 사용 |
| Infrastructure | ✅ 가능 | terraform plan으로 검증 |

### Mock 전략
- Frontend: MSW (Mock Service Worker)로 API 모킹
- Backend: Firestore 에뮬레이터 + Gemini API 모킹
- Infrastructure: terraform plan + 별도 테스트 프로젝트
