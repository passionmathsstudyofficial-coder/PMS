import { StudyClass, StudyChapter, StudyTopic, QuestionCategory, QuestionSet } from '../models/StudyContent.js';
import { ImportantQuestion } from '../models/ImportantQuestion.js';
import { Note } from '../models/Note.js';
import { ApiError } from '../middleware/error.js';
import { isObjectId } from '../lib/request.js';
import { MEDIA_SELECT, blockPopulate } from './populate.js';
import { publicParentFilter } from './relationships.js';

const media = path => ({ path, select: MEDIA_SELECT });
const commonMedia = [media('thumbnail'), media('pdfFile')];
const leafMedia = [media('pdfFile'), media('image'), media('featuredImage'), media('attachments.media')];
const entries = {
  class: StudyClass, chapter: StudyChapter, topic: StudyTopic,
  category: QuestionCategory, set: QuestionSet, question: ImportantQuestion, note: Note,
};

async function filter(Model, preview, scope) {
  return preview ? scope : { ...Model.publicFilter(scope), ...await publicParentFilter(Model) };
}

async function list(Model, preview, scope, page, limit) {
  const query = await filter(Model, preview, scope);
  const [items, total] = await Promise.all([
    Model.find(query).sort({ sortOrder: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(query),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function resolveStudyCms([module, kind, id, categoryClass, categoryChapter], { preview, override, home, page, limit }) {
  const important = module === 'important-questions';
  const heading = { en: important ? 'Important Questions' : 'Notes & Formulas', hi: important ? 'महत्वपूर्ण प्रश्न' : 'नोट्स और सूत्र' };
  const root = '/' + module;
  const breadcrumbs = [home, { label: heading, url: root }];
  let record;
  const groups = [];
  const add = async (label, type, scope, base = root + '/' + type) => {
    const group = await list(entries[type], preview, scope, page, limit);
    groups.push({ label, ...group, items: group.items.map(item => ({
      _id: item._id, number: item.number, title: item.title, description: item.description || item.summary,
      url: base + '/' + item._id,
    })) });
  };
  if (!kind) {
    if (important) await add('Question categories', 'category', {});
    await add('Classes', 'class', { module });
  } else {
    const Model = entries[kind];
    if (!Object.hasOwn(entries, kind) || !isObjectId(id) ||
      (important ? kind === 'note' : ['category', 'set', 'question'].includes(kind))) throw new ApiError(404, 'Page not found');
    const scope = { _id: id };
    if (kind === 'class') scope.module = module;
    if (['note', 'question'].includes(kind)) scope.studyClass = { $ne: null };
    const doc = await Model.findOne(await filter(Model, preview, scope));
    if (!doc) throw new ApiError(404, 'Page not found');
    if (kind === 'chapter' || kind === 'topic') {
      const chapter = kind === 'chapter' ? doc : await StudyChapter.findById(doc.studyChapter);
      if (!chapter || !await StudyClass.exists({ _id: chapter.studyClass, module })) throw new ApiError(404, 'Page not found');
    }
    if (override?.entityType === Model.modelName && String(override.id) === id) doc.set(override.data);
    await doc.populate(kind === 'question' ? [...leafMedia, ...blockPopulate()] : kind === 'note' ? leafMedia : commonMedia);
    record = doc.toObject();
    breadcrumbs.push({ label: record.title, url: `${root}/${kind}/${id}` });
    if (kind === 'category') {
      const base = root + '/category/' + id;
      const setScope = { questionCategory: id };
      if (!categoryClass) {
        const classIds = await QuestionSet.distinct('studyClass', await filter(QuestionSet, preview, setScope));
        await add('Classes', 'class', { module, _id: { $in: classIds } }, base);
        await add('Question sets', 'set', setScope);
      } else {
        if (!isObjectId(categoryClass) || categoryChapter && !isObjectId(categoryChapter)) throw new ApiError(404, 'Page not found');
        const cls = await StudyClass.findOne(await filter(StudyClass, preview, { _id: categoryClass, module })).lean();
        if (!cls) throw new ApiError(404, 'Class not found');
        const classPath = base + '/' + categoryClass;
        record = cls;
        breadcrumbs.push({ label: cls.title, url: classPath });
        setScope.studyClass = categoryClass;
        const questionScope = { questionCategory: id, studyClass: categoryClass };
        if (categoryChapter) {
          const chapter = await StudyChapter.findOne(await filter(StudyChapter, preview, { _id: categoryChapter, studyClass: categoryClass })).lean();
          if (!chapter) throw new ApiError(404, 'Chapter not found');
          record = chapter;
          breadcrumbs.push({ label: chapter.title, url: classPath + '/' + categoryChapter });
          await add('Questions', 'question', { ...questionScope, studyChapter: categoryChapter });
          await add('Question sets', 'set', { ...setScope, studyChapter: categoryChapter });
        } else {
          const chapterIds = await Promise.all([
            QuestionSet.distinct('studyChapter', await filter(QuestionSet, preview, setScope)),
            ImportantQuestion.distinct('studyChapter', await filter(ImportantQuestion, preview, questionScope)),
          ]);
          await add('Chapters', 'chapter', { studyClass: categoryClass, _id: { $in: chapterIds.flat().filter(Boolean) } }, classPath);
          await add('Question sets', 'set', setScope);
        }
      }
    }
    if (kind === 'class') {
      await add('Chapters', 'chapter', { studyClass: id });
      await add(important ? 'Question sets' : 'Formula sheets', important ? 'set' : 'note',
        important ? { studyClass: id } : { studyClass: id, studyChapter: null, category: 'formula_sheet' });
    }
    if (kind === 'chapter') {
      await add('Topics', 'topic', { studyChapter: id });
      if (important) await add('Questions', 'question', { studyChapter: id });
      else {
        await add('Notes', 'note', { studyChapter: id, category: { $ne: 'formula_sheet' } });
        await add('Formula sheets', 'note', { studyChapter: id, category: 'formula_sheet' });
      }
    }
    if (kind === 'topic') await add(important ? 'Questions' : 'Notes and formulas', important ? 'question' : 'note', { studyTopic: id });
    if (kind === 'set') await add('Questions', 'question', { questionSet: id });
  }
  const title = record?.title?.en || record?.title?.hi ? record.title : record?.number != null ? { en: `${kind === 'class' ? 'Class' : kind === 'chapter' ? 'Chapter' : 'Question'} ${record.number}` } : heading;
  return { type: 'studyCms', breadcrumbs, data: { title, record, groups, kind },
    seo: { ...record?.seo, title: record?.seo?.title || title, canonical: breadcrumbs.at(-1).url } };
}
