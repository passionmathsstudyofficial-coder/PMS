/** No remote requests: recognize only exact Drive hosts and supported file-sharing paths. */
export function driveDocument(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
  const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] || (['/open', '/uc'].includes(url.pathname) ? url.searchParams.get('id') : null);
  if (!id || !/^[\w-]{5,200}$/.test(id)) return null;
  return { id, open: `https://drive.google.com/file/d/${id}/view`, preview: `https://drive.google.com/file/d/${id}/preview`, download: `https://drive.google.com/uc?export=download&id=${id}` };
}

export function normalizeDocumentUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const drive = driveDocument(raw);
  if (drive) return drive.open;
  if (/^\/(?!\/)[^\s\\]*$/.test(raw)) return raw;
  let url;
  try { url = new URL(raw); } catch { throw new Error('Use a valid HTTPS document URL or local file path.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a valid HTTPS document URL.');
  if (['drive.google.com', 'docs.google.com'].includes(url.hostname)) throw new Error('Use a Google Drive file sharing link with a valid file ID.');
  return url.href;
}
