# Miracle Morning AI Coach - Infrastructure

Terraform으로 관리되는 Google Cloud 인프라입니다.

## 사전 준비

1. **gcloud CLI 설치 및 로그인**
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project project-bf49180a-39f8-45b2-949
```

2. **Terraform 설치**
```bash
brew install terraform
```

## 배포 순서

### 1단계: Terraform 초기화
```bash
cd infra
terraform init
```

### 2단계: 배포 계획 확인
```bash
terraform plan
```

### 3단계: 인프라 배포
```bash
terraform apply
```

### 4단계: Secret 값 설정 (수동)
```bash
# Gemini API 키 설정
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Firebase Web API 키 설정 (Firebase Console에서 확인)
echo -n "YOUR_FIREBASE_WEB_API_KEY" | gcloud secrets versions add firebase-web-api-key --data-file=-
```

## 리소스 목록

| 리소스 | 설명 |
|--------|------|
| Cloud Run | Backend API 서버 |
| Firestore | 데이터베이스 |
| Cloud Storage | 이미지 저장 |
| Secret Manager | API 키 보관 |
| Cloud Functions | 푸시 알림 발송 |
| Cloud Scheduler | 매분 알람 체크 |
| Artifact Registry | Docker 이미지 저장 |

## 비용 예상

무료 티어 범위 내 사용 시 월 ~$1 예상

## 주의사항

⚠️ **절대 하지 말 것:**
- API 키를 코드에 하드코딩
- .tfvars 파일을 Git에 커밋
- Secret 값을 로그에 출력

## 삭제

```bash
terraform destroy
```
