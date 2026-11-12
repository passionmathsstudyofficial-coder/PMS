import mongoose from 'mongoose';
import { ApiError } from '../middleware/error.js';

export async function validateStudyPlacement(doc) {
  const model = doc.constructor.modelName;
  if (!['StudyChapter', 'QuestionSet', 'Note', 'ImportantQuestion'].includes(model)) return;
  if (!doc.studyClass) {
    if (doc.studyChapter || doc.studyTopic || doc.questionCategory || doc.questionSet) {
      throw new ApiError(400, 'Select a CMS class before assigning scoped content.');
    }
    return;
  }
  const [studyClass, chapter, topic, set] = await Promise.all([
    mongoose.model('StudyClass').findById(doc.studyClass).lean(),
    doc.studyChapter && mongoose.model('StudyChapter').findById(doc.studyChapter).lean(),
    doc.studyTopic && mongoose.model('StudyTopic').findById(doc.studyTopic).lean(),
    doc.questionSet && mongoose.model('QuestionSet').findById(doc.questionSet).lean(),
  ]);
  const expected = model === 'Note' ? 'notes-formulas' : model === 'StudyChapter' ? null : 'important-questions';
  if (!studyClass || expected && studyClass.module !== expected) throw new ApiError(400, 'Select a class from the correct CMS.');
  if (doc.studyChapter && String(chapter?.studyClass) !== String(doc.studyClass)) throw new ApiError(400, 'The chapter belongs to a different class.');
  if (doc.studyTopic && (!doc.studyChapter || String(topic?.studyChapter) !== String(doc.studyChapter))) throw new ApiError(400, 'The topic belongs to a different chapter.');
  if (model === 'StudyChapter' || model === 'QuestionSet') return;
  if (doc.class || doc.chapter || doc.topic || doc.book || doc.subject) throw new ApiError(400, 'CMS placement cannot be combined with legacy placement.');
  if (model === 'Note' && !['ncert_notes', 'formula_sheet'].includes(doc.category)) throw new ApiError(400, 'Select notes or formula sheet for this CMS.');
  if (model === 'Note' && !doc.studyChapter && doc.category !== 'formula_sheet') throw new ApiError(400, 'Select a chapter for this note.');
  if (model === 'ImportantQuestion') {
    if (!doc.questionCategory || !set) throw new ApiError(400, 'Select a question category and set.');
    if (String(set.studyClass) !== String(doc.studyClass) || String(set.questionCategory) !== String(doc.questionCategory) ||
        (set.studyChapter && String(set.studyChapter) !== String(doc.studyChapter))) {
      throw new ApiError(400, 'The question set must match the selected category, class and chapter.');
    }
  }
}
