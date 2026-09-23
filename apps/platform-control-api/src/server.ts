import Fastify from 'fastify';
import { ChangeStateMachine, operationSemantics, type ChangeState, type ControlOperation } from './change-machine.js';
import { InMemoryControlStore, type ControlPage } from './store.js';
import { planSwitch, WorkflowPreconditionError, validatePlatformState, type DesiredState, type WorkflowContext, type WorkflowKind } from '../../../packages/config-engine/src/index.js';
import { isLockedProductionCapability, type Environment } from '../../../packages/policy-engine/src/index.js';
import type { TenantContext } from '../../../packages/security/src/index.js';
import { authenticateControlOperator, requireControlWrite } from './auth.js';
import { assertSecretMetadataOnly, redactSecretMaterial } from './secret-metadata.js';

declare module 'fastify' { interface FastifyRequest { operator: TenantContext } }

const app=Fastify({logger:true,bodyLimit:1024*256,requestTimeout:15_000});
const machine=new ChangeStateMachine();
const store=new InMemoryControlStore();
const environment=(process.env.PLATFORM_ENV??'development') as Environment;
const region=process.env.AWS_REGION??'ap-south-1';
const pages=new Set<ControlPage>(['overview','capabilities','features','providers','environments','dependencies','infrastructure','deployments','health','observability','security','secrets','costs','backup-dr','drift','emergency']);
const approvedMutationStates=new Set<ChangeState>(['APPROVED','PROVISIONING','DEPLOYING','VERIFYING','STABILIZING','COMPLETED']);

app.addHook('onRequest',async(request)=>{if(request.url.split('?')[0]==='/health')return;request.operator=await authenticateControlOperator(request.headers.authorization)});
app.setErrorHandler((error,request,reply)=>{const status=(error as {statusCode?:number}).statusCode??500;const code=(error as {code?:string}).code??(status>=500?'INTERNAL_ERROR':'CONTROL_REQUEST_REJECTED');if(status>=500)request.log.error({err:error},'control request failed');return reply.code(status).send({error:{code,message:status>=500?'Control-plane request failed':error.message,requestId:request.id}})});

app.get('/health',async()=>({status:'HEALTHY',service:'platform-control-api'}));
app.get('/v1/control/overview',async()=>({environment,region,configVersion:store.getConfigVersion(),...store.getPage('overview').data,updatedAt:store.getPage('overview').updatedAt}));
app.get('/v1/control/desired-state',async()=>({configVersion:store.getConfigVersion(),desiredState:store.getDesiredState()}));
app.put<{Body:DesiredState}>('/v1/control/desired-state',async(request,reply)=>{
  requireControlWrite(request.operator);
  const result=validatePlatformState(request.body,environment);if(!result.valid)return reply.code(409).send({error:{code:'INVALID_DESIRED_STATE',message:'Desired state failed schema, dependency or locked-capability validation',requestId:request.id},details:result});
  let changeId:string|undefined;
  if(environment==='production'){
    const header=request.headers['x-control-change-id'];changeId=Array.isArray(header)?header[0]:header;
    const change=changeId?store.getChange(changeId):undefined;
    if(!change||change.environment!=='production'||!change.approvedBy||!approvedMutationStates.has(change.state))return reply.code(409).send({error:{code:'APPROVED_PRODUCTION_CHANGE_REQUIRED',message:'Production desired-state changes require an approved control-plane change request.',requestId:request.id}});
  }
  store.setDesiredState(request.body as unknown as Record<string,unknown>,request.operator.userId);if(changeId)store.recordAudit({type:'desired-state.applied-from-change',changeId,actorId:request.operator.userId});return{configVersion:store.getConfigVersion(),desiredState:store.getDesiredState()}
});
app.get('/v1/control/actual-state',async()=>({actualState:store.getActualState()}));

app.get<{Params:{page:string}}>('/v1/control/pages/:page',async(request,reply)=>{if(!pages.has(request.params.page as ControlPage))return reply.code(404).send({error:{code:'CONTROL_PAGE_NOT_FOUND',message:'Unknown control-center page',requestId:request.id}});const snapshot=store.getPage(request.params.page as ControlPage);return request.params.page==='secrets'?{...snapshot,data:redactSecretMaterial(snapshot.data)}:snapshot});
app.put<{Params:{page:string};Body:Record<string,unknown>}>('/v1/control/pages/:page',async(request,reply)=>{requireControlWrite(request.operator);if(!pages.has(request.params.page as ControlPage))return reply.code(404).send({error:{code:'CONTROL_PAGE_NOT_FOUND',message:'Unknown control-center page',requestId:request.id}});if(request.params.page==='secrets')assertSecretMetadataOnly(request.body);store.setPage(request.params.page as ControlPage,request.body,request.operator.userId);const snapshot=store.getPage(request.params.page as ControlPage);return request.params.page==='secrets'?{...snapshot,data:redactSecretMaterial(snapshot.data)}:snapshot});

