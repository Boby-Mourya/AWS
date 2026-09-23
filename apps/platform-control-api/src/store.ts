import type { ChangeRequest } from './change-machine.js';

export type ControlPage = 'overview'|'capabilities'|'features'|'providers'|'environments'|'dependencies'|'infrastructure'|'deployments'|'health'|'observability'|'security'|'secrets'|'costs'|'backup-dr'|'drift'|'emergency';
export interface ControlSnapshot { updatedAt:string; data:Record<string,unknown>; }

export class InMemoryControlStore {
  private desiredState: Record<string, unknown> = {};
  private actualState: Record<string, unknown> = {};
  private readonly changes = new Map<string, ChangeRequest>();
  private readonly audit: Array<Record<string, unknown>> = [];
  private readonly pages = new Map<ControlPage,ControlSnapshot>();
  private configVersion=1;

  constructor(){
    const now=new Date().toISOString();
    this.pages.set('overview',{updatedAt:now,data:{health:'UNKNOWN',profile:'unknown',drift:'UNKNOWN',criticalAlerts:[]}});
    this.pages.set('capabilities',{updatedAt:now,data:{items:[]}});
    this.pages.set('features',{updatedAt:now,data:{items:[]}});
    this.pages.set('providers',{updatedAt:now,data:{items:[]}});
    this.pages.set('environments',{updatedAt:now,data:{items:['development','testing','staging','production']}});
    this.pages.set('dependencies',{updatedAt:now,data:{graph:{},conflicts:[]}});
    this.pages.set('infrastructure',{updatedAt:now,data:{resources:[]}});
    this.pages.set('deployments',{updatedAt:now,data:{releases:[]}});
    this.pages.set('health',{updatedAt:now,data:{dependencies:[],workers:[],queues:[],dlq:[],integrations:[]}});
    this.pages.set('observability',{updatedAt:now,data:{metrics:true,tracing:true,logging:true,slos:[]}});
    this.pages.set('security',{updatedAt:now,data:{posture:'UNKNOWN',criticalFindings:[]}});
    this.pages.set('secrets',{updatedAt:now,data:{items:[],note:'Secret metadata only; plaintext values are never stored or returned by the control plane.'}});
    this.pages.set('costs',{updatedAt:now,data:{currency:'USD',items:[]}});
    this.pages.set('backup-dr',{updatedAt:now,data:{rpo:null,rto:null,backups:[],restoreTests:[]}});
    this.pages.set('drift',{updatedAt:now,data:{status:'UNKNOWN',items:[]}});
    this.pages.set('emergency',{updatedAt:now,data:{maintenanceMode:false,killSwitches:{}}});
  }

  getDesiredState():Record<string,unknown>{return structuredClone(this.desiredState)}
  getActualState():Record<string,unknown>{return structuredClone(this.actualState)}
  getConfigVersion():number{return this.configVersion}
  setDesiredState(value:Record<string,unknown>,actorId:string):void{this.desiredState=structuredClone(value);this.configVersion++;this.recordAudit({type:'desired-state.updated',actorId,configVersion:this.configVersion})}
  setActualState(value:Record<string,unknown>,actorId='system'):void{this.actualState=structuredClone(value);this.recordAudit({type:'actual-state.observed',actorId})}
  setPage(page:ControlPage,data:Record<string,unknown>,actorId='system'):void{this.pages.set(page,{updatedAt:new Date().toISOString(),data:structuredClone(data)});this.recordAudit({type:`control-page.${page}.updated`,actorId})}
  getPage(page:ControlPage):ControlSnapshot{return structuredClone(this.pages.get(page)??{updatedAt:new Date(0).toISOString(),data:{}})}
  saveChange(change:ChangeRequest):void{this.changes.set(change.id,structuredClone(change));this.recordAudit({type:'change.saved',changeId:change.id,actorId:change.actorId,state:change.state})}
  getChange(id:string):ChangeRequest|undefined{const value=this.changes.get(id);return value?structuredClone(value):undefined}
  listChanges():ChangeRequest[]{return[...this.changes.values()].map(v=>structuredClone(v)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  auditHistory():Array<Record<string,unknown>>{return structuredClone(this.audit)}
  recordAudit(entry:Record<string,unknown>):void{this.audit.push({...structuredClone(entry),at:new Date().toISOString()})}
}
