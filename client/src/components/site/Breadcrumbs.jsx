import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Home } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useInterfaceL10n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Breadcrumbs always come from database relationships (API "breadcrumbs" array). */
export function Breadcrumbs({ items, className }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  if (!items?.length) return null;

  const resolveCrumbLabel = (item) => {
    if (item.url === '/') return uiText('Home');
    const raw = typeof item.label === 'string' ? item.label : t(item.label);
    const isInvalid = !raw || raw.includes('Content not available') || raw.includes('उपलब्ध नहीं') || raw.includes('सामग्री उपलब्ध नहीं');
    if (!isInvalid) return raw;
    const fallback = (typeof item.label === 'object' ? (item.label?.en || item.label?.hi || item.label?.mixed) : '') || '';
    if (fallback && !fallback.includes('Content not available') && !fallback.includes('उपलब्ध नहीं') && !fallback.includes('सामग्री उपलब्ध नहीं')) return fallback;
    // Derive fallback from URL segment if label was empty or invalid
    const segment = (item.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
    if (segment) {
      if (segment.startsWith('adhyay-') || segment.startsWith('chapter-')) {
        const num = segment.replace(/^[a-z]+-?/i, '');
        return `${uiText('Chapter')} ${num}`;
      }
      if (segment.startsWith('prashnavali-') || segment.startsWith('exercise-')) {
        const num = segment.replace(/^[a-z]+-?/i, '').replace(/-/g, '.');
        return `${uiText('Exercise')} ${num}`;
      }
      if (segment.startsWith('part-') || segment.startsWith('volume-')) {
        const num = segment.replace(/^[a-z]+-?/i, '');
        return `${uiText('Part')} ${num}`;
      }
      if (segment.startsWith('class-')) {
        const num = segment.replace(/^[a-z]+-?/i, '');
        return `${uiText('Class')} ${num}`;
      }
    }
    return '';
  };

  return (
    <Breadcrumb className={cn('w-full max-w-full overflow-x-auto pb-1', className)}>
      <BreadcrumbList className="flex-nowrap text-[13px] whitespace-nowrap">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const displayLabel = resolveCrumbLabel(item);
          return (
            <Fragment key={`${item.url}-${index}`}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage className="font-semibold">{displayLabel}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.url} className="inline-flex items-center gap-1 hover:text-brand">
                      {index === 0 && <Home className="size-3.5" aria-hidden="true" />}
                      {displayLabel}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
