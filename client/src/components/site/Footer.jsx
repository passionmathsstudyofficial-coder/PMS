import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite, useTerm } from '@/lib/site';
import { resolveMediaUrl } from '@/lib/media';
import { Logo } from './Logo.jsx';
import { SmartLink } from './SmartLink.jsx';
import { SOCIAL_ICONS } from './SocialIcons.jsx';
import { cn } from '@/lib/utils';

function Column({ title, children }) {
  useUiLanguage();
  return (
    <div className="flex flex-col">
      <h2 className="mb-4 text-xs font-black tracking-[0.14em] text-white uppercase">{title}</h2>
      <ul className="space-y-2.5 text-xs sm:text-sm">{children}</ul>
    </div>
  );
}

const linkClass = 'text-white/70 transition-colors hover:text-white hover:underline decoration-white/30 underline-offset-2';

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

const FALLBACK_FOOTER_COLUMNS = [
  {
    _id: 'col-ncert',
    label: { hi: 'NCERT Class 6 to 12 Math Solutions', en: 'NCERT Class 6 to 12 Math Solutions' },
    type: 'column',
    children: [
      { _id: 'c1-6', label: { hi: 'NCERT Class 6 Mathematics', en: 'NCERT Class 6 Mathematics' }, url: '/class-6/maths' },
      { _id: 'c1-7', label: { hi: 'NCERT Class 7 Mathematics', en: 'NCERT Class 7 Mathematics' }, url: '/class-7/maths' },
      { _id: 'c1-8', label: { hi: 'NCERT Class 8 Mathematics', en: 'NCERT Class 8 Mathematics' }, url: '/class-8/maths' },
      { _id: 'c1-9', label: { hi: 'NCERT Class 9 Mathematics', en: 'NCERT Class 9 Mathematics' }, url: '/class-9/maths' },
      { _id: 'c1-10', label: { hi: 'NCERT Class 10 Mathematics', en: 'NCERT Class 10 Mathematics' }, url: '/class-10/maths' },
      { _id: 'c1-11', label: { hi: 'NCERT Class 11 Mathematics', en: 'NCERT Class 11 Mathematics' }, url: '/class-11/maths' },
      { _id: 'c1-12', label: { hi: 'NCERT Class 12 Mathematics', en: 'NCERT Class 12 Mathematics' }, url: '/class-12/maths' },
    ],
  },
  {
    _id: 'col-rs',
    label: { hi: 'R.S. Aggarwal Solutions', en: 'R.S. Aggarwal Solutions' },
    type: 'column',
    children: [
      { _id: 'c2-6', label: { hi: 'R.S. Aggarwal Class 6', en: 'R.S. Aggarwal Class 6' }, url: '/reference-solutions/rs-aggarwal/class-6' },
      { _id: 'c2-7', label: { hi: 'R.S. Aggarwal Class 7', en: 'R.S. Aggarwal Class 7' }, url: '/reference-solutions/rs-aggarwal/class-7' },
      { _id: 'c2-8', label: { hi: 'R.S. Aggarwal Class 8', en: 'R.S. Aggarwal Class 8' }, url: '/reference-solutions/rs-aggarwal/class-8' },
      { _id: 'c2-9', label: { hi: 'R.S. Aggarwal Class 9', en: 'R.S. Aggarwal Class 9' }, url: '/reference-solutions/rs-aggarwal/class-9' },
      { _id: 'c2-10', label: { hi: 'R.S. Aggarwal Class 10', en: 'R.S. Aggarwal Class 10' }, url: '/reference-solutions/rs-aggarwal/class-10' },
      { _id: 'c2-11', label: { hi: 'R.S. Aggarwal Class 11', en: 'R.S. Aggarwal Class 11' }, url: '/reference-solutions/rs-aggarwal/class-11' },
      { _id: 'c2-12', label: { hi: 'R.S. Aggarwal Class 12', en: 'R.S. Aggarwal Class 12' }, url: '/reference-solutions/rs-aggarwal/class-12' },
    ],
  },
  {
    _id: 'col-rd',
    label: { hi: 'R.D. Sharma Solutions', en: 'R.D. Sharma Solutions' },
    type: 'column',
    children: [
      { _id: 'c3-6', label: { hi: 'R.D. Sharma Class 6', en: 'R.D. Sharma Class 6' }, url: '/reference-solutions/rd-sharma/class-6' },
      { _id: 'c3-7', label: { hi: 'R.D. Sharma Class 7', en: 'R.D. Sharma Class 7' }, url: '/reference-solutions/rd-sharma/class-7' },
      { _id: 'c3-8', label: { hi: 'R.D. Sharma Class 8', en: 'R.D. Sharma Class 8' }, url: '/reference-solutions/rd-sharma/class-8' },
      { _id: 'c3-9', label: { hi: 'R.D. Sharma Class 9', en: 'R.D. Sharma Class 9' }, url: '/reference-solutions/rd-sharma/class-9' },
      { _id: 'c3-10', label: { hi: 'R.D. Sharma Class 10', en: 'R.D. Sharma Class 10' }, url: '/reference-solutions/rd-sharma/class-10' },
      { _id: 'c3-11', label: { hi: 'R.D. Sharma Class 11', en: 'R.D. Sharma Class 11' }, url: '/reference-solutions/rd-sharma/class-11' },
      { _id: 'c3-12', label: { hi: 'R.D. Sharma Class 12', en: 'R.D. Sharma Class 12' }, url: '/reference-solutions/rd-sharma/class-12' },
    ],
  },
  {
    _id: 'col-kc',
    label: { hi: 'K.C. Sinha Solutions', en: 'K.C. Sinha Solutions' },
    type: 'column',
    children: [
      { _id: 'c4-6', label: { hi: 'K.C. Sinha Class 6', en: 'K.C. Sinha Class 6' }, url: '/reference-solutions/kc-sinha/class-6' },
      { _id: 'c4-7', label: { hi: 'K.C. Sinha Class 7', en: 'K.C. Sinha Class 7' }, url: '/reference-solutions/kc-sinha/class-7' },
      { _id: 'c4-8', label: { hi: 'K.C. Sinha Class 8', en: 'K.C. Sinha Class 8' }, url: '/reference-solutions/kc-sinha/class-8' },
      { _id: 'c4-9', label: { hi: 'K.C. Sinha Class 9', en: 'K.C. Sinha Class 9' }, url: '/reference-solutions/kc-sinha/class-9' },
      { _id: 'c4-10', label: { hi: 'K.C. Sinha Class 10', en: 'K.C. Sinha Class 10' }, url: '/reference-solutions/kc-sinha/class-10' },
      { _id: 'c4-11', label: { hi: 'K.C. Sinha Class 11', en: 'K.C. Sinha Class 11' }, url: '/reference-solutions/kc-sinha/class-11' },
      { _id: 'c4-12', label: { hi: 'K.C. Sinha Class 12', en: 'K.C. Sinha Class 12' }, url: '/reference-solutions/kc-sinha/class-12' },
    ],
  },
  {
    _id: 'col-links',
    label: { hi: 'Important Links', en: 'Important Links' },
    type: 'column',
    children: [
      { _id: 'c6-home', label: { hi: 'Home', en: 'Home' }, url: '/' },
      { _id: 'c6-maths', label: { hi: 'Mathematics', en: 'Mathematics' }, url: '/#classes' },
      { _id: 'c6-search', label: { hi: 'Search', en: 'Search' }, url: '/search' },
      { _id: 'c6-about', label: { hi: 'About Us', en: 'About Us' }, url: '/about-us' },
      { _id: 'c6-contact', label: { hi: 'Contact', en: 'Contact' }, url: '/contact' },
      { _id: 'c6-privacy', label: { hi: 'Privacy Policy', en: 'Privacy Policy' }, url: '/privacy-policy' },
      { _id: 'c6-terms', label: { hi: 'Terms & Conditions', en: 'Terms & Conditions' }, url: '/terms-and-conditions' },
    ],
  },
];

