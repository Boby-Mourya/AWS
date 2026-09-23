# Blocking target-architecture invariants. These are deliberately separate from later Section 16+ runtime configuration.
resource "terraform_data" "architecture_guardrails" {
  input = {
    environment = var.environment
    compute     = var.compute_provider
    image       = var.container_image
  }

  lifecycle {
    precondition {
      condition     = var.origin_domain_name != ""
      error_message = "origin_domain_name is required because CloudFront connects to the ALB over HTTPS and the regional ALB certificate must match the origin hostname."
    }
    precondition {
      condition     = var.domain_name == "" || var.cloudfront_certificate_arn != ""
      error_message = "cloudfront_certificate_arn in us-east-1 is required when a custom CloudFront domain_name is configured."
    }
    precondition {
      condition     = var.environment != "production" || can(regex("@sha256:[0-9a-fA-F]{64}$", var.container_image))
      error_message = "Production container_image must be immutable and pinned by sha256 digest."
    }
    precondition {
      condition     = var.environment != "production" || var.database_multi_az
      error_message = "Production PostgreSQL must use Multi-AZ."
    }
    precondition {
      condition     = var.environment != "production" || var.backup_retention_days >= 7
      error_message = "Production PostgreSQL requires at least seven days of automated backup retention."
    }
    precondition {
      condition     = var.environment != "production" || var.compute_provider != "ecs" || var.desired_count >= 2
      error_message = "Production ECS service requires at least two desired tasks."
    }
    precondition {
      condition     = var.environment != "production" || (var.enable_guardduty && var.enable_security_hub && var.enable_cloudtrail && var.enable_backup)
      error_message = "GuardDuty, Security Hub, CloudTrail and AWS Backup are locked on for the production target."
    }
  }
}
