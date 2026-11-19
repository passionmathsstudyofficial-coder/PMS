import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const classes = await mongoose.connection.collection('classlevels').find({}).toArray();
console.log('Classes count:', classes.length);
for (const c of classes) {
  console.log({ _id: c._id, number: c.number, name: c.name, slug: c.slug });
}

// And check all chapters where book = 6aec4f4cd00969cc1edb5018
const rsChs = await mongoose.connection.collection('chapters').find({
  $or: [
    { book: new mongoose.Types.ObjectId('6aec4f4cd00969cc1edb5018') },
    { book: '6aec4f4cd00969cc1edb5018' }
  ]
}).toArray();
console.log('Chapters with book=RS Aggarwal:', rsChs.length);
for (const c of rsChs) {
  console.log('RS Chapter:', { _id: c._id, number: c.number, slug: c.slug, title: c.title, class: c.class });
}

// And check exercises for those chapters
for (const c of rsChs) {
  const exs = await mongoose.connection.collection('exercises').find({ chapter: c._id }).toArray();
  console.log('RS Chapter exercises:', exs.map(e => ({ _id: e._id, number: e.number, slug: e.slug, title: e.title })));
}

await mongoose.disconnect();
