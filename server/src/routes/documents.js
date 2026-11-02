import express from 'express';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { env } from '../config/env.js';
import { isObjectId } from '../lib/request.js';
import { hasPermission } from '../lib/permissions.js';
import { cloudinary, uploadRoot } from '../lib/storage.js';
import { Media } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { isDocument, isPublicDocument } from '../services/documents.js';

const router = express.Router();
router.get(['/:id', '/:id/:filename'], optionalAuth, async (req, res) => {
  if (!isObjectId(req.params.id)) throw new ApiError(404, 'Document not found');
  const media = await Media.findById(req.params.id).lean();
  if (!isDocument(media)) throw new ApiError(404, 'Document not found');
  const staff = req.admin && hasPermission(req.admin.role, 'content:read') && (!env.REQUIRE_2FA || req.admin.totpEnabled);
  if (!staff && !await isPublicDocument(media)) throw new ApiError(404, 'Document not found');
  const download = req.query.download === '1' || media.format !== 'pdf';
  const filename = (media.originalName || media.filename || `document.${media.format}`).replace(/[\r\n"\\/]/g, '_');
  res.removeHeader('X-Frame-Options');
  res.set({
    'Content-Type': media.mimeType,
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="document.${media.format}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/'/g, '%27')}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': `default-src 'none'; frame-ancestors 'self' ${[...new Set([...env.clientOrigins, new URL(env.PUBLIC_SITE_URL).origin])].join(' ')}`,
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  if (media.provider === 'local') {
    const file = path.resolve(uploadRoot, media.publicId);
    if (!file.startsWith(uploadRoot + path.sep)) throw new ApiError(404, 'Document not found');
    return res.sendFile(file);
  }
  if (media.provider !== 'cloudinary' || !env.cloudinaryConfigured) throw new ApiError(503, 'Document storage is unavailable');
  // Use signed API delivery; the CDN can block PDF/ZIP delivery even after a successful upload.
  // Existing public raw keys (including extensionless ones) remain usable. New raw uploads are private.
  const resourceType = /\/image\//.test(media.url) ? 'image' : 'raw';
  const type = /\/(?:raw|image)\/(?:private|authenticated)\//.test(media.url) ? media.url.match(/\/(?:raw|image)\/(private|authenticated)\//)[1] : 'upload';
  const signed = cloudinary.utils.private_download_url(media.publicId, resourceType === 'raw' ? '' : media.format, {
    resource_type: resourceType, type, attachment: download, expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  let upstream;
  try { upstream = await fetch(signed, { signal: AbortSignal.timeout(60000) }); }
  catch { throw new ApiError(502, 'Document storage could not be reached. Please retry.'); }
  if (!upstream.ok || !upstream.body) throw new ApiError(502, 'Document could not be retrieved from storage. Please contact the administrator.');
  try { await pipeline(Readable.fromWeb(upstream.body), res); }
  catch (error) { if (res.headersSent) res.destroy(); else throw error; }
});
export default router;
