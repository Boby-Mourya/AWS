# Section 15 AWS Target Architecture

This stack is the concrete AWS target for Sections 1–15. It is intentionally a target/infrastructure baseline, not the Section 18 GitOps/change-orchestration implementation.

Traffic path: Route 53 (optional custom domain) -> CloudFront -> CloudFront-scope AWS WAF -> HTTPS ALB -> ECS Fargate, or EKS when `compute_provider = "eks"`. EKS workload/Ingress manifests remain in the containers/Kubernetes scope owned by the later implementation sections.

The VPC has public edge subnets, private application subnets and isolated data subnets across 2–3 AZs. Application subnets use NAT only when enabled, while VPC endpoints are created for S3, ECR API/DKR, CloudWatch Logs, Secrets Manager and STS. Data services are never placed in public subnets.

Managed data includes RDS PostgreSQL with AWS-managed master secret, PITR backups, KMS and Multi-AZ support; S3 with Block Public Access, KMS, versioning and lifecycle; SQS with DLQ; optional ElastiCache Redis; optional OpenSearch; and optional MSK with TLS. Workloads receive scoped IAM roles rather than AdministratorAccess or long-lived keys.

GuardDuty, Security Hub, multi-region CloudTrail with log validation, and AWS Backup are enabled by default. Production enables deletion protection for stateful/edge resources where supported. Human access is expected through AWS IAM Identity Center/SSO in the organization account; application workloads use task/node/workload identity.

For a custom CloudFront domain, set `domain_name`, `route53_zone_id`, and a us-east-1 `cloudfront_certificate_arn`. Set `origin_domain_name` (for example `origin.example.com`) to a Route 53 name covered by `alb_certificate_arn` so CloudFront-to-ALB TLS hostname validation remains valid.

Do not put passwords, API keys, access keys or plaintext secrets in `.tfvars` committed to Git. Database master credentials are generated and stored by RDS/Secrets Manager. Provider/application secret retrieval and rotation are Section 16 concerns.
