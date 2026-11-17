import { Book, BookClass, Chapter, ClassLevel, Exercise, Question, Subject, Topic } from '../models/index.js';
import { ApiError } from '../middleware/error.js';
import { urls } from './urls.js';

// Resolve saved relationships on the server so reference books use their own namespace.
export async function previewLocation(entityType, id) {
  const Model = { Chapter, Exercise, Question, Topic }[entityType];
  if (!Model) return {};
  const doc = await Model.findById(id).lean();
  if (!doc) throw new ApiError(404, 'Preview content no longer exists');
  const chapter = entityType === 'Chapter' ? doc : await Chapter.findById(doc.chapter).lean();
  if (!chapter) throw new ApiError(404, 'Preview chapter no longer exists');
  const [cls, subject, book] = await Promise.all([
    ClassLevel.findById(chapter.class).lean(),
    Subject.findById(chapter.subject).lean(),
    chapter.book ? Book.findById(chapter.book).lean() : null,
  ]);
  if (!cls || !subject || (chapter.book && !book)) throw new ApiError(404, 'Preview parent content no longer exists');
  const reference = book?.category === 'reference';
  const membership = reference ? await BookClass.findOne({ book: book._id, class: cls._id }).lean() : null;
  const bookClass = membership ? { ...cls, slug: membership.slug } : cls;
  let path = reference ? urls.referenceChapter(book, bookClass, chapter) : urls.chapter(cls, subject, chapter);
  if (entityType === 'Topic') path += `/topic/${doc.slug}`;
  if (entityType === 'Exercise' || entityType === 'Question') {
    const exercise = entityType === 'Exercise' ? doc : await Exercise.findById(doc.exercise).lean();
    if (!exercise) throw new ApiError(404, 'Preview exercise no longer exists');
    path = reference ? urls.referenceExercise(book, bookClass, chapter, exercise) : urls.exercise(cls, subject, chapter, exercise);
    if (entityType === 'Question') path += `/${doc.slug}`;
  }
  return {
    path,
    session: doc.academicSession || chapter.academicSession,
    relationships: {
      chapter: String(chapter._id),
      ...(entityType === 'Exercise' || entityType === 'Question' ? { exercise: String(entityType === 'Exercise' ? doc._id : doc.exercise) } : {}),
    },
  };
}
