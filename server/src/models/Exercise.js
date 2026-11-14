import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
import { contentPlugin } from './plugins/content.js';
import { ObjectId, languageMode, l10n, richL10n, seo } from './schemas/common.js';
import { joinSearch, l10nText, labels } from '../services/searchText.js';

async function validIntroVideo(id) {
  if (!id) return true;
  const video = await mongoose.model('Video').findById(id).select('provider youtubeId').lean();
  return Boolean(video && video.provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId));
}

const exerciseSchema = new mongoose.Schema(
  {
    chapter: { type: ObjectId, ref: 'Chapter', required: true, index: true },
    class: { type: ObjectId, ref: 'Class', index: true },
    subject: { type: ObjectId, ref: 'Subject', index: true },
    book: { type: ObjectId, ref: 'Book', index: true },
    academicSession: { type: String, default: '2026-27', trim: true, index: true },
    number: { type: String, required: true, trim: true, maxlength: 20 },
    title: l10n(),
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
    description: richL10n(),
    instructions: richL10n(),
    introVideo: { type: ObjectId, ref: 'Video' }, // Retained for manual language assignment.
    introVideoEn: { type: ObjectId, ref: 'Video', validate: validIntroVideo },
    introVideoHi: { type: ObjectId, ref: 'Video', validate: validIntroVideo },
    pdfFile: { type: ObjectId, ref: 'Media' },
    pdfUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    notes: richL10n(),
    languageMode,
    seo: seo(),
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

exerciseSchema.plugin(contentPlugin);
exerciseSchema.index({ chapter: 1, slug: 1 }, { unique: true });
exerciseSchema.index({ chapter: 1, sortOrder: 1 });
exerciseSchema.index({ searchText: 'text' }, { default_language: 'none' });

exerciseSchema.pre('validate', async function buildExercise() {
  this.slug = slugify(this.slug || `prashnavali-${this.number}`, `prashnavali-${this.number}`);
  const chapter = this.chapter
      ? await mongoose.model('Chapter').findById(this.chapter).select('class subject number title academicSession book').lean()
    : null;
    if (chapter) this.academicSession = chapter.academicSession || this.academicSession;
    if (!chapter) {
    this.invalidate('chapter', 'Parent chapter not found');
    return;
  }
  this.class = chapter.class;
  this.subject = chapter.subject;
  if (chapter.book) this.book = chapter.book;
  const cls = await mongoose.model('Class').findById(chapter.class).select('number').lean();
  this.searchText = joinSearch(
    labels.class(cls?.number),
    labels.chapter(chapter.number),
    l10nText(chapter.title),
    labels.exercise(this.number),
    l10nText(this.title),
    l10nText(this.description),
  );
});

exerciseSchema.pre('save', function flagChildren() {
  this.$locals.refreshChildren =
    !this.isNew && (this.isModified('number') || this.isModified('chapter') || this.isModified('class'));
});

exerciseSchema.post('save', async function refreshQuestions(doc) {
  if (!doc.$locals.refreshChildren) return;
  const items = await mongoose.model('Question').find({ exercise: doc._id });
  await Promise.all(items.map(q => q.save()));
});

export const Exercise = mongoose.model('Exercise', exerciseSchema);
