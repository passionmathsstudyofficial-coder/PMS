import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sid: { type: String, required: true, unique: true },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const StudentSession = mongoose.model('StudentSession', schema);
