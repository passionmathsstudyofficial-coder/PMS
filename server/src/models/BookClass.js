import mongoose from 'mongoose';
import { contentPlugin } from './plugins/content.js';
import { ObjectId, l10n, textL10n, seo } from './schemas/common.js';
import { slugify } from '../utils/slug.js';
const schema = new mongoose.Schema({
  book: { type: ObjectId, ref: 'Book', required: true, immutable: true },
  class: { type: ObjectId, ref: 'Class', required: true, immutable: true },
  name: l10n(), description: textL10n(), seo: seo(),
  slug: { type: String, required: true, trim: true, lowercase: true },
  thumbnail: { type: ObjectId, ref: 'Media' },
  subjects: [{ type: ObjectId, ref: 'Subject' }],
}, { timestamps: true });
schema.plugin(contentPlugin);
schema.index({ book: 1, class: 1 }, { unique: true });
schema.index({ book: 1, slug: 1 }, { unique: true });
schema.pre('validate', async function () {
  const parent = !this.slug && this.class ? await mongoose.model('Class').findById(this.class).select('slug').lean() : null;
  this.slug = slugify(this.slug || parent?.slug, 'class');
});
export const BookClass = mongoose.model('BookClass', schema);
