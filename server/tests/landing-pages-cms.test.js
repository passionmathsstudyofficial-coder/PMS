import { startServer, stopServer, createAdmin, login, PNG_1x1 } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

let app, owner, bookRs, cls10, subMath;

before(async () => {
  ({ app } = await startServer());
  await createAdmin({ email: 'landing-test-owner@test.local' });
  owner = await login(app, 'landing-test-owner@test.local');

  const subRes = await owner.post('/api/subjects').send({
    name: { en: 'Mathematics', hi: 'गणित' },
    slug: 'mathematics',
    isPublic: true,
    status: 'published',
  });
  subMath = subRes.body;

  const clsRes = await owner.post('/api/classes').send({
    number: 10,
    name: { en: 'Class 10', hi: 'कक्षा 10' },
    subjects: [subMath._id],
    status: 'published',
  });
  cls10 = clsRes.body;

  const bookRes = await owner.post('/api/content/books').send({
    title: { en: 'RS Aggarwal Mathematics', hi: 'आर.एस. अग्रवाल गणित' },
    slug: 'rs-aggarwal',
    author: 'R.S. Aggarwal',
    category: 'reference',
    classes: [10],
    availableClasses: [10],
    subject: subMath._id,
    hasSolutions: true,
    status: 'published',
    isVisible: true,
  });
  bookRs = bookRes.body;
});

after(stopServer);

test('Landing Pages Registry API and auto-ensuring landing pages', async () => {
  // 1. GET /api/content/landing-pages returns registry
  const regRes = await owner.get('/api/content/landing-pages');
  assert.equal(regRes.status, 200);
  assert.ok(Array.isArray(regRes.body.items));
  assert.ok(regRes.body.items.length >= 20, 'Should contain at least 20 predefined landing pages');

  // Verify categories exist
  const pyqEntry = regRes.body.items.find((i) => i.landingKey === 'study-materials/previous-year-questions');
  assert.ok(pyqEntry, 'PYQ landing page must be in registry');
  assert.equal(pyqEntry.category, 'Study Materials');

  const rsEntry = regRes.body.items.find((i) => i.landingKey === 'reference-solutions/rs-aggarwal');
  assert.ok(rsEntry, 'RS Aggarwal landing page must be in registry');

  const c10Entry = regRes.body.items.find((i) => i.landingKey === 'class-10/mathematics');
  assert.ok(c10Entry, 'Class 10 Mathematics landing page must be in registry');

  // 2. Ensure all landing pages via POST /api/content/landing-pages/ensure
  const ensureRes = await owner.post('/api/content/landing-pages/ensure').send({});
  assert.equal(ensureRes.status, 200);
  assert.ok(ensureRes.body.items);

  // Check by-key endpoint
  const byKeyRes = await owner.get('/api/content/landing-pages/by-key?key=study-materials/previous-year-questions');
  assert.equal(byKeyRes.status, 200);
  assert.equal(byKeyRes.body.item.landingKey, 'study-materials/previous-year-questions');
});

