import { createAdmin, login, startServer, stopServer } from './helpers.js';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import request from 'supertest';
import { env } from '../src/config/env.js';
import { Session } from '../src/models/index.js';

let app, owner;
before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'readiness@test.local' });
  owner = await login(app, 'readiness@test.local');
});
after(stopServer);

test('required 2FA cannot be bypassed using optional-auth draft reads or previews', async () => {
  const draft = await owner.post('/api/pages').send({ slug: 'private-readiness', title: { en: 'Private audit page' } });
  assert.equal(draft.status, 201);
  const previous = env.REQUIRE_2FA;
  env.REQUIRE_2FA = true;
  try {
    assert.equal((await owner.get('/api/auth/me')).status, 200, 'enrollment stays reachable');
    assert.equal((await owner.get('/api/pages?scope=admin')).status, 401);
    assert.equal((await owner.get(`/api/pages/${draft.body._id}`)).status, 404);
    assert.equal((await owner.get('/api/public/resolve?path=/private-readiness&preview=1')).status, 404);
    assert.equal((await owner.post('/api/pages').send({ slug: 'blocked' })).status, 403);
  } finally { env.REQUIRE_2FA = previous; }
});

test('private subjects cannot be enumerated or read anonymously', async () => {
  const result = await owner.post('/api/subjects').send({ slug: 'private-subject', name: { en: 'Private subject' }, status: 'published', isPublic: false });
  assert.equal(result.status, 201);
  assert.equal((await request(app).get(`/api/subjects/${result.body._id}`)).status, 404);
  const listing = await request(app).get('/api/subjects');
  assert.equal(listing.body.items.some(item => item._id === result.body._id), false);
  assert.equal((await owner.get(`/api/subjects/${result.body._id}`)).status, 200);
});

test('idle and absolute session expiration revoke otherwise valid signed cookies', async () => {
  for (const change of [
    { lastSeenAt: new Date(Date.now() - (env.SESSION_IDLE_MINUTES + 1) * 60000) },
    { expiresAt: new Date(Date.now() - 1000) },
  ]) {
    const session = await login(app, 'readiness@test.local');
    const cookie = session.res.headers['set-cookie'][0].split(';')[0];
    await Session.findOneAndUpdate({ admin: session.res.body.admin._id }, change, { sort: { createdAt: -1 } });
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie)).status, 401);
  }
});

test('untrusted forwarded host cannot authorize cross-origin login requests', async () => {
  const response = await request(app).post('/api/auth/login')
    .set('Origin', 'https://evil.example').set('X-Forwarded-Host', 'evil.example')
    .send({ email: 'readiness@test.local', password: 'Strong#Pass123' });
  assert.equal(response.status, 403);
});

test('hidden canonical reference books stay inaccessible through both route aliases', async () => {
  const result = await owner.post('/api/books').send({ title: { en: 'Private reference' }, author: 'Audit', slug: 'rs-aggarwal', category: 'reference', status: 'published' });
  assert.equal(result.status, 201);
  for (const root of ['reference-solutions', 'reference-books']) {
    assert.equal((await request(app).get(`/api/public/resolve?path=/${root}/rs-aggarwal`)).status, 200);
  }
  for (const update of [{ isVisible: false }, { isVisible: true, status: 'draft' }, { status: 'archived' }, { status: 'published', publishedAt: new Date(Date.now() + 86400000).toISOString() }]) {
    await owner.put(`/api/books/${result.body._id}`).send(update);
    for (const root of ['reference-solutions', 'reference-books']) {
      const hub = await request(app).get(`/api/public/resolve?path=/${root}`);
      assert.equal(hub.body.data.books.some(book => book.slug === 'rs-aggarwal'), false);
      assert.equal((await request(app).get(`/api/public/resolve?path=/${root}/rs-aggarwal`)).status, 404);
      assert.equal((await request(app).get(`/api/public/resolve?path=/${root}/rs-aggarwal/class-10`)).status, 404);
    }
  }
  assert.equal((await request(app).get('/api/public/resolve?path=/reference-solutions/not-a-real-book')).status, 404);
});

test('hidden or future announcements cannot bypass list visibility through detail URLs', async () => {
  const item = await owner.post('/api/announcements').send({ text: { en: 'Private announcement' }, isVisible: false });
  assert.equal(item.status, 201);
  const endpoint = `/api/announcements/${item.body._id}`;
  assert.equal((await request(app).get(endpoint)).status, 404);
  await owner.put(endpoint).send({ isVisible: true, startsAt: new Date(Date.now() + 86400000).toISOString() });
  assert.equal((await request(app).get(endpoint)).status, 404);
  assert.equal((await owner.get(endpoint)).status, 200);
});

test('reference book SEO edits reach the resolved student page in the selected language', async () => {
  const result = await owner.post('/api/books').send({ title: { en: 'SEO book', hi: 'पुस्तक' }, author: 'Audit', slug: 'seo-audit-book', category: 'reference', status: 'published' });
  assert.equal(result.status, 201);
  await request(app).get('/api/public/resolve?path=/reference-solutions/seo-audit-book&lang=en');
  await owner.put(`/api/books/${result.body._id}`).send({ seo: { translations: { en: { title: 'Updated English book SEO', description: 'Updated book description' }, hi: { title: 'पुस्तक का शीर्षक' } } } });
  const english = await request(app).get('/api/public/resolve?path=/reference-solutions/seo-audit-book&lang=en');
  const hindi = await request(app).get('/api/public/resolve?path=/reference-solutions/seo-audit-book&lang=hi');
  assert.equal(english.body.seo.title, 'Updated English book SEO');
  assert.equal(english.body.seo.description, 'Updated book description');
  assert.equal(hindi.body.seo.title, 'पुस्तक का शीर्षक');
});

test('login rate limiter is enforced when test bypass is disabled', async () => {
  process.env.TEST_RATE_LIMIT = '1';
  try {
    for (let index = 0; index < 10; index++) {
      const result = await request(app).post('/api/auth/login').send({ email: 'invalid-rate-limit-email', password: '' });
      assert.equal(result.status, 400);
    }
    const blocked = await request(app).post('/api/auth/login').send({ email: 'invalid-rate-limit-email', password: '' });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers['retry-after']);
  } finally { delete process.env.TEST_RATE_LIMIT; }
});

test('MongoDB operator payloads cannot authenticate and production cookies retain secure flags', async () => {
  const injection = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(injection.status, 400);
  assert.equal(injection.headers['set-cookie'], undefined);
  const previous = env.isProd;
  env.isProd = true;
  try {
    const result = await request(app).post('/api/auth/login').send({ email: 'readiness@test.local', password: 'Strong#Pass123' });
    assert.equal(result.status, 200);
    const cookie = result.headers['set-cookie'][0];
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(cookie.includes(flag));
  } finally { env.isProd = previous; }
});
