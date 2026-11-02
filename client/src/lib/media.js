import { API_BASE } from './config.js';
import { driveDocument } from '../../../shared/documents.js';

export function resolveMediaUrl(value, apiBase = API_BASE) {
  const url = String(value || '').trim();
  if (!url || /^(?:javascript|data|vbscript|file):/i.test(url) || url.startsWith('//')) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/') || url.startsWith('/api/public/files/')) {
    const base = /^https?:\/\//i.test(apiBase) ? new URL(apiBase).origin : '';
    if (url.startsWith('/api/public/files/')) return `${apiBase.replace(/\/$/, '')}/public/files/${url.slice('/api/public/files/'.length)}`;
    return `${base}/${url.replace(/^\//, '')}`;
  }
  return url.startsWith('/') ? url : '';
}

export function documentType(mediaOrUrl) {
  const value = typeof mediaOrUrl === 'object' ? mediaOrUrl?.format || mediaOrUrl?.filename || mediaOrUrl?.url : mediaOrUrl;
  return String(value || '').match(/(?:^|\.)(pdf|docx?)(?:$|[?#])/i)?.[1]?.toLowerCase() || '';
}

const WIDTHS = [320, 480, 640, 960, 1280, 1600];

export function imageUrl(media, width) {
  if (!media?.url) return '';
  if (media.provider === 'cloudinary' && width && !['svg', 'pdf', 'doc', 'docx'].includes(media.format)) {
    return media.url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  return resolveMediaUrl(media.url);
}

export function imageSrcSet(media) {
  if (media?.provider !== 'cloudinary' || ['svg', 'pdf', 'doc', 'docx'].includes(media.format)) return undefined;
  const max = media.width ? media.width * 1.25 : Infinity;
  const widths = WIDTHS.filter((w) => w <= max);
  return widths.length ? widths.map((w) => `${imageUrl(media, w)} ${w}w`).join(', ') : undefined;
}

export function aspectRatio(media) {
  return media?.width && media?.height ? `${media.width} / ${media.height}` : undefined;
}

export function documentDownloadUrl(value) {
  const url = resolveMediaUrl(value);
  if (driveDocument(url)) return driveDocument(url).download;
  return /\/public\/files\//.test(url) ? `${url}${url.includes('?') ? '&' : '?'}download=1` : url;
}
