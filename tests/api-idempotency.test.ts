import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiIdempotencyStore, MemoryIdempotencyPort } from '../apps/api/src/idempotency.ts';

test('idempotency store commits once and returns the committed winner',async()=>{
  const store=new ApiIdempotencyStore(new MemoryIdempotencyPort());
  const first=await store.commitOrRead('tenant:t:workspace:w:key',201,{id:'a'});
  const second=await store.commitOrRead('tenant:t:workspace:w:key',201,{id:'b'});
  assert.equal(JSON.parse(first.body).id,'a');
  assert.equal(JSON.parse(second.body).id,'a');
});

test('memory idempotency port expires records',async()=>{
  const port=new MemoryIdempotencyPort();
  await port.putIfAbsent('k',new Uint8Array([1]),0);
  assert.equal(await port.get('k'),null);
});
