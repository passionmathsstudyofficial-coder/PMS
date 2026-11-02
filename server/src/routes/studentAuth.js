import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { randomToken } from '../lib/crypto.js';
import { passwordError } from '../lib/permissions.js';
import { User } from '../models/User.js';
import { StudentSession } from '../models/StudentSession.js';
import { STUDENT_COOKIE, STUDENT_JWT, readStudentToken, requireStudent } from '../middleware/studentAuth.js';
import { csrfTokenFor } from '../middleware/csrf.js';
import { ApiError } from '../middleware/error.js';
import { loginLimiter } from '../middleware/rateLimits.js';
const router = express.Router();
const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
const dummy = bcrypt.hashSync('pms-student-timing-equalizer', 12);
const options = { httpOnly: true, secure: env.isProd, sameSite: 'strict', path: '/', maxAge: env.SESSION_ABSOLUTE_HOURS * 3_600_000 };
const safe = user => ({ _id: user._id, name: user.name, email: user.email, preferredLanguage: user.preferredLanguage });
async function begin(res, user) {
  const sid = randomToken(24);
  await StudentSession.create({ user: user._id, sid, expiresAt: new Date(Date.now() + options.maxAge) });
  const token = jwt.sign({ sub: String(user._id), sid }, env.JWT_SECRET, { algorithm: 'HS256', issuer: STUDENT_JWT.issuer, audience: STUDENT_JWT.audience, expiresIn: `${env.SESSION_ABSOLUTE_HOURS}h` });
  res.cookie(STUDENT_COOKIE, token, options);
  user.lastLoginAt = new Date(); user.failedLoginAttempts = 0; user.lockUntil = undefined; await user.save();
  return { user: safe(user), csrfToken: csrfTokenFor(sid) };
}
router.post('/register', loginLimiter, async (req, res) => {
  const data = credentials.extend({ name: z.string().trim().min(1).max(120), preferredLanguage: z.enum(['en', 'hi']).default('en') }).parse(req.body);
  const problem = passwordError(data.password, data.email); if (problem) throw new ApiError(400, problem);
  if (await User.exists({ email: data.email })) throw new ApiError(409, 'An account with this email already exists. Please sign in.');
  const user = await User.create({ name: data.name, email: data.email, preferredLanguage: data.preferredLanguage, passwordHash: await bcrypt.hash(data.password, 12) });
  res.status(201).json(await begin(res, user));
});
router.post('/login', loginLimiter, async (req, res) => {
  const data = credentials.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  const valid = await bcrypt.compare(data.password, user?.passwordHash || dummy);
  if (user?.lockUntil > new Date()) throw new ApiError(423, 'Too many sign-in attempts. Try again later.');
  if (!user?.isActive || !valid) {
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) { user.lockUntil = new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000); user.failedLoginAttempts = 0; }
      await user.save();
    }
    throw new ApiError(401, 'Invalid email or password');
  }
  res.json(await begin(res, user));
});
router.get('/me', requireStudent, (req, res) => res.set('Cache-Control', 'no-store').json({ user: safe(req.student), csrfToken: csrfTokenFor(req.studentSession.sid) }));
router.post('/logout', async (req, res) => {
  const token = readStudentToken(req);
  if (token?.sid) await StudentSession.deleteOne({ sid: token.sid });
  res.clearCookie(STUDENT_COOKIE, { ...options, maxAge: undefined }); res.json({ ok: true });
});
export default router;
