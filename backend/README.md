# Miracle Morning AI Coach - Backend

FastAPI 기반 REST API 서버입니다.

## 로컬 개발

### 1. 가상환경 설정
```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
```

### 2. 의존성 설치
```bash
pip install -r requirements-dev.txt
```

### 3. 환경변수 설정
```bash
# .env 파일 생성 (Git에 커밋하지 않음!)
cat > .env << EOF
GOOGLE_CLOUD_PROJECT=project-bf49180a-39f8-45b2-949
ENVIRONMENT=dev
GEMINI_API_KEY=your_api_key_here
EOF
```

### 4. 서버 실행
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. API 문서 확인
- Swagger UI: http://localhost:8000/docs

## Docker 빌드

```bash
# 빌드
docker build -t miracle-morning-backend .

# 실행
docker run -p 8080:8080 \
  -e GOOGLE_CLOUD_PROJECT=project-bf49180a-39f8-45b2-949 \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  miracle-morning-backend
```

## Cloud Run 배포

```bash
# Artifact Registry에 푸시
docker tag miracle-morning-backend \
  asia-northeast3-docker.pkg.dev/project-bf49180a-39f8-45b2-949/miracle-morning/backend:latest

docker push \
  asia-northeast3-docker.pkg.dev/project-bf49180a-39f8-45b2-949/miracle-morning/backend:latest

# Cloud Run 배포 (Terraform으로 관리)
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/ephemeral-token | Live API 토큰 발급 |
| GET | /api/routines | 루틴 목록 |
| POST | /api/routines | 루틴 생성 |
| PUT | /api/routines/{id} | 루틴 수정 |
| DELETE | /api/routines/{id} | 루틴 삭제 |
| POST | /api/sessions | 세션 시작 |
| POST | /api/sessions/{id}/complete | 루틴 완료 |
| POST | /api/sessions/{id}/skip | 루틴 스킵 |
| POST | /api/sessions/{id}/end | 세션 종료 |
| GET | /api/reports/daily/{date} | 일일 리포트 |
| GET | /api/reports/weekly | 주간 리포트 |
| GET | /api/reports/coaching | AI 코칭 |
| POST | /api/push/register | 푸시 토큰 등록 |

## 테스트

```bash
pytest
```

## 보안 주의사항

⚠️ **절대 하지 말 것:**
- API 키를 코드에 하드코딩
- .env 파일을 Git에 커밋
- 로그에 민감 정보 출력
