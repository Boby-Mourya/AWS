import test from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
const { app }=await import('../apps/api/src/server.ts');
const token='dev.'+Buffer.from(JSON.stringify({userId:'u1',tenantId:'t1',workspaceId:'w1',roles:['member'],permissions:['feature:documents'],mfa:false})).toString('base64url');const auth={authorization:`Bearer ${token}`};
test('API requires authentication on versioned routes',async()=>{const r=await app.inject({method:'GET',url:'/v1/items'});assert.equal(r.statusCode,401);assert.equal(r.json().error.code,'AUTHENTICATION_REQUIRED');});
test('API returns stable error envelope without stack trace',async()=>{const r=await app.inject({method:'POST',url:'/v1/resources',headers:auth,payload:{name:'x'}});assert.equal(r.statusCode,400);const body=r.json();assert.equal(body.error.code,'VALIDATION_ERROR');assert.ok(body.error.requestId);assert.equal('stack' in body.error,false);});
test('critical creation route is tenant-scoped and idempotent',async()=>{const headers={...auth,'idempotency-key':'idem-12345678'};const first=await app.inject({method:'POST',url:'/v1/resources',headers,payload:{name:'a'}});const second=await app.inject({method:'POST',url:'/v1/resources',headers,payload:{name:'a'}});assert.equal(first.statusCode,201);assert.equal(second.statusCode,201);assert.equal(first.json().id,second.json().id);assert.equal(first.json().tenantId,'t1');});
test('collection pagination is bounded',async()=>{const r=await app.inject({method:'GET',url:'/v1/items?limit=9999',headers:auth});assert.equal(r.json().limit,100);});
