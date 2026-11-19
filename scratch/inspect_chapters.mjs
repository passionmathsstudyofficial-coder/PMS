import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const rsBook = await mongoose.connection.collection('books').findOne({ slug: 'rs-aggarwal' });
const allChs = await mongoose.connection.collection('chapters').find({ book: rsBook?._id }).toArray();
console.log('RS Aggarwal chapters count:', allChs.length);
for (const c of allChs.slice(0, 10)) {
  console.log(' - Ch:', { _id: c._id, number: c.number, slug: c.slug, title: c.title });
}
await mongoose.disconnect();
