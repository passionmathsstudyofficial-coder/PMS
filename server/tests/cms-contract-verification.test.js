import { startServer, stopServer, createAdmin, login, PNG_1x1 } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app, owner, editor, cls12, subject, image;

before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'cms-test-owner@test.local' });
  await createAdmin({ email: 'cms-test-editor@test.local', role: 'editor' });
  owner = await login(app, 'cms-test-owner@test.local');
  editor = await login(app, 'cms-test-editor@test.local');

  const subRes = await owner.post('/api/subjects').send({
    name: { en: 'Mathematics', hi: 'गणित' },
    slug: 'mathematics-test',
    isPublic: true,
    status: 'published',
  });
  assert.equal(subRes.status, 201);
  subject = subRes.body;

  const clsRes = await owner.post('/api/classes').send({
    number: 12,
    name: { en: 'Class 12 Mathematics', hi: 'कक्षा 12 गणित' },
    subjects: [subject._id],
    status: 'published',
  });
  assert.equal(clsRes.status, 201);
  cls12 = clsRes.body;

  const upload = await owner.post('/api/media/upload').attach('files', PNG_1x1, {
    filename: 'triangle-diagram.png',
    contentType: 'image/png',
  });
  assert.equal(upload.status, 201);
  image = upload.body.items[0];
});

after(stopServer);

test('ERROR 1 & 2 FIXED: GET /api/content/books and GET /api/content/sessions return 200 with data', async () => {
  const booksRes = await owner.get('/api/content/books?scope=admin&limit=50');
  assert.equal(booksRes.status, 200, 'GET /api/content/books must return 200');
  assert.ok(Array.isArray(booksRes.body.items));

  const sessRes = await owner.get('/api/content/sessions');
  assert.equal(sessRes.status, 200, 'GET /api/content/sessions must return 200');
  assert.ok(Array.isArray(sessRes.body.items));
  assert.ok(sessRes.body.items.length >= 1, 'Default academic sessions must exist');
  assert.ok(sessRes.body.items.some((s) => s.slug === '2026-27'), 'Session 2026-27 must exist');

  const classesRes = await owner.get('/api/content/classes?scope=admin&limit=20');
  assert.equal(classesRes.status, 200, 'GET /api/content/classes must return 200');
  assert.ok(classesRes.body.items.length >= 1);
});

