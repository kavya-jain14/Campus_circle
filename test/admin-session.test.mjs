import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_SESSION_TTL_SECONDS, issueAdminSession, verifyAdminSession } from '../db/admin-session.mjs';

const secret = 'local-test-password-not-a-deployment-secret';
const start = Date.UTC(2026, 9, 17, 12, 0, 0);

test('an admin session is accepted only until its server-enforced eight-hour expiry', async () => {
  const token = await issueAdminSession(secret, start);
  const expiry = start + ADMIN_SESSION_TTL_SECONDS * 1000;
  assert.equal(await verifyAdminSession(token, secret, start), true);
  assert.equal(await verifyAdminSession(token, secret, expiry - 1), true);
  assert.equal(await verifyAdminSession(token, secret, expiry), false);
  assert.equal(await verifyAdminSession(token, secret, expiry + 1000), false);
});

test('editing the expiry or nonce does not extend a signed session', async () => {
  const token = await issueAdminSession(secret, start);
  const parts = token.split('.');
  parts[1] = String(Number(parts[1]) + ADMIN_SESSION_TTL_SECONDS);
  assert.equal(await verifyAdminSession(parts.join('.'), secret, start), false);
  parts[1] = token.split('.')[1];
  parts[2] = parts[2].replace(/.$/, (char) => char === 'a' ? 'b' : 'a');
  assert.equal(await verifyAdminSession(parts.join('.'), secret, start), false);
});

test('separate logins have distinct sessions and password changes invalidate them', async () => {
  const first = await issueAdminSession(secret, start);
  const second = await issueAdminSession(secret, start);
  assert.notEqual(first, second);
  assert.equal(await verifyAdminSession(second, secret, start), true);
  assert.equal(await verifyAdminSession(first, `${secret}-changed`, start), false);
});

test('missing, malformed, legacy and unconfigured sessions are rejected safely', async () => {
  const token = await issueAdminSession(secret, start);
  for (const value of [undefined, null, '', [], {}, '0'.repeat(64), `${token}.extra`, token.slice(0, -1), token.replace(/.$/, 'z')]) {
    assert.equal(await verifyAdminSession(value, secret, start), false);
  }
  assert.equal(await verifyAdminSession(token, '', start), false);
  assert.equal(await verifyAdminSession(token, undefined, start), false);
  await assert.rejects(issueAdminSession('', start));
});
