# Cloud Scheduler + Cloud Functions (푸시 알림용)
# 공식 문서: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job

# Service Account for Cloud Functions
resource "google_service_account" "push_function" {
  account_id   = "miracle-morning-push"
  display_name = "Miracle Morning Push Function Service Account"
}

# IAM: Firestore 접근 권한
resource "google_project_iam_member" "push_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.push_function.email}"
}

# Cloud Storage bucket for function source
resource "google_storage_bucket" "functions_source" {
  name          = "${var.project_id}-functions-source"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis]
}

# Cloud Scheduler Job (매분 실행)
resource "google_cloud_scheduler_job" "push_alarm" {
  name        = "miracle-morning-push-alarm"
  description = "Trigger push notifications for wake-up alarms"
  schedule    = "* * * * *" # 매분
  time_zone   = "Asia/Seoul"
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.push_alarm.url

    oidc_token {
      service_account_email = google_service_account.push_function.email
    }
  }

  depends_on = [
    google_project_service.apis,
    google_cloudfunctions2_function.push_alarm
  ]
}

# Cloud Function (2nd gen) - 푸시 알림 발송
resource "google_cloudfunctions2_function" "push_alarm" {
  name     = "miracle-morning-push-alarm"
  location = var.region

  build_config {
    runtime     = "python312"
    entry_point = "send_push_alarms"

    source {
      storage_source {
        bucket = google_storage_bucket.functions_source.name
        object = google_storage_bucket_object.push_function_source.name
      }
    }
  }

  service_config {
    min_instance_count             = 0
    max_instance_count             = 1
    timeout_seconds                = 60
    service_account_email          = google_service_account.push_function.email
    ingress_settings               = "ALLOW_ALL"
    all_traffic_on_latest_revision = true

    environment_variables = {
      GOOGLE_CLOUD_PROJECT = var.project_id
    }
  }

  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.push_function_source
  ]
}

# Placeholder source (실제 코드는 나중에 업로드)
resource "google_storage_bucket_object" "push_function_source" {
  name   = "push-function-source.zip"
  bucket = google_storage_bucket.functions_source.name
  source = "${path.module}/functions/push_alarm.zip"

  depends_on = [google_storage_bucket.functions_source]
}

# Cloud Function IAM (Scheduler가 호출 가능하도록)
resource "google_cloudfunctions2_function_iam_member" "scheduler_invoker" {
  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.push_alarm.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.push_function.email}"
}

# Cloud Scheduler 서비스 계정에 토큰 생성 권한 부여
# Cloud Functions 2nd gen은 Cloud Run 기반이므로 run.invoker 권한도 필요
resource "google_project_iam_member" "scheduler_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.push_function.email}"
}

# Cloud Run invoker 권한 (Cloud Functions 2nd gen은 Cloud Run 기반)
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloudfunctions2_function.push_alarm.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.push_function.email}"
}
