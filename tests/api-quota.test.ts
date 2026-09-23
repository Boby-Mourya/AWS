import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedWindowLimiter } from '../apps/api/src/rate-limit.js';
import { ApiError } from '../apps/api/src/errors.js';

test('fixed-window limiter can expose a distinct quota error code',()=>{
  const quota=new FixedWindowLimiter(2,60_000,'QUOTA_EXCEEDED','Tenant daily request quota exceeded');
  quota.check('tenant-1');quota.check('tenant-1');
  assert.throws(()=>quota.check('tenant-1'),(error:unknown)=>error instanceof ApiError&&error.statusCode===429&&error.code==='QUOTA_EXCEEDED');
});

test('quota accounting is isolated by tenant key',()=>{
  const quota=new FixedWindowLimiter(1,60_000,'QUOTA_EXCEEDED','Tenant daily request quota exceeded');
  quota.check('tenant-a');quota.check('tenant-b');
  assert.throws(()=>quota.check('tenant-a'),(error:unknown)=>error instanceof ApiError&&error.code==='QUOTA_EXCEEDED');
});
