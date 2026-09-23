# 1. Architectural Vision and Non-Negotiable Principles

The implementation follows a single application/platform core with pluggable providers and multiple deployment profiles. Business logic depends on contracts; infrastructure is selected through adapters and configuration.

Dependency direction is **Infrastructure -> Adapters -> Ports -> Application -> Domain**. Optional capability failures degrade only the affected capability. Production authentication, authorization, tenant isolation, encryption, audit, secret handling, logging, backups, migrations and configuration validation are never treated as optional.

Target request path: Route53 -> CloudFront -> WAF -> ALB/API Gateway -> API/BFF -> application/domain core -> capability contracts -> selected providers -> PostgreSQL/RDS source of truth.

Architecture tests protect the core from direct Redis, Kafka, AWS SDK, BullMQ, RabbitMQ, OpenSearch and Kubernetes imports.
