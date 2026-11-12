import { validateStudyPlacement } from './studyPlacement.js';
import mongoose from 'mongoose';
import { ApiError } from '../middleware/error.js';
import { cache } from '../lib/cache.js';
const parents = { class: 'Class', subject: 'Subject', chapter: 'Chapter', exercise: 'Exercise', question: 'Question', topic: 'Topic', book: 'Book', studyClass: 'StudyClass', studyChapter: 'StudyChapter', studyTopic: 'StudyTopic', questionCategory: 'QuestionCategory', questionSet: 'QuestionSet' };
const content = ['BookClass', 'Class', 'Subject', 'Chapter', 'Exercise', 'Question', 'Topic', 'Resource', 'Book', 'Note', 'ImportantQuestion', 'Video', 'StudyChapter', 'StudyTopic', 'QuestionSet'];

async function chapterFor(doc) {
  if (doc.get('chapter')) return mongoose.model('Chapter').findById(doc.get('chapter')).select('book').lean();
  if (doc.get('exercise')) {
    const exercise = await mongoose.model('Exercise').findById(doc.get('exercise')).select('chapter').lean();
    return exercise?.chapter
      ? mongoose.model('Chapter').findById(exercise.chapter).select('book').lean()
      : null;
  }
  if (doc.get('topic')) {
    const topic = await mongoose.model('Topic').findById(doc.get('topic')).select('chapter').lean();
    return topic?.chapter
      ? mongoose.model('Chapter').findById(topic.chapter).select('book').lean()
      : null;
  }
  return null;
}

/** Reject new dangling references, including optional parents, instead of silently saving unusable records. */
export async function validateReferences(doc) {
  for (const [path, schema] of Object.entries(doc.schema.paths)) {
    const ref = schema.options.ref || schema.caster?.options?.ref;
    if (!ref || !mongoose.models[ref] || ['createdBy', 'updatedBy'].includes(path) || (!doc.isNew && !doc.isModified(path))) continue;
    const value = doc.get(path);
    const ids = (Array.isArray(value) ? value : [value]).filter(Boolean).map(id => String(id?._id || id));
    if (!ids.length) continue;
    const count = await mongoose.model(ref).countDocuments({ _id: { $in: [...new Set(ids)] } });
    if (count !== new Set(ids).size) throw new ApiError(400, `Selected ${path} does not exist. Refresh and choose an existing record.`);
  }
  await validateStudyPlacement(doc);
  if (doc.constructor.modelName !== 'BookClass' && doc.schema.path('book') && doc.book && doc.class &&
      (doc.isNew || doc.isModified('book') || doc.isModified('class'))) {
    const book = await mongoose.model('Book').findById(doc.book).select('class availableClasses').lean();
    const cls = await mongoose.model('Class').findById(doc.class).select('number').lean();
    const memberships = await mongoose.model('BookClass').exists({ book: doc.book });
    const membership = memberships && await mongoose.model('BookClass').exists({ book: doc.book, class: doc.class });
    if (memberships ? !membership : book?.availableClasses?.length
      ? !book.availableClasses.includes(cls?.number)
      : book?.class && String(book.class) !== String(doc.class)) {
      throw new ApiError(400, 'Selected book is not configured for this class. Choose the correct book or update its supported classes.');
    }
  }
  if (doc.constructor.modelName === 'Chapter' && doc.status === 'published' && doc.isVisible &&
      (doc.isNew || ['class','subject','book','slug','academicSession','status','isVisible'].some(field => doc.isModified(field)))) {
    const Book = mongoose.model('Book');
    const book = doc.book ? await Book.findById(doc.book).select('category').lean() : null;
    if (!doc.book || book?.category === 'ncert') {
      const ncertBooks = await Book.find({category:'ncert'}).select('_id').lean();
      const duplicate = await mongoose.model('Chapter').exists({
        _id: {$ne:doc._id}, class:doc.class, subject:doc.subject, slug:doc.slug,
        academicSession:doc.academicSession, status:'published', isVisible:true,
        book:{$in:[null,...ncertBooks.map(item=>item._id)]},
      });
      if (duplicate) throw new ApiError(409, 'This NCERT chapter URL is already published for the class and academic session. Edit the existing chapter or choose a unique slug.');
    }
  }
  // A supplied child cannot belong to another class/chapter/subject.
  for (const [field, parent] of Object.entries(parents)) {
    if (!doc.schema.path(field) || !doc.get(field) || !['topic', 'exercise', 'chapter'].includes(field)) continue;
    const record = await mongoose.model(parent).findById(doc.get(field)).select('class subject chapter').lean();
    for (const scope of ['class', 'subject', 'chapter']) {
      if (scope === field || !record?.[scope] || !doc.get(scope)) continue;
      if (String(record[scope]) !== String(doc.get(scope))) throw new ApiError(400, `Selected ${field} belongs to a different ${scope}.`);
    }
  }
  if (doc.schema.path('book')) {
    const chapter = await chapterFor(doc);
    if (chapter?.book) {
      if (doc.book && String(doc.book) !== String(chapter.book)) {
        throw new ApiError(400, 'Selected book does not match the book that owns this chapter.');
      }
      if (!doc.book) doc.book = chapter.book;
    }
  }
}

