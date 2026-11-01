import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ADMIN_PATH } from '@/lib/config';
import { Link } from 'react-router';

export const isExternal = (url) => /^(https?:)?\/\//i.test(url || '') || /^(mailto|tel):/i.test(url || '');

/**
 * Renders internal links with the router, external links with safe attributes and "#anchor" links as same-page anchors.
 * Use "/#classes" (with the slash) in the CMS to link to a homepage section from other pages.
 */
export function SmartLink({ to, newTab, allowAdmin = false, children, ...props }) {
  useUiLanguage();
  const url = to || '#';
  let pathname;
  try { pathname = new URL(url, window.location.origin).pathname.replace(/\/$/, ''); } catch { return null; }
  if (!allowAdmin && (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`))) return null;
  if (!/^(?:https?:|mailto:|tel:|\/|#)/i.test(url)) return null;
  if (isExternal(url) || newTab) {
    return (
      <a href={url} target={newTab || isExternal(url) ? '_blank' : undefined} rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  if (url.startsWith('#')) {
    return (
      <a href={url} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link to={url} {...props}>
      {children}
    </Link>
  );
}
