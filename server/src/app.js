import { Media } from './models/index.js';
import { REMOTE_IMAGE_ORIGINS } from '../../shared/mediaPolicy.js';
import { prepareDocumentResponse } from './services/documents.js';
import { mapLegacyLanguages } from '../../shared/languages.js';
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimits.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import api from './routes/index.js';
import { recoveryRouter } from './routes/recovery.js';
import { renderAppHtml, robotsTxt, sitemapXml } from './services/seoHtml.js';

export function createApp({ sendRecoveryEmail } = {}) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const canonical = new URL(env.PUBLIC_SITE_URL);
    const hostname = canonical.hostname.replace(/^www\./i, '');
    if (env.isProd && req.hostname.toLowerCase() === `www.${hostname}`) {
      canonical.hostname = hostname;
      return res.redirect(308, `${canonical.origin}${req.originalUrl}`);
    }
    next();
  });

  const imgSources = ["'self'", 'data:', 'blob:', ...REMOTE_IMAGE_ORIGINS];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'worker-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': imgSources,
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://res.cloudinary.com', 'https://drive.google.com'],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'self'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': env.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
    }),
  );
  app.use(compression());
  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const allowed = new Set([
      ...env.clientOrigins,
      ...(env.PUBLIC_SITE_URL ? [new URL(env.PUBLIC_SITE_URL).origin] : []),
    ]);
    if (allowed.has(origin)) return true;
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
      prepareDocumentResponse(mapLegacyLanguages(JSON.parse(JSON.stringify(body)))).then(json, next);
      return res;
    };
    next();
  });

  // Old local document URLs remain valid aliases but can never bypass publication checks.
  app.use('/uploads', async (req, res, next) => {
    if (!/\.(pdf|docx?)$/i.test(req.path)) return next();
    const key = req.path.replace(/^\//, '');
    const media = await Media.findOne({ provider: 'local', publicId: key }).select('format').lean();
    // Preserve pre-existing public disk URLs that have no Media record. New uploads always have records.
    if (!media) return next();
    return res.redirect(307, `/api/public/files/${media._id}/document.${media.format}${req.query.download === '1' ? '?download=1' : ''}`);
  });

  // Locally stored uploads (development / no Cloudinary). SVGs can never execute scripts here.
  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOAD_DIR), {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        const lower = String(filePath || '').toLowerCase();
        if (/\.docx?$/.test(lower)) {
          res.setHeader('Content-Disposition', 'attachment');
          res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        } else if (lower.endsWith('.pdf')) {
          res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; object-src 'self'");
        } else if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(lower)) {
          res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; frame-ancestors 'self'");
        } else {
          res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use('/api', apiLimiter, csrfProtection);
  app.use('/api/auth', recoveryRouter('admin', sendRecoveryEmail));
  app.use('/api/student/auth', recoveryRouter('student', sendRecoveryEmail));
  app.use('/api', api);
  app.use('/api', notFound);

  app.get('/robots.txt', async (req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(await robotsTxt());
  });
  app.get('/sitemap.xml', async (req, res) => {
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await sitemapXml());
  });

  // Production: serve the built React app with server-rendered SEO tags for every content URL.
  const distIndex = path.join(env.CLIENT_DIST_DIR, 'index.html');
  if (fs.existsSync(distIndex)) {
    app.use(
      '/assets',
      express.static(path.join(env.CLIENT_DIST_DIR, 'assets'), { maxAge: '1y', immutable: true, index: false }),
    );
    app.use(express.static(env.CLIENT_DIST_DIR, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', renderAppHtml);
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
