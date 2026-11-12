import mongoose from 'mongoose';
import { contentPlugin } from './plugins/content.js';
import { ObjectId, l10n, textL10n, richL10n, seo } from './schemas/common.js';
import { joinSearch, l10nText, labels } from '../services/searchText.js';
import { slugify } from '../utils/slug.js';

export const STUDY_MODULES = ['important-questions', 'notes-formulas'];
const ref = (model, required = false) => ({ type: ObjectId, ref: model, required, index: true });
const media = (model = 'Media') => ({ type: ObjectId, ref: model });

function record(name, fields, unique, fallback) {
  const schema = new mongoose.Schema({
    title: l10n(),
    description: textL10n(),
    content: richL10n(),
    thumbnail: media(),
    pdfFile: media(),
    seo: seo(),
    slug: { type: String, required: true, maxlength: 120 },
    searchText: { type: String, select: false },
    ...fields,
  }, { timestamps: true });
  schema.plugin(contentPlugin);
  schema.index(unique, { unique: true });
  schema.pre('validate', function () {
    this.searchText = joinSearch(l10nText(this.title), l10nText(this.description), l10nText(this.content), name === 'StudyClass' ? labels.class(this.number) : labels.chapter(this.number));
    this.slug = slugify(this.slug || this.title?.en || this.title?.hi || fallback(this), name.toLowerCase());
  });
  return mongoose.model(name, schema);
}

export const StudyClass = record('StudyClass', {
  module: { type: String, enum: STUDY_MODULES, required: true, immutable: true },
  number: { type: Number, min: 1, max: 20, required: true, validate: Number.isInteger },
}, { module: 1, number: 1 }, doc => `class-${doc.number}`);
StudyClass.schema.index({ module: 1, slug: 1 }, { unique: true });

export const StudyChapter = record('StudyChapter', {
  studyClass: { ...ref('StudyClass', true), immutable: true },
  number: { type: Number, min: 0, required: true, validate: Number.isInteger },
}, { studyClass: 1, slug: 1 }, doc => `chapter-${doc.number}`);

export const StudyTopic = record('StudyTopic', {
  studyChapter: { ...ref('StudyChapter', true), immutable: true },
}, { studyChapter: 1, slug: 1 }, () => 'topic');

export const QuestionCategory = record('QuestionCategory', {}, { slug: 1 }, () => 'category');

export const QuestionSet = record('QuestionSet', {
  questionCategory: { ...ref('QuestionCategory', true), immutable: true },
  studyClass: { ...ref('StudyClass', true), immutable: true },
  studyChapter: { ...ref('StudyChapter'), immutable: true },
}, { questionCategory: 1, studyClass: 1, slug: 1 }, () => 'set');

export const studyPlacement = {
  studyClass: ref('StudyClass'),
  studyChapter: ref('StudyChapter'),
  studyTopic: ref('StudyTopic'),
};

export async function initializeStudyCms() {
  const categories = [
    ['pyq', 'Previous Year Questions', 'पिछले वर्षों के प्रश्न'],
    ['sample-papers', 'CBSE Sample Papers', 'सीबीएसई नमूना प्रश्नपत्र'],
    ['extra-questions', 'CBSE Extra Questions', 'सीबीएसई अतिरिक्त प्रश्न'],
    ['vvi', 'VVI Questions', 'अति महत्वपूर्ण प्रश्न'],
    ['board-exams', 'Board Examination Questions', 'बोर्ड परीक्षा के प्रश्न'],
    ['chapter-wise', 'Chapter-wise Important Questions', 'अध्यायवार महत्वपूर्ण प्रश्न'],
    ['topic-wise', 'Topic-wise Important Questions', 'विषयवार महत्वपूर्ण प्रश्न'],
  ];
  // Insert defaults once. A deleted or renamed default must stay deleted or renamed.
  const migrations = mongoose.connection.collection('contentMigrations');
  const id = 'study-cms-defaults-v1';
  if (await migrations.findOne({ _id: id })) return;
  await Promise.all([QuestionCategory.init(), StudyClass.init()]);
  await Promise.all([
    QuestionCategory.bulkWrite(categories.map(([slug, title, hindi], sortOrder) => ({
      updateOne: { filter: { slug }, update: { $setOnInsert: { slug, title: { en: title, hi: hindi }, sortOrder, status: 'published', searchText: joinSearch(title, hindi) } }, upsert: true },
    }))),
    StudyClass.bulkWrite(STUDY_MODULES.flatMap(module => Array.from({ length: 7 }, (_, index) => {
      const number = index + 6;
      return { updateOne: { filter: { module, number }, update: { $setOnInsert: {
        module, number, slug: `class-${number}`, title: { en: `Class ${number}`, hi: `कक्षा ${number}` },
        sortOrder: number, status: 'published', searchText: labels.class(number),
      } }, upsert: true } };
    }))),
  ]);
  await migrations.updateOne({ _id: id }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
}
