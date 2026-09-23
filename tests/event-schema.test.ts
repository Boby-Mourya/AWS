import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventSchemaRegistry, assertBackwardCompatibleEventSchema } from '../packages/domain/src/event-schema.ts';

const loadEnvelope=async()=>JSON.parse(await readFile('packages/domain/schemas/domain-event-envelope.v1.schema.json','utf8'));

test('event envelope is validated by event type and version',async()=>{
  const schema=await loadEnvelope();const registry=new EventSchemaRegistry();registry.register({eventType:'customer.created',version:1,schema});
  registry.validate({eventId:'e1',eventType:'customer.created',eventVersion:1,timestamp:new Date().toISOString(),tenantId:'t1',workspaceId:'w1',correlationId:'c1',source:'customer-service',data:{customerId:'x'}});
  assert.throws(()=>registry.validate({eventId:'e1',eventType:'customer.created',eventVersion:1,timestamp:new Date().toISOString(),tenantId:'',correlationId:'c1',source:'customer-service',data:{}}),/EVENT_SCHEMA_INVALID/);
  assert.throws(()=>registry.validate({eventId:'e2',eventType:'customer.created',eventVersion:2,timestamp:new Date().toISOString(),tenantId:'t1',correlationId:'c1',source:'customer-service',data:{}}),/EVENT_SCHEMA_NOT_REGISTERED/);
});

test('schema compatibility allows optional additions but rejects breaking changes',()=>{
  const previous={type:'object',required:['id'],properties:{id:{type:'string'},name:{type:'string'}}};
  assert.doesNotThrow(()=>assertBackwardCompatibleEventSchema(previous,{type:'object',required:['id'],properties:{id:{type:'string'},name:{type:'string'},note:{type:'string'}}}));
  assert.throws(()=>assertBackwardCompatibleEventSchema(previous,{type:'object',required:['id','note'],properties:{id:{type:'string'},name:{type:'string'},note:{type:'string'}}}),/EVENT_SCHEMA_NEW_REQUIRED_FIELD:note/);
  assert.throws(()=>assertBackwardCompatibleEventSchema(previous,{type:'object',required:['id'],properties:{id:{type:'number'},name:{type:'string'}}}),/EVENT_SCHEMA_TYPE_CHANGED:id/);
});
