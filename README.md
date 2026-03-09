# ☀️ SparkWake - Miracle Morning AI Coach

> Gemini Live Agent Challenge 해커톤 프로젝트

실시간 음성 AI 코치와 함께하는 미라클 모닝 루틴 관리 앱

## 🎯 주요 기능

- **실시간 음성 코칭**: Gemini Live API를 활용한 양방향 음성 대화
- **스마트 기상 알림**: 스누즈 제한 + AI 격려 메시지
- **루틴 진행 관리**: 타이머 + 음성/수동 완료 확인
- **주간 리포트**: AI 기반 맞춤형 코칭 제안
- **PWA 지원**: 모바일 앱처럼 설치 가능

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, PWA |
| Backend | FastAPI, Python 3.11+ |
| AI | Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`), Text Gen (`gemini-3-flash-preview`) |
| Database | Cloud Firestore |
| Auth | Firebase Authentication |
| Infra | Google Cloud Run, Terraform |

## 📁 프로젝트 구조

```
SparkWake/
├── frontend/          # Next.js PWA
├── backend/           # FastAPI 서버
├── infra/             # Terraform IaC
└── aidlc-docs/        # 설계 문서
```

## 🚀 로컬 개발 환경 설정

### 1. 환경변수 설정

```bash
# Backend
cp backend/.env.example backend/.env
# GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT 설정

# Frontend
cp frontend/.env.local.example frontend/.env.local
# NEXT_PUBLIC_FIREBASE_* 설정
```

### 2. Backend 실행

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

## 🔧 인프라 배포 (Terraform)

```bash
cd infra
terraform init
terraform plan
terraform apply
```

## 📱 주요 화면

1. **Wake Up View**: 기상 확인 + 스누즈 (최대 3회)
2. **Routine Progress**: 루틴별 타이머 + 완료 확인
3. **Daily Report**: 완료율 + AI 코칭 제안

## 🔐 보안

- API 키: 환경변수 + Secret Manager
- 인증: Firebase ID Token 검증
- Rate Limiting: slowapi 적용
- CORS: 프로덕션 도메인 제한

## 📄 라이선스

MIT License

---

Built with ❤️ for Gemini Live Agent Challenge
