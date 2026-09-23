export type FeatureName = 'rag'|'whatsapp'|'analytics'|'workflow'|'documents'|'chat'|'integrations';
export type FeatureMap = Partial<Record<FeatureName,boolean>>;
export function featureEnabled(features:FeatureMap,name:FeatureName,permissions:ReadonlySet<string>):boolean { return Boolean(features[name] && permissions.has(`feature:${name}`)); }