/** Parent deletion is deliberately blocked until children are moved/deleted by an editor. */
export async function protectParent(doc) {
  const field = Object.entries(parents).find(([, model]) => model === doc.constructor.modelName)?.[0];
  if (!field || !['class', 'subject', 'chapter', 'topic', 'exercise', 'book', 'studyClass', 'studyChapter', 'studyTopic', 'questionCategory', 'questionSet'].includes(field)) return;
  for (const name of content) {
    const Model = mongoose.models[name];
    if (!Model || !Model.schema.path(field)) continue;
    if (await Model.exists({ [field]: doc._id })) throw new ApiError(409, `This ${doc.constructor.modelName} still has linked ${name} records. Move or delete them first.`);
  }
}

export async function visibleParents(doc, visited = new Set()) {
  if (doc.book && doc.class && mongoose.models.BookClass) {
    const entry = await mongoose.model('BookClass').findOne({ book: doc.book?._id || doc.book, class: doc.class?._id || doc.class }).lean();
    if (entry && !await mongoose.model('BookClass').exists(mongoose.model('BookClass').publicFilter({ _id: entry._id }))) return false;
  }
  for (const [field, name] of Object.entries(parents)) {
    const value = doc[field];
    if (!value) continue;
    const id = String(value._id || value);
    if (!mongoose.isValidObjectId(id) || visited.has(`${name}:${id}`)) continue;
    visited.add(`${name}:${id}`);
    const Model = mongoose.models[name];
    if (!Model?.publicFilter) continue;
    const parent = await Model.findOne(Model.publicFilter({ _id: id })).lean();
    if (!parent || parent.isPublic === false || !await visibleParents(parent, visited)) return false;
  }
  return true;
}

export async function publicParentFilter(Model, visited = new Set()) {
  const conditions = [];
  if (Model.modelName !== 'BookClass' && Model.schema.path('book') && Model.schema.path('class') && mongoose.models.BookClass) {
    const entries = await mongoose.model('BookClass').find().select('book class status isVisible publishedAt').lean();
    const hidden = entries.filter(row => row.status !== 'published' || !row.isVisible || row.publishedAt && new Date(row.publishedAt) > new Date());
    if (hidden.length) conditions.push({ $nor: hidden.map(row => ({book: row.book, class: row.class})) });
  }
  const next = new Set([...visited, Model.modelName]);
  for (const [field, name] of Object.entries(parents)) {
    const Parent = mongoose.models[name];
    if (!Model.schema.path(field) || !Parent?.publicFilter || next.has(name)) continue;
    const getIds = async () => {
      const scopes = await publicParentFilter(Parent, next);
      return (await Parent.find({ ...Parent.publicFilter(), ...(name === 'Subject' ? { isPublic: true } : {}), ...scopes }).select('_id').lean()).map(doc => doc._id);
    };
    const scopedParent = ['StudyClass', 'StudyChapter', 'StudyTopic', 'QuestionCategory', 'QuestionSet'].includes(name);
    const ids = scopedParent ? await getIds() : await cache.wrap(`visible-parents:${[...next].sort().join(',')}:${name}`, 60_000, getIds);
    conditions.push({ $or: [{ [field]: null }, { [field]: { $in: ids } }] });
  }
  return conditions.length ? { $and: conditions } : {};
}
