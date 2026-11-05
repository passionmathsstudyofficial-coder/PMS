import { createAdmin, login, PASSWORD, startServer, stopServer } from './helpers.js';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { SiteSettings, User, PasswordRecovery, StudentSession } from '../src/models/index.js';
import { driveDocument, normalizeDocumentUrl } from '../../shared/documents.js';
let app, owner, cls, subject, chapter, exercise, question;
const mail = [];
const title = { en: 'Audit lesson', hi: 'जाँच पाठ' };
const create = async (resource, body) => {
  const res = await owner.post('/api/' + resource).send(body);
  assert.equal(res.status, 201, resource + ': ' + JSON.stringify(res.body)); return res.body;
};
before(async () => {
  await startServer();
  app = createApp({ sendRecoveryEmail: async message => mail.push(message) });
  await createAdmin({ email: 'audit@test.local' });
  await createAdmin({ email: 'staff@test.local', role: 'admin' });
  owner = await login(app, 'audit@test.local');
  subject = await create('subjects', { name: title, slug: 'audit-maths', status: 'published', isPublic: true });
  cls = await create('classes', { number: 10, name: title, status: 'published', subjects: [subject._id] });
  chapter = await create('chapters', { class: cls._id, subject: subject._id, number: 1, title, status: 'published' });
  exercise = await create('exercises', { chapter: chapter._id, number: '1.1', title, status: 'published' });
  question = await create('questions', { exercise: exercise._id, number: '1', text: title, status: 'published', solution: { blocks: [{ type: 'formula', latex: '\\frac{1}{2}' }] } });
});
after(stopServer);

