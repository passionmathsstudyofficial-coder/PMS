import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env.js';
import { randomToken } from '../lib/crypto.js';
import { passwordError } from '../lib/permissions.js';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { StudentSession } from '../models/StudentSession.js';
import { PasswordRecovery } from '../models/PasswordRecovery.js';
import { loginLimiter } from '../middleware/rateLimits.js';
import { ApiError } from '../middleware/error.js';
import { sendRecoveryEmail } from '../services/recoveryEmail.js';
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
export function recoveryRouter(kind, deliver = sendRecoveryEmail) {
  const router = express.Router();
  const Model = kind === 'admin' ? Admin : User;
  router.post('/forgot-password', loginLimiter, async (req, res) => {
    const { email, language } = z.object({ email: z.string().trim().toLowerCase().email().max(200), language: z.enum(['en', 'hi']).default('en') }).parse(req.body);
    if (deliver === sendRecoveryEmail && (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM)) throw new ApiError(503, 'Password recovery is unavailable. Please contact the administrator.');
    const account = await Model.findOne({ email, isActive: true });
    if (account) {
      const token = randomToken();
      const record = await PasswordRecovery.create({ account: account._id, kind, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60_000) });
      const url = new URL('/reset-password', env.PUBLIC_SITE_URL);
      url.searchParams.set('token', token); url.searchParams.set('kind', kind); url.searchParams.set('lang', language);
      try { await deliver({ email, url: url.href, language }); }
      catch (error) { await record.deleteOne(); throw error; }
    }
    res.set('Cache-Control', 'no-store').json({ ok: true });
  });
  router.post('/reset-password', loginLimiter, async (req, res) => {
    const { token, password } = z.object({ token: z.string().min(32).max(200), password: z.string().min(1).max(200) }).parse(req.body);
    const record = await PasswordRecovery.findOne({ kind, tokenHash: hash(token), expiresAt: { $gt: new Date() } });
    if (!record) throw new ApiError(400, 'This reset link is invalid or expired. Request a new link.');
    const account = await Model.findById(record.account);
    if (!account?.isActive) throw new ApiError(400, 'This reset link is invalid or expired. Request a new link.');
    const problem = passwordError(password, account.email); if (problem) throw new ApiError(400, problem);
    // Atomic single-use claim prevents concurrent reuse of the same token.
    const claimed = await PasswordRecovery.findOneAndDelete({ _id: record._id, expiresAt: { $gt: new Date() } });
    if (!claimed) throw new ApiError(400, 'This reset link is invalid or expired. Request a new link.');
    account.passwordHash = await bcrypt.hash(password, 12); account.failedLoginAttempts = 0; account.lockUntil = undefined;
    if (kind === 'admin') account.passwordChangedAt = new Date();
    await account.save();
    await PasswordRecovery.deleteMany({ account: account._id, kind });
    await (kind === 'admin' ? Session.deleteMany({ admin: account._id }) : StudentSession.deleteMany({ user: account._id }));
    res.set('Cache-Control', 'no-store').json({ ok: true });
  });
  return router;
}
