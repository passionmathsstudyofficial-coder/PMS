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
import { getReferenceBooks, referenceBookUrl } from '@/lib/referenceBooks.js';

function Column({ title, children }) {
  useUiLanguage();
  return (
    <div className="min-w-0">
      <h2 className="mb-3 text-sm font-black tracking-[0.14em] text-white uppercase">{title}</h2>
      <ul className="space-y-1 text-sm leading-relaxed">{children}</ul>
    </div>
  );
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
  const columns = [
    { label: { en: 'Quick Links', hi: 'त्वरित लिंक' }, children: [
      link('Home', 'होम', '/'),
      link('About Us', 'हमारे बारे में', '/about-us'),
      link('Contact Us', 'संपर्क करें', '/contact'),
    ] },
    { label: { en: 'Study Materials', hi: 'अध्ययन सामग्री' }, children: [
      link('Important Questions', 'महत्वपूर्ण प्रश्न', '/study-materials/important-questions'),
      link('Notes', 'नोट्स', '/study-materials/ncert-notes'),
      link('Exercises', 'प्रश्नावली', '/class-10/maths/prashnavali'),
      link('Solutions', 'हल', '/study-materials/ncert-solutions'),
    ] },
    { label: { en: 'Reference Books', hi: 'संदर्भ पुस्तकें' }, children: getReferenceBooks(site).map(book => ({
      label: book.title || { en: book.author || book.name || book.slug, hi: book.author || book.name || book.slug }, url: referenceBookUrl(book),
    })) },
    { label: { en: 'Other Information', hi: 'अन्य जानकारी' }, children: [
      link('Privacy Policy', 'गोपनीयता नीति', '/privacy-policy'),
      link('Terms & Conditions', 'नियम एवं शर्तें', '/terms-and-conditions'),
      link('Disclaimer', 'अस्वीकरण', '#footer-disclaimer'),
    ] },
  ];

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

  return (
    <footer className="mt-12 bg-[#0f111a] text-white border-t border-white/5">
      <div className="container-page pt-10 pb-24 lg:pt-12">
        {/* WhatsApp Channel Promotion Banner */}
        {showBanner && (
          <div className="mb-10 rounded-2xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/15 via-[#25D366]/5 to-white/5 p-5 sm:p-6 backdrop-blur-md shadow-lg shadow-black/20">
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
                      <span className="inline-flex items-center rounded-full bg-[#25D366]/20 px-2 py-0.5 text-[10px] font-bold text-[#25D366] ring-1 ring-[#25D366]/30">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#20bd5a] hover:shadow-lg active:scale-95 shrink-0 sm:self-auto self-start"
              >
                <SOCIAL_ICONS.whatsapp className="size-4" />
                <span>{bannerButtonText}</span>
              </a>
            </div>
          </div>
        )}

        <nav aria-label={uiText("Footer navigation")} className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
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
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs leading-relaxed text-white/55 sm:text-left">
          <p>
            {(t(footer.copyright) || `© {year} Passion Maths Study (PMS). All rights reserved.`).replace(
              '{year}',
              resolvedYear,
            )}
          </p>

        </div>
      </div>
    </footer>
  );
}
