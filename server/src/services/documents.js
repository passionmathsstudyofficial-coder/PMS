import mongoose from 'mongoose';
import { Media } from '../models/index.js';
import { findMediaUsage } from './usage.js';

export const isDocument = media => ['pdf', 'doc', 'docx'].includes(media?.format);
export const documentUrl = (id, format) => `/api/public/files/${id}/document.${format}`;

// The site has public published learning content and authenticated CMS staff, no enrollment model.
// A document stays private until referenced by visible, published content (including its parents).
async function publishedWithParents(Model, id, visited = new Set()) {
  const key = `${Model.modelName}:${id}`;
  if (visited.has(key)) return true;
  visited.add(key);
  if (!Model.publicFilter) return false;
  const doc = await Model.findOne(Model.publicFilter({ _id: id })).select('class subject chapter exercise question book topic isPublic').lean();
  if (!doc || (Model.modelName === 'Subject' && doc.isPublic === false)) return false;
  const parents = { class: 'Class', subject: 'Subject', chapter: 'Chapter', exercise: 'Exercise', question: 'Question', book: 'Book', topic: 'Topic' };
  for (const [field, model] of Object.entries(parents)) {
    if (doc[field] && !await publishedWithParents(mongoose.model(model), doc[field], visited)) return false;
  }
  return true;
}

function hasVisibleReference(value, media) {
  if (!value) return false;
  if (typeof value === 'string') return value === String(media._id) || value.includes(media.url) || value.includes(`/api/public/files/${media._id}`);
  if (value._bsontype === 'ObjectId') return String(value) === String(media._id);
  if (Array.isArray(value)) return value.some(item => hasVisibleReference(item, media));
  if (typeof value === 'object') {
    if (value.isVisible === false) return false;
    return Object.values(value).some(item => hasVisibleReference(item, media));
  }
  return false;
}

export async function isPublicDocument(media) {
  const names = { 'Important Question': 'ImportantQuestion', 'Homepage Section': 'Section', 'Class': 'Class' };
  for (const usage of await findMediaUsage(media._id)) {
    if (usage.type === 'Template' || usage.type === 'Website Settings' || usage.type === 'SEO') continue;
    const Model = mongoose.models[names[usage.type] || usage.type];
    if (!Model) continue;
    const record = await Model.findById(usage.id).lean();
    if (!hasVisibleReference(record, media)) continue;
    // Solutions inherit publication visibility from their question.
    if (usage.type === 'Solution') {
      const solution = await Model.findById(usage.id).select('question').lean();
      if (solution?.question && await publishedWithParents(mongoose.model('Question'), solution.question)) return true;
    } else if (await publishedWithParents(Model, usage.id)) return true;
  }
  return false;
}

export async function prepareDocumentResponse(body) {
  const urls = new Set();
  function collect(value) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        if (/\/uploads\/|cloudinary\.com\//.test(match[1])) urls.add(match[1].replace(/&amp;/g, '&'));
      }
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  collect(body);
  const replacements = new Map();
  if (urls.size) {
    const media = await Media.find({ url: { $in: [...urls] }, format: { $in: ['pdf', 'doc', 'docx'] } }).select('url format').lean();
    for (const item of media) replacements.set(item.url, documentUrl(item._id, item.format));
  }
  function visit(value) {
    if (typeof value === 'string') return value.replace(/((?:href|src)=["'])([^"']+)(["'])/g, (all, prefix, url, suffix) => {
      const replacement = replacements.get(url.replace(/&amp;/g, '&'));
      return replacement ? prefix + replacement + suffix : all;
    });
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    if (isDocument(result) && result.provider && result._id && result.url) result.url = documentUrl(result._id, result.format);
    if (isDocument(result.file) && result.file?.url) result.fileUrl = result.file.url;
    return result;
  }
  return visit(body);
}
