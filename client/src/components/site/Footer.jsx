import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Globe, Mail, Phone } from 'lucide-react';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { resolveMediaUrl } from '@/lib/media';
import { Logo } from './Logo.jsx';
import { SmartLink } from './SmartLink.jsx';
import { SOCIAL_ICONS } from './SocialIcons.jsx';
import { getReferenceBooks, isExcludedReferenceBook, referenceBookUrl } from '@/lib/referenceBooks.js';
import { cn } from '@/lib/utils';

function Column({ title, children }) {
  useUiLanguage();
  return (
    <div className="min-w-0">
      <h2 className="mb-3 text-base font-bold leading-snug text-white sm:text-lg">{title}</h2>
      <ul className="space-y-1 text-sm leading-relaxed">{children}</ul>
    </div>
  );
}

function isExcludedFooterItem(item) {
  if (!item) return true;
  const en = (item.label?.en || (typeof item.label === 'string' ? item.label : '') || '').toLowerCase().trim();
  const hi = (item.label?.hi || '').toLowerCase().trim();
  const url = (item.url || '').toLowerCase().trim();

  // Keep K.C. Sinha Mathematics!
  const isKcSinhaMaths =
    url.includes('kc-sinha-maths') ||
    url.includes('kc-sinha-math') ||
    en.includes('k.c. sinha mathematics') ||
    en.includes('kc sinha mathematics') ||
    hi.includes('के. सी. सिन्हा गणित') ||
    hi.includes('के.सी. सिन्हा गणित') ||
    hi.includes('के सी सिन्हा गणित');

  if (isKcSinhaMaths) {
    return false;
  }

  // 1. Standalone K.C. Sinha is excluded
  if (
    url.includes('kc-sinha') ||
    en.includes('k.c. sinha') ||
    en.includes('kc sinha') ||
    hi.includes('के.सी. सिन्हा') ||
    hi.includes('के. सी. सिन्हा')
  ) {
    return true;
  }

  // 2. Mathematics for Class 10 by R.D. Sharma
  if (
    url.includes('mathematics-for-class-10-by-r-d-sharma') ||
    en.includes('mathematics for class 10 by r.d. sharma') ||
    en.includes('mathematics for class 10 by rd sharma')
  ) {
    return true;
  }

  // 3. NCERT Solutions / NCERT Class 6 to 12 Math Solution
  if (
    en.includes('ncert solution') ||
    en.includes('ncert class 6 to 12 math') ||
    hi.includes('ncert कक्षा 6 से 12 गणित') ||
    hi.includes('ncert समाधान') ||
    hi.includes('ncert हल')
  ) {
    return true;
  }

  return false;
}

const linkClass = 'block min-h-10 max-w-full rounded-sm py-2 break-words focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white text-white/70 transition-colors hover:text-white hover:underline decoration-white/30 underline-offset-2';

const DEFAULT_SOCIAL = [
  { platform: 'whatsapp', url: 'https://whatsapp.com/channel/0029Vb8ePtV6xCSKZnaBfu0N', label: 'WhatsApp' },
  { platform: 'youtube', url: 'https://youtube.com/@passionmathsstudy?si=tc1BLKqOF3RTZnnc', label: 'YouTube' },
  { platform: 'instagram', url: 'https://www.instagram.com/nitishkumar65462?stkn=dXJ5N3M0c2U1NDhl', label: 'Instagram' },
  { platform: 'facebook', url: 'https://www.facebook.com/share/19ZEaJ72X5/', label: 'Facebook' },
];