const FALLBACK_FOOTER_BOTTOM = [
  { _id: 'fb-privacy', label: { hi: 'गोपनीयता नीति', en: 'Privacy Policy' }, url: '/privacy-policy' },
  { _id: 'fb-terms', label: { hi: 'नियम एवं शर्तें', en: 'Terms & Conditions' }, url: '/terms-and-conditions' },
  { _id: 'fb-contact', label: { hi: 'संपर्क', en: 'Contact' }, url: '/contact' },
];

export function Footer() {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const settings = site?.settings || {};
  const footer = settings.footer || {};
  const contact = settings.contact || {};
  const whatsappBanner = settings.whatsappBanner || {};
  const classes = [...(site?.classes || [])].sort((a, b) => a.number - b.number);

  const rawColumns = site?.navigationConfigured?.footer ? (site.navigation?.footer || []) : (site?.navigation?.footer?.length ? site.navigation.footer : FALLBACK_FOOTER_COLUMNS);
  const columns = rawColumns.filter((c) => {
    if (c.isVisible === false) return false;
    const en = (c.label?.en || '').toLowerCase();
    const hi = c.label?.hi || '';
    return !en.includes('state board') && !hi.includes('राज्य बोर्ड');
  });
  const looseLinks = columns.filter((c) => c.type === 'link');

  const bottomLinks = site?.navigationConfigured?.footerBottom ? (site.navigation?.footerBottom || []) : (site?.navigation?.footerBottom?.length ? site.navigation.footerBottom : FALLBACK_FOOTER_BOTTOM);
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
    <footer className="mt-16 bg-[#0f111a] text-white border-t border-white/5">
      <div className="container-page py-12 lg:py-16">
        {/* WhatsApp Channel Promotion Banner */}
        {showBanner && (
          <div className="mb-12 rounded-2xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/15 via-[#25D366]/5 to-white/5 p-5 sm:p-6 backdrop-blur-md shadow-lg shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
                  {bannerIconUrl ? (
                    <img src={bannerIconUrl} alt="WhatsApp" className="size-6 object-contain" />
                  ) : (
                    <SOCIAL_ICONS.whatsapp className="size-6" />
                  )}
                </span>
                <div>
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

        {/* Multi-Column Footer Layout on Desktop */}
        <div className={cn(
          'grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-6',
          columns.filter((c) => c.type !== 'link').length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6',
        )}>
          {columns
            .filter((c) => c.type !== 'link')
            .map((column) => (
              <Column key={column._id || column.label?.en} title={t(column.label)}>
                {column.type === 'classes'
                  ? classes.map((cls) => (
                      <li key={cls._id || cls.number}>
                        <Link to={cls.url || `/class-${cls.number}/maths`} className={linkClass}>
                          {term('class')} {cls.number} {term('mathematics')}
                        </Link>
                      </li>
                    ))
                  : (column.children || [])
                      .filter((child) => child.isVisible !== false)
                      .map((child) => (
                        <li key={child._id || child.url}>
                          <SmartLink to={child.url} newTab={child.newTab} className={linkClass}>
                            {t(child.label)}
                          </SmartLink>
                        </li>
                      ))}
              </Column>
            ))}

          {looseLinks.length > 0 && (
            <Column title={uiText("Links")}>
              {looseLinks.map((link) => (
                <li key={link._id || link.url}>
                  <SmartLink to={link.url} newTab={link.newTab} className={linkClass}>
                    {t(link.label)}
                  </SmartLink>
                </li>
              ))}
            </Column>
          )}
        </div>

        {/* Brand, Description & Social Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
            <Logo variant="footer" />
            <p className="max-w-md text-xs sm:text-[13px] leading-relaxed text-[#A1A1AA] sm:border-l sm:border-white/15 sm:pl-6 text-left">
              {t(footer.description) || uiText("A free, step-by-step and bilingual NCERT Mathematics study platform for Class 6–12 students.")}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start lg:justify-end">
            {(contact.email || contact.phone) && (
              <div className="flex items-center gap-3 text-xs text-white/70">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-white transition">
                    <Mail className="size-3.5 text-brand" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-white transition">
                    <Phone className="size-3.5 text-brand" /> {contact.phone}
                  </a>
                )}
              </div>
            )}

            {footer.showSocial !== false && (
              <ul className="flex items-center gap-2.5" aria-label={uiText("Social media links")}>
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

        {t(footer.disclaimer) && (
          <p className="mt-6 text-center sm:text-left text-[11px] leading-relaxed text-white/40">
            {t(footer.disclaimer)}
          </p>
        )}

        {/* Footer Bottom Section: Horizontal Divider, Copyright on Left, Links on Right */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row">
          <p>
            {(t(footer.copyright) || `© {year} Passion Maths Study (PMS). All rights reserved.`).replace(
              '{year}',
              resolvedYear,
            )}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {bottomLinks
              .filter((link) => link.isVisible !== false)
              .map((link) => (
                <li key={link._id || link.url}>
                  <SmartLink to={link.url} newTab={link.newTab} className="hover:text-white transition">
                    {t(link.label)}
                  </SmartLink>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
