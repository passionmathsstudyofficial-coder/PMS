import { StudyClass, StudyChapter, StudyTopic, QuestionCategory, QuestionSet } from '../models/StudyContent.js';
import { publicParentFilter, visibleParents } from '../services/relationships.js';
import crypto from 'node:crypto';
import { cache } from '../lib/cache.js';
import express from 'express';
import { driveDocument, normalizeDocumentUrl } from '../../../shared/documents.js';
import { mergeLanguageFields } from '../../../shared/localization.js';
import { languageResponse } from '../middleware/language.js';
import { hasPermission } from '../lib/permissions.js';
import { isObjectId } from '../lib/request.js';
import {
  AcademicSession,
  ensureDefaultSessions,
  AdSlot,
  Announcement,
  Book,
  BookClass,
  Chapter,
  ClassLevel,
  Exercise,
  ImportantQuestion,
  Note,
  Page,
  Question,
  RelatedContent,
  Resource,
  Media,
  Section,
  Solution,
  Subject,
  Template,
  Topic,
} from '../models/index.js';
import { optionalAuth, requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { assertNoChildren, crudRouter } from '../services/crud.js';
import { logActivity, labelOf } from '../services/activity.js';
import { BOOK_SELECT, MEDIA_SELECT, RESOURCE_SELECT, VIDEO_SELECT, blockPopulate, questionPopulate, solutionPopulate } from '../services/populate.js';
import { ensureDefaultLandingPages, ensureLandingPageByKey, getLandingRegistry } from '../services/landingPages.js';


const router = express.Router();
router.use(async (req, res, next) => { if (req.method === 'GET') await cache.sync(); next(); });
router.use((req,res,next) => req.method === 'GET' ? optionalAuth(req,res,() => req.query.scope === 'admin' || req.admin && req.query.lang === undefined ? next() : languageResponse(req,res,next)) : next());
const idFilter = (query, keys) =>
  Object.fromEntries(keys.filter((k) => isObjectId(query[k])).map((k) => [k, query[k]]));
const copySuffix = () => `copy-${crypto.randomBytes(2).toString('hex')}`;
const copyTitle = (value) => ({
  hi: value?.hi ? `${value.hi} (कॉपी)` : '',
  en: value?.en ? `${value.en} (copy)` : '',
  mixed: value?.mixed || '',
});

const classPopulate = { path: 'class', select: 'number name slug' };
const subjectPopulate = { path: 'subject', select: 'name slug' };
const seoImage = { path: 'seo.ogImage', select: MEDIA_SELECT };

const studyFilters = q => ({
  ...idFilter(q, ['studyClass', 'studyChapter', 'studyTopic', 'questionCategory', 'questionSet']),
  ...(q.module ? { module: String(q.module) } : {}),
  ...(q.slug ? { slug: String(q.slug) } : {}),
});
const studyMedia = [{ path: 'thumbnail', select: MEDIA_SELECT }, { path: 'pdfFile', select: MEDIA_SELECT }, seoImage];

for (const [path, Model] of [
  ['study-classes', StudyClass],
  ['study-chapters', StudyChapter],
  ['study-topics', StudyTopic],
  ['question-categories', QuestionCategory],
  ['question-sets', QuestionSet],
]) {
  const filters = async q => {
    const scope = studyFilters(q);
    if (Model === StudyClass) return scope;
    if (Model === QuestionSet && isObjectId(q.forChapter)) scope.$or = [{ studyChapter: null }, { studyChapter: q.forChapter }];
    const module = scope.module;
    delete scope.module;
    if (module && [StudyChapter, StudyTopic].includes(Model)) {
      const classes = await StudyClass.distinct('_id', { module, ...(scope.studyClass ? { _id: scope.studyClass } : {}) });
      scope.studyClass = { $in: classes };
    }
    if (Model === StudyTopic && scope.studyClass) {
      const chapters = await StudyChapter.distinct('_id', {
        studyClass: scope.studyClass, ...(scope.studyChapter ? { _id: scope.studyChapter } : {}),
      });
      delete scope.studyClass;
      scope.studyChapter = { $in: chapters };
    }
    return scope;
  };
  router.use('/' + path, crudRouter(Model, {
    adminFilters: filters,
    publicFilters: filters,
    defaultSort: { sortOrder: 1, number: 1, _id: 1 },
    populate: { list: studyMedia, detail: studyMedia },
    prepareDuplicate: plain => ({ ...plain, slug: `${plain.slug.slice(0, 108)}-${copySuffix()}`, title: copyTitle(plain.title) }),
  }));
}

router.use('/book-classes', crudRouter(BookClass, {
  entityType: 'BookClass',
  adminFilters: q => idFilter(q, ['book', 'class']),
  publicFilters: q => idFilter(q, ['book', 'class']),
  populate: { list: [classPopulate, { path: 'book', select: 'title slug' }, { path: 'subjects', select: 'name slug' }], detail: [classPopulate, { path: 'book', select: 'title slug' }, { path: 'subjects', select: 'name slug' }, { path: 'thumbnail', select: MEDIA_SELECT }] },
  beforeDelete: async doc => {
    for (const Model of [Chapter, Note, ImportantQuestion, Resource]) {
      await assertNoChildren(Model, { book: doc.book, class: doc.class }, 'This book class still has {count} linked records. Move or delete them first.');
    }
  },
}));

router.use(
  '/classes',
  crudRouter(ClassLevel, {
    entityType: 'Class',
    defaultSort: { sortOrder: 1, number: 1 },
    populate: {
      list: [{ path: 'subjects', select: 'name slug' }],
      detail: [{ path: 'thumbnail', select: MEDIA_SELECT }, seoImage, { path: 'subjects', select: 'name slug isPublic' }],
    },
    beforeDelete: async (doc) => {
      await assertNoChildren(Chapter, { class: doc._id }, 'This class still has {count} अध्याय. Delete or move them first.');
      await assertNoChildren(Note, { class: doc._id }, 'This class still has {count} notes. Delete them first.');
      await assertNoChildren(ImportantQuestion, { class: doc._id }, 'This class still has {count} important questions. Delete them first.');
    },
    prepareDuplicate: async (plain) => {
      const max = await ClassLevel.findOne().sort({ number: -1 }).select('number').lean();
      const number = (max?.number || 0) + 1;
      return { ...plain, number, slug: `class-${number}`, name: copyTitle(plain.name) };
    },
    extend: (r) => {
      r.get('/:classId/chapters', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.classId)) throw new ApiError(400, 'Invalid class id');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        const base = { class: req.params.classId, ...idFilter(req.query, ['subject']) };
        const items = await Chapter.find(admin ? base : { ...Chapter.publicFilter(base), ...await publicParentFilter(Chapter) })
          .sort({ sortOrder: 1, number: 1 })
          .populate(subjectPopulate)
          .lean();
        res.json({ items, total: items.length });
      });
    },
  }),
);

