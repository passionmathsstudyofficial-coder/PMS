import {
  AcademicSession,
  Book,
  Chapter,
  ClassLevel,
  Exercise,
  ImportantQuestion,
  Note,
  Page,
  Question,
  Resource,
  Solution,
  Subject,
  Topic,
} from '../models/index.js';
import { stripHtml } from '../lib/sanitize.js';
import { ApiError } from '../middleware/error.js';
import { LANDING_KEY_ALIASES } from './landingPages.js';
import {
  BOOK_SELECT,
  MEDIA_SELECT,
  RESOURCE_SELECT,
  VIDEO_SELECT,
  blockPopulate,
  cleanAttachments,
  cleanBlocks,
  cleanMethods,
  cleanVideoRef,
  questionPopulate,
  solutionPopulate,
} from './populate.js';
import { getPreview } from './previewStore.js';
import { relatedFor } from './related.js';
import { countsForChapters, countsForExercises } from './stats.js';
import { getTerms, pick, term } from './terms.js';
import { urls } from './urls.js';

const vis = (Model, preview, extra = {}) => (preview ? extra : Model.publicFilter(extra));

function sessionVis(Model, preview, extra = {}, session) {
  const path = Model.schema?.path('academicSession');
  if (!path) return vis(Model, preview, extra);
  const selected = String(session || '2026-27').trim();
  const normalized = selected.replace(/[–—]/g, '-').toLowerCase();
  const labels = [selected, normalized, normalized.replace(/-(\d{2})$/, (match, yy) => `–${yy}`)];
  const sessionCondition = {
    $or: [
      { academicSession: { $in: [...new Set(labels)] } },
      { academicSession: null },
      { academicSession: '' },
      { academicSession: { $exists: false } },
    ],
  };
  if (extra.$or) {
    return vis(Model, preview, {
      $and: [sessionCondition, { $or: extra.$or }],
      ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== '$or')),
    });
  }
  return vis(Model, preview, { ...extra, ...sessionCondition });
}

export const isSubjectMatch = (sub, seg) => {
  if (!sub || !seg) return false;
  if (sub.slug === seg) return true;
  const isMath = (val) => val === 'maths' || val === 'mathematics';
  return isMath(sub.slug) && isMath(seg);
};

async function attachLanding(result, key, preview, override) {
  if (!result?.data || !key) return result;
  const normalizedKey = String(key).trim().toLowerCase();
  const candidateKeys = [
    normalizedKey,
    LANDING_KEY_ALIASES[normalizedKey],
    normalizedKey.replace(/\/mathematics$/, '/maths'),
    normalizedKey.replace(/\/maths$/, '/mathematics'),
    normalizedKey.replace(/\/(maths|mathematics)$/, ''),
    normalizedKey.replace(/^class-(\d+)$/, 'class-$1/mathematics'),
    normalizedKey.replace(/^class-(\d+)$/, 'class-$1/maths'),
  ].filter(Boolean);
  const landingPage = await Page.findOne(vis(Page, preview, { landingKey: { $in: candidateKeys } }))
    .populate([
      { path: 'hero.image', select: MEDIA_SELECT },
      { path: 'hero.banner', select: MEDIA_SELECT },
      { path: 'sections.image', select: MEDIA_SELECT },
      { path: 'sections.items.image', select: MEDIA_SELECT },
    ]);
  if (!landingPage) return result;
  applyOverride(landingPage, override, 'Page');
  result.data.landingPage = landingPage;
  if (landingPage.seo?.title) result.seo.title = landingPage.seo.title;
  if (landingPage.seo?.description) result.seo.description = landingPage.seo.description;
  return result;
}

function applyOverride(doc, override, entityType) {
  if (!doc || !override || override.entityType !== entityType || String(override.id) !== String(doc._id)) return false;
  doc.set(override.data || {});
  return true;
}

function describe(value, fallback = '') {
  const text = stripHtml(pick(value, 'en') || pick(value, 'hi'));
  return (text || fallback).slice(0, 158);
}

function combine(...parts) {
  return {
    hi: parts.map((p) => (typeof p === 'string' ? p : p?.hi || '')).filter(Boolean).join(' '),
    en: parts.map((p) => (typeof p === 'string' ? p : p?.en || '')).filter(Boolean).join(' '),
  };
}

function seoFor(doc, { title, description, url, image }) {
  const s = doc?.seo || {};
  return {
    title: s.title || title,
    translations: s.translations,
    legacyTitle: s.title,
    legacyDescription: s.description,
    description: s.description || description,
    canonical: s.canonical || url,
    robots: s.robots || 'index,follow',
    ogTitle: s.ogTitle || s.title || title,
    ogDescription: s.ogDescription || s.description || description,
    ogImage: s.ogImage?.url || image || null,
    h1: s.h1 && (s.h1.hi || s.h1.en) ? s.h1 : null,
  };
}

async function shapeQuestion(question, { preview, override, base }) {
  const q = question.toObject ? question.toObject() : question;
  let solution = null;
  if (override?.entityType === 'Question' && String(override.id) === String(q._id) && override.solution) {
    const draft = new Solution({ question: q._id, ...override.solution });
    await draft.populate(solutionPopulate());
    solution = draft.toObject();
  } else {
    solution = await Solution.findOne({ question: q._id }).populate(solutionPopulate()).lean();
  }
  const isSolutionVisible = preview || (solution && (!solution.status || solution.status === 'published'));
  return {
    _id: q._id,
    number: q.number,
    title: q.title,
    questionType: q.questionType || 'subjective',
    slug: q.slug,
    text: q.text,
    languageMode: q.languageMode,
    attachments: cleanAttachments((q.attachments || []).filter((item) => isSolutionVisible || item.placement !== 'solution')),
    video: q.video?.video ? { video: cleanVideoRef(q.video.video), placement: q.video.placement } : null,
    hint: q.hint,
    answer: solution && !isSolutionVisible ? {} : q.answer,
    importantPoint: q.importantPoint,
    difficulty: q.difficulty,
    marks: q.marks,
    tags: q.tags,
    isImportant: q.isImportant,
    status: preview ? q.status : undefined,
    solution: isSolutionVisible && solution ? {
      _id: solution._id,
      status: solution.status || 'published',
      blocks: cleanBlocks(solution.blocks),
      methods: cleanMethods(solution.methods || []),
      languageMode: solution.languageMode,
    } : null,
    url: `${base}/${q.slug}`,
  };
}

