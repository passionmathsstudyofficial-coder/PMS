import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const chs = await mongoose.connection.collection('chapters').find({
  $or: [
    { slug: /adhyay-1/i },
    { slug: /chapter-1/i },
    { 'title.hi': /परिमेय/ },
    { 'title.en': /rational/i }
  ]
}).toArray();

console.log('Matching chapters:', chs.length);
for (const c of chs) {
  console.log({
    _id: c._id,
    slug: c.slug,
    title: c.title,
    number: c.number,
    book: c.book,
    class: c.class,
    subject: c.subject
  });
}

// Also check bookclasses
const bcs = await mongoose.connection.collection('bookclasses').find({}).toArray();
console.log('BookClasses count:', bcs.length);
for (const b of bcs) {
  console.log('BookClass:', { _id: b._id, slug: b.slug, book: b.book, class: b.class });
}

await mongoose.disconnect();
