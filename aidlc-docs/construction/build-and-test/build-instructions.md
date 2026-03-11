# Build Instructions

## 개요
Miracle Morning AI Coach 프로젝트의 빌드 지침서입니다.

## 사전 요구사항

### 필수 도구
- Node.js 20+ (Frontend)
- Python 3.12+ (Backend)
- Docker (Backend 컨테이너화)
- Terraform 1.5+ (Infrastructure)
- Google Cloud CLI (`gcloud`)
- Firebase CLI (`firebase`)

### GCP 설정
```bash
# 1. gcloud 인증
gcloud auth login
gcloud auth application-default login

# 2. 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 3. 필요한 API 활성화 (Terraform에서도 처리됨)
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 1. Infrastructure 빌드 (Terraform)

### 1.1 변수 설정
```bash
cd infra

# variables.tf에서 project_id 수정 또는 환경변수 사용
export TF_VAR_project_id="your-project-id"
export TF_VAR_region="asia-northeast3"
```

### 1.2 Terraform 초기화 및 적용
```bash
# 초기화
terraform init

# 계획 확인
terraform plan

# 적용 (첫 실행 시 Cloud Run은 이미지 없어서 실패할 수 있음)
terraform apply -auto-approve
```

### 1.3 Secret Manager에 API 키 저장
```bash
# Gemini API 키 저장 (Google AI Studio에서 발급)
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

> 참고: [Secret Manager 공식 문서](https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets)

---

## 2. Backend 빌드 (FastAPI + Docker)

### 2.1 로컬 빌드 및 테스트
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 로컬 실행 (개발용)
uvicorn app.main:app --reload --port 8080
```

### 2.2 Docker 이미지 빌드
```bash
cd backend

# Docker 이미지 빌드
docker build -t miracle-morning-backend:latest .

# 로컬 테스트
docker run -p 8080:8080 \
  -e GOOGLE_CLOUD_PROJECT=your-project-id \
  -e GEMINI_API_KEY=your-api-key \
  miracle-morning-backend:latest
```

### 2.3 Artifact Registry에 푸시
```bash
# Docker 인증 설정
gcloud auth configure-docker asia-northeast3-docker.pkg.dev

# 태그 지정
docker tag miracle-morning-backend:latest \
  asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/miracle-morning/backend:latest

# 푸시
docker push asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/miracle-morning/backend:latest
```

> 참고: [Artifact Registry 공식 문서](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)

### 2.4 Cloud Run 배포
```bash
# gcloud로 직접 배포 (Terraform 대신 사용 가능)
gcloud run deploy miracle-morning-backend \
  --image asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/miracle-morning/backend:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

> 참고: [Cloud Run 배포 공식 문서](https://cloud.google.com/run/docs/deploying)

---

## 3. Frontend 빌드 (Next.js PWA)

### 3.1 환경 변수 설정
```bash
cd frontend

# .env.local 파일 생성
cat > .env.local << EOF
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=https://miracle-morning-backend-xxxxx.asia-northeast3.run.app
EOF
```

### 3.2 의존성 설치 및 빌드
```bash
cd frontend

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 로컬 프리뷰
npm run start
```

### 3.3 Firebase Hosting 배포
```bash
# Firebase CLI 로그인
firebase login

# 프로젝트 초기화 (최초 1회)
firebase init hosting

# 배포
firebase deploy --only hosting
```

> 참고: [Firebase Hosting Next.js 배포 공식 문서](https://firebase.google.com/docs/hosting/frameworks/nextjs)

---

## 4. 전체 배포 순서

```
1. Terraform으로 인프라 프로비저닝
   ├── API 활성화
   ├── Firestore 생성
   ├── Cloud Storage 버킷 생성
   ├── Secret Manager 시크릿 생성
   └── Artifact Registry 생성

2. Secret Manager에 API 키 저장
   └── Gemini API 키

3. Backend Docker 이미지 빌드 및 푸시
   ├── docker build
   └── docker push

4. Cloud Run 배포 (Terraform 재적용 또는 gcloud)
   └── terraform apply

5. Frontend 빌드 및 배포
   ├── npm run build
   └── firebase deploy --only hosting

6. 검증
   ├── Backend 헬스체크: GET /health
   └── Frontend 접속 확인
```

---

## 빌드 스크립트 (자동화)

### deploy-all.sh
```bash
#!/bin/bash
set -e

PROJECT_ID=${1:-"your-project-id"}
REGION="asia-northeast3"

echo "=== 1. Infrastructure ==="
cd infra
terraform init
terraform apply -auto-approve -var="project_id=$PROJECT_ID"

echo "=== 2. Backend ==="
cd ../backend
docker build -t miracle-morning-backend:latest .
docker tag miracle-morning-backend:latest \
  $REGION-docker.pkg.dev/$PROJECT_ID/miracle-morning/backend:latest
docker push $REGION-docker.pkg.dev/$PROJECT_ID/miracle-morning/backend:latest

gcloud run deploy miracle-morning-backend \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/miracle-morning/backend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest

echo "=== 3. Frontend ==="
cd ../frontend
npm install
npm run build
firebase deploy --only hosting

echo "=== Done! ==="
```
