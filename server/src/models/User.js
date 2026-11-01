import mongoose from 'mongoose';
import { ObjectId } from './schemas/common.js';

// Student authentication is isolated from staff accounts and sessions.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true, maxlength: 200 },
    passwordHash: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    preferredLanguage: { type: String, enum: ['hi', 'en'], default: 'en' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    classLevel: { type: ObjectId, ref: 'Class' },
    bookmarks: [
      {
        kind: { type: String, enum: ['Chapter', 'Exercise', 'Question', 'Note', 'ImportantQuestion'] },
        item: { type: ObjectId, refPath: 'bookmarks.kind' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
