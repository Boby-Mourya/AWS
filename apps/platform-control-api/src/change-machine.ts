import { randomUUID } from 'node:crypto';

export type ChangeState = 'DRAFT'|'VALIDATING'|'IMPACT_ANALYSIS'|'WAITING_APPROVAL'|'APPROVED'|'PROVISIONING'|'DEPLOYING'|'VERIFYING'|'STABILIZING'|'COMPLETED'|'FAILED'|'ROLLING_BACK'|'ROLLED_BACK';
export type ControlOperation = 'disable-capability'|'stop-infrastructure'|'destroy-infrastructure'|'change-provider'|'compute-migration';

const forward: Partial<Record<ChangeState, ChangeState[]>> = {
  DRAFT:['VALIDATING'], VALIDATING:['IMPACT_ANALYSIS','FAILED'], IMPACT_ANALYSIS:['WAITING_APPROVAL','APPROVED','FAILED'], WAITING_APPROVAL:['APPROVED','FAILED'], APPROVED:['PROVISIONING','DEPLOYING','FAILED'], PROVISIONING:['DEPLOYING','FAILED'], DEPLOYING:['VERIFYING','FAILED'], VERIFYING:['STABILIZING','FAILED'], STABILIZING:['COMPLETED','FAILED'], FAILED:['ROLLING_BACK'], ROLLING_BACK:['ROLLED_BACK']
};

export interface ChangeRequest {
  id: string;
  environment: string;
  actorId: string;
  operation: ControlOperation;
  capability: string;
  desired: Record<string, unknown>;
  state: ChangeState;
  impactReport?: Record<string, unknown>;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  audit: Array<{state:ChangeState; at:string; actorId:string; note?:string}>;
}

export class ChangeStateMachine {
  create(input: Omit<ChangeRequest,'id'|'state'|'createdAt'|'updatedAt'|'audit'>): ChangeRequest {
    const now = new Date().toISOString();
    return { ...input, id: randomUUID(), state:'DRAFT', createdAt:now, updatedAt:now, audit:[{state:'DRAFT',at:now,actorId:input.actorId}] };
  }
  transition(change: ChangeRequest, next: ChangeState, actorId: string, note?: string): ChangeRequest {
    if (!(forward[change.state] ?? []).includes(next)) throw new Error(`Invalid change transition ${change.state} -> ${next}`);
    const now = new Date().toISOString();
    return { ...change, state:next, updatedAt:now, audit:[...change.audit,{state:next,at:now,actorId,note}] };
  }
}

export function operationSemantics(operation: ControlOperation): { destructive:boolean; description:string } {
  switch (operation) {
    case 'disable-capability': return { destructive:false, description:'Stop application usage and activate fallback/degraded mode; infrastructure remains intact.' };
    case 'stop-infrastructure': return { destructive:false, description:'Stop/deactivate a provider only if the provider safely supports it.' };
    case 'destroy-infrastructure': return { destructive:true, description:'Remove via IaC only after stabilization, approval, backup and retention checks.' };
    case 'change-provider': return { destructive:false, description:'Validated provider cutover with health verification and rollback.' };
    case 'compute-migration': return { destructive:false, description:'Parallel environment migration with incremental traffic shift.' };
  }
}
