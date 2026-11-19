import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const dbBook = await mongoose.connection.collection('books').findOne({ slug: 'rs-aggarwal' });
const cls8 = await mongoose.connection.collection('classlevels').findOne({ number: 8 });

console.log('Book:', dbBook?._id, dbBook?.slug, dbBook?.title);
console.log('Class 8:', cls8?._id, cls8?.number, cls8?.name);

const chs = await mongoose.connection.collection('chapters').find({
  class: cls8?._id,
  book: dbBook?._id
}).toArray();

console.log('Chapters found for RS Aggarwal Class 8:', chs.length);
for (const c of chs) {
  console.log('Chapter:', { _id: c._id, number: c.number, slug: c.slug, title: c.title });
  const exs = await mongoose.connection.collection('exercises').find({ chapter: c._id }).toArray();
  console.log('  Exercises:', exs.map(e => ({ _id: e._id, number: e.number, slug: e.slug, title: e.title })));
}

// What if book is null or something?
const chWithEx = await mongoose.connection.collection('exercises').findOne({
  $or: [{ slug: 'prashnavali-1-1' }, { number: '1.1' }]
});
console.log('Exercise 1.1 found:', chWithEx ? {
  _id: chWithEx._id,
  number: chWithEx.number,
  slug: chWithEx.slug,
  chapter: chWithEx.chapter
} : null);

if (chWithEx?.chapter) {
  const pCh = await mongoose.connection.collection('chapters').findOne({ _id: chWithEx.chapter });
  console.log('Parent chapter of exercise 1.1:', pCh ? {
    _id: pCh._id,
    number: pCh.number,
    slug: pCh.slug,
    title: pCh.title,
    book: pCh.book,
    class: pCh.class
  } : null);
}

await mongoose.disconnect();
