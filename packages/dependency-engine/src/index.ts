import type { DesiredState } from '@platform/config-engine';

export interface DependencyIssue {
  code: string;
  capability: string;
  dependency: string;
  message: string;
  migrations: string[];
}

export interface DependencyRule {
  capability: string;
  whenProvider?: string;
  requires: string[];
  migrationOptions?: string[];
}

export const DEPENDENCY_RULES: DependencyRule[] = [
  { capability:'queue',whenProvider:'bullmq',requires:['redis'],migrationOptions:['sqs','rabbitmq','sync'] },
  { capability:'distributed_lock',whenProvider:'redis',requires:['redis'],migrationOptions:['postgres'] },
  { capability:'distributed_lock',whenProvider:'postgres',requires:['postgres'] },
  { capability:'idempotency',whenProvider:'redis',requires:['redis'],migrationOptions:['postgres'] },
  { capability:'idempotency',whenProvider:'postgres',requires:['postgres'] },
  { capability:'event_bus',whenProvider:'outbox',requires:['postgres'],migrationOptions:['sns-sqs','kafka'] },
  { capability:'search',whenProvider:'postgres',requires:['postgres'],migrationOptions:['opensearch'] },
  { capability:'vector_store',whenProvider:'pgvector',requires:['postgres'],migrationOptions:['disable-rag'] },
  { capability:'rag',requires:['ai','vector_store','object_storage'],migrationOptions:['disable-rag'] }
];

function active(state:DesiredState,dependency:string):boolean{
  if(dependency==='postgres')return state.platform.database.enabled&&state.platform.database.provider==='postgres';
  if(dependency==='redis')return state.platform.cache.enabled&&state.platform.cache.provider==='redis';
  if(dependency==='rag')return Boolean(state.features.rag);
  const value=(state.platform as unknown as Record<string,{enabled?:boolean}>)[dependency];return Boolean(value?.enabled);
}

function ruleSelected(state:DesiredState,rule:DependencyRule):boolean{
  if(rule.capability==='rag')return Boolean(state.features.rag);
  const selection=(state.platform as unknown as Record<string,{enabled?:boolean;provider?:string}>)[rule.capability];
  if(!selection?.enabled)return false;return !rule.whenProvider||selection.provider===rule.whenProvider;
}

export function resolveDependencyIssues(state:DesiredState):DependencyIssue[]{
  const issues:DependencyIssue[]=[];
  for(const rule of DEPENDENCY_RULES){
    if(!ruleSelected(state,rule))continue;
    for(const dependency of rule.requires){
      if(active(state,dependency))continue;
      issues.push({code:'DEPENDENCY_UNAVAILABLE',capability:rule.capability,dependency,message:`${rule.capability}${rule.whenProvider?`/${rule.whenProvider}`:''} requires ${dependency}`,migrations:[...(rule.migrationOptions??[])]});
    }
  }
  return issues;
}

export function assertDependencies(state:DesiredState):void{
  const issues=resolveDependencyIssues(state);
  if(issues.length)throw new Error(`Dependency validation failed: ${issues.map(i=>`${i.capability}->${i.dependency}`).join(', ')}`);
}

export function dependencyGraph(state:DesiredState):Record<string,string[]>{
  const graph:Record<string,string[]>={};
  for(const rule of DEPENDENCY_RULES)if(ruleSelected(state,rule))graph[`${rule.capability}${rule.whenProvider?`:${rule.whenProvider}`:''}`]=[...rule.requires];
  return graph;
}
