import { startServer, stopServer, createAdmin, login, PNG_1x1 } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app, owner, editor, cls, subject, image;
const read = (path, session = '2026-27') => request(app).get('/api/public/resolve').query({ path, session, lang: 'en' });
async function create(resource, body) {
  const response = await owner.post(`/api/${resource}`).send(body);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}
before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'workflows@test.local' });
  await createAdmin({ email: 'editor@test.local', role: 'editor' });
  owner = await login(app, 'workflows@test.local');
  editor = await login(app, 'editor@test.local');
  subject = await create('subjects', { name: { en: 'Mathematics' }, slug: 'maths', isPublic: true, status: 'published' });
  cls = await create('classes', { number: 9, name: { en: 'Class 9' }, subjects: [subject._id], status: 'published' });
  const upload = await owner.post('/api/media/upload').attach('files', PNG_1x1, { filename: 'diagram.png', contentType: 'image/png' });
  assert.equal(upload.status, 201);
  image = upload.body.items[0];
});
after(stopServer);

for (const slug of ['rs-aggarwal', 'rd-sharma', 'kc-sinha', 'ml-aggarwal']) {
  test(`${slug}: draft, preview, independent solution publication, edit and session isolation`, async () => {
    const book = await create('books', { title: { en: slug }, slug, category: 'reference', availableClasses: [9], status: 'published' });
    const chapter = await create('chapters', { class: cls._id, subject: subject._id, book: book._id, number: 1, title: { en: `${slug} current` }, academicSession: '2026-27', status: 'published' });
    await create('chapters', { class: cls._id, subject: subject._id, book: book._id, number: 1, title: { en: `${slug} previous` }, academicSession: '2025-26', status: 'published' });
    const exercise = await create('exercises', { chapter: chapter._id, number: '1.1', status: 'published' });
    const question = await create('questions', {
      exercise: exercise._id, number: '1', text: { en: '<p>Find x: $x+1=2$</p>', hi: '<p>हल कीजिए</p>' },
      status: 'draft', attachments: [{ media: image._id }],
      solution: { status: 'draft', blocks: [], methods: [{ title: { en: 'Standard method' }, blocks: [{ type: 'explanation', content: { en: '<p>x = 1</p>' } }] }] },
    });
    const path = `/reference-solutions/${slug}/class-9/${chapter.slug}/${exercise.slug}`;
    assert.equal((await read(path)).body.data.questions.length, 0);
    assert.equal((await owner.get('/api/public/resolve').query({ path, preview: 1, lang: 'en' })).body.data.questions.length, 1);
    assert.equal((await owner.patch(`/api/questions/${question._id}/status`).send({ status: 'published' })).status, 200);
    let page = await read(path);
    assert.equal(page.body.data.questions[0].solution, null);
    assert.equal((await request(app).get(`/api/questions/${question._id}?lang=en`)).body.solution, null);
    assert.equal((await editor.patch(`/api/solutions/${question.solution._id}/status`).send({ status: 'published' })).status, 403);
    assert.equal((await owner.patch(`/api/solutions/${question.solution._id}/status`).send({ status: 'published' })).status, 200);
    page = await read(path);
    assert.equal(page.body.data.questions[0].solution.methods.length, 1);
    assert.equal((await owner.put(`/api/questions/${question._id}`).send({ text: { en: '<p>Updated question</p>' } })).status, 200);
    assert.match(JSON.stringify((await read(path)).body), /Updated question/);
    assert.match((await owner.get(`/api/questions/${question._id}`)).body.text.hi, /हल/);
    const previous = await read(`/reference-solutions/${slug}/class-9`, '2025-26');
    assert.match(JSON.stringify(previous.body.data.chapters), /previous/);
    assert.doesNotMatch(JSON.stringify(previous.body.data.chapters), /current/);
    assert.equal((await read(`/reference-solutions/${slug}/class-10`)).status, 404);
    assert.equal((await read(`${path}-missing`)).status, 404);
    await owner.patch(`/api/solutions/${question.solution._id}/status`).send({ status: 'archived' });
    assert.equal((await read(path)).body.data.questions[0].solution, null);
  });
}

for (const [type, route] of [['previous_year_paper', '/study-materials/previous-year-questions/class-9'], ['sample_paper', '/study-materials/cbse-sample-papers/class-9'], ['syllabus', '/study-materials/maths-syllabus/class-9']]) {
  test(`${type}: uploaded media, draft preview, publish, update and session isolation`, async () => {
    const body = { title: { en: `Workflow ${type}` }, class: cls._id, subject: subject._id, academicSession: '2026-27', resourceType: type, thumbnail: image._id, status: 'draft' };
    const resource = await create('resources', body);
    assert.doesNotMatch(JSON.stringify((await read(route)).body), new RegExp(`Workflow ${type}`));
    assert.match(JSON.stringify((await owner.get('/api/public/resolve').query({ path: route, preview: 1, lang: 'en' })).body), new RegExp(`Workflow ${type}`));
    await owner.patch(`/api/resources/${resource._id}/status`).send({ status: 'published' });
    assert.match(JSON.stringify((await read(route)).body), new RegExp(`Workflow ${type}`));
    assert.doesNotMatch(JSON.stringify((await read(route, '2025-26')).body), new RegExp(`Workflow ${type}`));
    await owner.put(`/api/resources/${resource._id}`).send({ title: { en: `Updated ${type}` } });
    assert.match(JSON.stringify((await read(route)).body), new RegExp(`Updated ${type}`));
  });
}

for (const [category, route] of [['ncert_notes', '/notes/ncert-chapter-wise-notes/class-9'], ['formula_sheet', '/notes/maths-formula-sheets/class-9']]) {
  test(`${category}: draft preview, publish, update and session isolation`, async () => {
    const note = await create('notes', { title: { en: `Workflow ${category}` }, class: cls._id, subject: subject._id, category, academicSession: '2026-27', content: { en: '<p>$a^2+b^2$</p>' }, attachments: [{ media: image._id }], status: 'draft' });
    assert.doesNotMatch(JSON.stringify((await read(route)).body), new RegExp(`Workflow ${category}`));
    assert.match(JSON.stringify((await owner.get('/api/public/resolve').query({ path: route, preview: 1, lang: 'en' })).body), new RegExp(`Workflow ${category}`));
    await owner.patch(`/api/notes/${note._id}/status`).send({ status: 'published' });
    assert.match(JSON.stringify((await read(route)).body), new RegExp(`Workflow ${category}`));
    assert.doesNotMatch(JSON.stringify((await read(route, '2025-26')).body), new RegExp(`Workflow ${category}`));
    await owner.put(`/api/notes/${note._id}`).send({ title: { en: `Updated ${category}` } });
    assert.match(JSON.stringify((await read(route)).body), new RegExp(`Updated ${category}`));
  });
}

test('standalone pages do not collide on an empty landing key', async () => {
  await create('pages', { title: { en: 'First standalone' }, landingKey: '' });
  await create('pages', { title: { en: 'Second standalone' }, landingKey: '' });
});
