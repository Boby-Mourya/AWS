import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.PLATFORM_ENV='development';
const {app}=await import('../apps/platform-control-api/src/server.js');
const token='dev.'+Buffer.from(JSON.stringify({userId:'operator-1',tenantId:'platform',roles:['platform-admin'],permissions:['platform:write'],mfa:true})).toString('base64url');
const headers={authorization:`Bearer ${token}`};

test('health is public but control APIs require operator authentication',async()=>{assert.equal((await app.inject({method:'GET',url:'/health'})).statusCode,200);assert.equal((await app.inject({method:'GET',url:'/v1/control/overview'})).statusCode,401)});
test('operator can create auditable non-destructive change',async()=>{const response=await app.inject({method:'POST',url:'/v1/control/changes',headers,payload:{environment:'development',operation:'disable-capability',capability:'cache',desired:{enabled:false,fallback:'memory'}}});assert.equal(response.statusCode,201);assert.equal(response.json().actorId,'operator-1');assert.equal(response.json().environment,'development')});
test('control API rejects a change scoped to another environment',async()=>{const response=await app.inject({method:'POST',url:'/v1/control/changes',headers,payload:{environment:'production',operation:'disable-capability',capability:'cache',desired:{enabled:false,fallback:'memory'}}});assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'ENVIRONMENT_SCOPE_MISMATCH')});
test('direct infrastructure destroy is rejected',async()=>{const response=await app.inject({method:'POST',url:'/v1/control/changes',headers,payload:{environment:'development',operation:'destroy-infrastructure',capability:'cache',desired:{}}});assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'DESTRUCTIVE_ACTION_REQUIRES_ORCHESTRATOR')});
test('secrets page accepts metadata but rejects plaintext secret values',async()=>{const response=await app.inject({method:'PUT',url:'/v1/control/pages/secrets',headers,payload:{secretValue:'do-not-store'}});assert.equal(response.statusCode,400)});
