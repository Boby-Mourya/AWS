variable "region" { type=string default="ap-south-1" }
variable "environment" { type=string validation { condition=contains(["development","test","staging","production"],var.environment) error_message="environment must be development, test, staging or production" } }
variable "name" { type=string default="pluggable-platform" }
variable "vpc_cidr" { type=string default="10.40.0.0/16" }
variable "az_count" { type=number default=2 validation { condition=var.az_count>=2 && var.az_count<=3 error_message="az_count must be 2 or 3" } }
variable "enable_nat" { type=bool default=true }
variable "compute_provider" { type=string default="ecs" validation { condition=contains(["ecs","eks"],var.compute_provider) error_message="compute_provider must be ecs or eks" } }
variable "container_image" { type=string description="Immutable application image URI. Production guardrails require an @sha256 digest." }
variable "container_port" { type=number default=3000 }
variable "desired_count" { type=number default=2 }
variable "cpu" { type=number default=512 }
variable "memory" { type=number default=1024 }
variable "health_check_path" { type=string default="/health" }
variable "alb_certificate_arn" { type=string description="Regional ACM certificate ARN used by the ALB HTTPS listener." }
variable "domain_name" { type=string default="" }
variable "origin_domain_name" { type=string default="" description="Route53/DNS origin hostname such as origin.example.com covered by the regional ALB certificate. Required by architecture guardrails for CloudFront HTTPS origin validation." }
variable "route53_zone_id" { type=string default="" }
variable "cloudfront_certificate_arn" { type=string default="" description="us-east-1 ACM cert when domain_name is configured." }
variable "database_name" { type=string default="platform" }
variable "database_username" { type=string default="platform_admin" }
variable "database_instance_class" { type=string default="db.t4g.medium" }
variable "database_allocated_storage" { type=number default=50 }
variable "database_multi_az" { type=bool default=true }
variable "backup_retention_days" { type=number default=14 }
variable "redis_enabled" { type=bool default=true }
variable "redis_node_type" { type=string default="cache.t4g.small" }
variable "opensearch_enabled" { type=bool default=false }
variable "opensearch_instance_type" { type=string default="t3.small.search" }
variable "msk_enabled" { type=bool default=false }
variable "msk_instance_type" { type=string default="kafka.t3.small" }
variable "bucket_name" { type=string }
variable "enable_guardduty" { type=bool default=true }
variable "enable_security_hub" { type=bool default=true }
variable "enable_cloudtrail" { type=bool default=true }
variable "enable_backup" { type=bool default=true }
variable "tags" { type=map(string) default={} }
