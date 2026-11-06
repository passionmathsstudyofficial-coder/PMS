import mongoose from 'mongoose';
import { sanitizeRichText } from '../../lib/sanitize.js';

const { Schema } = mongoose;
export const ObjectId = Schema.Types.ObjectId;

export const LANGUAGE_MODES = ['auto', 'hi', 'en'];
export const languageMode = { type: String, enum: LANGUAGE_MODES, default: 'auto', set: value => value === 'mixed' ? 'auto' : value };

const plain = (maxlength) => ({ type: String, default: '', trim: true, maxlength });
const rich = { type: String, default: '', set: sanitizeRichText, maxlength: 300_000 };

// Short localized text (titles, labels). React renders these as text, so no HTML is ever interpreted.
export const L10nSchema = new Schema(
  { hi: plain(600), en: plain(600), mixed: plain(600) },
  { _id: false },
);

// Longer localized plain text (descriptions, captions).
export const TextL10nSchema = new Schema(
  { hi: plain(6000), en: plain(6000), mixed: plain(6000) },
  { _id: false },
);

// Localized rich text (sanitized HTML from the editor).
export const RichL10nSchema = new Schema({ hi: rich, en: rich, mixed: rich }, { _id: false });

export const l10n = () => ({ type: L10nSchema, default: () => ({}) });
export const textL10n = () => ({ type: TextL10nSchema, default: () => ({}) });
export const richL10n = () => ({ type: RichL10nSchema, default: () => ({}) });

export const ROBOTS = ['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'];

const SeoTranslationSchema = new Schema({ title: plain(200), description: plain(400), ogTitle: plain(200), ogDescription: plain(400) }, { _id:false });
export const SeoSchema = new Schema(
  {
    title: plain(200),
    translations: { en: { type: SeoTranslationSchema, default: () => ({}) }, hi: { type: SeoTranslationSchema, default: () => ({}) } },
    description: plain(400),
    canonical: plain(500),
    ogTitle: plain(200),
    ogDescription: plain(400),
    ogImage: { type: ObjectId, ref: 'Media' },
    robots: { type: String, enum: ROBOTS, default: 'index,follow' },
    h1: l10n(),
    keywords: [plain(80)],
    keywordsByLanguage: { en: [plain(80)], hi: [plain(80)] },
  },
  { _id: false },
);
export const seo = () => ({ type: SeoSchema, default: () => ({}) });

export const MEDIA_KINDS = ['image', 'figure', 'diagram', 'graph', 'construction', 'pdf', 'notes', 'video', 'other'];

export const AttachmentSchema = new Schema({
  media: { type: ObjectId, ref: 'Media', required: true },
  kind: { type: String, enum: MEDIA_KINDS, default: 'image' },
  caption: textL10n(),
  alt: l10n(),
  placement: { type: String, enum: ['question', 'solution'], default: 'question' },
});

export const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'link'];

export const ButtonSchema = new Schema({
  label: l10n(),
  url: plain(500),
  variant: { type: String, enum: BUTTON_VARIANTS, default: 'primary' },
  newTab: { type: Boolean, default: false },
  icon: plain(60),
});

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const FormulaSchema = new Schema(
  {
    title: l10n(),
    latex: { type: String, default: '', maxlength: 5000 },
    description: textL10n(),
  },
  { _id: true },
);