router.use(
  '/subjects',
  crudRouter(Subject, {
    entityType: 'Subject',
    publicFilters: () => ({ isPublic: true }),
    defaultSort: { sortOrder: 1 },
    beforeDelete: async (doc) => {
      await assertNoChildren(Chapter, { subject: doc._id }, 'This subject still has {count} अध्याय.');
      await ClassLevel.updateMany({ subjects: doc._id }, { $pull: { subjects: doc._id } });
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, name: copyTitle(plain.name), isPublic: false }),
  }),
);

router.use(
  '/chapters',
  crudRouter(Chapter, {
    entityType: 'Chapter',
    defaultSort: { sortOrder: 1, number: 1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'book']),
      ...(q.book === 'none' ? { book: null } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'book']),
      ...(q.book === 'none' ? { book: null } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [classPopulate, subjectPopulate, { path: 'book', select: 'title author slug' }],
      detail: [
        classPopulate,
        subjectPopulate,
        { path: 'book', select: 'title author slug' },
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'introVideo', select: VIDEO_SELECT },
        { path: 'pdfFile', select: MEDIA_SELECT },
        { path: 'relatedChapters', select: 'number title slug class' },
        seoImage,
      ],
    },
    beforeWrite: async (doc) => {
      if (!doc.subject && doc.class) {
        const cls = await ClassLevel.findById(doc.class).select('subjects').lean();
        if (cls?.subjects?.length) doc.subject = cls.subjects[0];
        else {
          const defaultSub = await Subject.findOne().select('_id').lean();
          if (defaultSub) doc.subject = defaultSub._id;
        }
      }
      if (!doc.subject && doc.book) {
        const b = await Book.findById(doc.book).select('subject class').lean();
        if (b?.subject) doc.subject = b.subject;
        if (!doc.class && b?.class) doc.class = b.class;
      }
    },
    beforeDelete: async (doc) => {
      await assertNoChildren(Exercise, { chapter: doc._id }, 'This अध्याय still has {count} प्रश्नावली. Delete them first (nothing else is removed automatically).');
    },
    afterDelete: async (doc) => {
      await Promise.all([
        Topic.deleteMany({ chapter: doc._id }),
        Resource.deleteMany({ chapter: doc._id }),
        Book.updateMany({ chapter: doc._id }, { $unset: { chapter: 1 } }),
        Note.updateMany({ chapter: doc._id }, { $unset: { chapter: 1 } }),
        ImportantQuestion.updateMany({ chapter: doc._id }, { $unset: { chapter: 1 } }),
        Chapter.updateMany({ relatedChapters: doc._id }, { $pull: { relatedChapters: doc._id } }),
        RelatedContent.deleteMany({ source: doc._id }),
      ]);
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, title: copyTitle(plain.title) }),
    extend: (r) => {
      r.get('/:id/exercises', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid chapter id');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        const filter = {
          chapter: req.params.id,
          ...(req.query.academicSession ? { academicSession: String(req.query.academicSession) } : {}),
        };
        const items = await Exercise.find(admin ? filter : { ...Exercise.publicFilter(filter), ...await publicParentFilter(Exercise) })
          .sort({ sortOrder: 1, number: 1 })
          .populate([{ path: 'chapter', select: 'number title slug' }])
          .lean();
        res.json({ items, total: items.length });
      });

      r.post('/:id/exercises', requireAuth, requirePermission('content:write'), async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid chapter id');
        const chapter = await Chapter.findById(req.params.id).lean();
        if (!chapter) throw new ApiError(404, 'Chapter not found');
        const payload = {
          ...req.body,
          chapter: chapter._id,
          class: req.body.class || chapter.class,
          subject: req.body.subject || chapter.subject,
          academicSession: req.body.academicSession || chapter.academicSession,
          createdBy: req.admin._id,
          updatedBy: req.admin._id,
        };
        const exercise = new Exercise(payload);
        await exercise.save();
        cache.invalidate();
        await logActivity(req, { action: 'create', entityType: 'Exercise', entityId: exercise._id, entityLabel: labelOf(exercise) });
        res.status(201).json(exercise);
      });
    },
  }),
);

