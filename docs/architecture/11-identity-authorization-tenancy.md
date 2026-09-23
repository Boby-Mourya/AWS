# 11. Identity, Authorization and Multi-Tenant Isolation

`@platform/security` verifies OAuth 2.0 / OpenID Connect JWTs against remote JWKS in production. Privileged roles require an MFA authentication-method claim. The session registry supports explicit session revocation, device tracking, refresh-token rotation and refresh-token reuse detection. RBAC is permission-based and ABAC-style resource attributes can restrict ownership and resource conditions.

Every authenticated request establishes a `TenantContext` containing `userId`, `tenantId`, optional `workspaceId`, roles and permissions. Infrastructure-scope helpers consistently namespace cache keys, queue envelopes, event metadata, S3 prefixes, vector filters and log fields. Cross-tenant/workspace resource assertions fail closed. Production requires OIDC configuration at startup; the `dev.*` token decoder exists only when no production verifier is configured.

PostgreSQL Row-Level Security is added in Section 12 as a second barrier, not a replacement for application authorization. CI tests explicitly exercise cross-tenant denial.
