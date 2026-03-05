# Deployment Architecture

## 1. 배포 전략

**수동 배포** (MVP)
- Terraform으로 인프라 프로비저닝
- 수동 빌드 및 배포 스크립트

## 2. 디렉토리 구조

```
/
├── frontend/                 # Next.js PWA
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.js
│
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   └── models/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── functions/                # Cloud Functions
│   ├── push_scheduler/
│   │   ├── main.py
│   │   └── requirements.txt
│   └── ...
│
├── infra/                    # Terraform
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── cloud_run/
│   │   ├── firestore/
│   │   ├── storage/
│   │   ├── functions/
│   │   └── firebase/
│   └── environments/
│       ├── dev.tfvars
│       └── prod.tfvars
│
└── aidlc-docs/               # 문서만
```

## 3. 배포 순서

```
1. Terraform 인프라 프로비저닝
   └── GCP 프로젝트 설정
   └── Firestore 생성
   └── Cloud Storage 버킷 생성
   └── Secret Manager 시크릿 생성
   └── Cloud Run 서비스 생성
   └── Cloud Scheduler 작업 생성
   └── Cloud Functions 배포
   └── Firebase 프로젝트 연결

2. Backend 배포
   └── Docker 이미지 빌드
   └── Artifact Registry 푸시
   └── Cloud Run 배포

3. Frontend 배포
   └── npm run build
   └── Firebase Hosting 배포

4. 검증
   └── 헬스체크 확인
   └── 기능 테스트
```

## 4. Terraform 모듈 구조

### 4.1 main.tf (루트)

```hcl
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "firestore" {
  source     = "./modules/firestore"
  project_id = var.project_id
  region     = var.region
}

module "storage" {
  source     = "./modules/storage"
  project_id = var.project_id
  region     = var.region
}

module "cloud_run" {
  source     = "./modules/cloud_run"
  project_id = var.project_id
  region     = var.region
  image      = var.backend_image
}

module "functions" {
  source     = "./modules/functions"
  project_id = var.project_id
  region     = var.region
}
```

### 4.2 variables.tf

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "backend_image" {
  description = "Backend Docker image URL"
  type        = string
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
  default     = "dev"
}
```

## 5. 배포 스크립트

### 5.1 인프라 배포

```bash
#!/bin/bash
# deploy-infra.sh

cd infra

# 초기화
terraform init

# 계획 확인
terraform plan -var-file="environments/prod.tfvars"

# 적용
terraform apply -var-file="environments/prod.tfvars" -auto-approve
```

### 5.2 Backend 배포

```bash
#!/bin/bash
# deploy-backend.sh

cd backend

# Docker 빌드
docker build -t gcr.io/${PROJECT_ID}/miracle-morning-backend:latest .

# 푸시
docker push gcr.io/${PROJECT_ID}/miracle-morning-backend:latest

# Cloud Run 배포
gcloud run deploy miracle-morning-backend \
  --image gcr.io/${PROJECT_ID}/miracle-morning-backend:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated
```

### 5.3 Frontend 배포

```bash
#!/bin/bash
# deploy-frontend.sh

cd frontend

# 빌드
npm run build

# Firebase 배포
firebase deploy --only hosting
```

## 6. 환경 변수

### Backend (Cloud Run)

| 변수명 | 설명 | 소스 |
|--------|------|------|
| GOOGLE_CLOUD_PROJECT | 프로젝트 ID | 자동 |
| GEMINI_API_KEY | Gemini API 키 | Secret Manager |
| FIREBASE_PROJECT_ID | Firebase 프로젝트 | 환경변수 |
| ALLOWED_ORIGINS | CORS 허용 도메인 | 환경변수 |

### Frontend (.env.local)

| 변수명 | 설명 |
|--------|------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase 웹 API 키 |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Auth 도메인 |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | 프로젝트 ID |
| NEXT_PUBLIC_API_URL | Backend API URL |

## 7. 보안 설정

### 7.1 Secret Manager

```hcl
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  
  replication {
    auto {}
  }
}
```

### 7.2 IAM 권한

| 서비스 계정 | 역할 |
|------------|------|
| Cloud Run SA | Secret Manager Secret Accessor |
| Cloud Run SA | Firestore User |
| Cloud Run SA | Storage Object Admin |
| Cloud Functions SA | Firebase Cloud Messaging Admin |