router.use(
  '/topics',
  crudRouter(Topic, {
    entityType: 'Topic',
    defaultSort: { sortOrder: 1, number: 1 },
    adminFilters: async (q) => ({
      ...idFilter(q, ['chapter', 'class', 'subject']),
      ...(isObjectId(q.book) ? {
        $and: [{ chapter: { $in: await Chapter.distinct('_id', { book: q.book }) } }],
      } : {}),
      ...(q.difficulty ? { difficulty: String(q.difficulty) } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
    }),
    publicFilters: (q) => idFilter(q, ['chapter', 'class', 'subject']),
    populate: {
      list: [{ path: 'chapter', select: 'number title slug' }, classPopulate, subjectPopulate],
      detail: [
        { path: 'chapter', select: 'number title slug class subject', populate: [classPopulate, subjectPopulate] },
        classPopulate,
        subjectPopulate,
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        { path: 'videos', select: VIDEO_SELECT },
        { path: 'attachments.media', select: MEDIA_SELECT },
        { path: 'resources', select: RESOURCE_SELECT, populate: [{ path: 'file', select: MEDIA_SELECT }, { path: 'thumbnail', select: MEDIA_SELECT }] },
        { path: 'books', select: BOOK_SELECT, populate: { path: 'coverImage', select: MEDIA_SELECT } },
        seoImage,
      ],
    },
    afterDelete: async (doc) => {
      await Promise.all([
        Resource.updateMany({ topic: doc._id }, { $unset: { topic: 1 } }),
        Book.updateMany({ topic: doc._id }, { $unset: { topic: 1 } }),
        RelatedContent.deleteMany({ source: doc._id }),
      ]);
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, title: copyTitle(plain.title) }),
  }),
);

