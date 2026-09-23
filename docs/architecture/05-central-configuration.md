# 5. Central Configuration, Capability Registry and Switch Semantics

`@platform/config-engine` models one desired state and applies precedence in the required order: compiled defaults -> environment -> secret references -> platform desired state -> tenant overrides -> workspace overrides -> user permission evaluation.

Validation rejects unknown providers, missing required fallbacks, disabled locked core behavior and RAG dependency conflicts before startup/deployment. Switch classes are machine-readable and distinguish GREEN runtime changes, BLUE provider switches, AMBER infrastructure changes, RED compute migrations and LOCKED production controls.

The environment files in `config/` are declarative desired state. They are not edited by business modules and they contain no plaintext production secrets.
