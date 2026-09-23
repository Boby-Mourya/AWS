import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWebSessionCookie, hasFeature, hasPermission, webSessionCookieOptions, WEB_SESSION_COOKIE_NAME } from '../apps/web/src/core/auth/session.ts';

test('web session cookie is HMAC signed when a server secret is supplied',()=>{
  const session={userId:'u1',tenantId:'t1',workspaceId:'w1',permissions:['feature:documents'],features:{documents:true}};
  const cookie=encodeWebSessionCookie(session,'01234567890123456789012345678901');
  const [payload,signature]=cookie.split('.');
  assert.ok(payload&&signature);
  assert.ok(signature.length>=40);
  assert.equal(hasPermission(session,'feature:documents'),true);
  assert.equal(hasFeature(session,'documents'),true);
  assert.equal(hasFeature(session,'chat'),false);
});

test('web session policy uses host-only secure httpOnly same-site cookie attributes',()=>{
  const options=webSessionCookieOptions(3600);
  assert.equal(WEB_SESSION_COOKIE_NAME,'__Host-session-context');
  assert.equal(options.httpOnly,true);
  assert.equal(options.secure,true);
  assert.equal(options.sameSite,'lax');
  assert.equal(options.path,'/');
  assert.equal(options.maxAge,3600);
  assert.equal('domain' in options,false);
});