router.use(
  '/resources',
  crudRouter(Resource, {
    entityType: 'Resource',
    beforeWrite: async (doc) => {
      try {
        doc.fileUrl = normalizeDocumentUrl(doc.fileUrl);
        doc.externalUrl = normalizeDocumentUrl(doc.externalUrl);
        if (!doc.fileUrl && driveDocument(doc.externalUrl)) doc.fileUrl = doc.externalUrl;
      } catch (error) { throw new ApiError(400, error.message); }
      if (!doc.file) return;
      const file = await Media.findById(doc.file).select('format bytes').lean();
      if (!file) throw new ApiError(400, 'Selected attachment does not exist. Choose a file from the Media Library.');
      doc.fileType = file.format;
      if (!doc.fileSize && file.bytes) doc.fileSize = `${(file.bytes / (1024 * 1024)).toFixed(2)} MB`;
    },
    defaultSort: { sortOrder: 1, createdAt: -1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic', 'exercise', 'book']),
      ...(q.resourceType ? { resourceType: String(q.resourceType) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic', 'exercise', 'book']),
      ...(q.resourceType ? { resourceType: String(q.resourceType) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
    }),
    populate: {
      list: [
        classPopulate,
        { path: 'chapter', select: 'number title' },
        { path: 'exercise', select: 'number title slug' },
        { path: 'book', select: 'title author slug' },
        { path: 'topic', select: 'number title' },
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ],
      detail: [
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'exercise', select: 'number title slug' },
        { path: 'book', select: 'title author slug' },
        { path: 'topic', select: 'number title slug' },
        { path: 'file', select: MEDIA_SELECT },
        { path: 'thumbnail', select: MEDIA_SELECT },
      ],
    },
    prepareDuplicate: (plain) => ({ ...plain, title: copyTitle(plain.title) }),
  }),
);

router.use(
  '/books',
  crudRouter(Book, {
    entityType: 'Book',
    defaultSort: { sortOrder: 1, createdAt: -1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic']),
      ...(q.slug ? { slug: String(q.slug) } : {}),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic']),
      ...(q.slug ? { slug: String(q.slug) } : {}),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
    }),
    populate: {
      list: [classPopulate, { path: 'chapter', select: 'number title' }, { path: 'coverImage', select: MEDIA_SELECT }, { path: 'pdfFile', select: MEDIA_SELECT }],
      detail: [
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'topic', select: 'number title slug' },
        { path: 'coverImage', select: MEDIA_SELECT },
        { path: 'pdfFile', select: MEDIA_SELECT },
      ],
    },
    prepareDuplicate: (plain) => ({ ...plain, title: copyTitle(plain.title) }),
    extend: (r) => {
      r.get('/:id/classes', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid book id');
        const book = await Book.findById(req.params.id).lean();
        if (!book) throw new ApiError(404, 'Book not found');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        if (!admin && !await Book.exists(Book.publicFilter({ _id: book._id }))) throw new ApiError(404, 'Book not found');
        const entries = await BookClass.find(admin ? {book:book._id} : BookClass.publicFilter({book:book._id})).populate({path:'class',populate:{path:'subjects',select:'name slug'}}).sort({sortOrder:1}).lean();
        const visibleClasses = new Set((await ClassLevel.find(admin ? {} : ClassLevel.publicFilter()).select('_id').lean()).map(row=>String(row._id)));
        const items = entries.filter(row => row.class && visibleClasses.has(String(row.class._id))).map(row => ({...row.class,...row,_id:row.class._id,number:row.class.number,bookClassId:row._id}));
        res.json({ items, total: items.length });
      });

      r.post('/:id/classes', requireAuth, requirePermission('content:write'), async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid book id');
        const book = await Book.findById(req.params.id);
        if (!book) throw new ApiError(404, 'Book not found');
        const { classNumber, classId } = req.body;
        let num = Number(classNumber);
        if (!num && classId && isObjectId(classId)) {
          const cls = await ClassLevel.findById(classId).select('number').lean();
          if (cls) num = cls.number;
        }
        const cls = await ClassLevel.findOne({number:num});
        if (!cls) throw new ApiError(400, 'Create the class in Class Management first.');
        let entry = await BookClass.findOne({book:book._id,class:cls._id});
        if (!entry) entry = await BookClass.create({book:book._id,class:cls._id,name:cls.name,slug:cls.slug,subjects:cls.subjects,status:'draft'});
        await logActivity(req, { action:'update',entityType:'BookClass',entityId:entry._id,entityLabel:labelOf(entry) });
        cache.invalidate();
        res.status(201).json(entry);
      });

      r.get('/:id/chapters', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid book id');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        const filter = {
          book: req.params.id,
          ...idFilter(req.query, ['class', 'subject']),
          ...(req.query.academicSession ? { academicSession: String(req.query.academicSession) } : {}),
        };
        const items = await Chapter.find(admin ? filter : { ...Chapter.publicFilter(filter), ...await publicParentFilter(Chapter) })
          .sort({ sortOrder: 1, number: 1 })
          .populate([classPopulate, subjectPopulate])
          .lean();
        res.json({ items, total: items.length });
      });

      r.post('/:id/chapters', requireAuth, requirePermission('content:write'), async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid book id');
        const book = await Book.findById(req.params.id).lean();
        if (!book) throw new ApiError(404, 'Book not found');
        let subject = req.body.subject || book.subject;
        let classId = req.body.class || book.class;
        if (!subject && classId) {
          const cls = await ClassLevel.findById(classId).select('subjects').lean();
          subject = cls?.subjects?.[0];
        }
        if (!subject) {
          const defaultSub = await Subject.findOne().select('_id').lean();
          subject = defaultSub?._id;
        }
        const payload = {
          ...req.body,
          book: book._id,
          class: classId,
          subject,
          createdBy: req.admin._id,
          updatedBy: req.admin._id,
        };
        const chapter = new Chapter(payload);
        await chapter.save();
        cache.invalidate();
        await logActivity(req, { action: 'create', entityType: 'Chapter', entityId: chapter._id, entityLabel: labelOf(chapter) });
        res.status(201).json(chapter);
      });
    },
  }),
);

router.use(
  '/announcements',
  crudRouter(Announcement, {
    entityType: 'Announcement',
    hasStatus: false,
    defaultSort: { sortOrder: 1, createdAt: -1 },
    adminFilters: (q) => (q.isVisible !== undefined ? { isVisible: q.isVisible === 'true' } : {}),
    prepareDuplicate: (plain) => ({ ...plain, text: copyTitle(plain.text) }),
  }),
);

