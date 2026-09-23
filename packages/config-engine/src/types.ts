import type { DeploymentProfileName } from '@platform/config';

export type SwitchClass = 'runtime' | 'application-provider' | 'infrastructure' | 'compute-migration' | 'locked';
export type SwitchRisk = 'GREEN' | 'BLUE' | 'AMBER' | 'RED' | 'LOCKED';

export interface CapabilitySelection {
  enabled: boolean;
  provider: string;
  fallback?: string;
  required?: boolean;
}

export interface DesiredState {
  platform: {
    profile: DeploymentProfileName;
    database: CapabilitySelection;
    cache: CapabilitySelection;
    distributed_lock: CapabilitySelection;
    idempotency: CapabilitySelection;
    queue: CapabilitySelection;
    event_bus: CapabilitySelection;
    object_storage: CapabilitySelection;
    vector_store: CapabilitySelection;
    search: CapabilitySelection;
    ai: CapabilitySelection;
    observability: { metrics: boolean; tracing: boolean; logging: boolean };
  };
  features: Record<string, boolean>;
  limits?: Record<string, number>;
}

export interface ConfigLayers {
  compiledDefaults: DesiredState;
  environment?: Partial<DesiredState>;
  secretReferences?: Partial<DesiredState>;
  platformDesiredState?: Partial<DesiredState>;
  tenantOverrides?: Partial<DesiredState>;
  workspaceOverrides?: Partial<DesiredState>;
}