const SOCIAL_STYLES = {
  youtube: 'hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] hover:shadow-lg hover:shadow-[#FF0000]/25',
  facebook: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:shadow-lg hover:shadow-[#1877F2]/25',
  instagram: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-[#dc2743]/25',
  whatsapp: 'hover:bg-[#25D366] hover:text-white hover:border-[#25D366] hover:shadow-lg hover:shadow-[#25D366]/25',
};

export function Footer() {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const settings = site?.settings || {};
  const footer = settings.footer || {};
  const contact = settings.contact || {};
  const whatsappBanner = settings.whatsappBanner || {};
  // Reuse configured destinations for ordinary links and the navbar's live book list.
  const configuredLinks = [
    ...(site?.navigation?.header || []),
    ...(site?.navigation?.footer || []),
    ...(site?.navigation?.footerBottom || []),
  ].filter(item => item.isVisible !== false).flatMap(item => [item, ...(item.children || [])])
    .filter(item => item.isVisible !== false && item.url);
  const link = (en, hi, url) => {
    const configured = configuredLinks.find(item => item.url === url);
    return { ...configured, label: { en, hi }, url };
  };
  const classes = (site?.classes || []).map(cls => cls.number);

  // If CMS has configured footer columns, filter out excluded items and empty columns
  const rawCmsColumns = (site?.navigation?.footer || [])
    .filter(item => item.isVisible !== false && !isExcludedFooterItem(item))
    .map(col => ({
      label: col.label,
      children: (col.children || [])
        .filter(child => child.isVisible !== false && child.url && !isExcludedFooterItem(child))
        .map(child => ({ ...child, label: child.label, url: child.url })),
    }))
    .filter(col => col.children.length > 0);

  // Dynamic fallback from live reference books (excluding removed categories) + Important Links
  const dynamicColumns = [
    ...getReferenceBooks(site)
      .filter(book => !isExcludedReferenceBook(book))
      .map(book => ({
        label: book.title,
        children: (book.availableClasses || []).map(number => ({
          label: {
            en: `${book.title?.en || book.author} Class ${number}`,
            hi: `${book.title?.hi || book.author} कक्षा ${number}`,
          },
          url: (book.classRecords?.find(c => c.number === number)?.url || `${referenceBookUrl(book)}/class-${number}`),
        })),
      }))
      .filter(col => col.children.length > 0),
    {
      label: { en: 'Important Links', hi: 'महत्वपूर्ण लिंक' },
      children: [
        link('Home', 'होम', '/'),
        link('Mathematics', 'गणित', '/study-materials/ncert-solutions'),
        link('Search', 'खोजें', '/search'),
        link('About Us', 'हमारे बारे में', '/about-us'),
        link('Contact', 'संपर्क करें', '/contact'),
        link('Privacy Policy', 'गोपनीयता नीति', '/privacy-policy'),
        link('Terms & Conditions', 'नियम एवं शर्तें', '/terms-and-conditions'),
      ].filter(child => !isExcludedFooterItem(child)),
    },
  ];

  const columns = (rawCmsColumns.length >= 2 ? rawCmsColumns : dynamicColumns)
    .filter(col => col.children && col.children.length > 0 && !isExcludedFooterItem(col));

  const retainedLinks = [
    link('Important Questions', 'महत्वपूर्ण प्रश्न', '/study-materials/important-questions'),
    link('Notes', 'नोट्स', '/study-materials/ncert-notes'),
    link('Exercises', 'प्रश्नावली', '/class-10/maths/prashnavali'),
    link('Solutions', 'हल', '/study-materials/ncert-solutions'),
    ...getReferenceBooks(site).filter(book => !isExcludedReferenceBook(book)).map(book => ({ label: book.title, url: referenceBookUrl(book) })),
    link('Disclaimer', 'अस्वीकरण', '#footer-disclaimer'),
  ].filter(item => item && item.url && !isExcludedFooterItem(item));

  const displayedUrls = new Set([...columns.flatMap(column => column.children), ...retainedLinks].map(item => item.url));
  for (const item of configuredLinks) {
    if (!t(item.label) || displayedUrls.has(item.url) || isExcludedFooterItem(item)) continue;
    retainedLinks.push(item);
    displayedUrls.add(item.url);
  }

  const socialList = settings.social?.length ? settings.social : DEFAULT_SOCIAL;

  const currentYear = new Date().getFullYear();
  const resolvedYear = footer.copyrightYear && footer.copyrightYear !== 'auto' ? footer.copyrightYear : currentYear;

  // WhatsApp Banner values with graceful fallbacks
  const showBanner = whatsappBanner.enabled !== false;
  const bannerTitle = t(whatsappBanner.title) || uiText("Passion Maths Study WhatsApp Channel");
  const bannerBadge = t(whatsappBanner.badge) || uiText("Official");
  const bannerDesc =
    t(whatsappBanner.description) ||
    uiText("Get daily NCERT 2024–25 maths formulas, new solutions, notes and exam updates on WhatsApp.");
  const bannerUrl = whatsappBanner.url || 'https://whatsapp.com/channel/0029Vb8ePtV6xCSKZnaBfu0N';
  const bannerButtonText = t(whatsappBanner.buttonText) || uiText("Follow on WhatsApp");
  const bannerIconUrl = resolveMediaUrl(whatsappBanner.icon) || whatsappBanner.iconUrl;

  const gridClass =
    columns.length <= 1
      ? 'grid-cols-1'
      : columns.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns.length === 3
          ? 'grid-cols-1 sm:grid-cols-3 md:grid-cols-3'
          : columns.length === 4
            ? 'grid-cols-2 md:grid-cols-4'
            : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5';

  return (
    <footer className="mt-12 bg-[#090909] text-white border-t border-white/5">
      <div className="container-page pt-10 pb-24 lg:pt-12">
        {/* WhatsApp Channel Promotion Banner */}
        {showBanner && (
          <div className="mb-10 rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
                  {bannerIconUrl ? (
                    <img src={bannerIconUrl} alt="WhatsApp" className="size-6 object-contain" />
                  ) : (
                    <SOCIAL_ICONS.whatsapp className="size-6" />
                  )}
                </span>
                <div className="min-w-0 break-words">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-base font-extrabold text-white sm:text-lg">
                      {bannerTitle}
                    </h3>
                    {bannerBadge && (
                      <span className="inline-flex items-center rounded-full bg-[#08c429] px-2.5 py-1 text-xs font-bold text-white ring-1 ring-[#25D366]/30">
                        {bannerBadge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
                    {bannerDesc}
                  </p>
                </div>
              </div>
              <a
                href={bannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#08c429] px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#20bd5a] hover:shadow-lg active:scale-95 shrink-0 sm:self-auto self-start"
              >
                <SOCIAL_ICONS.whatsapp className="size-4" />
                <span>{bannerButtonText}</span>
              </a>
            </div>
          </div>
        )}

        <nav aria-label={uiText("Footer navigation")} className={cn('grid gap-x-5 gap-y-8 xl:gap-x-8', gridClass)}>
          {columns.map(column => (
            <Column key={column.label.en} title={t(column.label)}>
              {column.children.map(child => (
                <li key={child.url}>
                  <SmartLink to={child.url} newTab={child.newTab} className={linkClass}>
                    {t(child.label)}
                  </SmartLink>
                </li>
              ))}
            </Column>
          ))}
        </nav>

        <nav aria-label={uiText("More resources")} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
          {retainedLinks.map(child => <SmartLink key={child.url} to={child.url} newTab={child.newTab} className="py-2 hover:text-white hover:underline">{t(child.label)}</SmartLink>)}
        </nav>

        {/* Brand, Description & Social Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex min-w-0 flex-col xl:flex-row xl:items-center gap-4 sm:gap-6 text-left">
            <Logo variant="footer" className="min-w-0 max-w-full shrink" textClassName="min-w-0 shrink" />
            <p className="max-w-md text-xs sm:text-[13px] leading-relaxed text-[#A1A1AA] xl:border-l xl:border-white/15 xl:pl-6 text-left">
              {t(footer.description) || uiText("A free, step-by-step and bilingual NCERT Mathematics study platform for Class 6–12 students.")}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start lg:justify-end">
            {(contact.email || contact.phone) && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/70">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="inline-flex max-w-full items-center gap-1.5 break-all hover:text-white transition">
                    <Mail className="size-3.5 text-brand" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="inline-flex max-w-full items-center gap-1.5 break-all hover:text-white transition">
                    <Phone className="size-3.5 text-brand" /> {contact.phone}
                  </a>
                )}
              </div>
            )}

            {footer.showSocial !== false && (
              <ul className="flex flex-wrap items-center gap-2.5" aria-label={uiText("Social media links")}>
                {socialList
                  .filter((s) => s.isEnabled !== false)
                  .map((s) => {
                    const IconComponent = SOCIAL_ICONS[s.platform] || Globe;
                    const hoverClass = SOCIAL_STYLES[s.platform] || 'hover:bg-brand hover:text-white';
                    return (
                      <li key={s._id || s.platform || s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label || s.platform}
                          title={uiTemplate`Follow on ${s.platform.charAt(0).toUpperCase() + s.platform.slice(1)}`}
                          className={`grid size-9 place-items-center rounded-xl border border-white/15 bg-white/5 text-white/75 transition-all hover:scale-105 active:scale-95 ${hoverClass}`}
                        >
                          <IconComponent className="size-4" />
                        </a>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>

        <p id="footer-disclaimer" tabIndex={-1} className="mt-6 scroll-mt-32 rounded-sm text-left text-xs leading-relaxed text-white/60 focus-visible:outline-2 focus-visible:outline-white">
          {t(footer.disclaimer) || t({ en: "This is an independent educational platform.", hi: "यह एक स्वतंत्र शैक्षिक मंच है।" })}
        </p>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs leading-relaxed text-white/65">
          <p>
            {(t(footer.copyright) || `© {year} Passion Maths Study (PMS). All rights reserved.`).replace(
              '{year}',
              resolvedYear,
            )}
          </p>
          <nav aria-label={uiText("Legal links")} className="flex flex-wrap gap-x-4 gap-y-2">
            {(columns.at(-1)?.children || []).slice(-3).map(child => <SmartLink key={child.url} to={child.url} className="py-1 hover:text-white hover:underline">{t(child.label)}</SmartLink>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
