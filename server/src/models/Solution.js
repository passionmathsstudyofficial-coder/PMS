import mongoose from 'mongoose';
import { ObjectId, languageMode, textL10n, richL10n } from './schemas/common.js';
import { SolutionBlockSchema } from './SolutionBlock.js';
import { blocksText, joinSearch, l10nText } from '../services/searchText.js';

export const SolutionMethodSchema = new mongoose.Schema({
  title: textL10n(),
  methodType: { type: String, enum: ['standard', 'shortcut', 'alternative', 'custom'], default: 'standard' },
  blocks: [SolutionBlockSchema],
  finalAnswer: richL10n(),
  isDefault: { type: Boolean, default: false },
});

const solutionSchema = new mongoose.Schema(
  {
    question: { type: ObjectId, ref: 'Question', required: true, unique: true },
    blocks: [SolutionBlockSchema],
    methods: [SolutionMethodSchema],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published', index: true },
    publishedAt: { type: Date, index: true },
    isVisible: { type: Boolean, default: true },
    languageMode,
    template: { type: ObjectId, ref: 'Template' },
    createdBy: { type: ObjectId, ref: 'Admin' },
    updatedBy: { type: ObjectId, ref: 'Admin' },
    searchText: { type: String, select: false },
  },
  { timestamps: true },
);

solutionSchema.index({ searchText: 'text' }, { default_language: 'none' });

solutionSchema.pre('save', function setPublishedAt() {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

solutionSchema.statics.publicFilter = function publicFilter(extra = {}) {
  return {
    status: 'published',
    isVisible: true,
    $or: [
      { publishedAt: { $lte: new Date() } },
      { publishedAt: null },
      { publishedAt: { $exists: false } },
    ],
    ...extra,
  };
};

solutionSchema.pre('validate', function buildSolution() {
  const methodTexts = (this.methods || []).flatMap((m) => [
    l10nText(m.title),
    l10nText(m.finalAnswer),
    ...blocksText(m.blocks),
  ]);
  this.searchText = joinSearch(blocksText(this.blocks), ...methodTexts);
});

export const Solution = mongoose.model('Solution', solutionSchema);
