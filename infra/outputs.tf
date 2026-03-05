# Outputs
# 배포 후 필요한 정보들

output "backend_url" {
  description = "Cloud Run Backend URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "storage_bucket" {
  description = "Cloud Storage Bucket for user uploads"
  value       = google_storage_bucket.user_uploads.name
}

output "artifact_registry" {
  description = "Artifact Registry URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/miracle-morning"
}

output "push_function_url" {
  description = "Cloud Function URL for push alarms"
  value       = google_cloudfunctions2_function.push_alarm.url
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}
