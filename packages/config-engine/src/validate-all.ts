import type { DesiredState } from './types.js';
import { validateDesiredState } from './validate.js';
import { resolveDependencyIssues } from '@platform/dependency-engine';
import { assertLockedState, type Environment } from '@platform/policy-engine';

export interface FullValidationResult {
  valid: boolean;
  schemaIssues: ReturnType<typeof validateDesiredState>;
  dependencyIssues: ReturnType<typeof resolveDependencyIssues>;
}

export function validatePlatformState(state: DesiredState, environment: Environment): FullValidationResult {
  const schemaIssues = validateDesiredState(state);
  const dependencyIssues = resolveDependencyIssues(state);
  try { assertLockedState(state, environment); }
  catch (error) { schemaIssues.push({ path: 'platform', code: 'LOCKED_POLICY', message: error instanceof Error ? error.message : 'Locked policy violation' }); }
  return { valid: schemaIssues.length === 0 && dependencyIssues.length === 0, schemaIssues, dependencyIssues };
}

export function assertPlatformState(state: DesiredState, environment: Environment): void {
  const result = validatePlatformState(state, environment);
  if (!result.valid) throw new Error(`Platform desired state rejected before startup/deployment: ${JSON.stringify(result)}`);
}
