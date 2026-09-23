import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiIdempotencyStore, MemoryIdempotencyPort } from '../apps/api/src/idempotency.ts';

test('idempotency store commits once and concurrent callers read one winner',async()=>{
  const store=new ApiIdempotencyStore(new MemoryIdempotencyPort());
  const [first,second]=await Promise.all([
    store.commitOrRead('tenant:t:workspace:w:key',201,{id:'a'}),
    store.commitOrRead('tenant:t:workspace:w:key',201,{id:'b'})
  ]);
  assert.equal(JSON.parse(first.body).id,JSON.parse(second.body).id);
  assert.ok(['a','b'].includes(JSON.parse(first.body).id));
});

test('memory idempotency port expires records',async()=>{
  const port=new MemoryIdempotencyPort();
  await port.putIfAbsent('k',new Uint8Array([1]),0);
  assert.equal(await port.get('k'),null);
});
