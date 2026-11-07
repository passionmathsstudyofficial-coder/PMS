// Run only with the existing production process environment supplied privately.
// Writes a complete BSON-preserving export to a private directory; never restores.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.env.PMS_APP_ROOT, 'package.json'));
const mongoose = require('mongoose');
const { EJSON } = mongoose.mongo.BSON;
const directory = process.env.PMS_AUDIT_DIR;
await fsp.mkdir(directory, { recursive: true, mode: 0o700 });
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  if (mongoose.connection.name !== 'test') throw new Error('Refusing to back up an unexpected database');
  const filename = `test-pre-verification-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl.gz`;
  const file = path.join(directory, filename);
  const gzip = zlib.createGzip();
  const output = fs.createWriteStream(file, { mode: 0o600, flags: 'wx' });
  gzip.pipe(output);
  const completion = finished(output);
  const write = async value => { if (!gzip.write(EJSON.stringify(value, { relaxed: false }) + '\n')) await once(gzip, 'drain'); };
  const db = mongoose.connection.db;
  const collections = await db.listCollections({}, { nameOnly: false }).toArray();
  const expected = {};
  await write({ meta: { format: 'pms-full-ejson-v1', database: db.databaseName, createdAt: new Date() } });
  for (const collection of collections.filter(c => !c.name.startsWith('system.')).sort((a,b) => a.name.localeCompare(b.name))) {
    if (collection.type !== 'collection') { await write({ definition: collection }); continue; }
    await write({ collection: collection.name, options: collection.options, indexes: await db.collection(collection.name).listIndexes().toArray() });
    expected[collection.name] = 0;
    for await (const document of db.collection(collection.name).find({})) {
      await write({ c: collection.name, d: document });
      expected[collection.name]++;
    }
  }
  await write({ end: true, counts: expected });
  gzip.end();
  await completion;
  // Re-read every compressed byte and deserialize every BSON value; verify trailer counts.
  const actual = {}; let header, trailer;
  const input = fs.createReadStream(file).pipe(zlib.createGunzip());
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    const entry = EJSON.parse(line, { relaxed: false });
    if (entry.meta) header = entry.meta;
    if (entry.collection) actual[entry.collection] = 0;
    if (entry.c) actual[entry.c]++;
    if (entry.end) trailer = entry;
  }
  if (header?.database !== 'test' || !trailer) throw new Error('Backup header/trailer verification failed');
  for (const [name, count] of Object.entries(expected)) {
    if (actual[name] !== count || Number(trailer.counts[name]) !== count) throw new Error(`Backup count mismatch: ${name}`);
  }
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  const receipt = { ok: true, database: 'test', file, bytes: (await fsp.stat(file)).size, sha256: hash.digest('hex'),
    verifiedAt: new Date().toISOString(), counts: actual, documents: Object.values(actual).reduce((a,b) => a+b,0),
    verification: 'Full gzip decompression, BSON/EJSON deserialization, header/footer and per-collection counts; indexes/options included. No production restore performed.' };
  await fsp.writeFile(path.join(directory, 'backup-receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
} finally { await mongoose.disconnect(); }
