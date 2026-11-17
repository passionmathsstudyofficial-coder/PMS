import { randomToken } from '../lib/crypto.js';
import mongoose from 'mongoose';

// Temporary editor snapshots must survive requests landing on different production workers.
const TTL = 15 * 60_000;
const schema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  entry: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
const PreviewSnapshot = mongoose.model('PreviewSnapshot', schema);

export async function savePreview(entry) {
  const token = randomToken(18);
  await PreviewSnapshot.create({ token, entry, expiresAt: new Date(Date.now() + TTL) });
  return token;
}

export async function getPreview(token) {
  if (!token) return null;
  const snapshot = await PreviewSnapshot.findOne({ token: String(token), expiresAt: { $gt: new Date() } }).lean();
  return snapshot?.entry || null;
}
