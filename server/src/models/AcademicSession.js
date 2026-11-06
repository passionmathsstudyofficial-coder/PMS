import mongoose from 'mongoose';
import { textL10n } from './schemas/common.js';

const { Schema } = mongoose;

const academicSessionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 50 }, // e.g. "2026–27"
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 50 }, // e.g. "2026-27"
    year: { type: Number, required: true, min: 2000, max: 2100 }, // e.g. 2026
    isCurrent: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    description: textL10n(),
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

academicSessionSchema.index({ sortOrder: 1, year: -1 });
academicSessionSchema.index({ isCurrent: 1, isActive: 1 });

academicSessionSchema.pre('save', async function handleCurrent() {
  if (this.isCurrent) {
    // Ensure only one session is marked current
    await mongoose.model('AcademicSession').updateMany({ _id: { $ne: this._id } }, { $set: { isCurrent: false } });
  }
});

export const AcademicSession = mongoose.model('AcademicSession', academicSessionSchema);

