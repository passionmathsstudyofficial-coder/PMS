import { uiTemplate } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Link } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useBrand } from '@/lib/site';
import { cn } from '@/lib/utils';

export function Logo({ className, showText = true, textClassName, variant = 'header' }) {
  useUiLanguage();
  const brand = useBrand();
  const t = useInterfaceL10n();
  const isFooter = variant === 'footer';
  const src = isFooter ? (brand.footerLogoSrc || brand.logoSrc) : brand.logoSrc;
  const name = t(brand.name) || 'Passion Maths Study';
  const tagline = t(brand.tagline) || (isFooter ? 'NCERT Class 6–12 Maths' : '');

  return (
    <Link
      to="/"
      className={cn('group flex shrink-0 items-center gap-3', className)}
      aria-label={uiTemplate`${name} – Home`}
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 transition-transform duration-300 group-hover:scale-105',
          isFooter
            ? 'size-[50px] p-1 ring-white/20 shadow-md'
            : 'size-10 sm:size-11 p-0.5 ring-black/5 dark:ring-white/10',
        )}
      >
        <img
          src={src || '/brand/pms-logo.png'}
          alt={brand.logoAlt || name}
          width={isFooter ? 50 : 44}
          height={isFooter ? 50 : 44}
          loading="eager"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/brand/pms-logo.png';
          }}
          className="size-full object-contain"
        />
      </span>
      {showText && (
        <span className={cn('flex flex-col leading-tight shrink-0', textClassName)}>
          <span
            className={cn(
              'font-heading tracking-tight truncate',
              isFooter
                ? 'text-[18px] sm:text-[20px] font-bold text-white'
                : 'text-[14px] sm:text-[15px] xl:text-base font-extrabold text-foreground',
            )}
          >
            {name}
          </span>
          {tagline && (
            <span
              className={cn(
                'truncate',
                isFooter
                  ? 'text-[13px] sm:text-[14px] font-medium text-[#A1A1AA] mt-0.5'
                  : 'text-[10.5px] sm:text-[11px] font-medium text-muted-foreground',
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
