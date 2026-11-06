import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
import { contentPlugin } from './plugins/content.js';
import {
  AttachmentSchema,
  DIFFICULTIES,
  FormulaSchema,
  ObjectId,
  languageMode,
  l10n,
  richL10n,
  textL10n,
  seo,
} from './schemas/common.js';
import { joinSearch, l10nText, labels } from '../services/searchText.js';

export const VIDEO_PLACEMENTS = ['afterQuestion', 'beforeSolution', 'afterSolution'];

export const QUESTION_TYPES = [
  'mcq',
  'short_answer',
  'long_answer',
  'numerical',
  'case_based',
  'assertion_reason',
  'competency_based',
  'proof',
  'subjective',
  'objective',
];

const questionSchema = new mongoose.Schema(
  {
    exercise: { type: ObjectId, ref: 'Exercise', required: true, index: true },
    chapter: { type: ObjectId, ref: 'Chapter', index: true },
    class: { type: ObjectId, ref: 'Class', index: true },
    subject: { type: ObjectId, ref: 'Subject', index: true },
    book: { type: ObjectId, ref: 'Book', index: true },
    topic: { type: ObjectId, ref: 'Topic', index: true },
    academicSession: { type: String, default: '2026-27', trim: true, index: true },
    number: { type: String, required: true, trim: true, maxlength: 40 },
    code: { type: String, default: '', trim: true, maxlength: 60 },
    title: l10n(),
    shortDescription: textL10n(),
    board: { type: String, default: 'CBSE', trim: true, maxlength: 60 },
    year: { type: Number, index: true },
    paperSet: { type: String, default: '', trim: true, maxlength: 60 },
    source: { type: String, default: '', trim: true, maxlength: 120 },
    questionType: {
      type: String,
      enum: QUESTION_TYPES,
      default: 'subjective',
    },
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 140 },
    text: richL10n(),
    languageMode,
    attachments: [AttachmentSchema],
    image: { type: ObjectId, ref: 'Media' },
    featuredImage: { type: ObjectId, ref: 'Media' },
    introVideo: { type: ObjectId, ref: 'Video' },
    pdfFile: { type: ObjectId, ref: 'Media' },
    pdfUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    video: {
      video: { type: ObjectId, ref: 'Video' },
      placement: { type: String, enum: VIDEO_PLACEMENTS, default: 'afterSolution' },
    },
    formulas: [FormulaSchema],
    hint: richL10n(),
    answer: richL10n(),
    importantPoint: richL10n(),
    notes: richL10n(),
    markingScheme: richL10n(),
    mcqOptions: [
      {
        key: { type: String, default: 'A', trim: true },
        text: richL10n(),
        isCorrect: { type: Boolean, default: false },
      },
    ],
    mcqExplanation: richL10n(),
    parts: [
      {
        label: { type: String, default: 'a', trim: true },
        text: richL10n(),
        marks: { type: Number, min: 0 },
        answer: richL10n(),
      },
    ],
    relatedQuestions: [{ type: ObjectId, ref: 'Question' }],
    relatedChapters: [{ type: ObjectId, ref: 'Chapter' }],
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    marks: { type: Number, min: 0, max: 100 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    isImportant: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    seo: seo(),
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

questionSchema.plugin(contentPlugin);
questionSchema.index({ exercise: 1, slug: 1 }, { unique: true });
questionSchema.index({ exercise: 1, sortOrder: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ searchText: 'text' }, { default_language: 'none' });

questionSchema.pre('validate', async function buildQuestion() {
  this.slug = slugify(this.slug || `prashn-${this.number}`, `prashn-${this.number}`);
  const exercise = this.exercise
    ? await mongoose.model('Exercise').findById(this.exercise).select('chapter class subject number academicSession').lean()
    : null;
  if (exercise) this.academicSession = exercise.academicSession || this.academicSession;
  if (!exercise) {
    this.invalidate('exercise', 'Parent exercise not found');
    return;
  }
  this.chapter = exercise.chapter;
  this.class = exercise.class;
  this.subject = exercise.subject;
  const [chapter, cls] = await Promise.all([
    mongoose.model('Chapter').findById(exercise.chapter).select('number title book').lean(),
    mongoose.model('Class').findById(exercise.class).select('number').lean(),
  ]);
  if (chapter?.book && !this.book) this.book = chapter.book;
  this.searchText = joinSearch(
    labels.class(cls?.number),
    labels.chapter(chapter?.number),
    l10nText(chapter?.title),
    labels.exercise(exercise.number),
    labels.question(this.number),
    this.code,
    l10nText(this.title),
    l10nText(this.text),
    l10nText(this.hint),
    l10nText(this.answer),
    l10nText(this.notes),
    this.source,
    this.tags,
  );
});

export const Question = mongoose.model('Question', questionSchema);