test('Reference Books CMS API Contract: Book -> Class -> Chapter -> Exercise -> Question -> Solution', async () => {
  // 1. POST /api/content/books
  const bookCreate = await owner.post('/api/content/books').send({
    title: { en: 'RS Aggarwal Mathematics', hi: 'आर.एस. अग्रवाल गणित' },
    slug: 'rs-aggarwal-contract-test',
    author: 'R.S. Aggarwal',
    publisher: 'Bharati Bhawan',
    category: 'reference',
    availableClasses: [12],
    status: 'published',
  });
  assert.equal(bookCreate.status, 201);
  const bookId = bookCreate.body._id;

  // 2. GET /api/content/books/:id
  const bookGet = await owner.get(`/api/content/books/${bookId}`);
  assert.equal(bookGet.status, 200);
  assert.equal(bookGet.body.author, 'R.S. Aggarwal');

  // 3. PUT /api/content/books/:id
  const bookPut = await owner.put(`/api/content/books/${bookId}`).send({
    edition: '2026-27 Revised Edition',
  });
  assert.equal(bookPut.status, 200);
  assert.equal(bookPut.body.edition, '2026-27 Revised Edition');

  // 4. GET /api/content/books/:id/classes
  const classesRes = await owner.get(`/api/content/books/${bookId}/classes`);
  assert.equal(classesRes.status, 200);
  assert.ok(classesRes.body.items.some((c) => c.number === 12));

  // Classes must exist before a book membership can reference them.
  await owner.post("/api/content/classes").send({number:11,name:{en:"Class 11"},subjects:[subject._id],status:"published"}).expect(201);
  // 5. POST /api/content/books/:id/classes
  const addClassRes = await owner.post(`/api/content/books/${bookId}/classes`).send({
    classNumber: 11,
  });
  assert.equal(addClassRes.status, 201);
  assert.ok(addClassRes.body.class);
  assert.equal(addClassRes.body.book, bookId);

  // 6. POST /api/content/books/:id/chapters
  const chCreate = await owner.post(`/api/content/books/${bookId}/chapters`).send({
    class: cls12._id,
    number: 1,
    title: { en: 'Relations and Functions', hi: 'सम्बन्ध एवं फलन' },
    slug: 'relations-and-functions-test',
    academicSession: '2026-27',
    status: 'published',
  });
  assert.equal(chCreate.status, 201);
  const chapterId = chCreate.body._id;

  // 7. GET /api/content/books/:id/chapters
  const chaptersList = await owner.get(`/api/content/books/${bookId}/chapters?scope=admin`);
  assert.equal(chaptersList.status, 200);
  assert.equal(chaptersList.body.items.length, 1);
  assert.equal(chaptersList.body.items[0].number, 1);

  // 8. PUT /api/content/chapters/:id
  const chPut = await owner.put(`/api/content/chapters/${chapterId}`).send({
    shortDescription: { en: 'Definitions and types of relations' },
  });
  assert.equal(chPut.status, 200);

  // 9. POST /api/content/chapters/:id/exercises
  const exCreate = await owner.post(`/api/content/chapters/${chapterId}/exercises`).send({
    number: '1.1',
    slug: 'exercise-1-1-test',
    academicSession: '2026-27',
    status: 'published',
  });
  assert.equal(exCreate.status, 201);
  const exerciseId = exCreate.body._id;

  // 10. GET /api/content/chapters/:id/exercises
  const exList = await owner.get(`/api/content/chapters/${chapterId}/exercises?scope=admin`);
  assert.equal(exList.status, 200);
  assert.equal(exList.body.items.length, 1);
  assert.equal(exList.body.items[0].number, '1.1');

  // 11. PUT /api/content/exercises/:id
  const exPut = await owner.put(`/api/content/exercises/${exerciseId}`).send({
    title: { en: 'Exercise 1.1' },
  });
  assert.equal(exPut.status, 200);

  // 12. POST /api/content/exercises/:id/questions
  const qCreate = await owner.post(`/api/content/exercises/${exerciseId}/questions`).send({
    number: '1',
    slug: 'q1-test',
    title: { en: 'Reflexive Relation Test', hi: 'स्वतुल्य सम्बन्ध' },
    text: { en: '<p>Determine whether relation R on set A is reflexive.</p>', hi: '<p>जाँच कीजिए कि क्या सम्बन्ध R स्वतुल्य है।</p>' },
    attachments: [{ media: image._id, placement: 'question' }],
    status: 'published',
    solution: {
      status: 'published',
      methods: [
        {
          title: { en: 'Standard Method', hi: 'मानक विधि' },
          methodType: 'standard',
          blocks: [
            { type: 'step', number: 1, title: { en: 'Step 1' }, content: { en: '<p>A relation is reflexive if $(a, a) \\in R$ for all $a \\in A$.</p>' } },
            { type: 'finalAnswer', content: { en: '<p>Hence, R is reflexive.</p>' } },
          ],
        },
        {
          title: { en: 'Shortcut Method', hi: 'शॉर्टकट विधि' },
          methodType: 'shortcut',
          blocks: [
            { type: 'step', number: 1, title: { en: 'Direct Check' }, content: { en: '<p>Check diagonal elements $(a, a)$.</p>' } },
          ],
        },
      ],
    },
  });
  assert.equal(qCreate.status, 201);
  const questionId = qCreate.body._id;

  // 13. GET /api/content/exercises/:id/questions
  const qList = await owner.get(`/api/content/exercises/${exerciseId}/questions?scope=admin`);
  assert.equal(qList.status, 200);
  assert.equal(qList.body.items.length, 1);
  assert.ok(qList.body.items[0].solution.hasSolution);

  // 14. GET /api/content/questions/:id/solutions
  const solGet = await owner.get(`/api/content/questions/${questionId}/solutions`);
  assert.equal(solGet.status, 200);
  assert.ok(solGet.body.solution);
  assert.equal(solGet.body.solution.methods.length, 2);

  // 15. POST /api/content/questions/:id/solutions (update solution)
  const solUpdate = await owner.post(`/api/content/questions/${questionId}/solutions`).send({
    status: 'draft',
  });
  assert.equal(solUpdate.status, 201);

  // When solution is draft, student public resolve must hide the solution
  const studentPath = `/reference-solutions/rs-aggarwal-contract-test/class-12/relations-and-functions-test/exercise-1-1-test`;
  let studentView = await request(app).get('/api/public/resolve').query({ path: studentPath, session: '2026-27', lang: 'en' });
  assert.equal(studentView.status, 200);
  assert.equal(studentView.body.data.questions[0].solution, null, 'Draft solution must not leak to student');

  // 16. PATCH /api/content/solutions/:id/status to publish
  const solPublish = await owner.patch(`/api/solutions/${solUpdate.body._id}/status`).send({ status: 'published' });
  assert.equal(solPublish.status, 200);

  // Now student view must reveal both methods and math formulas
  studentView = await request(app).get('/api/public/resolve').query({ path: studentPath, session: '2026-27', lang: 'en' });
  assert.equal(studentView.status, 200);
  assert.ok(studentView.body.data.questions[0].solution);
  assert.equal(studentView.body.data.questions[0].solution.methods.length, 2);
  assert.match(JSON.stringify(studentView.body.data.questions[0].solution), /reflexive/);

  // Hindi view must return Hindi content
  const studentViewHi = await request(app).get('/api/public/resolve').query({ path: studentPath, session: '2026-27', lang: 'hi' });
  assert.equal(studentViewHi.status, 200);
  assert.match(JSON.stringify(studentViewHi.body), /स्वतुल्य/);

  // Cleanup
  await owner.del(`/api/questions/${questionId}`);
  await owner.del(`/api/exercises/${exerciseId}`);
  await owner.del(`/api/chapters/${chapterId}`);
  await owner.del(`/api/books/${bookId}`);
});

