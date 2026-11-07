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

export async function ensureDefaultHeaderFooter() {
  try {
    // 1. Ensure Navigation header has NCERT Mathematics
    let headerNav = await Navigation.findOne({ key: 'header' });
    if (headerNav && Array.isArray(headerNav.items)) {
      let changed = false;
      for (const item of headerNav.items) {
        const en = (item.label?.en || '').toLowerCase();
        if (item.type === 'classes' && (en === 'mathematics' || en === 'maths')) {
          item.label.en = 'NCERT Mathematics';
          item.label.hi = item.label.hi || 'NCERT गणित';
          changed = true;
        }
      }

      if (changed) {
        await headerNav.save();
      }
    }

    // 2. Sanitize and ensure clean Announcements
    const AnnouncementModel = mongoose.models.Announcement;
    if (AnnouncementModel) {
      const allAnnouncements = await AnnouncementModel.find();
      for (const a of allAnnouncements) {
        const missingEn = !a.text?.en || !a.text.en.trim() || /अध्याय-wise/.test(a.text.en);
        if (missingEn) {
          a.badge = { hi: 'नया सत्र 2026-27', en: 'NEW SESSION 2026-27' };
          a.text = {
            hi: 'नए शैक्षणिक सत्र 2026-27 में आपका स्वागत है! नए सत्र की सभी कक्षाएं और स्टडी मटेरियल अब उपलब्ध हैं।',
            en: '"Dear students, welcome to the new academic session 2026-27! New content and study materials are now available."',
          };
          a.linkLabel = { hi: 'शुरू करें →', en: 'Start Learning →' };
          a.linkUrl = '/#classes';
          a.isVisible = true;
          await a.save();
        }
      }
    }
  } catch (err) {
    console.error('[ensureDefaultHeaderFooter] error:', err);
  }
}
