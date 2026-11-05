import mongoose from 'mongoose';
import { safeNavigationUrl } from '../../../shared/links.js';
import { ObjectId, l10n } from './schemas/common.js';

const { Schema } = mongoose;

const NavChildSchema = new Schema({
  label: l10n(),
  url: { type: String, default: '', trim: true, maxlength: 500, validate: safeNavigationUrl },
  newTab: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  description: l10n(),
});

// type "classes" expands to live class links from the database (no hardcoded class lists).
const NavItemSchema = new Schema({
  label: l10n(),
  url: { type: String, default: '', trim: true, maxlength: 500, validate: safeNavigationUrl },
  type: { type: String, enum: ['link', 'classes', 'column', 'dropdown', 'mega'], default: 'link' },
  newTab: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  icon: { type: String, default: '', maxlength: 60 },
  children: [NavChildSchema],
});

export const NAV_KEYS = ['header', 'footer', 'footerBottom'];

const navigationSchema = new Schema(
  {
    key: { type: String, enum: NAV_KEYS, required: true, unique: true },
    items: [NavItemSchema],
    updatedBy: { type: ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

export const Navigation = mongoose.model('Navigation', navigationSchema);
