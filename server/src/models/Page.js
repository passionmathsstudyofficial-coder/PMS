import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
import { contentPlugin } from './plugins/content.js';
import { ObjectId, languageMode, l10n, richL10n, seo, textL10n } from './schemas/common.js';
import { joinSearch, l10nText } from '../services/searchText.js';

// Static CMS pages: About Us, Contact, Privacy Policy, Terms & Conditions, …
const pageSchema = new mongoose.Schema(
  {
    landingKey: { type: String, trim: true, lowercase: true, sparse: true, unique: true, maxlength: 160, set: (value) => value?.trim() || undefined },
    title: l10n(),
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    excerpt: textL10n(),
    content: richL10n(),
    hero: {
      title: l10n(),
      description: textL10n(),
      image: { type: ObjectId, ref: 'Media' },
      banner: { type: ObjectId, ref: 'Media' },
    },
    sections: [{
      type: { type: String, enum: ['richText', 'image', 'resourceCards', 'buttons', 'faq'], default: 'richText' },
      title: l10n(),
      text: richL10n(),
      image: { type: ObjectId, ref: 'Media' },
      visible: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
      items: [{ title: l10n(), text: textL10n(), image: { type: ObjectId, ref: 'Media' }, label: textL10n(), url: { type: String, default: '' } }],
    }],
    template: { type: String, enum: ['default', 'contact', 'legal'], default: 'default' },
    languageMode,
    seo: seo(),
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

pageSchema.plugin(contentPlugin);
pageSchema.index({ searchText: 'text' }, { default_language: 'none' });
pageSchema.index({ landingKey: 1, status: 1 });

pageSchema.pre('validate', function buildPage() {
  this.slug = slugify(this.slug || this.title?.en || this.title?.hi, 'page');
  if ((!this.landingKey && /^class-\d+/.test(this.slug)) || ['search', 'api', 'uploads'].includes(this.slug)) {
    this.invalidate('slug', 'This slug is reserved');
  }
  this.searchText = joinSearch(l10nText(this.title), l10nText(this.excerpt), l10nText(this.content));
});

export const Page = mongoose.model('Page', pageSchema);
export { ensureDefaultLandingPages } from '../services/landingPages.js';

