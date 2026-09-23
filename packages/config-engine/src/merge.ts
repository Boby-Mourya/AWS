import type { ConfigLayers, DesiredState } from './types.js';

function deepMerge<T>(base: T, patch?: Partial<T>): T {
  if (!patch) return structuredClone(base);
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return structuredClone(patch as T);
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = current && value && typeof current === 'object' && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(current, value as never)
      : structuredClone(value);
  }
  return out as T;
}

export function resolveDesiredState(layers: ConfigLayers): DesiredState {
  let result = structuredClone(layers.compiledDefaults);
  result = deepMerge(result, layers.environment);
  result = deepMerge(result, layers.secretReferences);
  result = deepMerge(result, layers.platformDesiredState);
  result = deepMerge(result, layers.tenantOverrides);
  result = deepMerge(result, layers.workspaceOverrides);
  return result;
}

export function applyUserPermissionEvaluation<T extends Record<string, boolean>>(features: T, allowed: ReadonlySet<string>): T {
  return Object.fromEntries(Object.entries(features).map(([name, enabled]) => [name, Boolean(enabled && allowed.has(name))])) as T;
}
