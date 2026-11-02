import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  kind: { type: String, enum: ['admin', 'student'], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PasswordRecovery = mongoose.model('PasswordRecovery', schema);
