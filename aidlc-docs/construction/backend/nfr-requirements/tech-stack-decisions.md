# Backend Tech Stack Decisions

## 확정 기술 스택

| 카테고리 | 선택 | 버전 | 근거 |
|----------|------|------|------|
| Framework | FastAPI | 0.110+ | 비동기, 자동 문서화 |
| Language | Python | 3.12 | 최신 안정 버전 |
| Auth | Firebase Admin SDK | 6.x | ID Token 검증 |
| Push | Firebase Cloud Messaging | - | 웹 푸시 |
| Database | Firestore | - | 실시간, 서버리스 |
| Storage | Cloud Storage | - | 이미지 저장 |
| Secrets | Secret Manager | - | API 키 보호 |
| Testing | pytest | 8.x | 단위 테스트 |

## 주요 결정 사항

### 1. Ephemeral Token 발급
- **결정**: Backend에서 발급
- **근거**: 
  - API 키를 Frontend에 노출하지 않음
  - 토큰 유효기간 제어 가능
  - Google 권장 방식

### 2. 데이터베이스 접근
- **결정**: Firebase Security Rules (Frontend 직접 접근)
- **근거**:
  - Backend 부하 감소
  - 실시간 동기화 활용
  - userId 기반 접근 제어

### 3. 푸시 알림 스케줄링
- **결정**: Cloud Scheduler + Cloud Functions
- **근거**:
  - 서버리스, 비용 효율적
  - 정확한 시간 트리거
  - Cloud Run과 분리된 실행

### 4. 에러 모니터링
- **결정**: 최소 로깅 + 민감정보 마스킹
- **근거**:
  - MVP 단순화
  - 보안 우선
  - 프로덕션 DEBUG 비활성화

## 패키지 목록

```
# requirements.txt
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
firebase-admin>=6.4.0
google-cloud-firestore>=2.14.0
google-cloud-storage>=2.14.0
google-cloud-secret-manager>=2.18.0
pydantic>=2.6.0
python-multipart>=0.0.9

# requirements-dev.txt
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

## API 엔드포인트 설계

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/ephemeral-token | Live API 토큰 발급 |
| GET | /api/routines | 루틴 목록 조회 |
| POST | /api/routines | 루틴 생성 |
| PUT | /api/routines/{id} | 루틴 수정 |
| DELETE | /api/routines/{id} | 루틴 삭제 |
| POST | /api/sessions | 세션 시작 |
| POST | /api/sessions/{id}/complete | 루틴 완료 |
| POST | /api/sessions/{id}/skip | 루틴 스킵 |
| POST | /api/sessions/{id}/end | 세션 종료 |
| GET | /api/reports | 리포트 조회 |
| POST | /api/push/register | 푸시 토큰 등록 |
