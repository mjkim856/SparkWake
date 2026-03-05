# Cloud Storage Bucket
# 공식 문서: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

resource "google_storage_bucket" "user_uploads" {
  name          = "${var.project_id}-user-uploads"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  # 이미지 스냅샷 저장용
  lifecycle_rule {
    condition {
      age = 365 # 1년 후 삭제 (비용 절감)
    }
    action {
      type = "Delete"
    }
  }

  cors {
    # 프로덕션 도메인 + 로컬 개발용
    origin          = [
      "https://${var.project_id}.web.app",
      "https://${var.project_id}.firebaseapp.com",
      "http://localhost:3000"
    ]
    method          = ["GET", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}