test('Customizing PYQ landing page via Admin reflects in public resolve immediately', async () => {
  // 1. Fetch PYQ page
  const pageRes = await owner.get('/api/content/landing-pages/by-key?key=study-materials/previous-year-questions');
  assert.equal(pageRes.status, 200);
  const pyqPage = pageRes.body.item;
  assert.ok(pyqPage._id);

  // 2. Admin edits hero title, description, and adds custom FAQ section
  const customHeroTitle = {
    en: 'Exclusive CBSE Class 10/12 Solved Board Papers (2018–2025)',
    hi: 'विशेष CBSE कक्षा 10/12 हल प्रश्न पत्र (2018–2025)',
  };
  const customHeroDesc = {
    en: 'Hand-written step-by-step mathematical answers by Passion Maths Study master faculty.',
    hi: 'Passion Maths Study के शिक्षकों द्वारा हस्तलिखित गणितीय समाधान।',
  };

  const updateRes = await owner.put(`/api/content/pages/${pyqPage._id}`).send({
    ...pyqPage,
    title: { en: 'Updated PYQ Landing Page', hi: 'अपडेटेड PYQ लैंडिंग पेज' },
    hero: {
      title: customHeroTitle,
      description: customHeroDesc,
    },
    sections: [
      {
        type: 'faq',
        title: { en: 'PYQ Exam FAQ', hi: 'PYQ परीक्षा प्रश्न' },
        visible: true,
        sortOrder: 0,
        items: [
          {
            title: { en: 'Are all 2025 sets included?', hi: 'क्या 2025 के सभी सेट शामिल हैं?' },
            text: { en: 'Yes, all Delhi, All India, and Foreign sets are covered.', hi: 'हाँ, दिल्ली, ऑल इंडिया और विदेशी सभी सेट शामिल हैं।' },
          },
        ],
      },
    ],
    status: 'published',
  });
  assert.equal(updateRes.status, 200);

  // 3. Request student-facing resolve at /study-materials/previous-year-questions in English
  const publicResEn = await owner.get('/api/public/resolve?path=/study-materials/previous-year-questions&lang=en');
  assert.equal(publicResEn.status, 200);
  assert.ok(publicResEn.body.data.landingPage, 'landingPage must be attached to data');
  assert.equal(publicResEn.body.data.landingPage.hero.title.en, customHeroTitle.en);
  assert.equal(publicResEn.body.data.landingPage.hero.description.en, customHeroDesc.en);
  assert.equal(publicResEn.body.data.landingPage.sections.length, 1);
  assert.equal(publicResEn.body.data.landingPage.sections[0].type, 'faq');

  // Request in Hindi
  const publicResHi = await owner.get('/api/public/resolve?path=/study-materials/previous-year-questions&lang=hi');
  assert.equal(publicResHi.status, 200);
  assert.equal(publicResHi.body.data.landingPage.hero.title.hi, customHeroTitle.hi);
  assert.equal(publicResHi.body.data.landingPage.hero.description.hi, customHeroDesc.hi);

  // 4. Request alias path /study-materials/pyq - must also attach the same landing page!
  const aliasRes = await owner.get('/api/public/resolve?path=/study-materials/pyq&lang=en');
  assert.equal(aliasRes.status, 200);
  assert.ok(aliasRes.body.data.landingPage, 'landingPage must attach for alias /study-materials/pyq');
  assert.equal(aliasRes.body.data.landingPage.hero.title.en, customHeroTitle.en);
});

test('Reference Book and NCERT Class landing pages attach correctly', async () => {
  // 1. Reference solutions RS Aggarwal
  const rsPageRes = await owner.get('/api/content/landing-pages/by-key?key=reference-solutions/rs-aggarwal');
  assert.equal(rsPageRes.status, 200);
  assert.ok(rsPageRes.body.item._id);

  const rsPublic = await owner.get('/api/public/resolve?path=/reference-solutions/rs-aggarwal&lang=en');
  assert.equal(rsPublic.status, 200);
  assert.ok(rsPublic.body.data.landingPage, 'RS Aggarwal must attach landing page');

  // 2. Class 10 NCERT Mathematics
  const c10PageRes = await owner.get('/api/content/landing-pages/by-key?key=class-10/mathematics');
  assert.equal(c10PageRes.status, 200);
  assert.ok(c10PageRes.body.item._id);

  // Update Class 10 landing page with custom hero
  await owner.put(`/api/content/pages/${c10PageRes.body.item._id}`).send({
    ...c10PageRes.body.item,
    hero: {
      title: { en: 'Class 10 Maths NCERT Master Solutions 2026-27', hi: 'कक्षा 10 गणित NCERT मास्टर समाधान 2026-27' },
      description: { en: 'Master Class 10 Board exam with full chapter solutions and formulas.', hi: 'कक्षा 10 बोर्ड परीक्षा की सम्पूर्ण तैयारी।' },
    },
    status: 'published',
  });

  const c10Public = await owner.get('/api/public/resolve?path=/class-10/mathematics&lang=en');
  assert.equal(c10Public.status, 200);
  assert.ok(c10Public.body.data.landingPage, 'Class 10 Mathematics must attach landing page');
  assert.equal(c10Public.body.data.landingPage.hero.title.en, 'Class 10 Maths NCERT Master Solutions 2026-27');
});