router.use(
  '/exercises',
  crudRouter(Exercise, {
    entityType: 'Exercise',
    defaultSort: { sortOrder: 1, number: 1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['chapter', 'class', 'subject']),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['chapter', 'class']),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [{ path: 'chapter', select: 'number title slug' }, classPopulate],
      detail: [
        { path: 'chapter', select: 'number title slug class subject', populate: [classPopulate, subjectPopulate] },
        { path: 'introVideo', select: VIDEO_SELECT },
      { path: 'introVideoEn', select: VIDEO_SELECT },
      { path: 'introVideoHi', select: VIDEO_SELECT },
        { path: 'pdfFile', select: MEDIA_SELECT },
        seoImage,
      ],
    },
    beforeWrite: async (doc) => {
      if (doc.chapter && (!doc.class || !doc.subject || !doc.academicSession)) {
        const ch = await Chapter.findById(doc.chapter).select('class subject academicSession').lean();
        if (ch) {
          if (!doc.class) doc.class = ch.class;
          if (!doc.subject) doc.subject = ch.subject;
          if (!doc.academicSession) doc.academicSession = ch.academicSession;
        }
      }
      if (!doc.subject && doc.class) {
        const cls = await ClassLevel.findById(doc.class).select('subjects').lean();
        if (cls?.subjects?.length) doc.subject = cls.subjects[0];
        else {
          const defaultSub = await Subject.findOne().select('_id').lean();
          if (defaultSub) doc.subject = defaultSub._id;
        }
      }
    },
    beforeDelete: async (doc) => {
      await assertNoChildren(Question, { exercise: doc._id }, 'This प्रश्नावली still has {count} questions. Delete them first.');
    },
    afterDelete: async (doc) => RelatedContent.deleteMany({ source: doc._id }),
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}` }),
    extend: (r) => {
      r.get('/:id/questions', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid exercise id');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        const filter = {
          exercise: req.params.id,
          ...(req.query.academicSession ? { academicSession: String(req.query.academicSession) } : {}),
        };
        const items = await Question.find(admin ? filter : { ...Question.publicFilter(filter), ...await publicParentFilter(Question) })
          .sort({ sortOrder: 1, createdAt: 1 })
          .populate([{ path: 'attachments.media', select: MEDIA_SELECT }])
          .lean();
        const qIds = items.map((q) => q._id);
        const solutionFilter = { question: { $in: qIds } };
        const solutions = await Solution.find(admin ? solutionFilter : Solution.publicFilter(solutionFilter)).select('question status methods blocks').lean();
        const solMap = new Map(solutions.map((s) => [String(s.question), s]));
        const serialized = items.map((q) => {
          const sol = solMap.get(String(q._id));
          return {
            ...q,
            solution: sol ? {
              _id: sol._id,
              status: sol.status || 'published',
              methodsCount: sol.methods?.length || 0,
              blocksCount: sol.blocks?.length || 0,
              hasSolution: true,
            } : null,
          };
        });
        res.json({ items: serialized, total: serialized.length });
      });

      r.post('/:id/questions', requireAuth, requirePermission('content:write'), async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid exercise id');
        const ex = await Exercise.findById(req.params.id).lean();
        if (!ex) throw new ApiError(404, 'Exercise not found');
        const payload = {
          ...req.body,
          exercise: ex._id,
          chapter: req.body.chapter || ex.chapter,
          class: req.body.class || ex.class,
          subject: req.body.subject || ex.subject,
          academicSession: req.body.academicSession || ex.academicSession,
          createdBy: req.admin._id,
          updatedBy: req.admin._id,
        };
        const question = new Question(payload);
        await question.save();
        if (req.body.solution) {
          await Solution.create({
            question: question._id,
            ...req.body.solution,
            status: req.body.solution.status || 'published',
            createdBy: req.admin._id,
            updatedBy: req.admin._id,
          });
        }
        cache.invalidate();
        await logActivity(req, { action: 'create', entityType: 'Question', entityId: question._id, entityLabel: labelOf(question) });
        res.status(201).json(question);
      });
    },
  }),

);

async function prepareSolution(question, req) {
  const payload = req.body?.solution;
  if (payload === undefined) return;
  let solution = await Solution.findOne({ question: question._id });
  const previousStatus = solution?.status;
  if (!solution) solution = new Solution({ question: question._id, createdBy: req.admin._id });
  const nextStatus = payload?.status || previousStatus || (hasPermission(req.admin.role, 'content:publish') ? 'published' : 'draft');
  if ((previousStatus === 'published' || nextStatus === 'published') && !hasPermission(req.admin.role, 'content:publish')) throw new ApiError(403, 'Only admins can publish or edit published solutions.');
  solution.set(mergeLanguageFields(solution.toObject(),{
    blocks: Array.isArray(payload?.blocks) ? payload.blocks : (solution.blocks?.toObject ? solution.blocks.toObject() : solution.blocks || []),
    methods: Array.isArray(payload?.methods) ? payload.methods : (solution.methods?.toObject ? solution.methods.toObject() : solution.methods || []),
    status: nextStatus,
    languageMode: payload?.languageMode || 'auto',
    template: isObjectId(payload?.template) ? payload.template : undefined,
  }));
  solution.updatedBy = req.admin._id;
  await solution.validate();
  req.pendingSolution = solution;
}

router.use(
  '/questions',
  crudRouter(Question, {
    entityType: 'Question',
    defaultSort: { sortOrder: 1, createdAt: 1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['exercise', 'chapter', 'class', 'subject', 'book', 'topic']),
      ...(['easy', 'medium', 'hard'].includes(q.difficulty) ? { difficulty: q.difficulty } : {}),
      ...(q.questionType ? { questionType: String(q.questionType) } : {}),
      ...(q.isImportant === 'true' ? { isImportant: true } : {}),
      ...(q.featured === 'true' ? { featured: true } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['exercise', 'chapter', 'book', 'topic']),
      ...(q.questionType ? { questionType: String(q.questionType) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [
        { path: 'exercise', select: 'number slug' },
        { path: 'chapter', select: 'number title slug' },
        { path: 'book', select: 'title slug' },
        { path: 'topic', select: 'number title' },
        { path: 'pdfFile', select: MEDIA_SELECT },
        { path: 'attachments.media', select: MEDIA_SELECT },
        classPopulate,
      ],
      detail: [
        ...questionPopulate,
        seoImage,
        { path: 'exercise', select: 'number slug title chapter' },
        { path: 'chapter', select: 'number title slug' },
        { path: 'book', select: 'title slug author' },
        { path: 'topic', select: 'number title slug' },
        { path: 'pdfFile', select: MEDIA_SELECT },
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'introVideo', select: VIDEO_SELECT },
        { path: 'video.video', select: VIDEO_SELECT },
        classPopulate,
        subjectPopulate,
      ],
    },
    serializeList: async (items) => {
      const qIds = items.map((q) => q._id);
      const solutions = await Solution.find({ question: { $in: qIds } }).select('question status methods blocks').lean();
      const solMap = new Map(solutions.map((s) => [String(s.question), s]));
      return items.map((q) => {
        const sol = solMap.get(String(q._id));
        return {
          ...q,
          solution: sol ? {
            _id: sol._id,
            status: sol.status || 'published',
            methodsCount: sol.methods?.length || 0,
            blocksCount: sol.blocks?.length || 0,
            hasSolution: true,
          } : null,
        };
      });
    },
    beforeWrite: prepareSolution,
    afterWrite: async (doc, req) => { if (req.pendingSolution) await req.pendingSolution.save(); },
    serialize: async (doc, req) => {
      const solution = await Solution.findOne({ question: doc._id }).populate(solutionPopulate()).lean();
      const canReadDraft = req.admin && hasPermission(req.admin.role, 'content:read');
      return { ...doc.toObject(), solution: canReadDraft || !solution?.status || solution?.status === 'published' ? solution : null };
    },
    afterDelete: async (doc) => {
      await Promise.all([Solution.deleteOne({ question: doc._id }), RelatedContent.deleteMany({ source: doc._id })]);
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}` }),
    extend: (r) => {
      r.get('/:id/solutions', optionalAuth, async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid question id');
        const admin = req.query.scope === 'admin' && req.admin && hasPermission(req.admin.role, 'content:read');
        if (!admin) {
          const question = await Question.findOne(Question.publicFilter({ _id: req.params.id })).lean();
          if (!question || !await visibleParents(question)) throw new ApiError(404, 'Question not found');
        }
        const filter = { question: req.params.id };
        const data = await Solution.findOne(admin ? filter : Solution.publicFilter(filter)).populate(solutionPopulate()).lean();
        res.json({ items: data ? [data] : [], solution: data, total: data ? 1 : 0 });
      });

      r.post('/:id/solutions', requireAuth, requirePermission('content:write'), async (req, res) => {
        if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid question id');
        const question = await Question.findById(req.params.id).lean();
        if (!question) throw new ApiError(404, 'Question not found');
        const existing = await Solution.findOne({ question: question._id });
        let saved;
        if (existing) {
          existing.set(req.body);
          existing.updatedBy = req.admin._id;
          saved = await existing.save();
        } else {
          saved = await Solution.create({
            question: question._id,
            ...req.body,
            status: req.body?.status || 'published',
            createdBy: req.admin._id,
            updatedBy: req.admin._id,
          });
        }
        cache.invalidate();
        await logActivity(req, { action: 'update', entityType: 'Solution', entityId: saved._id, entityLabel: labelOf(question) });
        res.status(201).json(saved);
      });
    },
    afterDuplicate: async (copy, source, req) => {
      const solution = await Solution.findOne({ question: source._id }).lean();
      if (solution) {
        await Solution.create({
          question: copy._id,
          blocks: solution.blocks.map(({ _id, ...b }) => b),
          methods: (solution.methods || []).map(({ _id, ...m }) => ({
            ...m,
            blocks: (m.blocks || []).map(({ _id: bId, ...b }) => b),
          })),
          status: solution.status || 'published',
          languageMode: solution.languageMode,
          createdBy: req.admin._id,
          updatedBy: req.admin._id,
        });
      }
    },
  }),
);

