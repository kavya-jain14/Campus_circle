import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

test('D1 routes preserve authenticated event and registration changes across runtime restart', { timeout: 90000 }, async () => {
  const root = new URL('../', import.meta.url);
  const persist = await mkdtemp(path.join(tmpdir(), 'campus-d1-test-'));
  const secret = 'isolated-local-test-password';
  let runtime;
  try {
    const bundle = await build({
      stdin: {
        contents: `import * as events from './app/api/events/route.ts';
          import * as admin from './app/api/admin/route.ts';
          import * as registrations from './app/api/registrations/route.ts';
          const routes = {'/api/events':events,'/api/admin':admin,'/api/registrations':registrations};
          export default {fetch(request) {
            const handler = routes[new URL(request.url).pathname]?.[request.method];
            return handler ? handler(request) : new Response('Not found', {status:404});
          }};`,
        resolveDir: root.pathname,
        sourcefile: 'd1-test-worker.ts',
      },
      bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
      external: ['cloudflare:workers'],
    });
    const start = () => new Miniflare({
      modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-05-15',
      bindings: { ADMIN_PASSWORD: secret }, d1Databases: { DB: 'campus-integration' }, d1Persist: persist,
    });
    runtime = start();
    const database = await runtime.getD1Database('DB');
    for (const file of (await readdir(new URL('drizzle/', root))).filter(name => name.endsWith('.sql')).sort()) {
      const sql = await readFile(new URL(`drizzle/${file}`, root), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint').filter(value => value.trim())) {
        await database.prepare(statement).run();
      }
    }
    const request = (resource, { method = 'GET', body, cookie, origin = 'https://campus.test' } = {}) => runtime.dispatchFetch(`https://campus.test/api/${resource}`, {
      method, headers: { origin, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const event = { name: 'Integration workshop', date: '2026-11-01T10:00', venue: 'Lab', category: 'Workshop', description: 'A persistent test event.', featured: 0 };
    const registration = { name: 'Test Student', email: 'student@example.test', college: 'Test College', year: '2', phone: '9876543210' };

    assert.equal((await (await request('events')).json()).length, 4);
    assert.equal((await request('events', { method: 'POST', body: event })).status, 403);
    assert.equal((await request('registrations')).status, 403);
    assert.equal((await request('admin', { method: 'POST', body: { password: secret }, origin: 'https://other.test' })).status, 403);
    assert.equal((await request('admin', { method: 'POST', body: { password: 'wrong' } })).status, 401);
    const login = await request('admin', { method: 'POST', body: { password: secret } });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
    assert.deepEqual(await (await request('admin', { cookie })).json(), { authenticated: true });
    assert.equal((await request('events', { method: 'POST', cookie, body: { ...event, category: 'invalid' } })).status, 400);
    const created = await request('events', { method: 'POST', cookie, body: event });
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.equal((await request('registrations', { method: 'POST', body: { ...registration, eventId: 'missing' } })).status, 404);
    assert.equal((await request('registrations', { method: 'POST', body: { ...registration, eventId: id }, origin: 'https://other.test' })).status, 403);
    assert.equal((await request('registrations', { method: 'POST', body: { ...registration, eventId: id } })).status, 201);
    assert.equal((await request('registrations', { method: 'POST', body: { ...registration, email: registration.email.toUpperCase(), eventId: id } })).status, 409);
    assert.equal((await request('events', { method: 'PUT', cookie, body: { ...event, id, name: 'Updated workshop' } })).status, 200);

    await runtime.dispose();
    runtime = start();
    const events = await (await request('events')).json();
    assert.equal(events.length, 5);
    assert.equal(events.find(value => value.id === id).name, 'Updated workshop');
    const registrations = await (await request('registrations', { cookie })).json();
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].event_name, 'Updated workshop');
    assert.equal(registrations[0].email, registration.email);
    assert.equal((await request('events', { method: 'DELETE', body: { id } })).status, 403);
    assert.equal((await request('events', { method: 'DELETE', cookie, body: { id } })).status, 200);
    assert.deepEqual(await (await request('registrations', { cookie })).json(), []);
    for (const value of await (await request('events')).json()) {
      assert.equal((await request('events', { method: 'DELETE', cookie, body: { id: value.id } })).status, 200);
    }
    await runtime.dispose();
    runtime = start();
    assert.deepEqual(await (await request('events')).json(), [], 'deleted samples must not be reseeded after restart');
    assert.match((await request('admin', { method: 'DELETE' })).headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    await runtime?.dispose();
    await rm(persist, { recursive: true, force: true });
  }
});
