import mongoose from 'mongoose';
import { contentPlugin } from './plugins/content.js';
import { ObjectId, l10n, seo, textL10n } from './schemas/common.js';
import { slugify } from '../utils/slug.js';

const { Schema } = mongoose;

const bookPartSchema = new Schema(
  {
    book: { type: ObjectId, ref: 'Book', required: true, index: true },
    class: { type: ObjectId, ref: 'Class', required: true, index: true },
    bookClass: { type: ObjectId, ref: 'BookClass', index: true },
    number: { type: Number, required: true, min: 1, default: 1 },
    title: l10n(),
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
    shortDescription: textL10n(),
    academicSession: { type: String, default: '2026-27', trim: true, index: true },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published', index: true },
    isVisible: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
    seo: seo(),
  },
  { timestamps: true }
);

bookPartSchema.plugin(contentPlugin);
bookPartSchema.index({ book: 1, class: 1, academicSession: 1, slug: 1 }, { unique: true });
bookPartSchema.index({ book: 1, class: 1, number: 1 });
bookPartSchema.index({ book: 1, class: 1, sortOrder: 1, number: 1 });

bookPartSchema.pre('validate', function buildSlug() {
  const defaultSlug = `part-${this.number}`;
  this.slug = slugify(this.slug || this.title?.en || defaultSlug, defaultSlug);
});

export const BookPart = mongoose.model('BookPart', bookPartSchema);
export default BookPart;
