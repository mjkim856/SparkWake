# Cloud Run Service (Backend API)
# 공식 문서: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

# Service Account for Cloud Run
resource "google_service_account" "backend" {
  account_id   = "miracle-morning-backend"
  display_name = "Miracle Morning Backend Service Account"
}

# IAM: Secret Manager 접근 권한
resource "google_secret_manager_secret_iam_member" "backend_gemini_key" {
  secret_id = google_secret_manager_secret.gemini_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# IAM: Firestore 접근 권한
resource "google_project_iam_member" "backend_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# IAM: Cloud Storage 접근 권한
resource "google_project_iam_member" "backend_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "miracle-morning"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# Cloud Run Service (배포 후 이미지 URL 업데이트 필요)
resource "google_cloud_run_v2_service" "backend" {
  name     = "miracle-morning-backend"
  location = var.region

  template {
    service_account = google_service_account.backend.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/miracle-morning/backend:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      # Secret Manager에서 API 키 주입
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      # 컨테이너 포트 명시 (FastAPI 기본 포트)
      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # 첫 배포 시 이미지가 없으면 에러 발생
  # 먼저 Docker 이미지를 빌드/푸시한 후 terraform apply 실행
  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.backend,
    google_secret_manager_secret.gemini_api_key
  ]

  lifecycle {
    ignore_changes = [
      # 이미지 태그 변경 시 재배포 방지 (CI/CD에서 관리)
      template[0].containers[0].image
    ]
  }
}

# Public 접근 허용
resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