router.use(
  '/solutions',
  crudRouter(Solution, {
    entityType: 'Solution',
    publicRead: false,
    hasStatus: true,
    defaultSort: { updatedAt: -1 },
    adminFilters: (q) => idFilter(q, ['question']),
    populate: {
      list: [{ path: 'question', select: 'number slug exercise chapter class status', populate: [{ path: 'exercise', select: 'number' }, classPopulate] }],
      detail: [...solutionPopulate(), { path: 'question', select: 'number slug' }],
    },
  }),
);

router.use(
  '/notes',
  crudRouter(Note, {
    entityType: 'Note',
    defaultSort: { sortOrder: 1, createdAt: -1 },
    adminFilters: (q) => ({
      ...studyFilters(q),
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic', 'book']),
      ...(q.scoped === 'true' && !isObjectId(q.studyClass) ? { studyClass: { $ne: null } } : {}),
      ...(q.legacy === 'true' ? { studyClass: null } : {}),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...studyFilters(q),
      ...idFilter(q, ['class', 'chapter', 'topic', 'book']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [{ path: 'studyClass', select: 'number title slug' }, { path: 'studyChapter', select: 'number title slug' }, classPopulate, { path: 'chapter', select: 'number title' }, { path: 'topic', select: 'number title' }, { path: 'book', select: 'title author slug' }, { path: 'pdfFile', select: MEDIA_SELECT }],
      detail: [
        { path: 'studyClass', select: 'number title slug' },
        { path: 'studyChapter', select: 'number title slug' },
        { path: 'studyTopic', select: 'title slug' },
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'topic', select: 'number title slug' },
        { path: 'book', select: 'title author slug' },
        { path: 'pdfFile', select: MEDIA_SELECT },
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'introVideo', select: VIDEO_SELECT },
        { path: 'attachments.media', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        seoImage,
      ],
    },
    beforeWrite: async (doc) => {
      if (doc.studyClass) return;
      if (doc.chapter && (!doc.class || !doc.subject || !doc.academicSession)) {
        const ch = await Chapter.findById(doc.chapter).select('class subject academicSession').lean();
        if (ch) {
          if (!doc.class) doc.class = ch.class;
          if (!doc.subject) doc.subject = ch.subject;
          if (!doc.academicSession) doc.academicSession = ch.academicSession;
        }
      }
      if (!doc.subject && doc.class) {
        const cls = await ClassLevel.findById(doc.class).select('subjects').lean();
        if (cls?.subjects?.length) doc.subject = cls.subjects[0];
        else {
          const defaultSub = await Subject.findOne().select('_id').lean();
          if (defaultSub) doc.subject = defaultSub._id;
        }
      }
    },
    afterDelete: async (doc) => RelatedContent.deleteMany({ source: doc._id }),
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, title: copyTitle(plain.title) }),
  }),
);