test('Notes CMS API Contract: Class, Academic Session, KC Sinha Notes, and PDF attachments', async () => {
  // 1. Create a reference book for KC Sinha
  const kcSinha = await owner.post('/api/content/books').send({
    title: { en: 'KC Sinha Mathematics', hi: 'के.सी. सिन्हा गणित' },
    slug: 'kc-sinha',
    author: 'K.C. Sinha',
    category: 'reference',
    availableClasses: [12],
    status: 'published',
  });
  assert.equal(kcSinha.status, 201);

  // 2. Create a chapter for KC Sinha
  const ch = await owner.post('/api/content/chapters').send({
    class: cls12._id,
    subject: subject._id,
    book: kcSinha.body._id,
    number: 1,
    title: { en: 'Inverse Trigonometry', hi: 'प्रतिलोम त्रिकोणमिति' },
    slug: 'inverse-trigonometry-test',
    academicSession: '2026-27',
    status: 'published',
  });
  assert.equal(ch.status, 201);

  // 3. POST /api/content/notes
  const noteCreate = await owner.post('/api/content/notes').send({
    title: { en: 'KC Sinha Class 12 Important Formulas', hi: 'के.सी. सिन्हा महत्वपूर्ण सूत्र' },
    summary: { en: 'Formulas and properties of inverse trig', hi: 'प्रतिलोम त्रिकोणमितीय सूत्र' },
    content: { en: '<p>Formula: $\\sin^{-1} x + \\cos^{-1} x = \\frac{\\pi}{2}$</p>' },
    class: cls12._id,
    subject: subject._id,
    chapter: ch.body._id,
    book: kcSinha.body._id,
    category: 'kc_sinha_notes',
    academicSession: '2026-27',
    status: 'published',
    attachments: [{ media: image._id }],
  });
  assert.equal(noteCreate.status, 201);
  const noteId = noteCreate.body._id;

  // 4. PATCH /api/content/notes/:id (Update note)
  const notePatch = await owner.patch(`/api/content/notes/${noteId}`).send({
    summary: { en: 'Updated summary: Complete inverse trig revision' },
  });
  assert.equal(notePatch.status, 200);
  assert.match(notePatch.body.summary.en, /Updated summary/);

  // 5. GET /api/content/notes with filters
  const notesList = await owner.get('/api/content/notes').query({
    scope: 'admin',
    class: cls12._id,
    category: 'kc_sinha_notes',
    academicSession: '2026-27',
  });
  assert.equal(notesList.status, 200);
  assert.equal(notesList.body.items.length, 1);
  assert.equal(notesList.body.items[0]._id, noteId);

  // 6. Student public resolve: /notes/kc-sinha-formulas-notes
  const studentNotes = await request(app).get('/api/public/resolve').query({
    path: '/notes/kc-sinha-formulas-notes',
    session: '2026-27',
    lang: 'en',
  });
  assert.equal(studentNotes.status, 200);
  assert.equal(studentNotes.body.type, 'referenceBookNotes');
  assert.equal(studentNotes.body.data.notes.length, 1);
  assert.match(JSON.stringify(studentNotes.body.data.notes[0]), /Updated summary/);

  // 7. Test unpublish: change note status to draft
  const unpub = await owner.patch(`/api/notes/${noteId}/status`).send({ status: 'draft' });
  assert.equal(unpub.status, 200);

  const studentNotesAfterUnpub = await request(app).get('/api/public/resolve').query({
    path: '/notes/kc-sinha-formulas-notes',
    session: '2026-27',
    lang: 'en',
  });
  assert.equal(studentNotesAfterUnpub.status, 200);
  assert.equal(studentNotesAfterUnpub.body.data.notes.length, 0, 'Unpublished note must disappear from student page');

  // 8. Re-publish
  await owner.patch(`/api/notes/${noteId}/status`).send({ status: 'published' });
  const studentNotesAfterRepub = await request(app).get('/api/public/resolve').query({
    path: '/notes/kc-sinha-formulas-notes',
    session: '2026-27',
    lang: 'en',
  });
  assert.equal(studentNotesAfterRepub.status, 200);
  assert.equal(studentNotesAfterRepub.body.data.notes.length, 1, 'Re-published note must reappear on student page');

  // Cleanup
  await owner.del(`/api/notes/${noteId}`);
  await owner.del(`/api/chapters/${ch.body._id}`);
  await owner.del(`/api/books/${kcSinha.body._id}`);
});

