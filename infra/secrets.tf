# Secret Manager
# 공식 문서: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
# ⚠️ 민감 정보는 절대 코드에 하드코딩하지 않음

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# Secret 값은 수동으로 설정 (Terraform에 노출 방지)
# gcloud secrets versions add gemini-api-key --data-file=-
# 또는 Console에서 설정

resource "google_secret_manager_secret" "firebase_web_api_key" {
  secret_id = "firebase-web-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}
