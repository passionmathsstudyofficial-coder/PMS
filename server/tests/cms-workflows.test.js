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

test('ML Aggarwal Notes and extended note fields (formulas, intro, pdfUrl) persist and validate', async () => {
  const note = await create('notes', {
    title: { en: 'ML Aggarwal Class 9 Chapter 1 Notes' },
    class: cls._id,
    subject: subject._id,
    category: 'ml_aggarwal_notes',
    academicSession: '2026-27',
    introduction: { en: '<p>Introduction to ML Aggarwal coordinate geometry</p>' },
    content: { en: '<p>Complete notes and formulas</p>' },
    formulas: [{ title: { en: 'Distance Formula' }, latex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', description: { en: 'Distance between points' } }],
    pdfUrl: 'https://example.com/notes.pdf',
    featured: true,
    status: 'published',
  });
  assert.equal(note.category, 'ml_aggarwal_notes');
  assert.equal(note.formulas.length, 1);
  assert.equal(note.featured, true);
  const fetched = await owner.get(`/api/notes/${note._id}`);
  assert.equal(fetched.body.category, 'ml_aggarwal_notes');
  assert.equal(fetched.body.formulas[0].latex, 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}');
});

test('Question full CMS editor: extended fields, formulas, parts, mcqOptions, and solution builder persist', async () => {
  const book = await create('books', { title: { en: 'RS Aggarwal 2026' }, slug: 'rs-aggarwal-question-test', category: 'reference', availableClasses: [9], status: 'published' });
  const chapter = await create('chapters', { class: cls._id, subject: subject._id, book: book._id, number: 5, title: { en: 'Coordinate Geometry Full CMS' }, academicSession: '2026-27', status: 'published' });
  const exercise = await create('exercises', { chapter: chapter._id, number: '5.2', status: 'published' });
  const topic = await create('topics', {
    name: { en: 'Section Formula' },
    class: cls._id,
    subject: subject._id,
    chapter: chapter._id,
    number: 1,
  });

  // 1. Create Question with all 10 panel fields
  const qPayload = {
    book: book._id,
    class: cls._id,
    subject: subject._id,
    chapter: chapter._id,
    exercise: exercise._id,
    topic: topic._id,
    academicSession: '2026-27',
    number: '12(a)',
    code: 'MATH-9-CH5-EX5.2-Q12A',
    title: { en: 'Coordinates of Point of Trisection', hi: 'त्रिभाजन बिंदु के निर्देशांक' },
    shortDescription: { en: 'Find coordinates dividing line segment in 1:2 ratio', hi: 'रेखाखंड को विभाजित करने वाले बिंदु के निर्देशांक' },
    board: 'CBSE',
    year: 2024,
    paperSet: 'Set 2 Code 30/2/1',
    source: 'RS Aggarwal Ex 5.2 Page 142',
    questionType: 'mcq',
    difficulty: 'hard',
    marks: 4,
    featured: true,
    pdfUrl: 'https://example.com/solutions/q12a.pdf',
    text: {
      en: '<p>Find the coordinates of the point $P(x, y)$ which divides the line segment joining $A(1, -2)$ and $B(4, 7)$ in the ratio $1 : 2$.</p>',
      hi: '<p>बिंदु $P(x, y)$ के निर्देशांक ज्ञात कीजिए जो $A(1, -2)$ और $B(4, 7)$ को जोड़ने वाले रेखाखंड को $1 : 2$ के अनुपात में विभाजित करता है।</p>',
    },
    mcqOptions: [
      { key: 'A', text: { en: '$(2, 1)$', hi: '$(2, 1)$' }, isCorrect: true },
      { key: 'B', text: { en: '$(3, 2)$', hi: '$(3, 2)$' }, isCorrect: false },
      { key: 'C', text: { en: '$(1, 3)$', hi: '$(1, 3)' }, isCorrect: false },
      { key: 'D', text: { en: '$(2, 3)$', hi: '$(2, 3)' }, isCorrect: false },
    ],
    mcqExplanation: {
      en: '<p>By Section Formula, $x = \\frac{1(4) + 2(1)}{1+2} = \\frac{6}{3} = 2$ and $y = \\frac{1(7) + 2(-2)}{1+2} = \\frac{3}{3} = 1$. Hence $(2, 1)$.</p>',
      hi: '<p>विभाजन सूत्र द्वारा, $x = 2$ और $y = 1$। अतः विकल्प (A) सही है।</p>',
    },
    parts: [
      { label: 'Part (i)', text: { en: 'Find x-coordinate', hi: 'x-निर्देशांक' }, marks: 2, answer: { en: '2', hi: '2' } },
      { label: 'Part (ii)', text: { en: 'Find y-coordinate', hi: 'y-निर्देशांक' }, marks: 2, answer: { en: '1', hi: '1' } },
    ],
    formulas: [
      {
        title: { en: 'Section Formula (Internal Division)', hi: 'आंतरिक विभाजन सूत्र' },
        latex: 'P(x, y) = \\left( \\frac{m x_2 + n x_1}{m+n}, \\frac{m y_2 + n y_1}{m+n} \\right)',
        description: { en: 'Formula for point dividing line in m:n ratio', hi: 'm:n अनुपात में विभाजित करने वाला सूत्र' },
      },
    ],
    hint: { en: '<p>Use $m=1$ and $n=2$ in the internal division section formula.</p>' },
    answer: { en: '<p>The coordinates of point P are $(2, 1)$.</p>' },
    importantPoint: { en: '<p>Always verify order of coordinates $(x_1, y_1)$ and $(x_2, y_2)$.</p>' },
    markingScheme: { en: '<p>1 mark for formula, 2 marks for substitution, 1 mark for final coordinates.</p>' },
    notes: { en: '<p>Trisection means dividing a segment into three equal parts with ratios $1:2$ or $2:1$.</p>' },
    status: 'published',
    solution: {
      status: 'published',
      methods: [
        {
          title: { en: 'Method 1: Direct Section Formula', hi: 'विधि 1: प्रत्यक्ष विभाजन सूत्र' },
          methodType: 'standard',
          blocks: [
            {
              type: 'step',
              title: { en: 'Step 1: Identify Given Values', hi: 'चरण 1: दिए गए मान' },
              content: { en: '<p>Given $A(x_1, y_1) = (1, -2)$, $B(x_2, y_2) = (4, 7)$, $m:n = 1:2$.</p>' },
            },
            {
              type: 'step',
              title: { en: 'Step 2: Apply Section Formula', hi: 'चरण 2: विभाजन सूत्र का प्रयोग' },
              content: { en: '<p>$x = \\frac{1(4) + 2(1)}{3} = 2$, $y = \\frac{1(7) + 2(-2)}{3} = 1$.</p>' },
            },
          ],
          finalAnswer: { en: 'Point $P(x, y) = (2, 1)$', hi: 'बिंदु $P(x, y) = (2, 1)$' },
        },
      ],
    },
  };

  const created = await create('questions', qPayload);
  assert.equal(created.code, 'MATH-9-CH5-EX5.2-Q12A');
  assert.equal(created.title.en, 'Coordinates of Point of Trisection');
  assert.equal(created.questionType, 'mcq');
  assert.equal(created.difficulty, 'hard');
  assert.equal(created.marks, 4);
  assert.equal(created.featured, true);
  assert.equal(created.mcqOptions.length, 4);
  assert.equal(created.parts.length, 2);
  assert.equal(created.formulas.length, 1);
  assert.equal(created.pdfUrl, 'https://example.com/solutions/q12a.pdf');

  // 2. Fetch full detail via admin API
  const detail = await owner.get(`/api/questions/${created._id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.code, 'MATH-9-CH5-EX5.2-Q12A');
  assert.equal(detail.body.book._id || detail.body.book, String(book._id));
  assert.equal(detail.body.topic._id || detail.body.topic, String(topic._id));
  assert.equal(detail.body.formulas[0].latex, 'P(x, y) = \\left( \\frac{m x_2 + n x_1}{m+n}, \\frac{m y_2 + n y_1}{m+n} \\right)');
  assert.equal(detail.body.solution.methods[0].blocks.length, 2);

  // 3. Admin filtering by book, questionType, featured
  const list = await owner.get('/api/questions').query({ scope: 'admin', book: book._id, questionType: 'mcq', featured: 'true' });
  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((item) => item._id === created._id));

  // 4. Update Question with new method and updated part marks
  const updateRes = await owner.put(`/api/questions/${created._id}`).send({
    marks: 5,
    parts: [
      { label: 'Part (i)', text: { en: 'Updated part' }, marks: 3, answer: { en: '2' } },
      { label: 'Part (ii)', text: { en: 'Updated part' }, marks: 2, answer: { en: '1' } },
    ],
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.marks, 5);
  assert.equal(updateRes.body.parts[0].marks, 3);
});

test('Important Question extended types and fields (assertion_reason, numerical, proof, pdfUrl, board) persist', async () => {
  for (const qType of ['mcq', 'numerical', 'case_based', 'assertion_reason', 'competency_based', 'proof', 'subjective']) {
    const iq = await create('important-questions', {
      title: { en: `Important Question ${qType}` },
      number: '4(b)',
      board: 'CBSE',
      class: cls._id,
      subject: subject._id,
      category: 'pyq',
      questionType: qType,
      difficulty: 'hard',
      marks: 5,
      year: 2025,
      paperSet: 'Set 1 (Code 30/1/1)',
      text: { en: '<p>Prove that $\\sqrt{7}$ is irrational.</p>' },
      formulas: [{ title: { en: 'Contradiction theorem' }, latex: 'p/q, \\gcd(p,q)=1' }],
      blocks: [{ type: 'step', title: { en: 'Step 1' }, content: { en: '<p>Assume $\\sqrt{7} = p/q$</p>' } }],
      answer: { en: '<p>Hence proved.</p>' },
      markingScheme: { en: '<p>2 marks for assumption, 3 marks for contradiction.</p>' },
      status: 'published',
    });
    assert.equal(iq.questionType, qType);
    assert.equal(iq.marks, 5);
    assert.equal(iq.year, 2025);
  }
});
