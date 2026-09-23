# 15. AWS Target Architecture

The target stack follows the mandated edge and service flow: Route 53 -> CloudFront -> AWS WAF/DDoS protections -> HTTPS ALB -> ECS Fargate or EKS. API services, workers, AI services and the platform control API use the same immutable image/pipeline model and consume capabilities only through the ports/adapters defined in earlier sections.

## Managed services

The Terraform target provisions RDS PostgreSQL as the source of truth, S3 object storage, SQS plus DLQ, KMS, ECR and CloudWatch Logs. Redis/ElastiCache, OpenSearch and MSK are controlled by explicit variables and remain optional providers. GuardDuty, Security Hub, CloudTrail and AWS Backup are enabled by default as AWS-side security/backup evidence.

## Account and blast-radius strategy

The platform is designed for AWS Organizations with separate Management, Security, Log Archive, Shared Services, Development, Test, Staging and Production accounts. This repository does not create or move organization accounts because those operations change organization governance and belong to the later infrastructure-orchestration scope. Production must be deployed into a separate account/blast radius from development and test.

## Network topology

The concrete VPC is split across at least two availability zones into public edge subnets, private application subnets and isolated data subnets. Only the ALB/NAT path is public. ECS/EKS workloads run privately; RDS, Redis, OpenSearch and MSK run in data subnets. S3 uses a gateway endpoint; ECR API/DKR, CloudWatch Logs, Secrets Manager and STS use private interface endpoints where practical.

## IAM

Application workloads receive dedicated scoped roles for only the bucket, queue and KMS operations they require. No browser or workload role receives `AdministratorAccess`, and no long-lived AWS access keys are required. Human administration is expected through IAM Identity Center/SSO and short-lived credentials. EKS uses dedicated cluster/node roles; fine-grained pod/workload identity is completed with the Section 17 Kubernetes implementation.

The deployable baseline is under `infrastructure/terraform/aws-target/`. It deliberately stops at Section 15 boundaries: AppConfig/Parameter Store/Secrets Manager runtime configuration mechanics, container/Kubernetes manifests, GitOps orchestration and later operational controls are owned by Sections 16+.
