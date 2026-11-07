import { startServer, stopServer, createAdmin, login } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Book } from '../src/models/index.js';
import { env } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let app, owner, subject, cls;
const resolve = path => request(app).get('/api/public/resolve').query({ path, lang: 'en' });
async function create(resource, data) {
  const result = await owner.post(`/api/${resource}`).send(data);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'production-routing@test.local' });
  owner = await login(app, 'production-routing@test.local');
  subject = await create('subjects', { slug: 'maths', name: { en: 'Mathematics' }, isPublic: true, status: 'published' });
  cls = await create('classes', { number: 6, subjects: [subject._id], status: 'published' });
});
after(stopServer);

test('bootstrap and resolver share exact saved book slugs, titles and supported classes', async () => {
  const empty = await request(app).get('/api/public/site');
  assert.deepEqual(empty.body.referenceBooks, [], 'do not invent unavailable reference books');
  const book = await create('books', { slug: 'mathematics-for-class-6', title: { en: 'Custom Class 6 Mathematics' }, category: 'reference', availableClasses: [6, 7], status: 'published' });
  const site = await request(app).get('/api/public/site');
  assert.deepEqual(site.body.referenceBooks.map(b => b.slug), [book.slug]);
  assert.deepEqual(site.body.referenceBooks[0].availableClasses, [6], 'only published classes');
  for (const path of [site.body.referenceBooks[0].url, `${site.body.referenceBooks[0].url}/class-6`]) {
    assert.equal((await resolve(path)).status, 200, path);
  }
  assert.equal((await resolve(`/reference-solutions/${book.slug}/class-7`)).status, 404);
  await owner.put(`/api/books/${book._id}`).send({ title: { en: 'Saved book title' }, availableClasses: [6] });
  assert.equal((await Book.findById(book._id)).title.en, 'Saved book title');
  assert.equal((await request(app).get('/api/public/site')).body.referenceBooks[0].title.en, 'Saved book title');
  assert.equal((await resolve(`/reference-solutions/${book.slug}`)).body.data.book.title.en, 'Saved book title');
  await owner.patch(`/api/books/${book._id}/status`).send({ status: 'draft' });
  assert.deepEqual((await request(app).get('/api/public/site')).body.referenceBooks, []);
  assert.equal((await resolve(`/reference-solutions/${book.slug}`)).status, 404);
});

test('legacy NCERT link resolves only to an existing published maths destination', async () => {
  const legacy = await resolve('/reference-solutions/ncert/class-6');
  assert.equal(legacy.status, 200, JSON.stringify(legacy.body));
  assert.equal(legacy.body.type, 'redirect');
  assert.equal(legacy.body.redirect, '/class-6/maths');
  assert.equal((await resolve(legacy.body.redirect)).status, 200);
  assert.equal((await resolve('/reference-solutions/ncert/class-99')).status, 404);
  assert.equal((await resolve('/reference-solutions/ncert/class-6/missing-chapter')).status, 404);
});

test('reference question permalinks resolve the requested question and reject invented suffixes', async () => {
  const book = await create('books', { slug: 'custom-reference', category: 'reference', title: { en: 'Custom' }, availableClasses: [6], status: 'published' });
  const chapter = await create('chapters', { class: cls._id, subject: subject._id, book: book._id, number: 1, title: { en: 'Numbers' }, status: 'published' });
  const exercise = await create('exercises', { chapter: chapter._id, number: '1.1', status: 'published' });
  const question = await create('questions', { exercise: exercise._id, number: '1', text: { en: '<p>Find $x^2$.</p>' }, status: 'published', solution: { status: 'published', blocks: [{ type: 'explanation', content: { en: '<p>$x^2=4$</p>' } }] } });
  const base = `/reference-solutions/${book.slug}/class-6/${chapter.slug}/${exercise.slug}`;
  const page = await resolve(`${base}/${question.slug}`);
  assert.equal(page.status, 200, JSON.stringify(page.body));
  assert.equal(page.body.type, 'question');
  assert.equal(page.body.data.question._id, question._id);
  assert.match(JSON.stringify(page.body.data.question.solution), /x\^2=4/);
  assert.equal((await resolve(`${base}/missing-question`)).status, 404);
  assert.equal((await resolve(`${base}/${question.slug}/invalid-extra`)).status, 404);
  await owner.patch(`/api/questions/${question._id}/status`).send({ status: 'draft' });
  assert.equal((await resolve(`${base}/${question.slug}`)).status, 404);
});

test('direct HTML loads redirect the legacy NCERT URL and retain genuine 404s', async () => {
  const original = env.CLIENT_DIST_DIR;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-routing-html-'));
  fs.writeFileSync(path.join(temp, 'index.html'), '<html lang="en"><head><!--app-head--></head><body><div id="root"></div></body></html>');
  try {
    env.CLIENT_DIST_DIR = temp;
    const web = createApp();
    const redirect = await request(web).get('/reference-solutions/ncert/class-6');
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.location, '/class-6/maths');
    assert.equal((await request(web).get(redirect.headers.location)).status, 200);
    assert.equal((await request(web).get('/reference-solutions/ncert/class-99')).status, 404);
    assert.equal((await request(web).get('/unknown-page-routing-audit')).status, 404);
    const api = await request(web).get('/api/unknown-endpoint');
    assert.equal(api.status, 404);
    assert.match(api.headers['content-type'], /json/);
  } finally {
    env.CLIENT_DIST_DIR = original;
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('draft and missing API responses cannot be cached across publication', async () => {
  const page = await create('pages', { slug: 'publication-cache-probe', title: { en: 'Cache probe' }, content: { en: '<p>Published content</p>' }, status: 'draft' });
  const draft = await resolve('/publication-cache-probe');
  assert.equal(draft.status, 404);
  assert.equal(draft.headers['cache-control'], 'no-store');
  const published = await owner.patch(`/api/pages/${page._id}/status`).send({ status: 'published' });
  assert.equal(published.status, 200);
  const visible = await resolve('/publication-cache-probe');
  assert.equal(visible.status, 200);
  assert.match(visible.body.data.page.content.en, /Published content/);
  await owner.patch(`/api/pages/${page._id}/status`).send({ status: 'draft' });
  const hidden = await resolve('/publication-cache-probe');
  assert.equal(hidden.status, 404);
  assert.equal(hidden.headers['cache-control'], 'no-store');
  const unauthenticated = await request(app).get('/api/pages?scope=admin');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers['cache-control'], 'no-store');
});
