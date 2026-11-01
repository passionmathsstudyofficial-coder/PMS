import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { StudentSession } from '../models/StudentSession.js';
import { ApiError } from './error.js';
export const STUDENT_COOKIE = 'pms_student';
export const STUDENT_JWT = { algorithms: ['HS256'], issuer: 'pms', audience: 'pms-student' };
export function readStudentToken(req) {
  try { return jwt.verify(req.cookies?.[STUDENT_COOKIE], env.JWT_SECRET, STUDENT_JWT); } catch { return null; }
}
export async function requireStudent(req, res, next) {
  try {
    const payload = readStudentToken(req);
    const session = payload?.sid && await StudentSession.findOne({ sid: payload.sid, user: payload.sub });
    if (!session || session.expiresAt <= new Date() || Date.now() - session.lastSeenAt.getTime() > env.SESSION_IDLE_MINUTES * 60_000) throw new ApiError(401, 'Please sign in again.');
    const user = await User.findById(session.user);
    if (!user?.isActive) throw new ApiError(401, 'Please sign in again.');
    if (Date.now() - session.lastSeenAt.getTime() > 60_000) { session.lastSeenAt = new Date(); await session.save(); }
    req.student = user; req.studentSession = session;
    next();
  } catch (error) { next(error); }
}
