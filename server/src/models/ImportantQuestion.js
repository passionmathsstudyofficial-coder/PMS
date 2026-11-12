import { studyPlacement } from './StudyContent.js';
import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
import { contentPlugin } from './plugins/content.js';
import { AttachmentSchema, DIFFICULTIES, FormulaSchema, ObjectId, languageMode, l10n, richL10n, seo, textL10n } from './schemas/common.js';
import { SolutionBlockSchema } from './SolutionBlock.js';
import { blocksText, joinSearch, l10nText, labels } from '../services/searchText.js';

const importantQuestionSchema = new mongoose.Schema(
  {
    ...studyPlacement,
    class: { type: ObjectId, ref: 'Class', required() { return !this.studyClass; }, index: true },
    subject: { type: ObjectId, ref: 'Subject', required() { return !this.studyClass; }, index: true },
    chapter: { type: ObjectId, ref: 'Chapter', index: true },
    topic: { type: ObjectId, ref: 'Topic', index: true },
    book: { type: ObjectId, ref: 'Book', index: true },
    questionCategory: { type: ObjectId, ref: 'QuestionCategory', index: true },
    questionSet: { type: ObjectId, ref: 'QuestionSet', index: true },
    mcqOptions: [{ text: richL10n(), correct: { type: Boolean, default: false } }],
    explanation: richL10n(),
    negativeMarks: { type: Number, min: 0, max: 100 },
    examType: { type: String, trim: true, maxlength: 120 },
    linkedQuestion: { type: ObjectId, ref: 'Question' },
    title: l10n(),
    number: { type: String, default: '1', trim: true },
    board: { type: String, default: 'CBSE', trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 140 },
    text: richL10n(),
    attachments: [AttachmentSchema],
    pdfFile: { type: ObjectId, ref: 'Media' },
    pdfUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    image: { type: ObjectId, ref: 'Media' },
    featuredImage: { type: ObjectId, ref: 'Media' },
    introVideo: { type: ObjectId, ref: 'Video' },
    formulas: [FormulaSchema],
    blocks: [SolutionBlockSchema],
    answer: richL10n(),
    marks: { type: Number, min: 0, max: 100 },
    source: { type: String, default: '', trim: true, maxlength: 120 },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    category: {
      type: String,
      enum: ['vvi', 'pyq', 'sample_paper', 'extra_questions', 'syllabus', 'general'],
      default: 'vvi',
      index: true,
    },
    academicSession: { type: String, default: '2026-27', trim: true, index: true },
    year: { type: Number, index: true },
    paperSet: { type: String, default: '', trim: true },
    markingScheme: richL10n(),
    questionType: {
      type: String,
      enum: ['mcq', 'true_false', 'fill_blank', 'short_answer', 'long_answer', 'numerical', 'case_based', 'assertion_reason', 'competency_based', 'proof', 'subjective', 'short', 'long', 'case_study'],
      default: 'short',
    },
    featured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    languageMode,
    seo: seo(),
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

importantQuestionSchema.plugin(contentPlugin);
importantQuestionSchema.index({ class: 1, subject: 1, slug: 1 }, { unique: true });
importantQuestionSchema.index({ searchText: 'text' }, { default_language: 'none' });

function hasOptionContent(value) {
  return Boolean(l10nText(value).trim() ||
    ['en', 'hi', 'mixed'].some(language => /data-latex="[^"]+"|<img\b[^>]*\bsrc=/i.test(value?.[language] || '')));
}

importantQuestionSchema.pre('validate', async function buildImportantQuestion() {
  if (!this.slug) {
    const base = l10nText({ en: this.title?.en }) || l10nText({ en: this.text?.en }).slice(0, 60) || 'important-question';
    this.slug = `${slugify(base, 'important-question')}-${this._id.toString().slice(-5)}`;
  }
  this.slug = slugify(this.slug, 'important-question');
  if (this.status === 'published' && this.questionType === 'mcq' && (this.studyClass || this.mcqOptions.length)) {
    const filled = this.mcqOptions.filter(option => hasOptionContent(option.text));
    if (filled.length < 4 || filled.length !== this.mcqOptions.length || filled.filter(option => option.correct).length !== 1) {
      this.invalidate('mcqOptions', 'Provide at least four options and choose exactly one correct answer.');
    }
  }
  if (this.negativeMarks > (this.marks ?? 0)) this.invalidate('negativeMarks', 'Negative marks cannot exceed the question marks.');
  const [cls, chapter] = await Promise.all([
    this.class ? mongoose.model('Class').findById(this.class).select('number').lean() : null,
    this.chapter ? mongoose.model('Chapter').findById(this.chapter).select('number title').lean() : null,
  ]);
  this.searchText = joinSearch(
    'important questions महत्वपूर्ण प्रश्न',
    labels.class(cls?.number),
    labels.chapter(chapter?.number),
    l10nText(chapter?.title),
    l10nText(this.title),
    this.number,
    l10nText(this.text),
    l10nText(this.answer),
    l10nText(this.explanation),
    this.mcqOptions.map(option => l10nText(option.text)),
    blocksText(this.blocks),
    this.source,
    this.tags,
  );
});

export const ImportantQuestion = mongoose.model('ImportantQuestion', importantQuestionSchema);
