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
  AdSlot,
  Announcement,
  Book,
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
import { BOOK_SELECT, MEDIA_SELECT, RESOURCE_SELECT, VIDEO_SELECT, blockPopulate, questionPopulate, solutionPopulate } from '../services/populate.js';


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
        const items = await Chapter.find(admin ? base : Chapter.publicFilter(base))
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
  }),
);

router.use(
  '/topics',
  crudRouter(Topic, {
    entityType: 'Topic',
    defaultSort: { sortOrder: 1, number: 1 },
    adminFilters: (q) => ({
      ...idFilter(q, ['chapter', 'class', 'subject']),
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
    beforeDelete: async (doc) => {
      await assertNoChildren(Question, { exercise: doc._id }, 'This प्रश्नावली still has {count} questions. Delete them first.');
    },
    afterDelete: async (doc) => RelatedContent.deleteMany({ source: doc._id }),
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}` }),
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
      ...idFilter(q, ['exercise', 'chapter', 'class']),
      ...(['easy', 'medium', 'hard'].includes(q.difficulty) ? { difficulty: q.difficulty } : {}),
      ...(q.isImportant === 'true' ? { isImportant: true } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['exercise', 'chapter']),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [
        { path: 'exercise', select: 'number slug' },
        { path: 'chapter', select: 'number title slug' },
        { path: 'attachments.media', select: MEDIA_SELECT },
        classPopulate,
      ],
      detail: [
        ...questionPopulate,
        seoImage,
        { path: 'exercise', select: 'number slug title chapter' },
        { path: 'chapter', select: 'number title slug' },
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
      ...idFilter(q, ['class', 'subject', 'chapter', 'book']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['class', 'chapter', 'book']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
    }),
    populate: {
      list: [classPopulate, { path: 'chapter', select: 'number title' }, { path: 'book', select: 'title author slug' }],
      detail: [
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'book', select: 'title author slug' },
        { path: 'attachments.media', select: MEDIA_SELECT },
        { path: 'video', select: VIDEO_SELECT },
        seoImage,
      ],
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
      ...idFilter(q, ['class', 'subject', 'chapter']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
      ...(q.status ? { status: String(q.status) } : {}),
    }),
    publicFilters: (q) => ({
      ...idFilter(q, ['class', 'chapter']),
      ...(q.category ? { category: String(q.category) } : {}),
      ...(q.academicSession ? { academicSession: String(q.academicSession) } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
    }),
    populate: {
      list: [classPopulate, { path: 'chapter', select: 'number title' }],
      detail: [
        classPopulate,
        subjectPopulate,
        { path: 'chapter', select: 'number title slug' },
        { path: 'linkedQuestion', select: 'number slug' },
        { path: 'attachments.media', select: MEDIA_SELECT },
        ...blockPopulate(),
        seoImage,
      ],
    },
    prepareDuplicate: (plain) => ({ ...plain, slug: `${plain.slug}-${copySuffix()}` }),
  }),
);

router.use(
  '/pages',
  crudRouter(Page, {
    entityType: 'Page',
    defaultSort: { sortOrder: 1, createdAt: 1 },
    populate: { detail: [seoImage] },
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
  '/sessions',
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
