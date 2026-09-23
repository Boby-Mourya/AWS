import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production control API requires approved change before desired-state mutation',async()=>{
  const source=await readFile('apps/platform-control-api/src/server.ts','utf8');
  assert.ok(source.includes('APPROVED_PRODUCTION_CHANGE_REQUIRED'));
  assert.ok(source.includes("request.headers['x-control-change-id']"));
  assert.ok(source.includes('approvedMutationStates'));
  assert.ok(source.includes('LOCKED_PRODUCTION_CAPABILITY'));
  assert.ok(source.includes('DESTRUCTIVE_ACTION_REQUIRES_ORCHESTRATOR'));
});