app.get('/v1/control/changes',async()=>({items:store.listChanges()}));
app.get<{Params:{id:string}}>('/v1/control/changes/:id',async(request,reply)=>store.getChange(request.params.id)??reply.code(404).send({error:{code:'CHANGE_NOT_FOUND',message:'Change request not found',requestId:request.id}}));
app.post<{Body:{environment?:string;operation:ControlOperation;capability:string;desired:Record<string,unknown>}}>('/v1/control/changes',async(request,reply)=>{
  requireControlWrite(request.operator);const body=request.body;
  if(body.environment&&body.environment!==environment)return reply.code(409).send({error:{code:'ENVIRONMENT_SCOPE_MISMATCH',message:`Control API is scoped to ${environment}; requested ${body.environment}`,requestId:request.id}});
  const semantics=operationSemantics(body.operation);
  if(body.operation==='destroy-infrastructure')return reply.code(409).send({error:{code:'DESTRUCTIVE_ACTION_REQUIRES_ORCHESTRATOR',message:semantics.description,requestId:request.id}});
  if(environment==='production'&&['disable-capability','stop-infrastructure'].includes(body.operation)&&isLockedProductionCapability(body.capability))return reply.code(409).send({error:{code:'LOCKED_PRODUCTION_CAPABILITY',message:`${body.capability} cannot be disabled or stopped in production`,requestId:request.id}});
  const change=machine.create({operation:body.operation,capability:body.capability,desired:body.desired,environment,actorId:request.operator.userId});store.saveChange(change);return reply.code(201).send(change)
});
app.post<{Params:{id:string};Body:{next:ChangeState;note?:string}}>('/v1/control/changes/:id/transition',async(request,reply)=>{
  requireControlWrite(request.operator);const current=store.getChange(request.params.id);if(!current)return reply.code(404).send({error:{code:'CHANGE_NOT_FOUND',message:'Change request not found',requestId:request.id}});
  if(current.environment==='production'&&current.state==='IMPACT_ANALYSIS'&&request.body.next==='APPROVED')return reply.code(409).send({error:{code:'PRODUCTION_APPROVAL_STAGE_REQUIRED',message:'Production changes must enter WAITING_APPROVAL before APPROVED',requestId:request.id}});
  let next=machine.transition(current,request.body.next,request.operator.userId,request.body.note);if(request.body.next==='APPROVED')next={...next,approvedBy:request.operator.userId};store.saveChange(next);return next
});

app.post<{Body:{kind:WorkflowKind;context:WorkflowContext}}>('/v1/control/workflows/preview',async(request,reply)=>{requireControlWrite(request.operator);try{const context={...request.body.context,environment,actorRoles:request.operator.roles};return{workflow:planSwitch(request.body.kind,context)}}catch(error){if(error instanceof WorkflowPreconditionError)return reply.code(409).send({error:{code:error.code,message:error.message,requestId:request.id}});throw error}});
app.get('/v1/control/audit',async()=>({items:store.auditHistory()}));
app.get('/v1/control/secrets',async()=>{const snapshot=store.getPage('secrets');return{...snapshot,data:redactSecretMaterial(snapshot.data)}});
app.post<{Body:{maintenanceMode?:boolean;killSwitch?:string;enabled?:boolean}}>('/v1/control/emergency',async(request)=>{requireControlWrite(request.operator);const current=store.getPage('emergency').data;const killSwitches={...((current.killSwitches as Record<string,boolean>|undefined)??{})};if(request.body.killSwitch)killSwitches[request.body.killSwitch]=Boolean(request.body.enabled);const data={...current,maintenanceMode:request.body.maintenanceMode??current.maintenanceMode??false,killSwitches};store.setPage('emergency',data,request.operator.userId);store.recordAudit({type:'emergency.desired-state.updated',actorId:request.operator.userId,data});return store.getPage('emergency')});

if(process.env.NODE_ENV!=='test')app.listen({port:Number(process.env.PORT??4100),host:'0.0.0.0'});
export{app,machine,store};
