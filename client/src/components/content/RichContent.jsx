import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { resolveMediaUrl } from '@/lib/media';
import { prepareRichHtml } from './mathContent.js';
import DOMPurify from 'dompurify';
import { renderMathContent } from './renderMathContent.js';
export { KATEX_OPTIONS } from './renderMathContent.js';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'data-latex', 'data-type', 'colwidth'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
};

/** Sanitized CMS HTML with KaTeX math ($…$, $$…$$ and <span data-latex>). */
export function RichContent({ html, className, as: Tag = 'div', ...props }) {
  useUiLanguage();
  const ref = useRef(null);
  const clean = useMemo(() => DOMPurify.sanitize(prepareRichHtml(html), PURIFY_CONFIG), [html]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = clean;
    el.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.replaceWith(wrapper);
      wrapper.appendChild(table);
    });
    renderMathContent(el);
    el.querySelectorAll('img').forEach((img) => {
      img.src = resolveMediaUrl(img.getAttribute('src'));
      img.loading = 'lazy';
      img.decoding = 'async';
    });
    el.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('href', resolveMediaUrl(a.getAttribute('href')) || a.getAttribute('href'));
      if (/\.(pdf|docx?)(?:$|[?#])/i.test(a.getAttribute('href'))) {
        a.classList.add('document-link');
        a.setAttribute('aria-label', `${a.textContent || 'Document'} · Open document`);
      }
      if (!a.href.startsWith(window.location.origin)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    });
  }, [clean]);

  return <Tag ref={ref} className={cn('rich', className)} {...props} />;
}
