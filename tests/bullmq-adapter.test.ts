import test from 'node:test';
import assert from 'node:assert/strict';
import { BullMqJobQueueAdapter, type BullMqQueueLike } from '../adapters/bullmq/src/index.ts';

test('BullMQ adapter maps JobQueuePort options and stable idempotency IDs',async()=>{
  const added:Array<{name:string;data:unknown;options?:Record<string,unknown>}>=[];
  const fake:BullMqQueueLike={
    add:async(name,data,options)=>{added.push({name,data,options});return{id:String(options?.jobId)}},
    waitUntilReady:async()=>undefined,
    close:async()=>undefined
  };
  const adapter=new BullMqJobQueueAdapter(()=>fake);
  const first=await adapter.enqueue('documents',{id:'d1'},{idempotencyKey:'tenant:a:doc:1',delayMs:250,maxAttempts:7});
  const second=await adapter.enqueue('documents',{id:'d1'},{idempotencyKey:'tenant:a:doc:1'});
  assert.equal(first,second);
  assert.match(first,/^idem-[a-f0-9]{64}$/);
  assert.equal(added[0]?.name,'documents');
  assert.equal(added[0]?.options?.delay,250);
  assert.equal(added[0]?.options?.attempts,7);
  assert.deepEqual(added[0]?.options?.backoff,{type:'exponential',delay:500});
  assert.equal((await adapter.health()).status,'HEALTHY');
  await adapter.close();
});
