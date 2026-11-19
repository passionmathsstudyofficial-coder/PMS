import mongoose from 'mongoose';

const baseUri = process.env.MONGODB_URI;
await mongoose.connect(baseUri);
const admin = mongoose.connection.db.admin();
const dbs = await admin.listDatabases();
console.log('Databases on cluster:', dbs.databases.map(d => d.name));

for (const d of dbs.databases) {
  const db = mongoose.connection.client.db(d.name);
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    if (c.name === 'books') {
      const b = await db.collection('books').findOne({ slug: 'rs-aggarwal' });
      if (b) {
        console.log(`Found rs-aggarwal in db "${d.name}":`, { _id: b._id, title: b.title, author: b.author });
      }
    }
  }
}

await mongoose.disconnect();
