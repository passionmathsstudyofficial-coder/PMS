import { studyPlacement } from './StudyContent.js';
import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
import { contentPlugin } from './plugins/content.js';
import { AttachmentSchema, FormulaSchema, ObjectId, languageMode, l10n, richL10n, seo, textL10n } from './schemas/common.js';
import { joinSearch, l10nText, labels } from '../services/searchText.js';

const noteSchema = new mongoose.Schema(
  {
    ...studyPlacement,
    class: { type: ObjectId, ref: 'Class', required() { return !this.studyClass; }, index: true },
    subject: { type: ObjectId, ref: 'Subject', required() { return !this.studyClass; }, index: true },
    chapter: { type: ObjectId, ref: 'Chapter', index: true },
    topic: { type: ObjectId, ref: 'Topic', index: true },
    book: { type: ObjectId, ref: 'Book', index: true },
    category: {
      type: String,
      enum: ['ncert_notes', 'formula_sheet', 'rs_aggarwal_notes', 'rd_sharma_notes', 'kc_sinha_notes', 'ml_aggarwal_notes', 'vvi_short_notes', 'general'],
      default: 'ncert_notes',
      index: true,
    },
    academicSession: { type: String, default: '2026-27', trim: true, index: true },
    title: l10n(),
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 140 },
    summary: textL10n(),
    introduction: richL10n(),
    content: richL10n(),
    formulas: [FormulaSchema],
    pdfFile: { type: ObjectId, ref: 'Media' },
    pdfUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    image: { type: ObjectId, ref: 'Media' },
    featuredImage: { type: ObjectId, ref: 'Media' },
    introVideo: { type: ObjectId, ref: 'Video' },
    relatedChapters: [{ type: ObjectId, ref: 'Chapter' }],
    featured: { type: Boolean, default: false },
    attachments: [AttachmentSchema],
    video: { type: ObjectId, ref: 'Video' },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    languageMode,
    seo: seo(),
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

noteSchema.plugin(contentPlugin);
noteSchema.index({ class: 1, subject: 1, academicSession: 1, slug: 1 }, { unique: true });
noteSchema.index({ searchText: 'text' }, { default_language: 'none' });

noteSchema.pre('validate', async function buildNote() {
  this.slug = slugify(this.slug || this.title?.en || this.title?.hi, 'note');
  if (this.studyClass && this.isNew && !this.slug.endsWith(this._id.toString().slice(-8))) this.slug = this.slug.slice(0, 130) + '-' + this._id.toString().slice(-8);
  const [cls, chapter] = await Promise.all([
    this.class ? mongoose.model('Class').findById(this.class).select('number').lean() : null,
    this.chapter ? mongoose.model('Chapter').findById(this.chapter).select('number title').lean() : null,
  ]);
  this.searchText = joinSearch(
    'notes नोट्स',
    labels.class(cls?.number),
    labels.chapter(chapter?.number),
    l10nText(chapter?.title),
    l10nText(this.title),
    l10nText(this.summary),
    l10nText(this.introduction),
    l10nText(this.content),
    this.tags,
  );
});

export const Note = mongoose.model('Note', noteSchema);
