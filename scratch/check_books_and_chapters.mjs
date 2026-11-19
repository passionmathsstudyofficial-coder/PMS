import mongoose from 'mongoose';
import { ClassLevel, Book, Chapter, Exercise } from '../server/src/models/index.js';

await mongoose.connect(process.env.MONGODB_URI);

const allBooks = await Book.find({ category: 'reference' }).lean();
console.log('All Reference Books:');
for (const b of allBooks) {
  console.log({ _id: b._id, slug: b.slug, title: b.title, author: b.author });
  const chCount = await Chapter.countDocuments({ book: b._id });
  console.log(`  Chapters with book=${b.slug}: ${chCount}`);
  if (chCount > 0) {
    const chs = await Chapter.find({ book: b._id }).lean();
    for (const c of chs) {
      console.log(`    Ch ${c.number}: ${JSON.stringify(c.title)} (slug: ${c.slug})`);
      const exs = await Exercise.find({ chapter: c._id }).lean();
      for (const e of exs) {
        console.log(`      Ex ${e.number}: ${JSON.stringify(e.title)} (slug: ${e.slug})`);
      }
    }
  }
}

await mongoose.disconnect();
