import { BookClass, ClassLevel } from '../models/index.js';
// Insert only: existing metadata, publication settings and content are never overwritten.
export async function ensureBookClasses(book, { createClasses = false } = {}) {
 if (book.category !== 'reference') return [];
 const result = [];
 for (let number = 6; number <= 12; number++) {
   let cls = await ClassLevel.findOne({ number });
   if (!cls && !createClasses) continue;
   if (!cls) cls = await ClassLevel.create({ number, name: { en: `Class ${number}` }, slug: `class-${number}`, status: 'published', isVisible: true });
   let entry = await BookClass.findOne({ book: book._id, class: cls._id });
   if (!entry) {
     try { entry = await BookClass.create({ book: book._id, class: cls._id, slug: cls.slug, name: { en: `Class ${number}`, hi: `कक्षा ${number}` }, subjects: cls.subjects, sortOrder: number, status: 'published', isVisible: true }); }
     catch (error) { if (error.code !== 11000) throw error; entry = await BookClass.findOne({ book: book._id, class: cls._id }); if (!entry) throw error; }
   }
   result.push(entry);
 }
 return result;
}
