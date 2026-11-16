import { startServer, stopServer, createAdmin, login, PNG_1x1 } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app, owner, cls, subject, media;
async function create(resource, payload) {
  const res = await owner.post(`/api/content/${resource}`).send(payload);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}
const read = (path, session = '2026-27') => request(app).get('/api/public/resolve').query({ path, session, lang: 'en' });
before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'study-menu@test.local' });
  owner = await login(app, 'study-menu@test.local');
  subject = await create('subjects', { name: { en: 'Maths' }, slug: 'maths', isPublic: true, status: 'published' });
  cls = await create('classes', { number: 10, name: { en: 'Class 10' }, subjects: [subject._id], status: 'published' });
  const upload = await owner.post('/api/media/upload').attach('files', PNG_1x1, { filename: 'menu.png', contentType: 'image/png' });
  assert.equal(upload.status, 201);
  media = upload.body.items[0];
});
after(stopServer);

const cases = [
  ['study-materials/previous-year-questions', 'important-questions', 'pyq', 'solvedQuestions'],
  ['study-materials/cbse-sample-papers', 'important-questions', 'sample_paper', 'questions'],
  ['study-materials/cbse-extra-questions', 'important-questions', 'extra_questions', 'questions'],
  ['study-materials/vvi-questions', 'important-questions', 'vvi', 'questions'],
  ['study-materials/maths-syllabus', 'resources', 'syllabus', 'resources'],
  ['notes/ncert-chapter-wise-notes', 'notes', 'ncert_notes', 'notes'],
  ['notes/maths-formula-sheets', 'notes', 'formula_sheet', 'formulaNotes'],
  ['notes/rs-aggarwal-formulas-notes', 'notes', 'rs_aggarwal_notes', 'notes', 'rs-aggarwal'],
  ['notes/rd-sharma-formulas-notes', 'notes', 'rd_sharma_notes', 'notes', 'rd-sharma'],
  ['notes/kc-sinha-formulas-notes', 'notes', 'kc_sinha_notes', 'notes', 'kc-sinha-maths'],
  ['notes/vvi-questions-short-notes', 'notes', 'vvi_short_notes', 'shortNotes'],
];

for (const [key, resource, category, collection, bookSlug] of cases) {
  test(`${key}: admin create, update, publication, media, session and landing edits reach students`, async () => {
    const book = bookSlug ? await create('books', { title: { en: bookSlug }, slug: bookSlug, category: 'reference', availableClasses: [10], status: 'published' }) : null;
    const payload = {
      title: { en: `${category} original`, hi: 'मूल सामग्री' },
      class: cls._id, subject: subject._id, academicSession: '2026-27', status: 'draft',
      ...(book ? { book: book._id } : {}),
      ...(resource === 'resources' ? { resourceType: category, fileUrl: 'https://example.com/syllabus.pdf' } : {
        category, pdfUrl: 'https://example.com/menu.pdf', image: media._id,
        attachments: [{ media: media._id }],
        formulas: [{ title: { en: 'Formula' }, latex: 'a^2+b^2' }],
        ...(resource === 'notes' ? { introduction: { en: '<p>Introduction</p>' }, content: { en: '<p>Original notes</p>' } } : {
          text: { en: '<p>Original question</p>' }, answer: { en: '<p>Original answer</p>' },
          blocks: [{ type: 'explanation', content: { en: '<p>Original solution</p>' } }],
        }),
      }),
    };
    const record = await create(resource, payload);
    const path = `/${key}/class-10`;
    const find = res => {
      assert.equal(res.status, 200, JSON.stringify(res.body));
      return res.body.data[collection].find(item => item._id === record._id);
    };
    assert.equal(find(await read(path)), undefined, 'Draft must be hidden');
    assert.equal((await owner.patch(`/api/content/${resource}/${record._id}/status`).send({ status: 'published' })).status, 200);
    assert.ok(find(await read(path)), 'Published record must appear on its menu page');
    const updated = await owner.put(`/api/content/${resource}/${record._id}`).send({ title: { en: `${category} updated`, hi: 'अपडेट सामग्री' } });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    const visible = find(await read(path));
    assert.equal(visible.title.en, `${category} updated`);
    const hindi = await request(app).get('/api/public/resolve').query({ path, session: '2026-27', lang: 'hi' });
    assert.equal(find(hindi).title.hi, 'अपडेट सामग्री');
    if (resource !== 'resources') {
      assert.equal(visible.image.url, media.url);
      assert.equal(visible.attachments[0].media.url, media.url);
      assert.equal(visible.pdfUrl, payload.pdfUrl);
      assert.equal(visible.formulas[0].latex, 'a^2+b^2');
    }
    assert.equal(find(await read(path, '2025-26')), undefined, 'Other sessions must be isolated');

    const landing = await owner.post('/api/content/landing-pages/ensure').send({ landingKey: key });
    assert.equal(landing.status, 200);
    const edited = await owner.put(`/api/content/pages/${landing.body.item._id}`).send({ hero: { title: { en: `${category} custom heading` } }, status: 'published' });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal((await read(`/${key}`)).body.data.landingPage.hero.title.en, `${category} custom heading`);
    if (bookSlug === 'kc-sinha-maths') {
      assert.equal(find(await read('/notes/kc-sinha-maths-formulas-notes/class-10'))._id, record._id);
      assert.equal((await read('/notes/kc-sinha-maths-formulas-notes')).body.data.landingPage.hero.title.en, `${category} custom heading`);
    }
    assert.equal((await owner.patch(`/api/content/${resource}/${record._id}/status`).send({ status: 'archived' })).status, 200);
    assert.equal(find(await read(path)), undefined, 'Archived record must disappear');
  });
}

test('missing reference books never return unrelated NCERT chapters or notes', async () => {
  const chapter = await create('chapters', { class: cls._id, subject: subject._id, number: 1, title: { en: 'NCERT only' }, status: 'published' });
  const res = await read('/notes/ml-aggarwal-formulas-notes/class-10');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.chapters.some(item => item._id === chapter._id), false);
  assert.deepEqual(res.body.data.notes, []);
});
