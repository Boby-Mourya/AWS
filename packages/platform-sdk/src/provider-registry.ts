import type { ProviderFactory } from '@platform/capability-contracts';

export class ProviderRegistry {
  private readonly providers = new Map<string, Map<string, ProviderFactory<unknown>>>();

  register<T>(capability: string, provider: string, factory: ProviderFactory<T>): void {
    const catalog = this.providers.get(capability) ?? new Map<string, ProviderFactory<unknown>>();
    if (catalog.has(provider)) throw new Error(`Provider already registered: ${capability}/${provider}`);
    catalog.set(provider, factory as ProviderFactory<unknown>);
    this.providers.set(capability, catalog);
  }

  has(capability: string, provider: string): boolean {
    return this.providers.get(capability)?.has(provider) ?? false;
  }

  list(capability: string): string[] {
    return [...(this.providers.get(capability)?.keys() ?? [])].sort();
  }

  async resolve<T>(capability: string, provider: string): Promise<T> {
    const factory = this.providers.get(capability)?.get(provider);
    if (!factory) throw new Error(`Unknown provider: ${capability}/${provider}`);
    return await factory() as T;
  }
}

export const REQUIRED_PROVIDER_CATALOG: Record<string, readonly string[]> = {
  cache: ['redis', 'memory', 'none'],
  queue: ['sqs', 'bullmq', 'rabbitmq', 'sync'],
  event_bus: ['kafka', 'sns-sqs', 'outbox'],
  search: ['opensearch', 'postgres'],
  object_storage: ['s3', 'minio', 'filesystem'],
  compute: ['eks', 'ecs', 'docker'],
  ai: ['local-ai', 'bedrock', 'external', 'disabled'],
  secrets: ['aws-secrets-manager', 'vault', 'env']
};

export function assertProviderCatalog(registry: ProviderRegistry, enabledCapabilities: string[]): void {
  for (const capability of enabledCapabilities) {
    const expected = REQUIRED_PROVIDER_CATALOG[capability];
    if (!expected) continue;
    if (!expected.some(provider => registry.has(capability, provider))) {
      throw new Error(`No registered provider for capability ${capability}`);
    }
  }
}
