# Variables for Miracle Morning AI Coach Infrastructure

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "project-bf49180a-39f8-45b2-949"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
  default     = "prod"
}
