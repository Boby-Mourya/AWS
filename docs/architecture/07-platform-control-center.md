# 7. Platform Control Center / DevOps Switch Panel

The control plane is implemented as a dedicated API plus platform-admin Next.js UI. The UI exposes every required page from the specification and is intentionally desired-state oriented: buttons do not execute shell commands or destructive cloud operations.

Change requests use the required state machine from DRAFT through validation, impact analysis, approval, provisioning/deployment, verification, stabilization and completion. Failures can move through FAILED -> ROLLING_BACK -> ROLLED_BACK.

`disable-capability`, `stop-infrastructure`, and `destroy-infrastructure` are separate operation semantics. Destroy requests are rejected by the direct HTTP API and must be handed to a separately approved IaC orchestrator after backup/retention checks. The Secrets page/API exposes metadata only and never plaintext secret values.
