export function safeNavigationUrl(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (/[\u0000-\u0020\\]/.test(text)) return false;
  if (text.startsWith('#') || /^\/(?!\/)/.test(text)) return true;
  try { const url = new URL(text); return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
