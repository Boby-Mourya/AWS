export type EntityId = string;

export interface DomainEvent<T = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly timestamp: string;
  readonly tenantId: string;
  readonly workspaceId?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly source: string;
  readonly data: T;
}

export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export * from './event-schema.js';
