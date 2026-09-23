import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../apps/api/src/server.ts';

test('API returns stable error envelope without stack trace',async()=>{const r=await app.inject({method:'POST',url:'/v1/resources',payload:{name:'x'}});assert.equal(r.statusCode,400);const body=r.json();assert.equal(body.error.code,'VALIDATION_ERROR');assert.ok(body.error.requestId);assert.equal('stack' in body.error,false);});

test('critical creation route requires idempotency and replays response',async()=>{const headers={'idempotency-key':'idem-12345678'};const first=await app.inject({method:'POST',url:'/v1/resources',headers,payload:{name:'a'}});const second=await app.inject({method:'POST',url:'/v1/resources',headers,payload:{name:'a'}});assert.equal(first.statusCode,201);assert.equal(second.statusCode,201);assert.equal(first.json().id,second.json().id);});

test('collection pagination is bounded',async()=>{const r=await app.inject({method:'GET',url:'/v1/items?limit=9999'});assert.equal(r.json().limit,100);});
