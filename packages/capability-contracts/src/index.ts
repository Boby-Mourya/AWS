import type { DomainEvent } from '@platform/domain';
import type { HealthAware } from '@platform/contracts';

export interface CachePort extends HealthAware {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EventBusPort extends HealthAware {
  publish(event: DomainEvent): Promise<void>;
}

export interface JobOptions {
  idempotencyKey?: string;
  delayMs?: number;
  maxAttempts?: number;
  correlationId?: string;
}

export interface JobQueuePort extends HealthAware {
  enqueue<T>(queue: string, payload: T, options?: JobOptions): Promise<string>;
}

export interface ObjectStoragePort extends HealthAware {
  put(key: string, body: Uint8Array, metadata?: Record<string, string>): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, expiresSeconds: number): Promise<string>;
}

export interface SearchQuery {
  text: string;
  tenantId: string;
  workspaceId?: string;
  limit?: number;
  cursor?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface SearchHit<T = unknown> {
  id: string;
  score: number;
  source: T;
}

export interface SearchResult<T = unknown> {
  hits: Array<SearchHit<T>>;
  nextCursor?: string;
  tookMs: number;
}

export interface SearchPort extends HealthAware {
  search<T = unknown>(query: SearchQuery): Promise<SearchResult<T>>;
}

export interface SecretProvider extends HealthAware {
  get(name: string): Promise<string>;
}

export interface DistributedLockPort extends HealthAware {
  withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

export interface IdempotencyPort extends HealthAware {
  get(key: string): Promise<Uint8Array | null>;
  putIfAbsent(key: string, value: Uint8Array, ttlSeconds: number): Promise<boolean>;
}

export interface AIModelRequest {
  tenantId: string;
  workspaceId?: string;
  model?: string;
  input: string;
  maxTokens?: number;
  temperature?: number;
  correlationId: string;
}

export interface AIModelResponse {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
}

export interface AIModelPort extends HealthAware {
  generate(request: AIModelRequest): Promise<AIModelResponse>;
}

export type ProviderName = string;
export type ProviderFactory<T> = () => Promise<T> | T;
