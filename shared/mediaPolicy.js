// Keep remote image rendering aligned with the server's img-src policy.
export const REMOTE_IMAGE_ORIGINS = Object.freeze([
  'https://i.ytimg.com', 'https://img.youtube.com', 'https://res.cloudinary.com',
]);

export function permittedImageUrl(value, ownOrigin = '') {
  if (!value || typeof value !== 'string') return '';
  value = value.trim();
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    return !url.username && !url.password && ['http:', 'https:'].includes(url.protocol) &&
      (url.origin === ownOrigin || REMOTE_IMAGE_ORIGINS.includes(url.origin)) ? value : '';
  } catch { return ''; }
}
