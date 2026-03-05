# Unit of Work - Requirements Mapping

## 요구사항 → Unit 매핑

### Unit 1: Frontend

| Requirement | 관련 기능 |
|-------------|----------|
| FR-1 (인증) | AuthProvider, 로그인 UI |
| FR-2 (루틴 설정) | RoutineManager, 설정 UI |
| FR-3 (음성 알람) | LiveSessionController, PWAManager |
| FR-4 (루틴 진행) | RoutineProgressView |
| FR-5 (비디오 인증) | VideoVerificationView, LiveSessionController |
| FR-6 (일일 리포트) | DailyReportView |
| NFR-4 (사용성) | 반응형 UI, 대체 UI |

### Unit 2: Backend

| Requirement | 관련 기능 |
|-------------|----------|
| FR-1 (인증) | AuthMiddleware |
| FR-2 (루틴 설정) | RoutineService |
| FR-3 (음성 알람) | GeminiLiveService, PushNotificationService |
| FR-4 (루틴 진행) | SessionService |
| FR-5 (비디오 인증) | GeminiLiveService, StorageService |
| FR-6 (일일 리포트) | ReportService |
| NFR-1 (성능) | API 최적화 |
| NFR-2 (보안) | 토큰 검증, API 키 관리 |

### Unit 3: Infrastructure

| Requirement | 관련 기능 |
|-------------|----------|
| FR-1~6 (전체) | Cloud Run, Firestore, Storage |
| NFR-2 (보안) | IAM, Security Rules |
| NFR-3 (확장성) | Cloud Run 자동 스케일링 |
| HK-5 (IaC) | Terraform 전체 |

---

## MVP 기능별 Unit 작업량

### FR-1: 사용자 인증
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 중 | AuthProvider, 로그인 UI |
| Backend | 소 | AuthMiddleware |
| Infra | 소 | Firebase Auth 설정 |

### FR-2: 루틴 설정
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 중 | RoutineManager, CRUD UI |
| Backend | 중 | RoutineService, API |
| Infra | 소 | Firestore 컬렉션 |

### FR-3: 음성 기상 알람 ⭐
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 대 | LiveSessionController, PWA Push |
| Backend | 대 | GeminiLiveService, PushService |
| Infra | 중 | Cloud Run, FCM 설정 |

### FR-4: 루틴 진행 관리
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 중 | RoutineProgressView |
| Backend | 중 | SessionService |
| Infra | 소 | - |

### FR-5: 실시간 비디오 인증 ⭐
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 대 | VideoVerificationView, 카메라 스트리밍 |
| Backend | 대 | GeminiLiveService (비디오 처리) |
| Infra | 중 | Cloud Storage |

### FR-6: 일일 리포트
| Unit | 작업량 | 상세 |
|------|--------|------|
| Frontend | 중 | DailyReportView |
| Backend | 중 | ReportService |
| Infra | 소 | - |

---

## Unit별 총 작업량 추정

| Unit | 총 작업량 | 예상 시간 |
|------|----------|----------|
| Frontend | 대 | 2.5일 |
| Backend | 대 | 2.5일 |
| Infrastructure | 중 | 1일 |
| 통합/테스트 | 중 | 1일 |
| **Total** | | **7일** |

---

## 핵심 경로 (Critical Path)

```
Day 1: Infra 기본 설정
       ↓
Day 2: Backend Auth + Routine API
       ↓
Day 3: Backend Gemini Live Service ← 핵심
       ↓
Day 4: Frontend Auth + Routine UI
       ↓
Day 5: Frontend Live Session + Video ← 핵심
       ↓
Day 6: 통합 테스트
       ↓
Day 7: 배포 + 데모
```

**병목 지점**:
1. Gemini Live API 통합 (Day 3)
2. 실시간 비디오 스트리밍 (Day 5)

**리스크 완화**:
- Day 3에 Live API 통합이 안 되면 → 음성만 먼저 구현
- Day 5에 비디오 인식이 안 되면 → 수동 완료 버튼으로 대체
