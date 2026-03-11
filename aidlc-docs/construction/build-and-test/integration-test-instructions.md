# Integration Test Instructions

## 개요
Miracle Morning AI Coach 프로젝트의 통합 테스트 지침서입니다.

---

## 1. 통합 테스트 범위

### 1.1 테스트 대상
| 통합 포인트 | 설명 |
|------------|------|
| Frontend ↔ Backend | REST API 호출 |
| Backend ↔ Firestore | 데이터 저장/조회 |
| Backend ↔ Secret Manager | API 키 조회 |
| Frontend ↔ Gemini Live API | 실시간 음성 대화 |
| Frontend ↔ Firebase Auth | 사용자 인증 |

### 1.2 MVP 통합 테스트 우선순위
1. **P0**: Backend API 엔드포인트 동작 확인
2. **P1**: Frontend → Backend 연동 확인
3. **P2**: Gemini Live API 연동 확인

---

## 2. Backend API 통합 테스트

### 2.1 로컬 환경 테스트

```bash
# Backend 실행
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8080

# 다른 터미널에서 테스트
curl http://localhost:8080/health
curl http://localhost:8080/docs  # Swagger UI
```

### 2.2 핵심 API 테스트 스크립트

```bash
#!/bin/bash
# test-api.sh

BASE_URL=${1:-"http://localhost:8080"}

echo "=== Health Check ==="
curl -s "$BASE_URL/health" | jq .

echo "=== Ephemeral Token ==="
curl -s "$BASE_URL/api/gemini/ephemeral-token" | jq .

echo "=== API Docs ==="
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/docs"
echo ""
```

### 2.3 인증 포함 API 테스트

```bash
# Firebase ID Token 필요 (Frontend에서 발급)
TOKEN="your-firebase-id-token"

# 루틴 조회
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/routines" | jq .

# 루틴 생성
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Meditation","duration":10,"startTime":"06:00"}' \
  "$BASE_URL/api/routines" | jq .
```

---

## 3. Frontend ↔ Backend 통합 테스트

### 3.1 로컬 환경 설정

```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --port 8080

# Terminal 2: Frontend
cd frontend
# .env.local에 NEXT_PUBLIC_API_URL=http://localhost:8080 설정
npm run dev
```

### 3.2 수동 테스트 체크리스트

| 기능 | 테스트 방법 | 예상 결과 |
|------|------------|----------|
| 익명 로그인 | 앱 첫 접속 | 자동 익명 로그인 |
| Google 로그인 | 로그인 버튼 클릭 | Google 팝업 → 로그인 성공 |
| 루틴 생성 | Add Routine 버튼 | 루틴 목록에 추가 |
| 루틴 조회 | 홈 화면 | 루틴 목록 표시 |
| 세션 시작 | Live 버튼 | 세션 화면 전환 |

---

## 4. Gemini Live API 통합 테스트

### 4.1 Ephemeral Token 발급 테스트

```bash
# Backend에서 토큰 발급
curl http://localhost:8080/api/gemini/ephemeral-token

# 응답 예시
# {"token": "eyJ..."}
```

### 4.2 Live API 연결 테스트 (브라우저)

1. Frontend 개발 서버 실행 (`npm run dev`)
2. 브라우저에서 `/session` 페이지 접속
3. 개발자 도구 Console에서 WebSocket 연결 확인
4. 마이크 권한 허용 후 음성 입력 테스트

### 4.3 Live API 디버깅

```javascript
// 브라우저 Console에서 실행
// WebSocket 연결 상태 확인
console.log('WebSocket readyState:', ws.readyState)
// 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
```

---

## 5. Firebase 통합 테스트

### 5.1 Firebase Auth 테스트

```javascript
// 브라우저 Console에서 실행
import { getAuth } from 'firebase/auth'

const auth = getAuth()
console.log('Current user:', auth.currentUser)
console.log('Is anonymous:', auth.currentUser?.isAnonymous)
```

### 5.2 Firestore 테스트

```javascript
// 브라우저 Console에서 실행
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const db = getFirestore()
const routines = await getDocs(collection(db, 'users', 'USER_ID', 'routines'))
routines.forEach(doc => console.log(doc.id, doc.data()))
```

---

## 6. 배포 환경 통합 테스트

### 6.1 Cloud Run 헬스체크

```bash
# Cloud Run URL 확인
BACKEND_URL=$(gcloud run services describe miracle-morning-backend \
  --region asia-northeast3 --format 'value(status.url)')

# 헬스체크
curl "$BACKEND_URL/health"
```

### 6.2 End-to-End 테스트 체크리스트

| 단계 | 테스트 | 확인 사항 |
|------|--------|----------|
| 1 | Frontend 접속 | Firebase Hosting URL 접속 가능 |
| 2 | 익명 로그인 | 자동 로그인 성공 |
| 3 | 루틴 생성 | Firestore에 데이터 저장 |
| 4 | 세션 시작 | Gemini Live API 연결 |
| 5 | 음성 대화 | AI 응답 수신 |
| 6 | 세션 완료 | 리포트 화면 표시 |

---

## 7. 트러블슈팅

### 7.1 CORS 에러
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
**해결**: Backend의 `ALLOWED_ORIGINS` 환경변수에 Frontend URL 추가

### 7.2 Firebase Auth 에러
```
Firebase: Error (auth/configuration-not-found)
```
**해결**: `.env.local`의 Firebase 설정 확인

### 7.3 Gemini API 에러
```
Error: Token fetch failed: 401
```
**해결**: Secret Manager의 `gemini-api-key` 값 확인

### 7.4 Firestore 권한 에러
```
FirebaseError: Missing or insufficient permissions
```
**해결**: Firebase Console에서 Security Rules 확인