async function shapeTopic(topic, { cls, subject, ch, preview, override, terms, baseCrumbs, session }) {
  const vis = (Model, isPreview, extra = {}) => sessionVis(Model, isPreview, extra, session);
  const tp = topic.toObject ? topic.toObject() : topic;
  const topicUrl = urls.topic(cls, subject, ch, tp);
  const chapterUrl = urls.chapter(cls, subject, ch);
  const chapterLabel = term(terms, 'chapter', ch.number);

  // Fetch topic-specific or chapter-level resources and books
  const [resources, books, siblingTopics, exercises] = await Promise.all([
    Resource.find(vis(Resource, preview, { $or: [{ topic: tp._id }, { chapter: ch._id }] }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate([
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ])
      .lean(),
    Book.find(vis(Book, preview, { $or: [{ topic: tp._id }, { chapter: ch._id }, { class: cls._id }] }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate({ path: 'coverImage', select: MEDIA_SELECT })
      .lean(),
    Topic.find(vis(Topic, preview, { chapter: ch._id }))
      .sort({ sortOrder: 1, number: 1 })
      .select('number title slug difficulty estimatedTime shortDescription')
      .lean(),
    Exercise.find(vis(Exercise, preview, { chapter: ch._id }))
      .sort({ sortOrder: 1, number: 1 })
      .select('number title slug')
      .lean(),
  ]);

  const tpIndex = siblingTopics.findIndex((s) => String(s._id) === String(tp._id));
  const prev = tpIndex > 0 ? { ...siblingTopics[tpIndex - 1], label: `Topic ${siblingTopics[tpIndex - 1].number}`, url: urls.topic(cls, subject, ch, siblingTopics[tpIndex - 1]) } : null;
  const next = tpIndex < siblingTopics.length - 1 ? { ...siblingTopics[tpIndex + 1], label: `Topic ${siblingTopics[tpIndex + 1].number}`, url: urls.topic(cls, subject, ch, siblingTopics[tpIndex + 1]) } : null;

  return {
    type: 'topic',
    data: {
      class: cls,
      subject,
      chapter: { _id: ch._id, number: ch.number, title: ch.title, slug: ch.slug, url: chapterUrl },
      topic: {
        ...tp,
        url: topicUrl,
        video: cleanVideoRef(tp.video),
        videos: (tp.videos || []).map(cleanVideoRef).filter(Boolean),
        attachments: cleanAttachments(tp.attachments),
      },
      resources: resources.map((r) => ({
        ...r,
        fileUrl: r.file?.url || r.fileUrl || '',
        fileSize: r.fileSize || (r.file?.bytes ? `${(r.file.bytes / (1024 * 1024)).toFixed(1)} MB` : ''),
        thumbnailUrl: r.thumbnail?.url || '',
      })),
      books: books.map((b) => ({
        ...b,
        coverUrl: b.coverImage?.url || b.coverUrl || '',
      })),
      siblings: siblingTopics.map((s) => ({ ...s, url: urls.topic(cls, subject, ch, s) })),
      exercises: exercises.map((e) => ({ ...e, url: urls.exercise(cls, subject, ch, e) })),
      prev,
      next,
    },
    breadcrumbs: [...baseCrumbs, { label: chapterLabel, url: chapterUrl }, { label: tp.title, url: topicUrl }],
    related: await relatedFor('Topic', tp, terms, preview),
    seo: seoFor(tp, {
      title: `${pick(tp.title, 'hi')} (${pick(tp.title, 'en')}) | Class ${cls.number} Maths ${chapterLabel.hi}`,
      description: describe(tp.shortDescription, describe(tp.notes, `Class ${cls.number} Maths ${chapterLabel.hi} ${pick(tp.title, 'en')} – Video lessons, study notes, formula sheet and practice questions.`)),
      url: topicUrl,
      image: tp.featuredImage?.url || tp.image?.url || ch.featuredImage?.url,
    }),
  };
}

async function loadSubjectContext(segments, preview) {
  const cls = await ClassLevel.findOne(vis(ClassLevel, preview, { slug: segments[0] }))
    .populate({ path: 'thumbnail', select: MEDIA_SELECT })
    .populate({ path: 'seo.ogImage', select: MEDIA_SELECT })
    .lean();
  if (!cls) return null;
  let subjects = await Subject.find({
    _id: { $in: cls.subjects },
    ...(preview ? {} : { ...Subject.publicFilter(), isPublic: true }),
  })
    .sort({ sortOrder: 1 })
    .lean();
  if (!subjects.length) {
    subjects = await Subject.find(preview ? {} : { ...Subject.publicFilter(), isPublic: true })
      .sort({ sortOrder: 1 })
      .lean();
  }
  return { cls, subjects };
}

export const STUDY_MATERIAL_CATEGORIES = [
  {
    slug: 'ncert-solutions',
    type: 'ncert-solutions',
    name: { hi: 'NCERT समाधान', en: 'NCERT Solutions' },
    shortDesc: {
      hi: 'कक्षा 6 से 12 तक अध्याय-वार व प्रश्नावली-वार NCERT गणित के विस्तृत हल (Hindi & English medium)।',
      en: 'Complete chapter-wise and exercise-wise step-by-step NCERT Mathematics solutions.',
    },
    icon: 'CheckCircle2',
  },
  {
    slug: 'ncert-books',
    type: 'ncert_books',
    name: { hi: 'NCERT पुस्तकें', en: 'NCERT Books' },
    shortDesc: {
      hi: 'सत्र 2024-25 व 2025-26 की आधिकारिक NCERT गणित पाठ्यपुस्तकें और अध्याय-वार पीडीएफ डाउनलोड।',
      en: 'Download latest NCERT Mathematics textbooks chapter-wise PDF for Classes 6 to 12.',
    },
    icon: 'BookOpen',
  },
  {
    slug: 'ncert-notes',
    type: 'ncert_notes',
    name: { hi: 'NCERT नोट्स व सूत्र', en: 'NCERT Notes & Formulas' },
    shortDesc: {
      hi: 'प्रत्येक अध्याय के मुख्य सूत्र, प्रमेय, परिभाषाएं और त्वरित पुनरीक्षण नोट्स।',
      en: 'Chapter-wise revision notes, formula sheets, and key concept summaries.',
    },
    icon: 'FileText',
  },
  {
    slug: 'previous-year-questions',
    type: 'previous_year_paper',
    name: { hi: 'पिछले वर्षों के प्रश्नपत्र (PYQ)', en: 'Previous Year Questions (PYQ)' },
    shortDesc: {
      hi: 'सीबीएसई कक्षा 6 से 12 तक पिछले 10 वर्षों के हल प्रश्नपत्र, मार्किंग स्कीम और प्रश्न-वार विस्तृत हल।',
      en: 'Previous 10 years CBSE question papers with question-wise step-by-step solutions and marking schemes.',
    },
    icon: 'FileSpreadsheet',
  },
  {
    slug: 'cbse-sample-papers',
    type: 'cbse_sample_papers',
    name: { hi: 'CBSE सैंपल पेपर्स व मॉडल पेपर्स', en: 'CBSE Sample Papers' },
    shortDesc: {
      hi: 'सीबीएसई बोर्ड परीक्षा के नवीनतम मॉडल प्रश्नपत्र, ब्लूप्रिंट और अंकन योजना।',
      en: 'Official CBSE sample question papers with marking schemes and practice model papers.',
    },
    icon: 'FileSpreadsheet',
  },
  {
    slug: 'cbse-extra-questions',
    type: 'extra_questions',
    name: { hi: 'CBSE अतिरिक्त अभ्यास प्रश्न', en: 'CBSE Extra Questions' },
    shortDesc: {
      hi: 'कक्षा और अध्याय-वार अतिरिक्त महत्वपूर्ण प्रश्न, हॉट्स (HOTS) और चरणबद्ध हल।',
      en: 'Class-wise and chapter-wise extra practice questions with detailed step-by-step solutions.',
    },
    icon: 'HelpCircle',
  },
  {
    slug: 'vvi-questions',
    type: 'important_questions',
    name: { hi: 'VVI प्रश्न (बोर्ड विशेष)', en: 'VVI Questions (Board Special)' },
    shortDesc: {
      hi: 'बोर्ड परीक्षा हेतु अति महत्वपूर्ण लघु उत्तरीय, दीर्घ उत्तरीय और बार-बार पूछे जाने वाले प्रश्न।',
      en: 'Most repeated high-yield board special questions with complete step-by-step solutions.',
    },
    icon: 'Sparkles',
  },
  {
    slug: 'maths-syllabus',
    type: 'syllabus',
    name: { hi: 'गणित पाठ्यक्रम (Maths Syllabus)', en: 'Maths Syllabus' },
    shortDesc: {
      hi: 'नवीनतम सीबीएसई गणित पाठ्यक्रम, इकाई-वार अंक विभाजन और हटाए गए विषय विवरण।',
      en: 'Latest CBSE Mathematics syllabus, unit-wise marks distribution, and curriculum downloads.',
    },
    icon: 'GraduationCap',
  },
  {
    slug: 'extra-questions',
    type: 'extra_questions',
    name: { hi: 'अतिरिक्त अभ्यास प्रश्न', en: 'Extra Practice Questions' },
    shortDesc: {
      hi: 'परीक्षा तैयारी और अवधारणा सुदृढ़ीकरण हेतु अतिरिक्त अभ्यास प्रश्न और हल।',
      en: 'Extra practice questions with step-by-step solutions for deep mathematical clarity.',
    },
    icon: 'HelpCircle',
  },
  {
    slug: 'important-questions',
    type: 'important_questions',
    name: { hi: 'महत्वपूर्ण प्रश्न (बोर्ड)', en: 'Important Questions' },
    shortDesc: {
      hi: 'बोर्ड परीक्षा में बार-बार पूछे जाने वाले उच्च अंक वाले प्रश्न और मॉडल हल।',
      en: 'Most repeated and high-scoring board questions with complete step-by-step solutions.',
    },
    icon: 'Sparkles',
  },
  {
    slug: 'english-summaries',
    type: 'english_summaries',
    name: { hi: 'अंग्रेजी / कॉन्सेप्ट सारांश', en: 'English & Concept Summaries' },
    shortDesc: {
      hi: 'प्रत्येक अध्याय के प्रमुख सिद्धांतों और शब्दावली का द्विभाषी सारांश।',
      en: 'Quick chapter summaries, theorem definitions, and proof guides in English and Hindi.',
    },
    icon: 'AlignLeft',
  },
  {
    slug: 'syllabus',
    type: 'syllabus',
    name: { hi: 'पाठ्यक्रम (CBSE Syllabus)', en: 'CBSE Syllabus' },
    shortDesc: {
      hi: 'नवीनतम सीबीएसई गणित पाठ्यक्रम, हटाए गए विषय और इकाई-वार अंक विभाजन।',
      en: 'Updated CBSE Mathematics syllabus, deleted syllabus details, and unit-wise marks distribution.',
    },
    icon: 'GraduationCap',
  },
];

export const CANONICAL_REFERENCE_BOOKS = [
  {
    slug: 'ncert',
    title: { hi: 'NCERT गणित समाधान', en: 'NCERT Solutions' },
    author: 'NCERT',
    publisher: 'NCERT',
    category: 'reference',
    description: {
      hi: 'सीबीएसई कक्षा 6 से 12 के लिए NCERT गणित के अध्याय-वार और प्रश्नावली-वार संपूर्ण चरणबद्ध हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for NCERT Mathematics Classes 6 to 12.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
    featured: true,
  },
  {
    slug: 'rs-aggarwal',
    title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'RS Aggarwal Solutions' },
    author: 'R.S. Aggarwal',
    publisher: 'Bharati Bhawan',
    category: 'reference',
    description: {
      hi: 'सीबीएसई कक्षा 6 से 12 के लिए आर.एस. अग्रवाल गणित के अध्याय-वार और प्रश्नावली-वार विस्तृत हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for RS Aggarwal Mathematics Classes 6 to 12.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
    featured: true,
  },
  {
    slug: 'rd-sharma',
    title: { hi: 'आर.डी. शर्मा समाधान', en: 'RD Sharma Solutions' },
    author: 'Dr. R.D. Sharma',
    publisher: 'Dhanpat Rai Publications',
    category: 'reference',
    description: {
      hi: 'सीबीएसई बोर्ड परीक्षा और प्रतियोगी परीक्षाओं के लिए आर.डी. शर्मा गणित के संपूर्ण हल।',
      en: 'Comprehensive RD Sharma Mathematics solutions with all question steps, formulas, and proofs.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
    featured: true,
  },
  {
    slug: 'ml-aggarwal',
    title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'ML Aggarwal Solutions' },
    author: 'M.L. Aggarwal',
    publisher: 'Arya Publications',
    category: 'reference',
    description: {
      hi: 'आईसीएसई / सीबीएसई गणित के लिए एम.एल. अग्रवाल अंडरस्टैंडिंग मैथमेटिक्स के हल।',
      en: 'Step-by-step solutions for ML Aggarwal Understanding Mathematics for middle and secondary classes.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
    featured: true,
  },
  {
    slug: 'kc-sinha',
    title: { hi: 'के.सी. सिन्हा समाधान', en: 'KC Sinha Solutions' },
    author: 'Dr. K.C. Sinha',
    publisher: 'Students Friends / Rastogi Publications',
    category: 'reference',
    description: {
      hi: 'कक्षा 6 से 12 के विद्यार्थियों के लिए के.सी. सिन्हा गणित के संपूर्ण और विस्तृत चरणबद्ध हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for KC Sinha Mathematics Classes 6 to 12.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
    featured: true,
  },
];

function formatResource(r) {
  if (!r) return null;
  return {
    ...r,
    fileUrl: r.file?.url || r.fileUrl || '',
    fileSize: r.fileSize || (r.file?.bytes ? `${(r.file.bytes / (1024 * 1024)).toFixed(1)} MB` : ''),
    thumbnailUrl: r.thumbnail?.url || '',
    externalUrl: r.externalUrl || '',
    videoUrl: r.videoUrl || '',
  };
}

async function findClassBySegment(segment, preview) {
  if (!segment) return null;
  const numMatch = segment.match(/\d+/);
  const num = numMatch ? Number(numMatch[0]) : null;
  const filter = num !== null ? { $or: [{ slug: segment }, { number: num }] } : { slug: segment };
  return ClassLevel.findOne(vis(ClassLevel, preview, filter))
    .populate({ path: 'thumbnail', select: MEDIA_SELECT })
    .populate({ path: 'subjects', select: 'name slug isPublic' })
    .lean();
}

async function resolveStudyMaterialsPath(segments, { preview, page, limit, session, terms, home }) {
  const vis = (Model, isPreview, extra = {}) => sessionVis(Model, isPreview, extra, session);
  const smCrumb = { label: { hi: 'अध्ययन सामग्री', en: 'Study Materials' }, url: urls.studyMaterials() };
  const [classes, sessions] = await Promise.all([
    ClassLevel.find(vis(ClassLevel, preview)).sort({ number: -1 }).select('number name slug').lean(),
    AcademicSession.find({ isActive: true }).sort({ sortOrder: 1, year: -1 }).lean(),
  ]);

  const activeSessions = sessions.length ? sessions : [
    { name: '2026–27', slug: '2026-27', year: 2026, isCurrent: true },
    { name: '2025–26', slug: '2025-26', year: 2025, isCurrent: false },
    { name: '2024–25', slug: '2024-25', year: 2024, isCurrent: false },
  ];
  const currentSession = session || activeSessions.find((s) => s.isCurrent)?.name || activeSessions[0]?.name || '2026–27';

  // 1. Hub page: /study-materials
  if (segments.length === 1) {
    const featuredResources = await Resource.find(vis(Resource, preview, { featured: true }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(8)
      .populate([
        { path: 'class', select: 'number name slug' },
        { path: 'chapter', select: 'number title slug' },
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ])
      .lean();

    return {
      type: 'studyMaterials',
      data: {
        level: 'hub',
        categories: STUDY_MATERIAL_CATEGORIES,
        classes: classes.map((c) => ({ ...c, url: urls.class(c) })),
        academicSessions: activeSessions,
        currentSession,
        featuredResources: featuredResources.map(formatResource),
      },
      breadcrumbs: [home, smCrumb],
      seo: {
        title: 'Study Materials & Reference Solutions for Classes 6 to 12 | Passion Maths Study',
        description: 'Download NCERT Solutions, NCERT Books, Notes, CBSE Sample Papers, Extra Questions, and Syllabus for Classes 6, 7, 8, 9, 10, 11, and 12.',
        canonical: urls.studyMaterials(),
      },
    };
  }

  const rawSlug = segments[1];
  const ALIASES = {
    pyq: 'previous-year-questions',
    syllabus: 'maths-syllabus',
    'extra-questions': 'cbse-extra-questions',
    'sample-papers': 'cbse-sample-papers',
    'important-questions': 'vvi-questions',
  };
  const categorySlug = ALIASES[rawSlug] || rawSlug;
  const cat = STUDY_MATERIAL_CATEGORIES.find((c) => c.slug === categorySlug);
  if (!cat) throw new ApiError(404, 'Study material category not found');

  const catCrumb = { label: cat.name, url: urls.studyMaterialCategory(cat.slug) };
  const categoryTypes = [cat.type];
  if (cat.type === 'ncert_notes') categoryTypes.push('notes', 'formula_sheet', 'revision');
  if (cat.type === 'cbse_sample_papers') categoryTypes.push('sample_paper', 'previous_year_paper', 'practice_paper');
  if (cat.type === 'previous_year_paper') categoryTypes.push('previous_year_paper', 'pyq', 'sample_paper');
  if (cat.type === 'extra_questions') categoryTypes.push('question_bank', 'worksheet', 'assignment');
  if (cat.type === 'important_questions') categoryTypes.push('important_questions', 'vvi');
  if (cat.type === 'ncert_books') categoryTypes.push('ncert_books', 'other');

  // Determine class if present
  let cls = null;
  if (segments.length >= 3) {
    cls = await findClassBySegment(segments[2], preview);
    if (!cls) throw new ApiError(404, 'Class not found');
  } else {
    // Default to class 10 for detailed category views if not specified
    cls = classes.find((c) => c.number === 10) || classes[0] || null;
  }

  const classCrumb = cls ? { label: { hi: `कक्षा ${cls.number}`, en: `Class ${cls.number}` }, url: urls.studyMaterialCategoryClass(cat.slug, cls) } : null;
  const crumbs = classCrumb && segments.length >= 3 ? [home, smCrumb, catCrumb, classCrumb] : [home, smCrumb, catCrumb];

  // A. Dedicated PYQ page
  if (categorySlug === 'previous-year-questions' || categorySlug === 'pyq') {
    const classFilter = cls ? { class: cls._id } : {};
    const [papers, solvedQuestions] = await Promise.all([
      Resource.find(vis(Resource, preview, { resourceType: { $in: ['previous_year_paper', 'pyq'] }, ...classFilter }))
        .sort({ year: -1, createdAt: -1 })
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'file', select: MEDIA_SELECT },
          { path: 'thumbnail', select: MEDIA_SELECT },
        ])
        .lean(),
      ImportantQuestion.find(vis(ImportantQuestion, preview, { category: 'pyq', ...classFilter }))
        .sort({ year: -1, sortOrder: 1, createdAt: -1 })
        .limit(25)
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'chapter', select: 'number title slug' },
          ...blockPopulate(),
        ])
        .lean(),
    ]);

    const examYears = [2025, 2024, 2023, 2022, 2020, 2019, 2018];
    return {
      type: 'pyq',
      data: {
        category: cat,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
        academicSessions: activeSessions,
        currentSession,
        examinationYears: examYears,
        papers: papers.map(formatResource),
        solvedQuestions: solvedQuestions.map((q) => ({
          ...q,
          attachments: cleanAttachments(q.attachments),
          blocks: cleanBlocks(q.blocks),
        })),
        categories: STUDY_MATERIAL_CATEGORIES,
      },
      breadcrumbs: crumbs,
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths Previous Year Question Papers (PYQ) with Solutions | Passion Maths Study`,
        description: `Download CBSE Class ${cls?.number || '6-12'} Mathematics Previous Year Question Papers with step-by-step solutions, marking schemes, and question-wise analysis.`,
        canonical: urls.studyMaterialCategory(cat.slug),
      },
    };
  }

  // B. Dedicated CBSE Sample Papers page
  if (categorySlug === 'cbse-sample-papers') {
    const classFilter = cls ? { class: cls._id } : {};
    const [samplePapers, markingSchemes] = await Promise.all([
      Resource.find(vis(Resource, preview, { resourceType: { $in: ['cbse_sample_papers', 'sample_paper', 'practice_paper'] }, ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'file', select: MEDIA_SELECT },
          { path: 'thumbnail', select: MEDIA_SELECT },
        ])
        .lean(),
      Resource.find(vis(Resource, preview, { resourceType: 'solution', ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'file', select: MEDIA_SELECT },
        ])
        .lean(),
    ]);

    return {
      type: 'samplePapers',
      data: {
        category: cat,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
        academicSessions: activeSessions,
        currentSession,
        papers: samplePapers.map(formatResource),
        markingSchemes: markingSchemes.map(formatResource),
        categories: STUDY_MATERIAL_CATEGORIES,
      },
      breadcrumbs: crumbs,
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths Sample Papers with Solutions & Marking Scheme | Passion Maths Study`,
        description: `Download latest official CBSE Sample Papers for Class ${cls?.number || '6-12'} Mathematics with step-by-step solutions and blueprints.`,
        canonical: urls.studyMaterialCategory(cat.slug),
      },
    };
  }

  // C. Dedicated CBSE Extra Questions page
  if (categorySlug === 'cbse-extra-questions' || categorySlug === 'extra-questions') {
    const classFilter = cls ? { class: cls._id } : {};
    const [chapters, extraQuestions, resources] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug').lean() : [],
      ImportantQuestion.find(vis(ImportantQuestion, preview, { category: { $in: ['extra_questions', 'general'] }, ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(30)
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'chapter', select: 'number title slug' },
          ...blockPopulate(),
        ])
        .lean(),
      Resource.find(vis(Resource, preview, { resourceType: { $in: ['extra_questions', 'question_bank', 'worksheet'] }, ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    return {
      type: 'extraQuestions',
      data: {
        category: cat,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        questions: extraQuestions.map((q) => ({
          ...q,
          attachments: cleanAttachments(q.attachments),
          blocks: cleanBlocks(q.blocks),
        })),
        resources: resources.map(formatResource),
        categories: STUDY_MATERIAL_CATEGORIES,
      },
      breadcrumbs: crumbs,
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths Extra Questions with Step-by-Step Solutions | Passion Maths Study`,
        description: `Chapter-wise extra questions for CBSE Class ${cls?.number || '6-12'} Mathematics with detailed solutions, difficulty levels, and formulas.`,
        canonical: urls.studyMaterialCategory(cat.slug),
      },
    };
  }

  // D. Dedicated VVI Questions page
  if (categorySlug === 'vvi-questions' || categorySlug === 'important-questions') {
    const classFilter = cls ? { class: cls._id } : {};
    const [chapters, vviQuestions, resources] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug').lean() : [],
      ImportantQuestion.find(vis(ImportantQuestion, preview, { category: { $in: ['vvi', 'general'] }, ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(35)
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'chapter', select: 'number title slug' },
          ...blockPopulate(),
        ])
        .lean(),
      Resource.find(vis(Resource, preview, { resourceType: { $in: ['important_questions', 'vvi'] }, ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    return {
      type: 'vviQuestions',
      data: {
        category: cat,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        questions: vviQuestions.map((q) => ({
          ...q,
          attachments: cleanAttachments(q.attachments),
          blocks: cleanBlocks(q.blocks),
        })),
        resources: resources.map(formatResource),
        categories: STUDY_MATERIAL_CATEGORIES,
      },
      breadcrumbs: crumbs,
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths VVI Questions (Board Special) | Passion Maths Study`,
        description: `Most important VVI questions for CBSE Class ${cls?.number || '6-12'} Mathematics board exams with step-by-step solutions and marks weightage.`,
        canonical: urls.studyMaterialCategory(cat.slug),
      },
    };
  }

  // E. Dedicated Maths Syllabus page
  if (categorySlug === 'maths-syllabus' || categorySlug === 'syllabus') {
    const classFilter = cls ? { class: cls._id } : {};
    const [chapters, syllabusResources] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug shortDescription syllabusMarks image').populate({ path: 'image', select: MEDIA_SELECT }).lean() : [],
      Resource.find(vis(Resource, preview, { resourceType: 'syllabus', ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    return {
      type: 'mathsSyllabus',
      data: {
        category: cat,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        resources: syllabusResources.map(formatResource),
        topics: await Topic.find(vis(Topic, preview, { chapter: { $in: chapters.map((chapter) => chapter._id) } })).select('chapter title shortDescription number slug').sort({ sortOrder: 1, number: 1 }).lean(),
        categories: STUDY_MATERIAL_CATEGORIES,
      },
      breadcrumbs: crumbs,
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths Syllabus ${currentSession} | Chapter-wise Marks Distribution`,
        description: `Official CBSE Class ${cls?.number || '6-12'} Mathematics syllabus for ${currentSession}, course structure, deleted topics, and question paper design.`,
        canonical: urls.studyMaterialCategory(cat.slug),
      },
    };
  }

  // Generic fallback for any other study material category (e.g. ncert-books)
  const resources = await Resource.find(vis(Resource, preview, { resourceType: { $in: categoryTypes }, ...(cls ? { class: cls._id } : {}) }))
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate([
      { path: 'class', select: 'number name slug' },
      { path: 'chapter', select: 'number title slug' },
      { path: 'file', select: MEDIA_SELECT },
      { path: 'thumbnail', select: MEDIA_SELECT },
    ])
    .lean();

  return {
    type: 'studyMaterials',
    data: {
      level: segments.length === 3 ? 'categoryClass' : 'category',
      category: cat,
      class: cls,
      classes: classes.map((c) => ({ ...c, url: urls.studyMaterialCategoryClass(cat.slug, c) })),
      academicSessions: activeSessions,
      currentSession,
      resources: resources.map(formatResource),
      categories: STUDY_MATERIAL_CATEGORIES,
    },
    breadcrumbs: crumbs,
    seo: {
      title: `${pick(cat.name, 'en')} for Class ${cls?.number || '6-12'} Maths | Passion Maths Study`,
      description: describe(cat.shortDesc, `Download ${pick(cat.name, 'en')} for Classes 6 to 12 Mathematics in Hindi and English medium.`),
      canonical: urls.studyMaterialCategory(cat.slug),
    },
  };
}

async function resolveNotesPath(segments, { preview, page, limit, session, terms, home }) {
  const vis = (Model, isPreview, extra = {}) => sessionVis(Model, isPreview, extra, session);
  const notesCrumb = { label: { hi: 'गणित नोट्स व सूत्र', en: 'Maths Notes & Formulas' }, url: '/notes/ncert-chapter-wise-notes' };
  const [classes, sessions] = await Promise.all([
    ClassLevel.find(vis(ClassLevel, preview)).sort({ number: -1 }).select('number name slug').lean(),
    AcademicSession.find({ isActive: true }).sort({ sortOrder: 1, year: -1 }).lean(),
  ]);

  const activeSessions = sessions.length ? sessions : [
    { name: '2026–27', slug: '2026-27', year: 2026, isCurrent: true },
    { name: '2025–26', slug: '2025-26', year: 2025, isCurrent: false },
    { name: '2024–25', slug: '2024-25', year: 2024, isCurrent: false },
  ];
  const currentSession = session || activeSessions.find((s) => s.isCurrent)?.name || activeSessions[0]?.name || '2026–27';

  // If /notes with no secondary segment, default to ncert-chapter-wise-notes
  const subCategory = segments[1] || 'ncert-chapter-wise-notes';

  // Determine class
  let cls = null;
  if (segments.length >= 3) {
    cls = await findClassBySegment(segments[2], preview);
  }
  if (!cls) {
    cls = classes.find((c) => c.number === 10) || classes[0] || null;
  }

  const classFilter = cls ? { class: cls._id } : {};

  // 1. NCERT Chapter-wise Notes: /notes/ncert-chapter-wise-notes
  if (subCategory === 'ncert-chapter-wise-notes' || subCategory === 'ncert-notes') {
    const [chapters, notes, resources] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug shortDescription formulas').lean() : [],
      Note.find(vis(Note, preview, { category: { $in: ['ncert_notes', 'general'] }, ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .populate([{ path: 'chapter', select: 'number title slug' }, { path: 'attachments.media', select: MEDIA_SELECT }])
        .lean(),
      Resource.find(vis(Resource, preview, { resourceType: { $in: ['ncert_notes', 'notes', 'revision'] }, ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'chapter', select: 'number title slug' }, { path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    return {
      type: 'ncertNotes',
      data: {
        class: cls,
        classes: classes.map((c) => ({ ...c, url: `/notes/ncert-chapter-wise-notes/class-${c.number}` })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        notes,
        resources: resources.map(formatResource),
      },
      breadcrumbs: [home, notesCrumb, { label: { hi: 'NCERT अध्याय-वार नोट्स', en: 'NCERT Chapter-wise Notes' }, url: '/notes/ncert-chapter-wise-notes' }],
      seo: {
        title: `CBSE Class ${cls?.number || '6-12'} Maths NCERT Chapter-wise Notes | Passion Maths Study`,
        description: `Complete NCERT Mathematics chapter-wise notes for Class ${cls?.number || '6-12'}, definitions, theorems, formulas, diagrams, and revision summaries.`,
        canonical: `/notes/ncert-chapter-wise-notes`,
      },
    };
  }

  // 2. All Maths Formula Sheets: /notes/maths-formula-sheets
  if (subCategory === 'maths-formula-sheets' || subCategory === 'formula-sheets') {
    const [chapters, formulaNotes, resources] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug formulas').lean() : [],
      Note.find(vis(Note, preview, { category: 'formula_sheet', ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .populate([{ path: 'chapter', select: 'number title slug' }])
        .lean(),
      Resource.find(vis(Resource, preview, { resourceType: 'formula_sheet', ...classFilter }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    const symbols = [
      { symbol: '\\pi', name: { en: 'Pi', hi: 'पाई' }, approx: '\\approx 3.14159 \\text{ or } \\frac{22}{7}', use: { en: 'Circumference & Area of Circles', hi: 'वृत्त की परिधि और क्षेत्रफल' } },
      { symbol: '\\sqrt{x}', name: { en: 'Square Root', hi: 'वर्गमूल' }, approx: 'x^{1/2}', use: { en: 'Radicals & Quadratics', hi: 'मूल और द्विघात समीकरण' } },
      { symbol: '\\sum_{i=1}^n x_i', name: { en: 'Summation (Sigma)', hi: 'योग (सिग्मा)' }, approx: 'x_1 + x_2 + ... + x_n', use: { en: 'Statistics & Arithmetic Progressions', hi: 'सांख्यिकी और समांतर श्रेढ़ी' } },
      { symbol: '\\Delta', name: { en: 'Discriminant', hi: 'विविक्तकर' }, approx: 'b^2 - 4ac', use: { en: 'Nature of roots of quadratic equation', hi: 'द्विघात समीकरण के मूलों की प्रकृति' } },
      { symbol: '\\pm', name: { en: 'Plus-Minus', hi: 'धन-ऋण' }, approx: '+ \\text{ or } -', use: { en: 'Quadratic formula roots', hi: 'द्विघात सूत्र के दो हल' } },
      { symbol: '\\theta, \\alpha, \\beta', name: { en: 'Angles / Roots', hi: 'कोण / मूल' }, approx: '\\text{Variables}', use: { en: 'Trigonometry & Polynomial zeroes', hi: 'त्रिकोणमिति और बहुपद के शून्यक' } },
      { symbol: '\\sin^2 \\theta + \\cos^2 \\theta = 1', name: { en: 'Pythagorean Trig Identity', hi: 'त्रिकोणमितीय सर्वसमिका' }, approx: '1', use: { en: 'Trigonometric Simplifications', hi: 'त्रिकोणमिति मान' } },
      { symbol: '\\int, \\frac{d}{dx}', name: { en: 'Calculus Operators', hi: 'कैलकुलस संकारक' }, approx: '\\text{Integral & Derivative}', use: { en: 'Higher Secondary Maths', hi: 'कक्षा 11 व 12 गणित' } },
    ];

    return {
      type: 'formulaSheets',
      data: {
        class: cls,
        classes: classes.map((c) => ({ ...c, url: `/notes/maths-formula-sheets/class-${c.number}` })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        formulaNotes,
        resources: resources.map(formatResource),
        symbols,
      },
      breadcrumbs: [home, notesCrumb, { label: { hi: 'सभी गणित सूत्र पत्रक', en: 'All Maths Formula Sheets' }, url: '/notes/maths-formula-sheets' }],
      seo: {
        title: `All Maths Formulas for Class ${cls?.number || '6-12'} | Complete Formula Sheet PDF`,
        description: `Download Class ${cls?.number || '6-12'} Mathematics All Formula Sheets PDF, chapter-wise formulas, algebra, trigonometry, geometry, and symbols guide.`,
        canonical: `/notes/maths-formula-sheets`,
      },
    };
  }

  // 3. Reference Book Formulas & Notes: RS Aggarwal, RD Sharma, KC Sinha
  const isRs = subCategory === 'rs-aggarwal-formulas-notes' || subCategory === 'rs-aggarwal' || subCategory === 'reference-book-notes';
  const isRd = subCategory === 'rd-sharma-formulas-notes' || subCategory === 'rd-sharma';
  const isKc = subCategory === 'kc-sinha-formulas-notes' || subCategory === 'kc-sinha';

  if (isRs || isRd || isKc) {
    const bookSlug = isRs ? 'rs-aggarwal' : isRd ? 'rd-sharma' : 'kc-sinha';
    const bookTitle = isRs ? 'RS Aggarwal' : isRd ? 'RD Sharma' : 'KC Sinha';
    const bookDoc = await Book.findOne(vis(Book, preview, { slug: bookSlug })).lean();

    const [chapters, bookNotes, resources] = await Promise.all([
      Chapter.find(vis(Chapter, preview, { book: bookDoc?._id, ...(cls ? { class: cls._id } : {}) }))
        .sort({ sortOrder: 1, number: 1 })
        .select('number title slug shortDescription formulas')
        .lean(),
      Note.find(vis(Note, preview, { book: bookDoc?._id, ...(cls ? { class: cls._id } : {}) }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      Resource.find(vis(Resource, preview, { book: bookDoc?._id, ...(cls ? { class: cls._id } : {}) }))
        .sort({ createdAt: -1 })
        .populate([{ path: 'file', select: MEDIA_SELECT }])
        .lean(),
    ]);

    return {
      type: 'referenceBookNotes',
      data: {
        bookSlug,
        bookTitle,
        book: bookDoc,
        class: cls,
        classes: classes.map((c) => ({ ...c, url: `/notes/${subCategory}/class-${c.number}` })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        notes: bookNotes,
        resources: resources.map(formatResource),
      },
      breadcrumbs: [home, notesCrumb, { label: { hi: `${bookTitle} सूत्र व नोट्स`, en: `${bookTitle} Formulas & Notes` }, url: `/notes/${subCategory}` }],
      seo: {
        title: `${bookTitle} Class ${cls?.number || '6-12'} Maths Formulas & Chapter Notes | Passion Maths Study`,
        description: `Download ${bookTitle} Class ${cls?.number || '6-12'} Mathematics important formulas, theorem notes, worked examples, and quick revision PDF.`,
        canonical: `/notes/${subCategory}`,
      },
    };
  }

  // 4. VVI Questions & Short Notes: /notes/vvi-questions-short-notes
  if (subCategory === 'vvi-questions-short-notes' || subCategory === 'vvi-short-notes') {
    const [chapters, shortNotes, questions] = await Promise.all([
      cls ? Chapter.find(vis(Chapter, preview, { class: cls._id, book: null })).sort({ sortOrder: 1, number: 1 }).select('number title slug formulas').lean() : [],
      Note.find(vis(Note, preview, { category: 'vvi_short_notes', ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .populate([{ path: 'chapter', select: 'number title slug' }])
        .lean(),
      ImportantQuestion.find(vis(ImportantQuestion, preview, { category: 'vvi', ...classFilter }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(20)
        .populate([
          { path: 'class', select: 'number name slug' },
          { path: 'chapter', select: 'number title slug' },
          ...blockPopulate(),
        ])
        .lean(),
    ]);

    return {
      type: 'vviShortNotes',
      data: {
        class: cls,
        classes: classes.map((c) => ({ ...c, url: `/notes/vvi-questions-short-notes/class-${c.number}` })),
        academicSessions: activeSessions,
        currentSession,
        chapters,
        shortNotes,
        questions: questions.map((q) => ({
          ...q,
          attachments: cleanAttachments(q.attachments),
          blocks: cleanBlocks(q.blocks),
        })),
      },
      breadcrumbs: [home, notesCrumb, { label: { hi: 'VVI प्रश्न व संक्षिप्त नोट्स', en: 'VVI Questions & Short Notes' }, url: '/notes/vvi-questions-short-notes' }],
      seo: {
        title: `VVI Questions & Short Notes for Class ${cls?.number || '6-12'} Maths | Rapid Revision`,
        description: `Rapid revision short notes, high-yield VVI questions, and formula cheat-sheets for Class ${cls?.number || '6-12'} Mathematics board preparation.`,
        canonical: `/notes/vvi-questions-short-notes`,
      },
    };
  }

  throw new ApiError(404, 'Notes page not found');
}

async function resolveReferenceSolutionsPath(segments, { preview, page, limit, session, previewToken, override, terms, home }) {
  const vis = (Model, isPreview, extra = {}) => sessionVis(Model, isPreview, extra, session);
  const refCrumb = { label: { hi: 'संदर्भ समाधान', en: 'Reference Solutions' }, url: urls.referenceSolutions() };

  // Load registered reference books from DB + canonical list
  const [dbBooks, sessions] = await Promise.all([
    Book.find(vis(Book, preview, { category: 'reference' }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate([{ path: 'coverImage', select: MEDIA_SELECT }, { path: 'class', select: 'number' }])
      .lean(),
    AcademicSession.find({ isActive: true }).sort({ sortOrder: 1, year: -1 }).lean(),
  ]);

  const activeSessions = sessions.length ? sessions : [
    { name: '2026–27', slug: '2026-27', year: 2026, isCurrent: true },
    { name: '2025–26', slug: '2025-26', year: 2025, isCurrent: false },
    { name: '2024–25', slug: '2024-25', year: 2024, isCurrent: false },
  ];
  const currentSession = session || activeSessions.find((s) => s.isCurrent)?.name || activeSessions[0]?.name || '2026–27';

  const rootSlug = segments[0] || 'reference-solutions';
  const allBooksMap = new Map();
  for (const b of dbBooks) {
    if (b.slug) {
      if (!preview && (b.status !== 'published' || !b.isVisible || !b.publishedAt || new Date(b.publishedAt) > new Date())) {
        allBooksMap.delete(b.slug);
        continue;
      }
      const existing = allBooksMap.get(b.slug) || {};
      allBooksMap.set(b.slug, {
        ...existing,
        ...b,
        classes: (b.availableClasses && b.availableClasses.length > 0) ? b.availableClasses : (b.class?.number ? [b.class.number] : []),
        url: `/${rootSlug}/${b.slug}`,
      });
    }
  }
  const allBooks = Array.from(allBooksMap.values());

  const classes = await ClassLevel.find(vis(ClassLevel, preview))
    .sort({ number: -1 })
    .select('number name slug')
    .lean();

  // 1. Hub: /reference-solutions
  if (segments.length === 1) {
    return {
      type: 'referenceSolutions',
      data: {
        level: 'hub',
        books: allBooks,
        classes: classes.map((c) => ({ ...c, url: urls.class(c) })),
        academicSessions: activeSessions,
        currentSession,
      },
      breadcrumbs: [home, refCrumb],
      seo: {
        title: 'Reference Book Solutions: RS Aggarwal, RD Sharma & ML Aggarwal Maths | Passion Maths Study',
        description: 'Free step-by-step solutions for RS Aggarwal, RD Sharma, and ML Aggarwal Mathematics for Classes 6 to 12.',
        canonical: urls.referenceSolutions(),
      },
    };
  }

  const bookSlug = segments[1];
  // Old menus incorrectly advertised NCERT as a reference book. Preserve only
  // legacy URLs whose corresponding published NCERT destination actually resolves.
  if (bookSlug === 'ncert' && !allBooksMap.has(bookSlug) && segments.length >= 3) {
    const cls = await findClassBySegment(segments[2], preview);
    if (!cls) throw new ApiError(404, 'Class not found');
    const subjects = await Subject.find(vis(Subject, preview, { _id: { $in: cls.subjects }, isPublic: true })).lean();
    const subject = subjects.find(sub => isSubjectMatch(sub, 'maths'));
    if (!subject) throw new ApiError(404, 'Subject not found');
    const target = `${urls.subject(cls, subject)}${segments.length > 3 ? '/' + segments.slice(3).join('/') : ''}`;
    await resolvePath(target, { preview, page, limit, session, previewToken });
    return { type: 'redirect', redirect: target };
  }
  const book = allBooksMap.get(bookSlug);
  if (!book) throw new ApiError(404, 'Reference book not found');
  const bookCrumb = { label: book.title, url: urls.referenceBook(book) };

  // 2. Book Hub: /reference-solutions/:bookSlug
  if (segments.length === 2) {
    return {
      type: 'referenceSolutions',
      data: {
        level: 'book',
        book,
        classes: classes.filter((c) => book.classes?.includes(c.number)).map((c) => ({ ...c, url: urls.referenceBookClass(book, c) })),
        books: allBooks,
        academicSessions: activeSessions,
        currentSession,
      },
      breadcrumbs: [home, refCrumb, bookCrumb],
      seo: seoFor(book, {
        title: `${pick(book.title, 'en')} for Classes 6 to 12 Maths | Passion Maths Study`,
        description: describe(book.description, `Chapter-wise and exercise-wise solutions for ${pick(book.title, 'en')}.`),
        url: urls.referenceBook(book),
      }),
    };
  }

  // 3. Book Class page: /reference-solutions/:bookSlug/class-:number
  const cls = await findClassBySegment(segments[2], preview);
  if (!cls) throw new ApiError(404, 'Class not found');
  if (Array.isArray(book.classes) && book.classes.length && !book.classes.includes(cls.number)) throw new ApiError(404, 'This reference book is not configured for the selected class');
  if (Array.isArray(book.classes) && book.classes.length === 0) throw new ApiError(404, 'This reference book has no supported classes configured');
  const classCrumb = { label: { hi: `कक्षा ${cls.number}`, en: `Class ${cls.number}` }, url: urls.referenceBookClass(book, cls) };

  const dbBookDoc = dbBooks.find((b) => b.slug === bookSlug);
  const bookFilter = { book: dbBookDoc._id };

  const rawChapters = await Chapter.find(vis(Chapter, preview, { class: cls._id, ...bookFilter }))
    .sort({ sortOrder: 1, number: 1 })
    .select('number title slug shortDescription image pdfFile pdfUrl')
    .populate([
      { path: 'image', select: MEDIA_SELECT },
      { path: 'pdfFile', select: MEDIA_SELECT },
    ])
    .lean();

  const chapterIds = rawChapters.map((c) => c._id);
  const rawExercises = await Exercise.find(vis(Exercise, preview, { chapter: { $in: chapterIds } }))
    .sort({ sortOrder: 1, number: 1 })
    .select('number title slug chapter pdfFile pdfUrl')
    .populate({ path: 'pdfFile', select: MEDIA_SELECT })
    .lean();

  const exercisesByChapter = new Map();
  for (const ex of rawExercises) {
    const key = String(ex.chapter);
    if (!exercisesByChapter.has(key)) exercisesByChapter.set(key, []);
    exercisesByChapter.get(key).push({
      ...ex,
      url: urls.referenceExercise(book, cls, rawChapters.find((c) => String(c._id) === key) || {}, ex),
    });
  }

  const chapters = rawChapters.map((ch) => ({
    ...ch,
    url: urls.referenceChapter(book, cls, ch),
    exercises: exercisesByChapter.get(String(ch._id)) || [],
  }));

  if (segments.length === 3) {
    return {
      type: 'referenceSolutions',
      data: {
        level: 'class',
        book,
        class: cls,
        chapters,
        books: allBooks,
        classes: classes.filter(c => book.classes.includes(c.number)).map((c) => ({ ...c, url: urls.referenceBookClass(book, c) })),
        academicSessions: activeSessions,
        currentSession,
      },
      breadcrumbs: [home, refCrumb, bookCrumb, classCrumb],
      seo: {
        title: `${pick(book.title, 'en')} Class ${cls.number} Maths Solutions | Chapter-wise`,
        description: `Complete solutions for ${pick(book.title, 'en')} Class ${cls.number} Mathematics chapters and exercises with step-by-step explanations.`,
        canonical: urls.referenceBookClass(book, cls),
      },
    };
  }

  // 4. Chapter page: /reference-solutions/:bookSlug/class-:number/:chapterSlug
  const chapterSegment = segments[3];
  const numMatch = chapterSegment.match(/\d+/);
  const chNum = numMatch ? Number(numMatch[0]) : null;
  const chapter = chapters.find((c) => c.slug === chapterSegment || (chNum !== null && c.number === chNum));
  if (!chapter) throw new ApiError(404, 'Chapter not found');

  const chapterCrumb = { label: chapter.title, url: urls.referenceChapter(book, cls, chapter) };
  const chapterExercises = chapter.exercises || [];

  const [resources, siblingChapters] = await Promise.all([
    Resource.find(vis(Resource, preview, { class: cls._id, chapter: chapter._id }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate([
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ])
      .lean(),
    chapters,
  ]);

  const chIndex = siblingChapters.findIndex((c) => String(c._id) === String(chapter._id));
  const prevChapter = chIndex > 0 ? siblingChapters[chIndex - 1] : null;
  const nextChapter = chIndex < siblingChapters.length - 1 ? siblingChapters[chIndex + 1] : null;

  if (segments.length === 4) {
    return {
      type: 'referenceSolutions',
      data: {
        level: 'chapter',
        book,
        class: cls,
        chapter,
        exercises: chapterExercises,
        resources: resources.map(formatResource),
        siblingChapters,
        prev: prevChapter ? { label: prevChapter.title, url: urls.referenceChapter(book, cls, prevChapter) } : null,
        next: nextChapter ? { label: nextChapter.title, url: urls.referenceChapter(book, cls, nextChapter) } : null,
        academicSessions: activeSessions,
        currentSession,
      },
      breadcrumbs: [home, refCrumb, bookCrumb, classCrumb, chapterCrumb],
      seo: {
        title: `${pick(book.title, 'en')} Class ${cls.number} Chapter ${chapter.number} Solutions | ${pick(chapter.title, 'en')}`,
        description: `Download and view ${pick(book.title, 'en')} Class ${cls.number} Chapter ${chapter.number} (${pick(chapter.title, 'en')}) exercise solutions, PDF notes, and formula sheets.`,
        canonical: urls.referenceChapter(book, cls, chapter),
      },
    };
  }

  // 5. Exercise page: /reference-solutions/:bookSlug/class-:number/:chapterSlug/:exerciseSlug
  const exerciseSegment = segments[4];
  const exClean = exerciseSegment.replace(/^(exercise|prashnavali)-?/i, '');
  let exercise = await Exercise.findOne(vis(Exercise, preview, {
    chapter: chapter._id,
    $or: [{ slug: exerciseSegment }, { number: exClean }, { number: exerciseSegment }, { slug: `exercise-${exClean}` }],
  }))
    .populate([
      { path: 'introVideo', select: VIDEO_SELECT },
      { path: 'introVideoEn', select: VIDEO_SELECT },
      { path: 'introVideoHi', select: VIDEO_SELECT },
      { path: 'pdfFile', select: MEDIA_SELECT },
    ])
    .lean();

  if (!exercise) throw new ApiError(404, 'Exercise not found');

  const exerciseCrumb = { label: { hi: `अभ्यास ${exercise.number}`, en: `Exercise ${exercise.number}` }, url: urls.referenceExercise(book, cls, chapter, exercise) };

  if (segments.length === 6) {
    const q = await Question.findOne(vis(Question, preview, { exercise: exercise._id, slug: segments[5] })).populate(questionPopulate);
    if (!q) throw new ApiError(404, 'Question not found');
    applyOverride(q, override, 'Question');
    const base = urls.referenceExercise(book, cls, chapter, exercise);
    const question = await shapeQuestion(q, { preview, override, base });
    const siblings = await Question.find(vis(Question, preview, { exercise: exercise._id }))
      .sort({ sortOrder: 1, createdAt: 1 }).select('number slug').lean();
    const index = siblings.findIndex(item => String(item._id) === String(q._id));
    const nav = item => item ? { label: term(terms, 'question', item.number), url: `${base}/${item.slug}` } : null;
    return {
      type: 'question',
      data: { class: cls, book, chapter: { ...chapter, url: urls.referenceChapter(book, cls, chapter) },
        exercise: { ...exercise, url: base }, question, prev: nav(siblings[index - 1]), next: nav(siblings[index + 1]) },
      breadcrumbs: [home, refCrumb, bookCrumb, classCrumb, chapterCrumb, exerciseCrumb,
        { label: term(terms, 'question', q.number), url: question.url }],
      seo: seoFor(q, { title: `${pick(book.title, 'en')} Exercise ${exercise.number} Question ${q.number}`, description: describe(question.text), url: question.url }),
    };
  }

  // Fetch questions if this is a real DB exercise
  let shapedQuestions = [];
  let totalQuestions = 0;
  const pageSize = Math.min(Math.max(Number(limit) || 15, 1), 50);

  if (exercise._id && !String(exercise._id).startsWith('ref-')) {
    const filter = vis(Question, preview, { exercise: exercise._id });
    const [questions, count] = await Promise.all([
      Question.find(filter)
        .sort({ sortOrder: 1, createdAt: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate(questionPopulate)
        .lean(),
      Question.countDocuments(filter),
    ]);
    totalQuestions = count;
    for (const q of questions) {
      shapedQuestions.push(await shapeQuestion(q, { preview, base: urls.referenceExercise(book, cls, chapter, exercise) }));
    }
  }

  const exIndex = chapterExercises.findIndex((e) => e.number === exercise.number || e.slug === exercise.slug);
  const prevEx = exIndex > 0 ? chapterExercises[exIndex - 1] : null;
  const nextEx = exIndex < chapterExercises.length - 1 ? chapterExercises[exIndex + 1] : null;

  return {
    type: 'referenceSolutions',
    data: {
      level: 'exercise',
      book,
      class: cls,
      chapter,
      exercise: {
        ...exercise,
        introVideo: cleanVideoRef(exercise.introVideo),
        pdfUrl: exercise.pdfFile?.url || exercise.pdfUrl || chapter.pdfUrl || chapter.pdfFile?.url || '',
      },
      questions: shapedQuestions,
      pagination: { page, limit: pageSize, total: totalQuestions, pages: Math.ceil(totalQuestions / pageSize) || 1 },
      siblings: chapterExercises,
      prev: prevEx ? { label: `Exercise ${prevEx.number}`, url: urls.referenceExercise(book, cls, chapter, prevEx) } : null,
      next: nextEx ? { label: `Exercise ${nextEx.number}`, url: urls.referenceExercise(book, cls, chapter, nextEx) } : null,
      resources: resources.map(formatResource),
      academicSessions: activeSessions,
      currentSession,
    },
    breadcrumbs: [home, refCrumb, bookCrumb, classCrumb, chapterCrumb, exerciseCrumb],
    seo: {
      title: `${pick(book.title, 'en')} Class ${cls.number} Chapter ${chapter.number} Exercise ${exercise.number} Solutions`,
      description: `Step-by-step solutions for ${pick(book.title, 'en')} Class ${cls.number} Chapter ${chapter.number} Exercise ${exercise.number} with diagrams, formulas, and video explanations.`,
      canonical: urls.referenceExercise(book, cls, chapter, exercise),
    },
  };
}

/**
 * Resolves any public URL path to structured page data (+ breadcrumbs, related, SEO).
 * Used by the React site and by the server for SEO meta rendering.
 */

export const STATE_BOARDS = [
  {
    slug: 'bihar-board',
    name: { hi: 'बिहार बोर्ड (BSEB)', en: 'Bihar Board (BSEB)' },
    title: { hi: 'बिहार बोर्ड कक्षा 6–12 गणित समाधान', en: 'Bihar Board Class 6–12 Maths Solutions' },
    description: {
      hi: 'बिहार बोर्ड (BSEB) कक्षा 6 से 12 के लिए NCERT एवं राज्य पाठ्यपुस्तक गणित के विस्तृत हल, नोट्स और मॉडल पेपर।',
      en: 'Bihar School Examination Board (BSEB) Classes 6 to 12 complete Mathematics solutions, notes, formulas and model question papers.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'jharkhand-board',
    name: { hi: 'झारखंड बोर्ड (JAC)', en: 'Jharkhand Board (JAC)' },
    title: { hi: 'झारखंड बोर्ड कक्षा 6–12 गणित समाधान', en: 'Jharkhand Board Class 6–12 Maths Solutions' },
    description: {
      hi: 'झारखंड अधिविद्य परिषद (JAC) कक्षा 6 से 12 गणित समाधान, अध्याय-वार नोट्स और महत्वपूर्ण प्रश्न।',
      en: 'Jharkhand Academic Council (JAC) Classes 6 to 12 Maths step-by-step solutions, revision notes and question bank.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'up-board',
    name: { hi: 'यूपी बोर्ड (UPMSP)', en: 'UP Board (UPMSP)' },
    title: { hi: 'यूपी बोर्ड कक्षा 6–12 गणित समाधान', en: 'UP Board Class 6–12 Maths Solutions' },
    description: {
      hi: 'उत्तर प्रदेश माध्यमिक शिक्षा परिषद् (UPMSP) कक्षा 6 से 12 हिंदी माध्यम NCERT गणित समाधान।',
      en: 'Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP) Classes 6 to 12 Hindi & English medium Mathematics solutions.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'mp-board',
    name: { hi: 'एमपी बोर्ड (MPBSE)', en: 'MP Board (MPBSE)' },
    title: { hi: 'एमपी बोर्ड कक्षा 6–12 गणित समाधान', en: 'MP Board Class 6–12 Maths Solutions' },
    description: {
      hi: 'मध्य प्रदेश माध्यमिक शिक्षा मंडल (MPBSE) कक्षा 6 से 12 गणित हल, सूत्र और अभ्यास प्रश्न।',
      en: 'Madhya Pradesh Board of Secondary Education (MPBSE) Classes 6 to 12 Maths textbook solutions and formulas.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'rajasthan-board',
    name: { hi: 'राजस्थान बोर्ड (RBSE)', en: 'Rajasthan Board (RBSE)' },
    title: { hi: 'राजस्थान बोर्ड कक्षा 6–12 गणित समाधान', en: 'Rajasthan Board Class 6–12 Maths Solutions' },
    description: {
      hi: 'माध्यमिक शिक्षा बोर्ड राजस्थान (RBSE) कक्षा 6 से 12 गणित के संपूर्ण हल, महत्वपूर्ण प्रश्न और नोट्स।',
      en: 'Board of Secondary Education Rajasthan (RBSE) Classes 6 to 12 complete Mathematics solutions and study material.',
    },
    classes: [6, 7, 8, 9, 10, 11, 12],
  },
];

async function resolveStateBoardsPath(segments, { preview, terms, home }) {
  const classes = await ClassLevel.find(vis(ClassLevel, preview))
    .sort({ number: -1 })
    .select('number name slug')
    .lean();

  const boardCrumb = { label: { hi: 'राज्य बोर्ड', en: 'State Boards' }, url: '/state-boards' };

  if (segments.length === 1) {
    return {
      type: 'stateBoards',
      data: {
        level: 'hub',
        boards: STATE_BOARDS,
        classes: classes.map((c) => ({ ...c, url: urls.class(c) })),
      },
      breadcrumbs: [home, boardCrumb],
      seo: {
        title: 'State Boards Maths Solutions: Bihar, Jharkhand, UP, MP, Rajasthan | Passion Maths Study',
        description: 'Class 6 to 12 State Board Mathematics solutions, syllabus, NCERT mapping and revision notes for Bihar, UP, Jharkhand, MP, and Rajasthan boards.',
        canonical: '/state-boards',
      },
    };
  }

  const boardSlug = segments[1];
  const board = STATE_BOARDS.find((b) => b.slug === boardSlug) || {
    slug: boardSlug,
    name: { hi: boardSlug.replace(/-/g, ' ').toUpperCase(), en: boardSlug.replace(/-/g, ' ').toUpperCase() },
    title: { hi: `${boardSlug.replace(/-/g, ' ').toUpperCase()} गणित समाधान`, en: `${boardSlug.replace(/-/g, ' ').toUpperCase()} Maths Solutions` },
    description: { hi: 'राज्य बोर्ड गणित समाधान एवं नोट्स', en: 'State board mathematics solutions and notes.' },
    classes: [6, 7, 8, 9, 10, 11, 12],
  };

  return {
    type: 'stateBoards',
    data: {
      level: 'board',
      board,
      boards: STATE_BOARDS,
      classes: classes.map((c) => ({ ...c, url: urls.class(c) })),
    },
    breadcrumbs: [home, boardCrumb, { label: board.name, url: `/state-boards/${board.slug}` }],
    seo: {
      title: `${board.title?.en || board.name?.en} | Passion Maths Study`,
      description: board.description?.en || 'Complete state board mathematics solutions and notes for Classes 6 to 12.',
      canonical: `/state-boards/${board.slug}`,
    },
  };
}

export async function resolvePath(pathname, { preview = false, page = 1, limit = 15, session, previewToken } = {}) {
  const effectiveSession = session || (await AcademicSession.findOne({ isActive: true, isCurrent: true }).select('slug').lean())?.slug || '2026-27';
  const vis = (Model, isPreview, extra = {}) => sessionVis(Model, isPreview, extra, effectiveSession);
  const segments = String(pathname || '/')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s).toLowerCase());
  if (segments.length > 6) throw new ApiError(404, 'Page not found');
  const terms = await getTerms();
  const override = preview ? getPreview(previewToken) : null;
  const home = { label: term(terms, 'home'), url: '/' };

  if (segments.length === 0) return { type: 'home' };

  if (segments[0] === 'study-materials') {
    const key = segments.length > 1 ? `study-materials/${segments[1]}` : 'study-materials';
    return attachLanding(await resolveStudyMaterialsPath(segments, { preview, page, limit, session: effectiveSession, terms, home }), key, preview, override);
  }

  if (segments[0] === 'notes' || segments[0] === 'revision-notes') {
    const key = `notes/${segments[1] || 'ncert-chapter-wise-notes'}`;
    return attachLanding(await resolveNotesPath(segments, { preview, page, limit, session: effectiveSession, terms, home }), key, preview, override);
  }

  if (segments[0] === 'state-boards') {
    const key = segments.length > 1 ? `state-boards/${segments[1]}` : 'state-boards';
    return attachLanding(await resolveStateBoardsPath(segments, { preview, terms, home }), key, preview, override);
  }

  if (segments[0] === 'reference-solutions' || segments[0] === 'reference-books') {
    const key = segments.length > 1 ? `reference-solutions/${segments[1]}` : 'reference-solutions';
    return attachLanding(await resolveReferenceSolutionsPath(segments, { preview, page, limit, session: effectiveSession, previewToken, override, terms, home }), key, preview, override);
  }

  const ctx = await loadSubjectContext(segments, preview);

  // Static pages: /about-us, /privacy-policy, …
  if (!ctx) {
    if (segments.length !== 1) throw new ApiError(404, 'Page not found');
    const pageDoc = await Page.findOne(vis(Page, preview, { slug: segments[0] })).populate({ path: 'seo.ogImage', select: MEDIA_SELECT });
    if (!pageDoc) throw new ApiError(404, 'Page not found');
    applyOverride(pageDoc, override, 'Page');
    const data = pageDoc.toObject();
    const url = urls.page(data);
    return {
      type: 'page',
      data: { page: data },
      breadcrumbs: [home, { label: data.title, url }],
      seo: seoFor(data, { title: pick(data.title), description: describe(data.excerpt, describe(data.content)), url }),
    };
  }

  const { cls, subjects } = ctx;
  const classLabel = term(terms, 'class', cls.number);
  const classCrumb = { label: classLabel, url: urls.class(cls) };

  if (segments.length === 1) {
    if (subjects.length === 1) return { type: 'redirect', redirect: urls.subject(cls, subjects[0]) };
    return {
      type: 'class',
      data: { class: cls, subjects: subjects.map((s) => ({ ...s, url: urls.subject(cls, s) })) },
      breadcrumbs: [home, classCrumb],
      seo: seoFor(cls, { title: pick(cls.name) || classLabel.en, description: describe(cls.description), url: urls.class(cls) }),
    };
  }

  const subject = subjects.find((s) => isSubjectMatch(s, segments[1]));
  if (!subject) throw new ApiError(404, 'Subject not found');
  const subjectUrl = urls.subject(cls, subject);
  const subjectCrumb = { label: subject.name, url: subjectUrl };
  const crumbsBase = subjects.length === 1 ? [home, { label: classLabel, url: subjectUrl }, subjectCrumb] : [home, classCrumb, subjectCrumb];
  const subjectTitle = combine(classLabel, subject.name);
  const scope = { class: cls._id, subject: subject._id };

  const chapterList = async (withExercises, withTopics) => {
    const chapters = await Chapter.find(vis(Chapter, preview, scope))
      .sort({ sortOrder: 1, number: 1 })
      .select('number title slug shortDescription image status featured')
      .populate({ path: 'image', select: MEDIA_SELECT })
      .lean();
    const counts = await countsForChapters(chapters.map((c) => c._id), preview, effectiveSession);

    let exercisesByChapter = new Map();
    if (withExercises) {
      const exercises = await Exercise.find(vis(Exercise, preview, { chapter: { $in: chapters.map((c) => c._id) } }))
        .sort({ sortOrder: 1, number: 1 })
        .select('number title slug chapter status')
        .lean();
      const qCounts = await countsForExercises(exercises.map((e) => e._id), preview, effectiveSession);
      exercisesByChapter = exercises.reduce((map, e) => {
        const key = String(e.chapter);
        const ch = chapters.find((c) => String(c._id) === key);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...e, questionCount: qCounts[String(e._id)] || 0, url: urls.exercise(cls, subject, ch, e) });
        return map;
      }, new Map());
    }

    let topicsByChapter = new Map();
    if (withTopics) {
      const topics = await Topic.find(vis(Topic, preview, { chapter: { $in: chapters.map((c) => c._id) } }))
        .sort({ sortOrder: 1, number: 1 })
        .select('number title slug chapter difficulty estimatedTime status')
        .lean();
      topicsByChapter = topics.reduce((map, t) => {
        const key = String(t.chapter);
        const ch = chapters.find((c) => String(c._id) === key);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...t, url: urls.topic(cls, subject, ch, t) });
        return map;
      }, new Map());
    }

    return chapters.map((ch) => ({
      ...ch,
      url: urls.chapter(cls, subject, ch),
      exerciseCount: counts.exercises[String(ch._id)] || 0,
      questionCount: counts.questions[String(ch._id)] || 0,
      exercises: withExercises ? exercisesByChapter.get(String(ch._id)) || [] : undefined,
      topics: withTopics ? topicsByChapter.get(String(ch._id)) || [] : undefined,
    }));
  };

  if (segments.length === 2) {
    const [chapters, noteCount, resourceCount, bookCount, importantCount, sessions] = await Promise.all([
      chapterList(true, true),
      Note.countDocuments(vis(Note, preview, scope)),
      Resource.countDocuments(vis(Resource, preview, scope)),
      Book.countDocuments(vis(Book, preview, { class: cls._id })),
      ImportantQuestion.countDocuments(vis(ImportantQuestion, preview, scope)),
      AcademicSession.find({ isActive: true }).sort({ sortOrder: 1, year: -1 }).lean(),
    ]);

    const activeSessions = sessions.length ? sessions : [
      { name: '2026–27', slug: '2026-27', year: 2026, isCurrent: true },
      { name: '2025–26', slug: '2025-26', year: 2025, isCurrent: false },
      { name: '2024–25', slug: '2024-25', year: 2024, isCurrent: false },
    ];
    const currentSession = session || activeSessions.find((s) => s.isCurrent)?.name || activeSessions[0]?.name || '2026–27';

    const subjectResult = {
      type: 'subject',
      data: {
        class: cls,
        subject,
        chapters,
        academicSessions: activeSessions,
        currentSession,
        noteCount,
        resourceCount,
        bookCount,
        importantCount,
        links: {
          exercises: urls.exercises(cls, subject),
          notes: urls.notes(cls, subject),
          resources: urls.resources(cls, subject),
          books: urls.books(cls, subject),
          importantQuestions: urls.importantQuestions(cls, subject),
        },
      },
      breadcrumbs: crumbsBase,
      seo: seoFor(cls, {
        title: `NCERT Solutions for Class ${cls.number} Maths | ${pick(subjectTitle, 'hi')}`,
        description: describe(cls.description, `Class ${cls.number} Mathematics अध्याय-wise and प्रश्नावली-wise NCERT solutions in Hindi and English.`),
        url: subjectUrl,
        image: cls.thumbnail?.url,
      }),
    };
    const key = `class-${cls.number}/${segments[1]}`;
    return attachLanding(subjectResult, key, preview, override);
  }

  const special = segments[2];
  if (special === 'prashnavali' && segments.length === 3) {
    const url = urls.exercises(cls, subject);
    const label = term(terms, 'exerciseWise');
    return {
      type: 'subjectExercises',
      data: { class: cls, subject, chapters: await chapterList(true, false) },
      breadcrumbs: [...crumbsBase, { label, url }],
      seo: seoFor(null, { title: `Class ${cls.number} Maths ${label.en}`, description: `Class ${cls.number} Maths प्रश्नावली-wise NCERT solutions.`, url }),
    };
  }

  if (special === 'notes') {
    const listUrl = urls.notes(cls, subject);
    const notesCrumb = { label: term(terms, 'notes'), url: listUrl };
    if (segments.length === 3) {
      const notes = await Note.find(vis(Note, preview, scope))
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('title summary slug chapter tags status')
        .populate({ path: 'chapter', select: 'number title slug' })
        .lean();
      return {
        type: 'notesList',
        data: { class: cls, subject, notes: notes.map((n) => ({ ...n, url: urls.note(cls, subject, n) })) },
        breadcrumbs: [...crumbsBase, notesCrumb],
        seo: seoFor(null, { title: `Class ${cls.number} Maths Notes`, description: `Class ${cls.number} Mathematics notes and formulas in Hindi and English.`, url: listUrl }),
      };
    }
    if (segments.length === 4) {
      const note = await Note.findOne(vis(Note, preview, { ...scope, slug: segments[3] })).populate([
        { path: 'attachments.media', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        { path: 'chapter', select: 'number title slug' },
        { path: 'seo.ogImage', select: MEDIA_SELECT },
      ]);
      if (!note) throw new ApiError(404, 'Note not found');
      if (applyOverride(note, override, 'Note')) await note.populate([{ path: 'attachments.media', select: MEDIA_SELECT }, { path: 'video', select: VIDEO_SELECT }]);
      const data = note.toObject();
      const url = urls.note(cls, subject, data);
      data.attachments = cleanAttachments(data.attachments);
      data.video = cleanVideoRef(data.video);
      if (data.chapter) data.chapter.url = urls.chapter(cls, subject, data.chapter);
      return {
        type: 'note',
        data: { class: cls, subject, note: data },
        breadcrumbs: [...crumbsBase, notesCrumb, { label: data.title, url }],
        related: await relatedFor('Note', data, terms, preview),
        seo: seoFor(data, { title: `${pick(data.title)} | Class ${cls.number} Maths Notes`, description: describe(data.summary, describe(data.content)), url }),
      };
    }
    throw new ApiError(404, 'Page not found');
  }

  if (special === 'resources' && segments.length === 3) {
    const listUrl = urls.resources(cls, subject);
    const resourcesCrumb = { label: { hi: 'अध्ययन सामग्री व पीडीएफ', en: 'Study Material & PDFs' }, url: listUrl };
    const resources = await Resource.find(vis(Resource, preview, scope))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate([
        { path: 'chapter', select: 'number title slug' },
        { path: 'topic', select: 'number title slug' },
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ])
      .lean();
    return {
      type: 'resourcesList',
      data: {
        class: cls,
        subject,
        resources: resources.map((r) => ({
          ...r,
          fileUrl: r.file?.url || r.fileUrl || '',
          fileSize: r.fileSize || (r.file?.bytes ? `${(r.file.bytes / (1024 * 1024)).toFixed(1)} MB` : ''),
          thumbnailUrl: r.thumbnail?.url || '',
          chapter: r.chapter ? { ...r.chapter, url: urls.chapter(cls, subject, r.chapter) } : null,
          topic: r.topic && r.chapter ? { ...r.topic, url: urls.topic(cls, subject, r.chapter, r.topic) } : null,
        })),
      },
      breadcrumbs: [...crumbsBase, resourcesCrumb],
      seo: seoFor(null, {
        title: `Class ${cls.number} Maths PDF Notes, Worksheets & Formula Sheets`,
        description: `Download Class ${cls.number} Mathematics PDF notes, formula sheets, worksheets, sample papers and assignments.`,
        url: listUrl,
      }),
    };
  }

  if (special === 'books' && segments.length === 3) {
    const listUrl = urls.books(cls, subject);
    const booksCrumb = { label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' }, url: listUrl };
    const books = await Book.find(vis(Book, preview, { class: cls._id }))
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate([
        { path: 'chapter', select: 'number title slug' },
        { path: 'coverImage', select: MEDIA_SELECT },
      ])
      .lean();
    return {
      type: 'booksList',
      data: {
        class: cls,
        subject,
        books: books.map((b) => ({
          ...b,
          coverUrl: b.coverImage?.url || b.coverUrl || '',
          chapter: b.chapter ? { ...b.chapter, url: urls.chapter(cls, subject, b.chapter) } : null,
        })),
      },
      breadcrumbs: [...crumbsBase, booksCrumb],
      seo: seoFor(null, {
        title: `Recommended Reference Books for Class ${cls.number} Maths`,
        description: `Best reference books, NCERT textbooks, and competitive mathematics guides for Class ${cls.number}.`,
        url: listUrl,
      }),
    };
  }

  if (special === 'important-questions' && segments.length === 3) {
    const url = urls.importantQuestions(cls, subject);
    const pageSize = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const filter = vis(ImportantQuestion, preview, scope);
    const [items, total] = await Promise.all([
      ImportantQuestion.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate([
          { path: 'attachments.media', select: MEDIA_SELECT },
          ...blockPopulate(),
          { path: 'chapter', select: 'number title slug' },
        ])
        .lean(),
      ImportantQuestion.countDocuments(filter),
    ]);
    const label = term(terms, 'importantQuestions');
    return {
      type: 'importantQuestions',
      data: {
        class: cls,
        subject,
        items: items.map((iq) => ({
          ...iq,
          attachments: cleanAttachments(iq.attachments),
          blocks: cleanBlocks(iq.blocks),
          chapter: iq.chapter ? { ...iq.chapter, url: urls.chapter(cls, subject, iq.chapter) } : null,
        })),
        pagination: { page, limit: pageSize, total, pages: Math.ceil(total / pageSize) || 1 },
      },
      breadcrumbs: [...crumbsBase, { label, url }],
      seo: seoFor(null, { title: `Class ${cls.number} Maths ${label.en}`, description: `Class ${cls.number} Mathematics important questions with step-by-step solutions.`, url }),
    };
  }

  // Chapter → Topic / Exercise → Question
  const chapter = await Chapter.findOne(vis(Chapter, preview, { ...scope, slug: segments[2] })).populate([
    { path: 'image', select: MEDIA_SELECT },
    { path: 'featuredImage', select: MEDIA_SELECT },
    { path: 'introVideo', select: VIDEO_SELECT },
    { path: 'pdfFile', select: MEDIA_SELECT },
    { path: 'seo.ogImage', select: MEDIA_SELECT },
  ]);
  if (!chapter) throw new ApiError(404, 'अध्याय not found');
  if (segments.length === 3 && applyOverride(chapter, override, 'Chapter')) {
    await chapter.populate([
      { path: 'image', select: MEDIA_SELECT },
      { path: 'featuredImage', select: MEDIA_SELECT },
      { path: 'introVideo', select: VIDEO_SELECT },
      { path: 'pdfFile', select: MEDIA_SELECT },
    ]);
  }
  const ch = chapter.toObject();
  const chapterUrl = urls.chapter(cls, subject, ch);
  const chapterLabel = term(terms, 'chapter', ch.number);
  const chapterCrumb = { label: chapterLabel, url: chapterUrl };

  if (segments.length === 3) {
    const [topics, exercises, resources, books, notes, importantQuestions] = await Promise.all([
      Topic.find(vis(Topic, preview, { chapter: ch._id }))
        .sort({ sortOrder: 1, number: 1 })
        .populate([
          { path: 'image', select: MEDIA_SELECT },
          { path: 'video', select: VIDEO_SELECT },
        ])
        .lean(),
      Exercise.find(vis(Exercise, preview, { chapter: ch._id }))
        .sort({ sortOrder: 1, number: 1 })
        .select('number title slug description status')
        .lean(),
      Resource.find(vis(Resource, preview, { chapter: ch._id }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .populate([
          { path: 'file', select: MEDIA_SELECT },
          { path: 'thumbnail', select: MEDIA_SELECT },
        ])
        .lean(),
      Book.find(vis(Book, preview, { $or: [{ chapter: ch._id }, { class: cls._id }] }))
        .sort({ sortOrder: 1, createdAt: -1 })
        .populate({ path: 'coverImage', select: MEDIA_SELECT })
        .lean(),
      Note.find(vis(Note, preview, { chapter: ch._id })).select('title summary slug').lean(),
      ImportantQuestion.countDocuments(vis(ImportantQuestion, preview, { chapter: ch._id })),
    ]);

    const qCounts = await countsForExercises(exercises.map((e) => e._id), preview, effectiveSession);
    const siblings = await Chapter.find(vis(Chapter, preview, scope)).sort({ sortOrder: 1, number: 1 }).select('number title slug').lean();
    const index = siblings.findIndex((s) => String(s._id) === String(ch._id));
    const nav = (s) => s && { label: term(terms, 'chapter', s.number), title: s.title, url: urls.chapter(cls, subject, s) };

    return {
      type: 'chapter',
      data: {
        class: cls,
        subject,
        chapter: { ...ch, introVideo: cleanVideoRef(ch.introVideo), url: chapterUrl },
        topics: topics.map((tp) => ({
          ...tp,
          url: urls.topic(cls, subject, ch, tp),
          video: cleanVideoRef(tp.video),
        })),
        exercises: exercises.map((e) => ({ ...e, questionCount: qCounts[String(e._id)] || 0, url: urls.exercise(cls, subject, ch, e) })),
        resources: resources.map((r) => ({
          ...r,
          fileUrl: r.file?.url || r.fileUrl || '',
          fileSize: r.fileSize || (r.file?.bytes ? `${(r.file.bytes / (1024 * 1024)).toFixed(1)} MB` : ''),
          thumbnailUrl: r.thumbnail?.url || '',
        })),
        books: books.map((b) => ({
          ...b,
          coverUrl: b.coverImage?.url || b.coverUrl || '',
        })),
        notes: notes.map((n) => ({ ...n, url: urls.note(cls, subject, n) })),
        importantCount: importantQuestions,
        links: {
          importantQuestions: urls.importantQuestions(cls, subject),
          notes: urls.notes(cls, subject),
          resources: urls.resources(cls, subject),
          books: urls.books(cls, subject),
        },
        prev: nav(siblings[index - 1]),
        next: nav(siblings[index + 1]),
      },
      breadcrumbs: [...crumbsBase, chapterCrumb],
      related: await relatedFor('Chapter', ch, terms, preview),
      seo: seoFor(ch, {
        title: `Class ${cls.number} Maths ${chapterLabel.hi} – ${pick(ch.title, 'hi')} (${pick(ch.title, 'en')})`,
        description: describe(ch.shortDescription, `Class ${cls.number} Maths ${chapterLabel.hi} NCERT solutions, topics, video lessons, and step-by-step हल.`),
        url: chapterUrl,
        image: ch.featuredImage?.url || ch.image?.url,
      }),
    };
  }

  // Check for Topic page route: /class-10/maths/chapter/topic/topic-slug (segments.length === 5)
  if (segments.length === 5 && segments[3] === 'topic') {
    const topicDoc = await Topic.findOne(vis(Topic, preview, { chapter: ch._id, slug: segments[4] })).populate([
      { path: 'image', select: MEDIA_SELECT },
      { path: 'featuredImage', select: MEDIA_SELECT },
      { path: 'video', select: VIDEO_SELECT },
      { path: 'videos', select: VIDEO_SELECT },
      { path: 'attachments.media', select: MEDIA_SELECT },
      { path: 'seo.ogImage', select: MEDIA_SELECT },
    ]);
    if (!topicDoc) throw new ApiError(404, 'Topic not found');
    if (applyOverride(topicDoc, override, 'Topic')) {
      await topicDoc.populate([
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        { path: 'videos', select: VIDEO_SELECT },
        { path: 'attachments.media', select: MEDIA_SELECT },
      ]);
    }
    return shapeTopic(topicDoc, { cls, subject, ch, preview, override, terms, baseCrumbs: crumbsBase, session: effectiveSession });
  }

  // Check for segment 3 in 4-segment URLs
  if (segments.length === 4) {
    // 1. Is it a Topic slug directly under Chapter?
    const topicDoc = await Topic.findOne(vis(Topic, preview, { chapter: ch._id, slug: segments[3] })).populate([
      { path: 'image', select: MEDIA_SELECT },
      { path: 'featuredImage', select: MEDIA_SELECT },
      { path: 'video', select: VIDEO_SELECT },
      { path: 'videos', select: VIDEO_SELECT },
      { path: 'attachments.media', select: MEDIA_SELECT },
      { path: 'seo.ogImage', select: MEDIA_SELECT },
    ]);
    if (topicDoc) {
      if (applyOverride(topicDoc, override, 'Topic')) {
        await topicDoc.populate([
          { path: 'image', select: MEDIA_SELECT },
          { path: 'featuredImage', select: MEDIA_SELECT },
          { path: 'video', select: VIDEO_SELECT },
          { path: 'videos', select: VIDEO_SELECT },
          { path: 'attachments.media', select: MEDIA_SELECT },
        ]);
      }
      return shapeTopic(topicDoc, { cls, subject, ch, preview, override, terms, baseCrumbs: crumbsBase, session: effectiveSession });
    }

    // 2. Is it an Exercise?
    const exercise = await Exercise.findOne(vis(Exercise, preview, { chapter: ch._id, slug: segments[3] })).populate([
      { path: 'introVideo', select: VIDEO_SELECT },
      { path: 'introVideoEn', select: VIDEO_SELECT },
      { path: 'introVideoHi', select: VIDEO_SELECT },
      { path: 'pdfFile', select: MEDIA_SELECT },
      { path: 'seo.ogImage', select: MEDIA_SELECT },
    ]);
    if (exercise) {
      if (applyOverride(exercise, override, 'Exercise')) await exercise.populate([{ path: 'introVideo', select: VIDEO_SELECT },
      { path: 'introVideoEn', select: VIDEO_SELECT },
      { path: 'introVideoHi', select: VIDEO_SELECT }, { path: 'pdfFile', select: MEDIA_SELECT }]);
      const ex = exercise.toObject();
      const exerciseUrl = urls.exercise(cls, subject, ch, ex);
      const exerciseLabel = term(terms, 'exercise', ex.number);
      const exerciseCrumb = { label: exerciseLabel, url: exerciseUrl };
      const titlePrefix = `Class ${cls.number} Maths ${chapterLabel.hi} ${exerciseLabel.hi}`;

      const siblingExercises = await Exercise.find(vis(Exercise, preview, { chapter: ch._id })).sort({ sortOrder: 1, number: 1 }).select('number slug title').lean();
      const exIndex = siblingExercises.findIndex((s) => String(s._id) === String(ex._id));
      const exNav = (s) => s && { label: term(terms, 'exercise', s.number), url: urls.exercise(cls, subject, ch, s) };

      const pageSize = Math.min(Math.max(Number(limit) || 15, 1), 50);
      const filter = vis(Question, preview, { exercise: ex._id });
      const [questions, total] = await Promise.all([
        Question.find(filter).sort({ sortOrder: 1, createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).populate(questionPopulate).lean(),
        Question.countDocuments(filter),
      ]);
      const shaped = [];
      for (const q of questions) shaped.push(await shapeQuestion(q, { preview, base: exerciseUrl }));
      return {
        type: 'exercise',
        data: {
          class: cls,
          subject,
          chapter: { _id: ch._id, number: ch.number, title: ch.title, slug: ch.slug, url: chapterUrl },
          exercise: { ...ex, introVideo: cleanVideoRef(ex.introVideo), url: exerciseUrl },
          questions: shaped,
          pagination: { page, limit: pageSize, total, pages: Math.ceil(total / pageSize) || 1 },
          siblings: siblingExercises.map((s) => ({ _id: s._id, label: term(terms, 'exercise', s.number), url: urls.exercise(cls, subject, ch, s) })),
          prev: exNav(siblingExercises[exIndex - 1]),
          next: exNav(siblingExercises[exIndex + 1]),
        },
        breadcrumbs: [...crumbsBase, chapterCrumb, exerciseCrumb],
        related: await relatedFor('Exercise', ex, terms, preview),
        seo: seoFor(ex, {
          title: `${titlePrefix} NCERT Solutions (${pick(ch.title, 'en')})`,
          description: describe(ex.description, `${titlePrefix} के सभी प्रश्नों के step-by-step हल – Hindi & English medium.`),
          url: exerciseUrl,
        }),
        faq: shaped.slice(0, 10).map((q) => ({ question: describe(q.text), answer: describe(q.answer) })).filter((f) => f.question && f.answer),
      };
    }

    throw new ApiError(404, 'Page not found');
  }

  // 5 segments: Question under Exercise
  if (segments.length === 5) {
    const exercise = await Exercise.findOne(vis(Exercise, preview, { chapter: ch._id, slug: segments[3] }));
    if (!exercise) throw new ApiError(404, 'प्रश्नावली not found');
    const ex = exercise.toObject();
    const exerciseUrl = urls.exercise(cls, subject, ch, ex);
    const exerciseLabel = term(terms, 'exercise', ex.number);
    const exerciseCrumb = { label: exerciseLabel, url: exerciseUrl };
    const titlePrefix = `Class ${cls.number} Maths ${chapterLabel.hi} ${exerciseLabel.hi}`;

    const question = await Question.findOne(vis(Question, preview, { exercise: ex._id, slug: segments[4] })).populate([
      ...questionPopulate,
      { path: 'seo.ogImage', select: MEDIA_SELECT },
    ]);
    if (!question) throw new ApiError(404, 'Question not found');
    if (applyOverride(question, override, 'Question')) await question.populate(questionPopulate);
    const shaped = await shapeQuestion(question, { preview, override, base: exerciseUrl });
    const siblings = await Question.find(vis(Question, preview, { exercise: ex._id })).sort({ sortOrder: 1, createdAt: 1 }).select('number slug').lean();
    const qIndex = siblings.findIndex((s) => String(s._id) === String(question._id));
    const qNav = (s) => s && { label: term(terms, 'question', s.number), url: `${exerciseUrl}/${s.slug}` };
    const questionLabel = term(terms, 'question', shaped.number);
    const q = question.toObject();
    return {
      type: 'question',
      data: {
        class: cls,
        subject,
        chapter: { _id: ch._id, number: ch.number, title: ch.title, slug: ch.slug, url: chapterUrl },
        exercise: { _id: ex._id, number: ex.number, title: ex.title, slug: ex.slug, url: exerciseUrl },
        question: shaped,
        prev: qNav(siblings[qIndex - 1]),
        next: qNav(siblings[qIndex + 1]),
      },
      breadcrumbs: [...crumbsBase, chapterCrumb, exerciseCrumb, { label: questionLabel, url: shaped.url }],
      related: await relatedFor('Question', q, terms, preview),
      seo: seoFor(q, {
        title: `${titlePrefix} ${questionLabel.hi} Solution`,
        description: describe(shaped.text, `${titlePrefix} ${questionLabel.hi} का step-by-step हल.`),
        url: shaped.url,
        image: shaped.attachments[0]?.media?.url,
      }),
      faq: [{ question: describe(shaped.text), answer: describe(shaped.answer) }].filter((f) => f.question && f.answer),
    };
  }

  throw new ApiError(404, 'Page not found');
}
