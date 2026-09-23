import type { ChangeRequest } from './change-machine.js';

export class InMemoryControlStore {
  private desiredState: Record<string, unknown> = {};
  private readonly changes = new Map<string, ChangeRequest>();
  private readonly audit: Array<Record<string, unknown>> = [];
  getDesiredState(): Record<string, unknown> { return structuredClone(this.desiredState); }
  setDesiredState(value: Record<string, unknown>, actorId: string): void {
    this.desiredState = structuredClone(value);
    this.audit.push({ type:'desired-state.updated', actorId, at:new Date().toISOString() });
  }
  saveChange(change: ChangeRequest): void { this.changes.set(change.id, structuredClone(change)); }
  getChange(id: string): ChangeRequest | undefined { const value=this.changes.get(id); return value ? structuredClone(value) : undefined; }
  listChanges(): ChangeRequest[] { return [...this.changes.values()].map(v => structuredClone(v)); }
  auditHistory(): Array<Record<string, unknown>> { return structuredClone(this.audit); }
}
