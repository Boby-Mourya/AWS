import type { DesiredState, SwitchClass } from '@platform/config-engine';

export type Environment = 'development' | 'testing' | 'staging' | 'production';

export const LOCKED_PRODUCTION_CAPABILITIES = [
  'authentication', 'authorization', 'tenant_isolation', 'primary_persistent_datastore',
  'tls_encryption', 'secure_secret_handling', 'sensitive_operation_audit', 'structured_logging',
  'input_validation', 'backup_policy', 'database_migration_system', 'configuration_validation'
] as const;

export interface PolicyContext {
  environment: Environment;
  actorRoles: string[];
  switchClass: SwitchClass;
  operation: 'enable' | 'disable' | 'change-provider' | 'stop' | 'destroy';
  capability: string;
  approved?: boolean;
}

export interface PolicyDecision { allowed: boolean; reasons: string[]; approvalRequired: boolean; }

export function evaluatePlatformPolicy(context: PolicyContext): PolicyDecision {
  const reasons: string[] = [];
  const production = context.environment === 'production';
  const privileged = context.actorRoles.some(r => ['platform-admin','sre','security-admin'].includes(r));
  if (!privileged) reasons.push('PLATFORM_ADMIN_ROLE_REQUIRED');
  if (production && context.operation === 'disable' && LOCKED_PRODUCTION_CAPABILITIES.includes(context.capability as never)) reasons.push('LOCKED_PRODUCTION_CAPABILITY');
  const approvalRequired = production && ['application-provider','infrastructure','compute-migration'].includes(context.switchClass);
  if (approvalRequired && !context.approved) reasons.push('PRODUCTION_APPROVAL_REQUIRED');
  if (context.operation === 'destroy' && context.switchClass === 'runtime') reasons.push('RUNTIME_SWITCH_CANNOT_DESTROY_INFRASTRUCTURE');
  return { allowed: reasons.length === 0, reasons, approvalRequired };
}

export function assertLockedState(state: DesiredState, environment: Environment): void {
  if (environment !== 'production') return;
  const violations: string[] = [];
  if (!state.platform.database.enabled) violations.push('primary_persistent_datastore');
  if (!state.platform.observability.logging) violations.push('structured_logging');
  if (violations.length) throw new Error(`Locked production capabilities disabled: ${violations.join(', ')}`);
}
