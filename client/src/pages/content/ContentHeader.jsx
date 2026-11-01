import { uiText } from '@/lib/uiLanguage.js';
import { ContentLanguageSwitcher } from '@/components/content/ContentLanguageSwitcher.jsx';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isValidElement, useRef } from 'react';
import { Link } from 'react-router';
import { Breadcrumbs } from '@/components/site/Breadcrumbs.jsx';
import { useInterfaceL10n } from '@/lib/i18n';
import { useEntrance } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function ContentHeader({ breadcrumbs, eyebrow, title, subtitle, watermark, children, aside, className }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const ref = useRef(null);
  useEntrance(ref, [String(watermark), breadcrumbs?.at(-1)?.url]);

  const resolvedTitle = typeof title === 'object' && title !== null && !isValidElement(title) ? t(title) : title;
  const resolvedSubtitle = typeof subtitle === 'object' && subtitle !== null && !isValidElement(subtitle) ? t(subtitle) : subtitle;

  return (
    <section ref={ref} className={cn('relative overflow-hidden border-b bg-gradient-to-b from-brand-soft/40 to-background', className)}>
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      {watermark !== undefined && (
        <span
          className="pointer-events-none absolute -top-6 right-2 font-heading text-[9rem] leading-none font-extrabold text-brand/[0.06] select-none sm:right-10 sm:text-[12rem] dark:text-white/[0.04]"
          aria-hidden="true"
        >
          {typeof watermark === 'string' ? uiText(watermark) : watermark}
        </span>
      )}
      <div className="container-page relative py-6 sm:py-9">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow && (
              <div data-enter className="mb-3 flex flex-wrap items-center gap-2">
                {eyebrow}
              </div>
            )}
            <h1 data-enter className="font-heading text-[1.7rem] leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-4xl dark:text-foreground">
              {resolvedTitle}
            </h1>
            {resolvedSubtitle && (
              <p data-enter className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {resolvedSubtitle}
              </p>
            )}
            {children && <div data-enter>{children}</div>}
            <ContentLanguageSwitcher />
          </div>
          {aside && (
            <div data-enter className="shrink-0">
              {aside}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function StatPills({ items }) {
  useUiLanguage();
  const list = items.filter((i) => i.value !== undefined && i.value !== null);
  if (!list.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {list.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold">
          <span className="font-heading text-sm font-extrabold text-brand">{item.value}</span>
          <span className="text-muted-foreground">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function PrevNextLink({ item, direction, t }) {
  useUiLanguage();
  if (!item) return <span className="hidden sm:block" />;
  const isPrev = direction === 'prev';
  return (
    <Link
      to={item.url}
      rel={isPrev ? 'prev' : 'next'}
      className={cn('group flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-brand/40 hover:shadow-md', !isPrev && 'sm:flex-row-reverse sm:text-right')}
    >
      {isPrev ? (
        <ArrowLeft className="size-5 shrink-0 text-brand transition group-hover:-translate-x-0.5" aria-hidden="true" />
      ) : (
        <ArrowRight className="size-5 shrink-0 text-brand transition group-hover:translate-x-0.5" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-muted-foreground">{t(item.label)}</span>
        {item.title && <span className="block truncate font-semibold group-hover:text-brand">{t(item.title)}</span>}
      </span>
    </Link>
  );
}

export function PrevNext({ prev, next, t }) {
  useUiLanguage();
  if (!prev && !next) return null;
  return (
    <nav aria-label={uiText("Previous and next")} className="mt-10 grid gap-3 sm:grid-cols-2">
      <PrevNextLink item={prev} direction="prev" t={t} />
      <PrevNextLink item={next} direction="next" t={t} />
    </nav>
  );
}
