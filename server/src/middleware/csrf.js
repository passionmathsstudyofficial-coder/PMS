import { env } from '../config/env.js';
import { hmac, safeEqual } from '../lib/crypto.js';
import { ApiError } from './error.js';
import { readSessionToken } from './auth.js';
import { readStudentToken } from './studentAuth.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/2fa/verify',
  '/api/auth/login',
  '/api/auth/2fa/verify',
  '/api/student/auth/register', '/api/student/auth/login',
  '/api/student/auth/forgot-password', '/api/student/auth/reset-password',
  '/api/auth/forgot-password', '/api/auth/reset-password',
]);

export const csrfTokenFor = (sid) => hmac(`csrf:${sid}`);

function allowedOrigin(req, origin) {
  if (!origin) return true;
  const host = req.get('x-forwarded-host') || req.get('host');
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }
  const allowed = new Set([
    ...env.clientOrigins,
    ...(env.PUBLIC_SITE_URL ? [new URL(env.PUBLIC_SITE_URL).origin] : []),
  ]);
  if (allowed.has(origin)) return true;
  return false;
}

// Signed double-submit token bound to the admin session + strict Origin check on state-changing requests.
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  if (!allowedOrigin(req, req.get('origin'))) return next(new ApiError(403, 'Cross-origin request blocked'));
  const normalizedPath = req.originalUrl?.split('?')[0] || req.path;
  if (EXEMPT_PATHS.has(req.path) || EXEMPT_PATHS.has(normalizedPath)) return next();

  const payload = normalizedPath?.startsWith('/api/student/') ? readStudentToken(req) : readSessionToken(req);
  if (!payload?.sid) return next();

  const provided = req.get('x-csrf-token');
  if (!provided || !safeEqual(provided, csrfTokenFor(payload.sid))) {
    return next(new ApiError(403, 'Invalid or missing CSRF token. Refresh the page and try again.'));
  }
  next();
}
