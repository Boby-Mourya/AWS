import Fastify from 'fastify';
import { ApiError, errorEnvelope } from './errors.js';
import { buildRequestContext, type RequestContext } from './request-context.js';
import { FixedWindowLimiter } from './rate-limit.js';
import { IdempotencyStore } from './idempotency.js';
import { parsePage } from './pagination.js';
import { authenticate } from './auth.js';

declare module 'fastify' { interface FastifyRequest { platformContext: RequestContext } }
const app=Fastify({logger:true,bodyLimit:1024*1024,requestTimeout:15_000,connectionTimeout:10_000});
const limiter=new FixedWindowLimiter(Number(process.env.API_RPM ?? 600),60_000);const idempotency=new IdempotencyStore();
const publicPaths=new Set(['/health']);

app.addHook('onRequest',async(request,reply)=>{
  request.platformContext=buildRequestContext(request.headers as Record<string,unknown>);
  reply.header('x-request-id',request.platformContext.requestId).header('x-correlation-id',request.platformContext.correlationId).header('X-Content-Type-Options','nosniff').header('Referrer-Policy','strict-origin-when-cross-origin').header('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!publicPaths.has(request.url.split('?')[0]??''))request.platformContext.tenant=await authenticate(request.headers.authorization);
  const tenantKey=request.platformContext.tenant?.tenantId ?? request.ip;limiter.check(tenantKey);
});
app.setErrorHandler((error,request,reply)=>{const requestId=request.platformContext?.requestId??request.id;if(error instanceof ApiError)return reply.code(error.statusCode).send(errorEnvelope(error.code,error.message,requestId));if((error as {validation?:unknown}).validation)return reply.code(400).send(errorEnvelope('VALIDATION_ERROR','Request validation failed',requestId));request.log.error({err:{name:error.name,message:error.message},requestId,tenantId:request.platformContext?.tenant?.tenantId},'request failed');return reply.code(500).send(errorEnvelope('INTERNAL_ERROR','An internal error occurred',requestId));});
app.get('/health',async()=>({status:'HEALTHY'}));
app.get('/v1/meta/capabilities',async(request)=>({features:{documents:true,chat:true,analytics:true,workflow:false},permissions:request.platformContext.tenant?.permissions??[]}));
app.get<{Querystring:{limit?:string;cursor?:string}}>('/v1/items',{schema:{querystring:{type:'object',properties:{limit:{type:'string'},cursor:{type:'string'}},additionalProperties:false}}},async(request)=>{const page=parsePage(request.query as unknown as Record<string,unknown>);return {items:[],nextCursor:undefined,limit:page.limit};});
app.post<{Body:{name:string}}>('/v1/resources',{schema:{headers:{type:'object',properties:{'idempotency-key':{type:'string',minLength:8,maxLength:200}},required:['idempotency-key']},body:{type:'object',required:['name'],properties:{name:{type:'string',minLength:1,maxLength:200}},additionalProperties:false}}},async(request,reply)=>{const key=`${request.platformContext.tenant!.tenantId}:${String(request.headers['idempotency-key'])}`;const cached=idempotency.get(key);if(cached)return reply.code(cached.status).send(JSON.parse(cached.body));const result={id:crypto.randomUUID(),tenantId:request.platformContext.tenant!.tenantId,name:request.body.name};idempotency.put(key,201,result);return reply.code(201).send(result);});
if(process.env.NODE_ENV!=='test')app.listen({port:Number(process.env.PORT??4000),host:'0.0.0.0'});export { app };
