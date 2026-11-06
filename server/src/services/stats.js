import { cache } from '../lib/cache.js';
import { Chapter, Exercise, Question } from '../models/index.js';

async function countBy(Model, field, match) {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

function sessionScope(session) {
  if (!session) return {};
  const selected = String(session).trim();
  const slug = selected.replace(/[–—]/g, '-').toLowerCase();
  const display = slug.replace(/-(\d{2})$/, '–$1');
  const labels = [...new Set([selected, slug, display])];
  return {
    $or: [
      { academicSession: { $in: labels } },
      { academicSession: null },
      { academicSession: '' },
      { academicSession: { $exists: false } },
    ],
  };
}

// Published chapter / exercise / question counts per class (used on class cards).
export async function classStats() {
  return cache.wrap('class-stats', 60_000, async () => {
    const [chapters, exercises, questions] = await Promise.all([
      countBy(Chapter, 'class', Chapter.publicFilter()),
      countBy(Exercise, 'class', Exercise.publicFilter()),
      countBy(Question, 'class', Question.publicFilter()),
    ]);
    return { chapters, exercises, questions };
  });
}

export async function countsForChapters(chapterIds, preview = false, session) {
  const ids = chapterIds.map((id) => id);
  const sessionFilter = sessionScope(session);
  const exMatch = preview ? { chapter: { $in: ids }, ...sessionFilter } : Exercise.publicFilter({ chapter: { $in: ids }, ...sessionFilter });
  const qMatch = preview ? { chapter: { $in: ids }, ...sessionFilter } : Question.publicFilter({ chapter: { $in: ids }, ...sessionFilter });
  const [exercises, questions] = await Promise.all([
    countBy(Exercise, 'chapter', exMatch),
    countBy(Question, 'chapter', qMatch),
  ]);
  return { exercises, questions };
}

export async function countsForExercises(exerciseIds, preview = false, session) {
  const filter = { exercise: { $in: exerciseIds }, ...sessionScope(session) };
  const match = preview ? filter : Question.publicFilter(filter);
  return countBy(Question, 'exercise', match);
}