// Warm anonymous caches before each write, then verify exact authored values rather than only HTTP success.
for (const [resource, field] of [
  ['classes', 'name'], ['subjects', 'name'], ['chapters', 'title'], ['exercises', 'title'],
  ['questions', 'text'], ['topics', 'title'], ['resources', 'title'], ['books', 'title'],
  ['notes', 'content'], ['important-questions', 'text'], ['pages', 'content'],
]) test(`${resource}: published edits reach anonymous readers and preserve the other language`, async () => {
  const existing = { classes: cls, subjects: subject, chapters: chapter, exercises: exercise, questions: question }[resource];
  const item = existing || await create(resource, { ...bodies[resource](), status: 'published' });
  const endpoint = `/api/${resource}/${item._id}`;
  assert.equal((await request(app).get(`${endpoint}?lang=en`)).status, 200);
  const revision = (await request(app).get('/api/public/revision')).body.revision;
  const english = `Updated ${resource} content`;
  const saved = await owner.put(endpoint).send({ [field]: { en: english } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body[field].en, english);
  assert.equal(saved.body[field].hi, title.hi);
  for (const lang of ['en', 'hi']) {
    const read = await request(app).get(`${endpoint}?lang=${lang}`);
    assert.equal(read.status, 200);
    assert.equal(read.body[field][lang], lang === 'en' ? english : title.hi);
    assert.equal(read.body[field][lang === 'en' ? 'hi' : 'en'], undefined);
  }
  assert.notEqual((await request(app).get('/api/public/revision')).body.revision, revision);
  if (resource === 'pages') {
    const path = `/api/public/resolve?path=/${item.slug}&lang=en`;
    assert.equal((await request(app).get(path)).body.data.page.content.en, english);
    await owner.put(endpoint).send({ content: { en: '<p>Second saved page edit</p>' } });
    assert.equal((await request(app).get(path)).body.data.page.content.en, '<p>Second saved page edit</p>');
    await owner.patch(`${endpoint}/status`).send({ status: 'draft' });
    assert.equal((await request(app).get(path)).status, 404);
  }
  if (!existing) assert.equal((await owner.del(endpoint)).status, 200);
});

test('reference menu excludes archived, scheduled, draft and hidden books', async () => {
  const item = await create('books', { title, author: 'Audit Author', slug: 'visibility-audit-book', category: 'reference', status: 'published' });
  const appears = async () => (await request(app).get('/api/public/site?lang=en')).body.referenceBooks.some(book => book._id === item._id);
  assert.equal(await appears(), true);
  for (const update of [
    { status: 'archived' }, { status: 'draft' },
    { status: 'published', publishedAt: new Date(Date.now() + 86400000).toISOString() },
    { publishedAt: new Date(Date.now() - 1000).toISOString(), isVisible: false },
  ]) {
    assert.equal((await owner.put(`/api/books/${item._id}`).send(update)).status, 200);
    assert.equal(await appears(), false, JSON.stringify(update));
  }
  await owner.put(`/api/books/${item._id}`).send({ isVisible: true });
  assert.equal(await appears(), true);
  await owner.del(`/api/books/${item._id}`);
});

test('a private canonical reference book suppresses its default menu entry', async () => {
  const initial = (await request(app).get('/api/public/site?lang=en')).body.referenceBooks[0];
  assert.ok(initial?.slug);
  const item = await create('books', { title, author: 'Audit Author', slug: initial.slug, category: 'reference', status: 'published' });
  for (const update of [{ isVisible: false }, { isVisible: true, status: 'archived' }, { status: 'draft' }]) {
    await owner.put(`/api/books/${item._id}`).send(update);
    const books = (await request(app).get('/api/public/site?lang=en')).body.referenceBooks;
    assert.equal(books.some(book => book.slug === initial.slug), false);
  }
  await owner.del(`/api/books/${item._id}`);
});

test('advertisement edits revalidate and disabled slots stop serving code', async () => {
  await owner.put('/api/site-settings').send({ ads: { enabled: true } });
  const item = await create('ad-slots', { name: 'Fresh ad', placement: 'belowHeader', isEnabled: true, code: '<p>Original ad</p>' });
  const path = `/api/public/ad-frame/${item._id}`;
  const before = await request(app).get(path);
  assert.equal(before.status, 200);
  assert.match(before.headers['cache-control'], /no-cache|no-store/);
  await owner.put(`/api/ad-slots/${item._id}`).send({ code: '<p>Updated ad</p>' });
  assert.match((await request(app).get(path)).text, /Updated ad/);
  await owner.put(`/api/ad-slots/${item._id}`).send({ isEnabled: false });
  assert.equal((await request(app).get(path)).status, 404);
  await owner.del(`/api/ad-slots/${item._id}`);
});

for (const [resource, field, path, collection] of [
  ['announcements', 'text', '/api/public/site?lang=en', 'announcements'],
  ['sections', 'title', '/api/public/home?lang=en', 'sections'],
]) test(`${resource}: warmed student responses refresh after edits and visibility changes`, async () => {
  const item = await create(resource, { ...bodies[resource](), status: 'published' });
  const read = async () => (await request(app).get(path)).body[collection].find(value => value._id === item._id);
  assert.ok(await read());
  await owner.put(`/api/${resource}/${item._id}`).send({ [field]: { en: 'Updated student banner' } });
  assert.equal((await read())[field].en, 'Updated student banner');
  await owner.put(`/api/${resource}/${item._id}`).send({ isVisible: false });
  assert.equal(await read(), undefined);
  await owner.del(`/api/${resource}/${item._id}`);
});

test('header toggles, label and configured URL persist independently and invalidate public bootstrap cache', async () => {
  await request(app).get('/api/public/site?lang=en');
  const prior = (await SiteSettings.getSingleton()).toObject();
  const header = { sticky: false, showSearch: false, showLanguageSwitch: false, showThemeSwitch: false, showLoginButton: true, loginUrl: '/login?source=header', loginLabel: { en: 'Student sign in', hi: 'विद्यार्थी प्रवेश' }, showAnnouncement: false, showClassPills: false };
  assert.equal((await owner.put('/api/site-settings').send({ header })).status, 200);
  const bootstrap = await request(app).get('/api/public/site?lang=en');
  for (const [key, value] of Object.entries(header)) if (key !== 'loginLabel') assert.deepEqual(bootstrap.body.settings.header[key], value, key);
  assert.equal(bootstrap.body.settings.header.loginLabel.en, header.loginLabel.en);
  assert.equal(bootstrap.body.settings.header.loginLabel.hi, undefined);
  await owner.put('/api/site-settings').send({ header: { showLoginButton: false } });
  const persisted = await request(createApp()).get('/api/public/site?lang=en');
  assert.equal(persisted.body.settings.header.showLoginButton, false);
  assert.equal(persisted.body.settings.header.loginUrl, header.loginUrl);
  assert.deepEqual((await SiteSettings.getSingleton()).toObject().contact, prior.contact);
  assert.equal((await owner.put('/api/site-settings').send({ header: { loginUrl: 'javascript:alert(1)' } })).status, 400);
});

test('navigation ordering, visibility and child links reach public site after save/restart', async () => {
  const items = [{ label: title, type: 'column', children: [{ label: title, url: '/language-proof' }, { label: title, url: '/hidden', isVisible: false }] }, { label: title, url: '/second' }, { label: title, url: '/hidden', isVisible: false }];
  assert.equal((await owner.put('/api/navigation/header').send({ items })).status, 200);
  const site = await request(createApp()).get('/api/public/site?lang=en');
  assert.equal(site.body.navigationConfigured.header, true);
  assert.equal(site.body.navigation.header.length, 2);
  assert.equal(site.body.navigation.header[0].children.length, 1);
  assert.equal(site.body.navigation.header[1].url, '/second');
  assert.equal((await owner.put('/api/navigation/unknown').send({ items: [] })).status, 404);
});

const bodies = {
  topics: () => ({ chapter: chapter._id, class: cls._id, subject: subject._id, title, slug: 'audit-topic', number: 1 }),
  resources: () => ({ class: cls._id, subject: subject._id, chapter: chapter._id, title, fileUrl: 'https://example.com/study.pdf' }),
  books: () => ({ class: cls._id, subject: subject._id, title, author: 'Audit Author', slug: 'audit-book' }),
  notes: () => ({ class: cls._id, subject: subject._id, chapter: chapter._id, title, slug: 'audit-note', content: title }),
  'important-questions': () => ({ class: cls._id, subject: subject._id, text: title, slug: 'audit-important' }),
  templates: () => ({ name: 'Audit template', kind: 'solution', blocks: [{ type: 'formula', latex: 'x^2' }] }),
  announcements: () => ({ text: title, isActive: true }),
  sections: () => ({ type: 'text', page: 'home', name: 'Audit section', title }),
  pages: () => ({ slug: 'audit-page', title, content: title }),
  'related-content': () => ({ sourceType: 'Question', source: question._id, items: [{ targetType: 'Url', label: title, url: '/search' }] }),
  'ad-slots': () => ({ name: 'Audit ad', placement: 'belowHeader', code: '', isEnabled: true }),
  videos: () => ({ provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title }),
};
for (const [resource, body] of Object.entries(bodies)) test(`${resource}: create/read/edit/filter/paginate/persist/delete via authenticated API`, async () => {
  const item = await create(resource, { ...body(), status: 'draft' });
  const read = await owner.get(`/api/${resource}/${item._id}`);
  assert.equal(read.status, 200);
  const edited = await owner.put(`/api/${resource}/${item._id}`).send({ sortOrder: 7 });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  const list = await owner.get(`/api/${resource}?scope=admin&page=1&limit=1`);
  assert.equal(list.status, 200); assert.ok(list.body.total >= 1); assert.equal(list.body.items.length, 1);
  if (resource !== 'related-content') {
    const filtered = await owner.get(`/api/${resource}?scope=admin&q=__no_such_audit_record__`);
    assert.equal(filtered.status, 200); assert.equal(filtered.body.items.length, 0, resource + ' search');
  }
  const Model = Object.values(mongoose.models).find(Model => Model.collection.name === ({ 'related-content': 'relatedcontents', 'ad-slots': 'adslots', 'important-questions': 'importantquestions', sections: 'sections' }[resource] || resource));
  if (Model) assert.ok(await Model.exists({ _id: item._id }));
  assert.equal((await owner.del(`/api/${resource}/${item._id}`)).status, 200);
  assert.equal((await owner.get(`/api/${resource}/${item._id}`)).status, 404);
});

test('all website setting sections preserve unrelated values through partial saves and public refresh', async () => {
  const values = { brand: { shortName: 'Audit' }, footer: { description: title }, contact: { email: 'school@example.com' }, social: [{ platform: 'youtube', url: 'https://www.youtube.com/@school' }], language: { default: 'en' }, terminology: [{ key: 'chapter', ...title }], theme: { defaultMode: 'dark' }, seo: { defaultTitle: title }, ads: { enabled: true } };
  for (const [key, value] of Object.entries(values)) {
    const result = await owner.put('/api/site-settings').send({ [key]: value });
    assert.equal(result.status, 200, key + ': ' + JSON.stringify(result.body));
    const reload = await owner.get('/api/site-settings?scope=admin');
    assert.equal(reload.status, 200); assert.ok(reload.body[key]);
  }
  const persisted = await SiteSettings.getSingleton();
  assert.equal(persisted.brand.shortName, 'Audit'); assert.equal(persisted.contact.email, 'school@example.com');
  const publicSite = await request(createApp()).get('/api/public/site?lang=hi');
  assert.equal(publicSite.body.settings.brand.shortName, 'Audit'); assert.equal(publicSite.body.settings.footer.description.hi, title.hi);
});

test('Google Drive sharing variants normalize safely; malformed links fail and public resource persists', async () => {
  const id = 'audit_FILE-12345';
  for (const url of [`https://drive.google.com/file/d/${id}/view?usp=sharing`, `https://drive.google.com/open?id=${id}`, `https://drive.google.com/uc?id=${id}&export=download`]) {
    const descriptor = driveDocument(url); assert.equal(descriptor.preview, `https://drive.google.com/file/d/${id}/preview`);
    assert.equal(normalizeDocumentUrl(url), descriptor.open);
  }
  for (const url of ['javascript:alert(1)', 'https://drive.google.com/file/d/!', 'https://drive.google.com/open?id=bad']) assert.throws(() => normalizeDocumentUrl(url));
  assert.equal(driveDocument('https://drive.google.com.evil.example/file/d/audit_FILE-12345/view'), null);
  const item = await create('resources', { title, class: cls._id, chapter: chapter._id, externalUrl: `https://drive.google.com/open?id=${id}`, status: 'published' });
  const read = await request(app).get(`/api/resources/${item._id}?lang=en`);
  assert.equal(read.body.fileUrl, `https://drive.google.com/file/d/${id}/view`);
  assert.equal((await owner.put(`/api/resources/${item._id}`).send({ fileUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await request(app).get('/api/health')).headers['content-security-policy'].includes('https://drive.google.com'), true);
});

test('dangling/cross-class relationships and orphaning parent deletes are rejected; draft parents hide children', async () => {
  const invalid = await owner.post('/api/resources').send({ title, class: new mongoose.Types.ObjectId(), status: 'published' });
  assert.equal(invalid.status, 400);
  const other = await create('classes', { number: 11, name: title, status: 'published' });
  assert.equal((await owner.post('/api/resources').send({ title, class: other._id, chapter: chapter._id })).status, 400);
  assert.equal((await owner.del(`/api/classes/${cls._id}`)).status, 409);
  assert.equal((await owner.del(`/api/chapters/${chapter._id}`)).status, 409);
  await owner.patch(`/api/chapters/${chapter._id}/status`).send({ status: 'draft' });
  assert.equal((await request(app).get(`/api/exercises/${exercise._id}`)).status, 404);
  const list = await request(app).get(`/api/exercises?chapter=${chapter._id}`);
  assert.equal(list.body.items.length, 0);
  await owner.patch(`/api/chapters/${chapter._id}/status`).send({ status: 'published' });
  assert.equal((await request(app).get(`/api/exercises/${exercise._id}`)).status, 200);
});

test('student registration, reload, login, logout, CSRF, role isolation and owner management are real', async () => {
  const student = request.agent(app);
  const body = { name: 'Audit Student', email: 'learner@test.local', password: PASSWORD, role: 'superadmin' };
  assert.equal((await student.post('/api/student/auth/register').send({ ...body, password: 'weak' })).status, 400);
  const registered = await student.post('/api/student/auth/register').send(body);
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  assert.equal(registered.body.user.passwordHash, undefined); assert.equal(registered.body.user.role, undefined);
  assert.match(registered.headers['set-cookie'][0], /HttpOnly/);
  assert.equal((await student.get('/api/student/auth/me')).status, 200);
  assert.equal((await student.get('/api/auth/me')).status, 401);
  assert.equal((await student.post('/api/classes').send({ number: 12 })).status, 401);
  assert.equal((await student.get('/api/students')).status, 401);
  assert.equal((await student.post('/api/student/auth/logout')).status, 403);
  assert.equal((await student.post('/api/student/auth/logout').set('x-csrf-token', registered.body.csrfToken)).status, 200);
  assert.equal((await student.get('/api/student/auth/me')).status, 401);
  assert.equal((await student.post('/api/student/auth/login').send({ email: body.email, password: 'Wrong#Pass123' })).status, 401);
  assert.equal((await student.post('/api/student/auth/login').send(body)).status, 200);
  const staff = await login(app, 'staff@test.local');
  assert.equal((await staff.get('/api/students')).status, 403);
  const listing = await owner.get('/api/students?q=learner&limit=1'); assert.equal(listing.body.total, 1); assert.equal(listing.body.items[0].passwordHash, undefined);
  const user = await User.findOne({ email: body.email });
  assert.equal((await owner.put(`/api/students/${user._id}`).send({ isActive: false })).status, 200);
  assert.equal(await StudentSession.countDocuments({ user: user._id }), 0);
  assert.equal((await student.get('/api/student/auth/me')).status, 401);
  await owner.put(`/api/students/${user._id}`).send({ isActive: true });
  assert.equal((await owner.get('/api/dashboard')).body.totals.students, 1);
});

test('admin/student recovery uses hashed expiring single-use tokens, revokes sessions and handles mail errors honestly', async () => {
  for (const [kind, email, prefix] of [['admin', 'audit@test.local', '/api/auth'], ['student', 'learner@test.local', '/api/student/auth']]) {
    const unknown = await request(app).post(`${prefix}/forgot-password`).send({ email: 'unknown@test.local' });
    assert.equal(unknown.status, 200);
    const before = mail.length;
    assert.equal((await request(app).post(`${prefix}/forgot-password`).send({ email, language: 'hi' })).status, 200);
    assert.equal(mail.length, before + 1);
    const url = new URL(mail.at(-1).url); const token = url.searchParams.get('token');
    const record = await PasswordRecovery.findOne({ kind }); assert.ok(record); assert.notEqual(record.tokenHash, token);
    const password = 'Changed#Pass321';
    assert.equal((await request(app).post(`${prefix}/reset-password`).send({ token, password: 'weak' })).status, 400);
    assert.equal((await request(app).post(`${prefix}/reset-password`).send({ token, password })).status, 200);
    assert.equal((await request(app).post(`${prefix}/reset-password`).send({ token, password })).status, 400);
    const loginResponse = await request(app).post(`${prefix}/login`).send({ email, password }); assert.equal(loginResponse.status, 200, kind);
    assert.equal((await request(app).post(`${prefix}/login`).send({ email, password: PASSWORD })).status, 401);
  }
  assert.equal((await owner.get('/api/auth/me')).status, 401);
  const brokenMail = createApp({ sendRecoveryEmail: async () => { throw new Error('provider unavailable'); } });
  assert.equal((await request(brokenMail).post('/api/student/auth/forgot-password').send({ email: 'learner@test.local' })).status, 500);
  assert.equal(await PasswordRecovery.countDocuments(), 0);
  const expired = await PasswordRecovery.create({ kind: 'student', account: (await User.findOne())._id, tokenHash: 'expired-hash', expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request(app).post('/api/student/auth/reset-password').send({ token: 'x'.repeat(43), password: PASSWORD })).status, 400);
  await expired.deleteOne();
});

test('unconfigured credentialed origins, malformed IDs and invalid payloads fail without server errors', async () => {
  const cors = await request(app).get('/api/health').set('Origin', 'https://untrusted.vercel.app');
  assert.equal(cors.headers['access-control-allow-origin'], undefined);
  const rejected = await request(app).post('/api/student/auth/login').set('Origin', 'https://untrusted.vercel.app').send({ email: 'learner@test.local', password: PASSWORD });
  assert.equal(rejected.status, 403);
  assert.equal((await request(app).get('/api/chapters/not-an-id')).status, 400);
});

test('editors cannot modify already-published content or published solutions by omitting status', async () => {
  await createAdmin({ email: 'audit-editor@test.local', role: 'editor' });
  const editor = await login(app, 'audit-editor@test.local');
  assert.equal((await editor.put(`/api/questions/${question._id}`).send({ text: { en: 'Unauthorized edit' } })).status, 403);
  const solution = await mongoose.model('Solution').findOne({ question: question._id });
  assert.equal((await editor.put(`/api/solutions/${solution._id}`).send({ blocks: [{ type: 'formula', latex: 'x=99' }] })).status, 403);
});
