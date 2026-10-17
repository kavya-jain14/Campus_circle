export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

async function sessionKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function issueAdminSession(secret, now = Date.now()) {
  if (typeof secret !== 'string' || !secret) throw new Error('Admin access has not been configured.');
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(secret), encoder.encode(`campus-circle-admin:${payload}`));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${payload}.${hex}`;
}

export async function verifyAdminSession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || typeof secret !== 'string' || !secret) return false;
  const match = /^v1\.(\d{10,12})\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Math.floor(now / 1000)) return false;
  const payload = token.slice(0, token.lastIndexOf('.'));
  const signature = Uint8Array.from(match[3].match(/../g), (byte) => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', await sessionKey(secret), signature, encoder.encode(`campus-circle-admin:${payload}`));
}
