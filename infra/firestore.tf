# Firestore Database
# 공식 문서: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database

resource "google_firestore_database" "main" {
  provider = google-beta
  project  = var.project_id
  name     = "(default)"
  # Firestore는 asia-northeast3(서울) 미지원, asia-northeast1(도쿄) 사용
  # 지원 리전: https://cloud.google.com/firestore/docs/locations
  location_id             = "asia-northeast1"
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
  deletion_policy         = "DELETE"

  depends_on = [google_project_service.apis]
}

# Firestore Security Rules는 Firebase Console에서 설정
# 또는 firebase deploy --only firestore:rules 사용