router.use(
  '/important-questions',
  crudRouter(ImportantQuestion, {
    entityType: 'ImportantQuestion',
    defaultSort: { sortOrder: 1, createdAt: -1 },
    adminFilters: (q) => ({
      ...studyFilters(q),
      ...idFilter(q, ['class', 'subject', 'chapter', 'topic', 'book']),
      ...(q.scoped === 'true' && !isObjectId(q.studyClass) ? { studyClass: { $ne: null } } : {}),
      ...(q.legacy === 'true' ? { studyClass: null } : {}),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
      ...(q.difficulty ? { difficulty: String(q.difficulty) } : {}),
      ...(q.questionType ? { questionType: String(q.questionType) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...studyFilters(q),
      ...idFilter(q, ['class', 'chapter', 'topic', 'book']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
      ...(q.difficulty ? { difficulty: String(q.difficulty) } : {}),
      ...(q.questionType ? { questionType: String(q.questionType) } : {}),
    }),
    populate: {
      list: [{ path: 'studyClass', select: 'number title slug' }, { path: 'studyChapter', select: 'number title slug' }, classPopulate, { path: 'chapter', select: 'number title' }, { path: 'topic', select: 'number title' }, { path: 'book', select: 'title author slug' }, { path: 'pdfFile', select: MEDIA_SELECT }],
      detail: [
        { path: 'studyClass', select: 'number title slug' },
        { path: 'studyChapter', select: 'number title slug' },
        { path: 'studyTopic', select: 'title slug' },
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'topic', select: 'number title slug' },
        { path: 'book', select: 'title author slug' },
        { path: 'linkedQuestion', select: 'number slug' },
        { path: 'pdfFile', select: MEDIA_SELECT },
        { path: 'image', select: MEDIA_SELECT },
        { path: 'featuredImage', select: MEDIA_SELECT },
        { path: 'introVideo', select: VIDEO_SELECT },
        { path: 'attachments.media', select: MEDIA_SELECT },
        ...blockPopulate(),
        seoImage,
      ],
    },
    beforeWrite: async (doc) => {
      if (doc.studyClass) return;
      if (doc.chapter && (!doc.class || !doc.subject || !doc.academicSession)) {
        const ch = await Chapter.findById(doc.chapter).select('class subject academicSession').lean();
        if (ch) {
          if (!doc.class) doc.class = ch.class;
          if (!doc.subject) doc.subject = ch.subject;
          if (!doc.academicSession) doc.academicSession = ch.academicSession;
        }
      }
      if (!doc.subject && doc.class) {
        const cls = await ClassLevel.findById(doc.class).select('subjects').lean();
        if (cls?.subjects?.length) doc.subject = cls.subjects[0];
        else {
          const defaultSub = await Subject.findOne().select('_id').lean();
          if (defaultSub) doc.subject = defaultSub._id;
        }
      }
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, title: copyTitle(plain.title) }),
  }),
);

router.get('/landing-pages', requireAuth, async (req, res, next) => {
  try {
    const registry = await getLandingRegistry();
    res.json({ items: registry, total: registry.length });
  } catch (err) {
    next(err);
  }
});

router.post('/landing-pages/ensure', requireAuth, requirePermission('content:write'), async (req, res, next) => {
  try {
    const { landingKey } = req.body || {};
    if (landingKey) {
      const page = await ensureLandingPageByKey(landingKey);
      cache.invalidate();
      return res.json({ item: page });
    }
    const created = await ensureDefaultLandingPages();
    cache.invalidate();
    const registry = await getLandingRegistry();
    res.json({ createdCount: created.length, items: registry });
  } catch (err) {
    next(err);
  }
});

router.get('/landing-pages/by-key', requireAuth, async (req, res, next) => {
  try {
    const key = String(req.query.key || '').trim().toLowerCase();
    if (!key) throw new ApiError(400, 'Missing key query parameter');
    const page = await ensureLandingPageByKey(key);
    res.json({ item: page });
  } catch (err) {
    next(err);
  }
});

router.use(
  '/pages',
  crudRouter(Page, {
    entityType: 'Page',
    defaultSort: { sortOrder: 1, createdAt: 1 },
    populate: { detail: [seoImage] },
    beforeWrite: async (doc) => {
      if (!doc.subject && doc.class) {
        const cls = await ClassLevel.findById(doc.class).select('subjects').lean();
        if (cls?.subjects?.length) doc.subject = cls.subjects[0];
        else {
          const defaultSub = await Subject.findOne().select('_id').lean();
          if (defaultSub) doc.subject = defaultSub._id;
        }
      }
    },
    afterDelete: async (doc) => RelatedContent.deleteMany({ source: doc._id }),
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}`, title: copyTitle(plain.title) }),
  }),
);

router.use(
  '/sections',
  crudRouter(Section, {
    entityType: 'Section',
    defaultSort: { sortOrder: 1, createdAt: 1 },
    writePermission: 'settings:write',
    deletePermission: 'settings:write',
    adminFilters: (q) => (q.pageKey ? { page: String(q.pageKey).slice(0, 60) } : {}),
    publicFilters: (q) => (q.pageKey ? { page: String(q.pageKey).slice(0, 60) } : {}),
    populate: {
      detail: [
        { path: 'image', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        { path: 'items.image', select: MEDIA_SELECT },
        { path: 'config.classes', select: 'number name slug' },
        { path: 'config.chapters', select: 'number title slug class', populate: { path: 'class', select: 'number' } },
        { path: 'config.questions', select: 'number slug exercise', populate: { path: 'exercise', select: 'number' } },
        { path: 'config.importantQuestions', select: 'text slug marks' },
        { path: 'config.notes', select: 'title slug' },
        { path: 'config.videos', select: VIDEO_SELECT },
        { path: 'config.gallery', select: MEDIA_SELECT },
      ],
    },
    prepareDuplicate: (plain) => ({ ...plain, name: `${plain.name || plain.type} (copy)` }),
  }),
);

router.use(
  '/related-content',
  crudRouter(RelatedContent, {
    entityType: 'RelatedContent',
    publicRead: false,
    hasStatus: false,
    defaultSort: { updatedAt: -1 },
    adminFilters: (q) => ({ ...idFilter(q, ['source']), ...(q.sourceType ? { sourceType: String(q.sourceType) } : {}) }),
    populate: {
      list: [{ path: 'source', select: 'title number slug text' }],
      // items.target is not populated: "Url" items have no target model to populate.
      detail: [{ path: 'source', select: 'title number slug text' }],
    },
  }),
);

router.use(
  '/templates',
  crudRouter(Template, {
    entityType: 'Template',
    publicRead: false,
    hasStatus: false,
    defaultSort: { sortOrder: 1, name: 1 },
    adminFilters: (q) => (q.kind ? { kind: String(q.kind) } : {}),
    populate: { detail: blockPopulate() },
    prepareDuplicate: (plain) => ({ ...plain, name: `${plain.name} (copy)`, isDefault: false }),
  }),
);

router.use(
  '/ad-slots',
  crudRouter(AdSlot, {
    entityType: 'AdSlot',
    publicRead: false,
    hasStatus: false,
    defaultSort: { sortOrder: 1 },
    writePermission: 'settings:write',
    deletePermission: 'settings:write',
    readPermission: 'settings:write',
    beforeWrite: async (doc, req) => {
      if (doc.isModified('code') && !hasPermission(req.admin.role, 'ads:code')) {
        throw new ApiError(403, 'Only the owner account can change advertisement code');
      }
    },
  }),
);

router.use(
  ['/sessions', '/academic-sessions'],
  async (req, res, next) => {
    try { await ensureDefaultSessions(); } catch {}
    next();
  },
  crudRouter(AcademicSession, {
    entityType: 'AcademicSession',
    hasStatus: false,
    defaultSort: { sortOrder: 1, year: -1 },
    adminFilters: (q) => ({
      ...(q.isActive !== undefined ? { isActive: q.isActive === 'true' } : {}),
      ...(q.isCurrent !== undefined ? { isCurrent: q.isCurrent === 'true' } : {}),
    }),
    publicFilters: () => ({ isActive: true }),
    prepareDuplicate: (plain) => ({
      ...plain,
      name: `${plain.name} (copy)`,
      slug: `${plain.slug}-${copySuffix()}`,
      isCurrent: false,
    }),
  }),
);

export default router;
