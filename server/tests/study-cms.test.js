import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createAdmin, login, startServer, stopServer } from './helpers.js';
import { initializeStudyCms } from '../src/models/StudyContent.js';

let app, owner, questionClass, notesClass;
const questions = 'important-questions';
const notes = 'notes-formulas';
const published = { status: 'published', isVisible: true };
const create = async (resource, data) => (await owner.post('/api/' + resource).send(data).expect(201)).body;
const resolve = path => request(app).get('/api/public/resolve').query({ path, lang: 'en' });

before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'study-cms@test.local' });
  owner = await login(app, 'study-cms@test.local');
  await initializeStudyCms();
  const classes = (await owner.get('/api/study-classes?scope=admin').expect(200)).body.items;
  questionClass = classes.find(item => item.number === 10 && item.module === questions)._id;
  notesClass = classes.find(item => item.number === 10 && item.module === notes)._id;
});
after(stopServer);

test('defaults are independently editable and one-time initialization preserves deletes', async () => {
  assert.notEqual(questionClass, notesClass);
  const categories = (await owner.get('/api/question-categories?scope=admin').expect(200)).body.items;
  assert.equal(categories.length, 7);
  const pyq = categories.find(item => item.slug === 'pyq');
  await owner.put('/api/question-categories/' + pyq._id).send({ title: { en: 'Past papers' } }).expect(200);
  const vvi = categories.find(item => item.slug === 'vvi');
  await owner.del('/api/question-categories/' + vvi._id).expect(200);
  await initializeStudyCms();
  const publicPage = (await resolve('/important-questions').expect(200)).body;
  assert.equal(publicPage.data.groups[0].items.length, 6);
  assert.equal(publicPage.data.groups[0].items.find(item => item._id === pyq._id).title.en, 'Past papers');
});

test('questions and notes publish through independent class and chapter hierarchies', async () => {
  const questionChapter = await create('study-chapters', { studyClass: questionClass, number: 1, title: { en: 'Number systems' }, ...published });
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
  const attachment = await owner.post('/api/media/upload').field('kind', 'pdf').attach('files', pdf, 'chapter.pdf').expect(201);
  const file = attachment.body.items[0];
  const notesChapter = await create('study-chapters', { studyClass: notesClass, number: 1, title: { en: 'Number systems' }, pdfFile: file._id, ...published });
  await request(app).get(file.url).expect(200);
  const chapterList = await owner.get('/api/study-chapters?scope=admin&module=important-questions').expect(200);
  assert.deepEqual(chapterList.body.items.map(item => item._id), [questionChapter._id]);
  const topic = await create('study-topics', { studyChapter: questionChapter._id, title: { en: 'Roots' }, ...published });
  const category = await create('question-categories', { title: { en: 'Practice tests' }, ...published });
  const set = await create('question-sets', {
    studyClass: questionClass, studyChapter: questionChapter._id, questionCategory: category._id,
    title: { en: 'Roots practice' }, ...published,
  });
  const fields = {
    studyClass: questionClass, studyChapter: questionChapter._id, studyTopic: topic._id,
    questionCategory: category._id, questionSet: set._id, questionType: 'mcq',
    title: { en: 'Evaluate the square root' }, text: { en: '<p>Find the square root of 25.</p>' },
    mcqOptions: [1, 2, 3, 4, 5].map(number => ({ text: { en: '<span data-type="math" class="math-inline" data-latex="' + number + '"></span>' }, correct: number === 5 })),
    marks: 2, negativeMarks: 0.5, examType: 'Board', explanation: { en: '<p>Five squared is 25.</p>' },
  };
  await owner.post('/api/important-questions').send({ ...fields, studyChapter: notesChapter._id }).expect(400);
  await owner.post('/api/important-questions').send({ ...fields, status: 'published', mcqOptions: fields.mcqOptions.slice(0, 3) }).expect(400);
  await owner.post('/api/question-sets').send({ studyClass: notesClass, questionCategory: category._id, title: { en: 'Wrong module' } }).expect(400);
  const question = await create('important-questions', { ...fields, status: 'draft' });
  const questionPath = '/important-questions/question/' + question._id;
  await resolve(questionPath).expect(404);
  const token = (await owner.post('/api/public/preview').send({ entityType: 'ImportantQuestion', id: question._id, data: { text: { en: '<p>Preview text</p>' } } }).expect(200)).body.token;
  const preview = await owner.get('/api/public/resolve').query({ path: questionPath, preview: 1, previewToken: token, lang: 'en' }).expect(200);
  assert.match(preview.body.data.record.text.en, /Preview text/);
  await owner.patch('/api/important-questions/' + question._id + '/status').send({ status: 'published' }).expect(200);
  assert.equal((await resolve(questionPath).expect(200)).body.data.record.mcqOptions.length, 5);
  assert.equal((await resolve('/important-questions/set/' + set._id).expect(200)).body.data.groups[0].items[0]._id, question._id);
  const scopedCategory = '/important-questions/category/' + category._id + '/' + questionClass;
  assert.equal((await resolve(scopedCategory).expect(200)).body.data.groups[0].items[0]._id, questionChapter._id);
  assert.equal((await resolve(scopedCategory + '/' + questionChapter._id).expect(200)).body.data.groups[0].items[0]._id, question._id);
  await resolve(scopedCategory + '/' + notesChapter._id).expect(404);
  const duplicate = await owner.post('/api/important-questions/' + question._id + '/duplicate').expect(201);
  assert.equal(duplicate.body.status, 'draft');
  await owner.put('/api/important-questions/' + question._id).send({ title: { en: 'Updated practice question' } }).expect(200);
  assert.equal((await resolve(questionPath).expect(200)).body.data.title.en, 'Updated practice question');
  await owner.del('/api/question-categories/' + category._id).expect(409);
  await owner.del('/api/study-chapters/' + questionChapter._id).expect(409);

  await owner.post('/api/notes').send({ studyClass: questionClass, studyChapter: questionChapter._id, title: { en: 'Wrong module' } }).expect(400);
  const note = await create('notes', { studyClass: notesClass, studyChapter: notesChapter._id, title: { en: 'Revision notes' }, ...published });
  const sheet = await create('notes', {
    studyClass: notesClass, category: 'formula_sheet', title: { en: 'Formula sheet' },
    formulas: [{ title: { en: 'Area of a circle' }, latex: 'A=\\pi r^2' }], ...published,
  });
  const notePath = '/notes-formulas/note/' + note._id;
  const sheetPath = '/notes-formulas/note/' + sheet._id;
  await resolve(notePath).expect(200);
  assert.equal((await resolve(sheetPath).expect(200)).body.data.record.formulas[0].latex, 'A=\\pi r^2');
  await resolve('/important-questions/chapter/' + notesChapter._id).expect(404);
  await owner.put('/api/study-classes/' + notesClass).send({ publishedAt: '2099-01-01T00:00:00.000Z' }).expect(200);
  const scheduled = await owner.get('/api/study-classes?scope=admin&module=notes-formulas&status=scheduled').expect(200);
  assert.deepEqual(scheduled.body.items.map(item => item._id), [notesClass]);
  await resolve(notePath).expect(404);
  await resolve(sheetPath).expect(404);
  assert.notEqual((await request(app).get(file.url)).status, 200);
  await resolve(questionPath).expect(200);
  await owner.patch('/api/question-categories/' + category._id + '/status').send({ status: 'archived' }).expect(200);
  await resolve(questionPath).expect(404);
  assert.equal((await request(app).get('/api/important-questions?scoped=true').expect(200)).body.total, 0);
});
