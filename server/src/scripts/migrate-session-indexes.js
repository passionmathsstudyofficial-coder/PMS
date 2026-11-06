// Dry-run by default. Uses raw collections so application auto-indexing cannot
// change indexes before the backup is complete.
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const apply = process.argv.includes('--apply');
const session = process.argv.find((arg) => arg.startsWith('--legacy-session='))?.split('=')[1];
if (apply && !/^\d{4}-\d{2}$/.test(session || '')) throw new Error('Specify --legacy-session=YYYY-YY for existing content without a session');
const connection = await mongoose.createConnection(env.MONGODB_URI, { autoIndex: false, autoCreate: false }).asPromise();
try {
  const db = connection.db;
  const counts = {};
  const names = ['chapters', 'notes', 'resources', 'importantquestions', 'exercises', 'questions'];
  for (const name of names) counts[name] = await db.collection(name).countDocuments({ academicSession: { $in: [null, ''] } });
  console.log(JSON.stringify({ apply, missingSessions: counts }));
  if (apply) {
    const folder = path.resolve(env.BACKUP_DIR, `before-session-migration-${Date.now()}`);
    await fs.mkdir(folder, { recursive: true });
    for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
      const records = await db.collection(name).find({}).toArray();
      await fs.writeFile(path.join(folder, `${name}.ejson`), mongoose.mongo.BSON.EJSON.stringify(records), { flag: 'wx' });
    }
    for (const name of names) {
      await db.collection(name).updateMany({ academicSession: { $in: [null, ''] } }, { $set: { academicSession: session } });
      await db.collection(name).updateMany({ academicSession: /[–—]/ }, [{ $set: { academicSession: { $replaceAll: { input: { $replaceAll: { input: '$academicSession', find: '–', replacement: '-' } }, find: '—', replacement: '-' } } } }]);
    }
    for (const [child, parent, foreignKey] of [['exercises', 'chapters', 'chapter'], ['questions', 'exercises', 'exercise']]) {
      for await (const record of db.collection(parent).find({}, { projection: { academicSession: 1 } })) {
        await db.collection(child).updateMany({ [foreignKey]: record._id }, { $set: { academicSession: record.academicSession } });
      }
    }
    for (const [name, fields] of [['chapters', { class: 1, subject: 1, book: 1, academicSession: 1, slug: 1 }], ['notes', { class: 1, subject: 1, academicSession: 1, slug: 1 }]]) {
      const collection = db.collection(name);
      // Create the stronger scoped index first; retain old index if validation fails.
      await collection.createIndex(fields, { unique: true });
      for (const index of await collection.indexes()) {
        if (index.unique && index.key.slug && index.key.class && index.key.subject && !index.key.academicSession) await collection.dropIndex(index.name);
      }
    }
    await db.collection('pages').updateMany({ landingKey: '' }, { $unset: { landingKey: '' } });
    await db.collection('solutions').updateMany({ status: { $exists: false } }, { $set: { status: 'published' } });
    console.log('Migration completed; backup saved before changes. Safe to rerun.');
  }
} finally {
  await connection.close();
}
