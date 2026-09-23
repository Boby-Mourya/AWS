# 3. Repository and Code Organization

The monorepo now contains the required `apps`, `services`, `packages`, `adapters`, `infrastructure`, `config`, `tests`, `scripts`, `docs` and `.github` boundaries. `services/_template` is the canonical service-internal layout with domain, application, ports, adapters, infrastructure, interfaces and tests.

The Section 1 architecture test enforces that business/domain layers do not directly import infrastructure SDKs. New services should copy the template and keep provider-specific code in `adapters/` or service adapter folders only.
