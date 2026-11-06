import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowRight, BookOpen, FileText, Star } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Figure } from '@/components/content/Figure.jsx';
import { toViewerImage, useImageViewer } from '@/components/content/ImageViewer.jsx';
import { MathFormula } from '@/components/content/MathFormula.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { YouTubeEmbed } from '@/components/content/YouTubeEmbed.jsx';
import { SmartLink } from '@/components/site/SmartLink.jsx';
import { Icon } from '@/lib/icons';
import { useInterfaceL10n } from '@/lib/i18n';
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '@/lib/motion';
import { getReferenceBooks } from '@/lib/referenceBooks.js';
import { useSite, useTerm } from '@/lib/site';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { SectionButtons, SectionShell } from './SectionShell.jsx';

const COLS = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

export function StatisticsSection({ section }) {
  useUiLanguage();
  const ref = useRef(null);
  const t = useInterfaceL10n();
  const auto = section.data?.auto || {};
  const valueOf = (raw) => String(raw || '').replace(/\{(\w+)\}/g, (_, key) => (auto[key] ?? ''));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray('[data-count]', ref.current).forEach((el) => {
        const target = Number(el.dataset.count);
        if (!Number.isFinite(target) || target <= 0) return;
        const counter = { value: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () => gsap.to(counter, { value: target, duration: 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(counter.value).toLocaleString('en-IN')) }),
        });
      });
    },
    { scope: ref, dependencies: [section._id, JSON.stringify(auto)] },
  );

  return (
    <SectionShell section={section} className="py-8 sm:py-10">
      <div ref={ref} className={cn('grid grid-cols-2 gap-3 sm:gap-4', COLS[section.config?.columns] || 'lg:grid-cols-4')}>
        {section.items.map((item) => {
          const value = valueOf(item.value);
          const numeric = /^\d+$/.test(value) ? Number(value) : null;
          return (
            <div key={item._id} data-reveal className="flex flex-col items-center rounded-2xl border bg-card p-5 text-center">
              {item.icon && <Icon name={item.icon} className="mb-2 size-7 text-brand" />}
              <span className="font-heading text-3xl font-extrabold text-ink dark:text-foreground" data-count={numeric ?? undefined}>
                {numeric !== null ? numeric.toLocaleString('en-IN') : value}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">{t(item.title)}</span>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function StepsSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const items = section.items || [];
  return (
    <SectionShell section={section} className="py-10 sm:py-14" containerClassName="relative">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={item._id}
              data-reveal
              className={cn('relative flex flex-col rounded-xl border p-4', section.config?.background === 'dark' ? 'border-white/10 bg-white/5' : 'bg-card', last && 'ring-2 ring-saffron/60')}
            >
              <span className="font-mono text-[11px] font-semibold opacity-60">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={item.icon} className={cn('my-2 size-6', last ? 'text-saffron' : 'text-[color-mix(in_oklab,var(--brand)_45%,white)]')} />
              <span className="font-heading text-[15px] font-bold">{t(item.title)}</span>
              {t(item.description) && <span className="mt-0.5 text-xs opacity-70">{t(item.description)}</span>}
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

function ReferenceBookIllustration({ slug, author }) {
  const isNcert = slug === 'ncert';
  const isRs = slug === 'rs-aggarwal';
  const isRd = slug === 'rd-sharma';
  const isKc = slug === 'kc-sinha';
  const isMl = slug === 'ml-aggarwal';

  const theme = isNcert
    ? {
        bg: 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
        border: 'border-amber-500/30',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        badgeText: 'NCERT Exemplar & Textbook',
        accentText: 'text-amber-600 dark:text-amber-400',
        formula: 'f(x) = \\sum_{n=0}^{\\infty} a_n x^n',
        decorColor: 'rgba(245, 158, 11, 0.25)',
      }
    : isRs
    ? {
        bg: 'from-blue-600/20 via-indigo-500/10 to-blue-500/5',
        border: 'border-blue-500/30',
        badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
        badgeText: 'Secondary & Sr. Secondary',
        accentText: 'text-blue-600 dark:text-blue-400',
        formula: '\\sin^2\\theta + \\cos^2\\theta = 1',
        decorColor: 'rgba(59, 130, 246, 0.25)',
      }
    : isRd
    ? {
        bg: 'from-purple-600/20 via-violet-500/10 to-indigo-500/5',
        border: 'border-purple-500/30',
        badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
        badgeText: 'Board & Competitive Practice',
        accentText: 'text-purple-600 dark:text-purple-400',
        formula: '\\int_a^b f(x)\\,dx = F(b) - F(a)',
        decorColor: 'rgba(147, 51, 234, 0.25)',
      }
    : isKc
    ? {
        bg: 'from-emerald-600/20 via-teal-500/10 to-emerald-500/5',
        border: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        badgeText: 'Higher & Foundation Practice',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        decorColor: 'rgba(16, 185, 129, 0.25)',
      }
    : isMl
    ? {
        bg: 'from-rose-600/20 via-pink-500/10 to-rose-500/5',
        border: 'border-rose-500/30',
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        badgeText: 'ICSE & CBSE Mathematics',
        accentText: 'text-rose-600 dark:text-rose-400',
        formula: 'S_n = \\frac{n}{2}[2a + (n-1)d]',
        decorColor: 'rgba(244, 63, 94, 0.25)',
      }
    : {
        bg: 'from-indigo-600/20 via-brand/10 to-indigo-500/5',
        border: 'border-brand/30',
        badgeBg: 'bg-brand/15 text-brand',
        badgeText: 'Reference Solution',
        accentText: 'text-brand',
        formula: 'a^2 + b^2 = c^2',
        decorColor: 'rgba(230, 81, 0, 0.2)',
      };

  return (
    <div className={cn('relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-gradient-to-br p-4 flex flex-col justify-between select-none', theme.bg, theme.border)}>
      {/* Background Math SVG pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`math-grid-${slug}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/20" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#math-grid-${slug})`} />
        <circle cx="85%" cy="30%" r="48" fill="none" stroke={theme.decorColor} strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M 20 95 Q 90 20, 160 75 T 290 30" fill="none" stroke={theme.decorColor} strokeWidth="2" />
        <polygon points="180,85 240,35 260,100" fill="none" stroke={theme.decorColor} strokeWidth="1.2" />
      </svg>

      {/* Top row in illustration */}
      <div className="relative z-10 flex items-center justify-between">
        <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm', theme.badgeBg)}>
          {theme.badgeText}
        </span>
        <BookOpen className={cn('size-4 opacity-75', theme.accentText)} />
      </div>

      {/* Center math formula */}
      <div className="relative z-10 my-auto text-center px-2 py-1">
        <div className={cn('font-mono text-xs font-bold tracking-wide opacity-95', theme.accentText)}>
          <MathFormula latex={theme.formula} display={false} />
        </div>
      </div>

      {/* Bottom book publisher or edition */}
      <div className="relative z-10 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] font-semibold text-muted-foreground">
        <span className="truncate max-w-[150px]">{author || 'Mathematics'}</span>
        <span className="font-mono opacity-80">Class 6–12</span>
      </div>
    </div>
  );
}

function BookCoverImage({ book, bookTitle }) {
  const [failed, setFailed] = useState(false);
  const rawSrc = book.coverUrl || book.coverImage?.url;
  // Discard external amazon URLs that fail due to hotlink/CSP protection
  const src = (rawSrc && !rawSrc.includes('media-amazon.com')) ? rawSrc : null;

  if (!src || failed) {
    return <ReferenceBookIllustration slug={book.slug} title={bookTitle} author={book.author} />;
  }

  return (
    <img
      src={src}
      alt={bookTitle}
      className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const CANONICAL_BOOKS = {
  ncert: {
    title: { hi: 'NCERT गणित समाधान', en: 'NCERT Solutions' },
    author: 'NCERT',
    publisher: 'NCERT',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'सीबीएसई कक्षा 6 से 12 के लिए NCERT गणित के अध्याय-वार और प्रश्नावली-वार संपूर्ण चरणबद्ध हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for NCERT Mathematics Classes 6 to 12.',
    },
    url: '/reference-solutions/ncert',
  },
  'rs-aggarwal': {
    title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'RS Aggarwal Solutions' },
    author: 'R.S. Aggarwal',
    publisher: 'Bharati Bhawan',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'सीबीएसई कक्षा 6 से 12 के लिए आर.एस. अग्रवाल गणित के अध्याय-वार और प्रश्नावली-वार विस्तृत हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for RS Aggarwal Mathematics Classes 6 to 12.',
    },
    url: '/reference-solutions/rs-aggarwal',
  },
  'rd-sharma': {
    title: { hi: 'आर.डी. शर्मा समाधान', en: 'RD Sharma Solutions' },
    author: 'Dr. R.D. Sharma',
    publisher: 'Dhanpat Rai Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'सीबीएसई बोर्ड परीक्षा और प्रतियोगी परीक्षाओं के लिए आर.डी. शर्मा गणित के संपूर्ण हल।',
      en: 'Comprehensive RD Sharma Mathematics solutions with all question steps, formulas, and proofs.',
    },
    url: '/reference-solutions/rd-sharma',
  },
  'kc-sinha': {
    title: { hi: 'के.सी. सिन्हा समाधान', en: 'KC Sinha Solutions' },
    author: 'Dr. K.C. Sinha',
    publisher: 'Students Friends / Rastogi Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'कक्षा 6 से 12 के विद्यार्थियों के लिए के.सी. सिन्हा गणित के संपूर्ण और विस्तृत चरणबद्ध हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for KC Sinha Mathematics Classes 6 to 12.',
    },
    url: '/reference-solutions/kc-sinha',
  },
  'ml-aggarwal': {
    title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'ML Aggarwal Solutions' },
    author: 'M.L. Aggarwal',
    publisher: 'Arya Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'आईसीएसई / सीबीएसई गणित के लिए एम.एल. अग्रवाल अंडरस्टैंडिंग मैथमेटिक्स के हल।',
      en: 'Step-by-step solutions for ML Aggarwal Understanding Mathematics for middle and secondary classes.',
    },
    url: '/reference-solutions/ml-aggarwal',
  },
};

const ALIAS_SLUGS = {
  'mathematics-for-class-10-by-r-d-sharma': 'rd-sharma',
  'secondary-school-mathematics-for-class-10-by-r-s-aggarwal': 'rs-aggarwal',
  'ncert-mathematics-textbook-for-class-10': 'ncert',
};

export function ReferenceBooksSection({ section }) {
  const language = useUiLanguage();
  const t = useInterfaceL10n();
  const site = useSite();

  const isHindi = language === 'hi';
  const availableClassesText = isHindi ? 'उपलब्ध कक्षाएँ:' : 'Available Classes:';
  const exploreSolutionsText = isHindi ? 'समाधान देखें' : 'Explore Solutions';
  const stepByStepText = isHindi ? 'चरणबद्ध हल' : 'Step-by-step Solutions';
  const mathSubjectText = isHindi ? 'गणित' : 'Mathematics';
  const chaptersText = isHindi ? 'अध्याय' : 'Chapters';
  const classText = isHindi ? 'कक्षा' : 'Class';

  const rawBooks = section?.data?.books || getReferenceBooks(site);
  // Ensure all 5 canonical books are always present and properly sequenced
  const bookMap = new Map();
  for (const [slug, canon] of Object.entries(CANONICAL_BOOKS)) {
    bookMap.set(slug, { ...canon, slug });
  }
  for (const b of (rawBooks || [])) {
    if (!b?.slug) continue;
    const cleanSlug = String(b.slug).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const targetSlug = ALIAS_SLUGS[cleanSlug] || cleanSlug;
    const existing = bookMap.get(targetSlug) || {};
    // If it's a canonical book with single-class title (e.g. "for Class 10"), preserve canonical series title
    const isCanon = Boolean(CANONICAL_BOOKS[targetSlug]);
    const preserveCanonTitle = isCanon && (
      !b.title?.en ||
      b.title.en.includes('Class 10') ||
      b.title.en.includes('Class 12')
    );

    bookMap.set(targetSlug, {
      ...existing,
      ...b,
      slug: targetSlug,
      title: (isCanon && preserveCanonTitle) ? CANONICAL_BOOKS[targetSlug].title : (b.title || existing.title),
      availableClasses: (b.availableClasses?.length >= 3)
        ? b.availableClasses
        : (existing.availableClasses || [6, 7, 8, 9, 10, 11, 12]),
      url: b.url || `/reference-solutions/${targetSlug}`,
    });
  }

  const books = Array.from(bookMap.values()).filter((b) => b.isVisible !== false);

  const isOldHierarchy =
    section?.name === 'hierarchy' ||
    section?.type === 'steps' ||
    section?.title?.en === 'Every question in a clear order';

  const defaultBadge = { hi: 'संदर्भ पुस्तक संग्रह', en: 'REFERENCE BOOK COLLECTION' };
  const defaultTitle = { hi: 'हमारी संदर्भ पुस्तकें देखें', en: 'Explore Our Reference Books' };
  const defaultDesc = {
    hi: 'भारत की सबसे लोकप्रिय संदर्भ पुस्तकों से अध्याय-वार संपूर्ण हल, अभ्यास, स्पष्टीकरण और गणित का अभ्यास प्राप्त करें।',
    en: "Find comprehensive chapter-wise solutions, exercises, explanations and mathematics practice from India's most popular reference books.",
  };

  const effectiveSection = {
    ...section,
    badge: (!isOldHierarchy && section?.badge && (section.badge.en || section.badge.hi)) ? section.badge : defaultBadge,
    title: (!isOldHierarchy && section?.title && (section.title.en || section.title.hi)) ? section.title : defaultTitle,
    description: (!isOldHierarchy && section?.description && (section.description.en || section.description.hi)) ? section.description : defaultDesc,
    config: {
      ...section?.config,
      background: section?.config?.background === 'dark' ? 'none' : (section?.config?.background || 'none'),
    },
  };

  if (!books.length) return null;

  return (
    <SectionShell section={effectiveSection} className="py-12 sm:py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => {
          const bookTitle = t(book.title) || book.author || book.name || book.slug;
          const bookDesc = t(book.description) || (t(book.subtitle) || '');
          const classes = (book.availableClasses?.length ? book.availableClasses : [6, 7, 8, 9, 10, 11, 12])
            .slice()
            .sort((a, b) => a - b);
          const classRangeLabel = classes.length > 1
            ? `${classText} ${classes[0]}–${classes[classes.length - 1]}`
            : (classes.length === 1 ? `${classText} ${classes[0]}` : mathSubjectText);

          const bookUrl = book.url || `/reference-solutions/${book.slug}`;

          return (
            <div
              key={book.slug || book._id}
              data-reveal
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl"
            >
              <div>
                {/* Book Cover Visual: Either uploaded image (with error boundary) or custom educational illustration */}
                <div className="relative mb-5 overflow-hidden rounded-xl border border-border/50 bg-muted/30">
                  <BookCoverImage book={book} bookTitle={bookTitle} />

                  {/* Top-right Class Coverage Badge overlay */}
                  <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-md">
                    {classRangeLabel}
                  </span>
                </div>

                {/* Metadata Row: Subject & Author */}
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
                    {mathSubjectText}
                  </span>
                  {book.author && (
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {book.author}
                    </span>
                  )}
                </div>

                {/* Book Title */}
                <h3 className="font-heading text-lg font-extrabold tracking-tight transition-colors group-hover:text-brand sm:text-xl">
                  <Link to={bookUrl} className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {bookTitle}
                  </Link>
                </h3>

                {/* Book Description */}
                {bookDesc && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {bookDesc}
                  </p>
                )}

                {/* Available Classes Quick Navigation */}
                <div className="relative z-10 mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {availableClassesText}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {classes.map((clsNum) => (
                      <Link
                        key={clsNum}
                        to={`/reference-solutions/${book.slug}/class-${clsNum}`}
                        className="rounded-lg border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-bold text-foreground/85 transition hover:border-brand hover:bg-brand hover:text-white"
                        title={`${bookTitle} - Class ${clsNum}`}
                      >
                        {clsNum}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer: Chapter count & Explore Button */}
              <div className="relative z-10 mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                <span className="font-semibold text-muted-foreground">
                  {book.chapterCount
                    ? `${book.chapterCount} ${chaptersText}`
                    : stepByStepText}
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-brand group-hover:text-brand">
                  <span>{exploreSolutionsText}</span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function ChapterGridSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const term = useTerm();
  const chapters = section.data?.chapters || [];
  if (!chapters.length) return null;
  return (
    <SectionShell section={section}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {chapters.map((ch) => (
          <Link key={ch._id} to={ch.url} data-reveal className="group flex flex-col justify-between rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
            <div>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand">
                  {term('class')} {ch.class.number}
                </span>
                <span className="font-semibold text-muted-foreground">
                  {term('chapter')} {ch.number}
                </span>
              </div>
              <h3 className="text-base font-bold group-hover:text-brand">{t(ch.title)}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{ch.title.hi && ch.title.en ? (t(ch.title) === ch.title.hi ? ch.title.en : ch.title.hi) : ''}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span>
                {ch.exerciseRange ? `${term('exercise')} ${ch.exerciseRange[0]}${ch.exerciseRange[1] !== ch.exerciseRange[0] ? `–${ch.exerciseRange[1]}` : ''}` : term('comingSoon')}
              </span>
              <ArrowRight className="size-4 text-brand transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

export function CardGridSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const cols = section.config?.columns || 3;
  return (
    <SectionShell section={section}>
      <div className={cn('grid gap-4 sm:grid-cols-2', COLS[cols])}>
        {section.items.map((item) => (
          <div key={item._id} data-reveal className="flex flex-col justify-between rounded-2xl border bg-card p-6 transition hover:shadow-lg">
            <div>
              <span className="mb-4 grid size-12 place-items-center rounded-xl bg-indigo-soft text-indigo">
                <Icon name={item.icon} className="size-6" />
              </span>
              {t(item.badge) && <span className="mb-2 inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-muted-foreground uppercase">{t(item.badge)}</span>}
              <h3 className="text-lg font-bold">{t(item.title)}</h3>
              {t(item.description) && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(item.description)}</p>}
              {item.latex && (
                <div className="mt-4 rounded-xl border border-dashed bg-paper px-3 py-2 dark:bg-muted/40">
                  <MathFormula latex={item.latex} />
                </div>
              )}
            </div>
            {item.url && (
              <SmartLink to={item.url} className="mt-5 inline-flex items-center justify-between rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-brand-soft hover:text-brand">
                {t(item.title)} <ArrowRight className="size-4" aria-hidden="true" />
              </SmartLink>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function QuestionListSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const term = useTerm();
  const important = section.data?.importantQuestions || [];
  const questions = section.data?.questions || [];
  if (!important.length && !questions.length) return null;
  return (
    <SectionShell section={section}>
      <ul className="grid gap-3 md:grid-cols-2">
        {important.map((iq) => (
          <li key={iq._id} data-reveal>
            <Link to={iq.url} className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 hover:border-brand/40 hover:shadow-md">
              <Star className="mt-1 size-4 shrink-0 text-saffron" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <RichContent html={t(iq.text)} className="line-clamp-2 text-[15px] leading-relaxed [&_p]:m-0" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(iq.classLabel)}
                  {iq.chapter && ` · ${term('chapter')} ${iq.chapter.number}`}
                  {iq.marks ? ` · ${iq.marks} ${term('marks')}` : ''}
                </p>
              </div>
            </Link>
          </li>
        ))}
        {questions.map((q) => (
          <li key={q._id} data-reveal>
            <Link to={q.url} className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 hover:border-brand/40 hover:shadow-md">
              <span className="mt-0.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{t(q.questionLabel)}</span>
              <div className="min-w-0 flex-1">
                <RichContent html={t(q.text)} className="line-clamp-2 text-[15px] [&_p]:m-0" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(q.classLabel)} · {t(q.exerciseLabel)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function NotesSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const notes = section.data?.notes || [];
  if (!notes.length) return null;
  return (
    <SectionShell section={section}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <Link key={note._id} to={note.url} data-reveal className="group rounded-2xl border bg-card p-5 hover:border-brand/40 hover:shadow-md">
            <FileText className="mb-3 size-6 text-indigo" aria-hidden="true" />
            <h3 className="font-bold group-hover:text-brand">{t(note.title)}</h3>
            {t(note.summary) && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t(note.summary)}</p>}
            <p className="mt-3 text-xs font-semibold text-muted-foreground">{t(note.classLabel)}</p>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

export function VideoSection({ section }) {
  useUiLanguage();
  const videos = [section.video, ...(section.config?.videos || [])].filter((v) => v?.youtubeId);
  if (!videos.length) return null;
  return (
    <SectionShell section={section}>
      <div className={cn('grid gap-5', videos.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-3xl')}>
        {videos.map((video) => (
          <div key={video._id} data-reveal>
            <YouTubeEmbed video={video} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ImageGallerySection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const { openViewer } = useImageViewer();
  const gallery = section.config?.gallery || [];
  if (!gallery.length) return null;
  const images = gallery.map((m) => toViewerImage(m, { alt: t(m.alt), caption: t(m.caption) }));
  return (
    <SectionShell section={section}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {gallery.map((media, i) => (
          <div key={media._id} data-reveal>
            <Figure media={media} alt={t(media.alt) || media.title} caption={t(media.caption)} onOpen={() => openViewer(images, i)} sizes="(min-width: 1024px) 300px, 50vw" />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function CtaSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const background = section.config?.background || 'brand';
  const inverted = background === 'brand' || background === 'dark';
  return (
    <section id={section.name || section._id} className="py-10 sm:py-14">
      <div className="container-page">
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl px-6 py-10 sm:px-12 sm:py-14',
            background === 'dark' ? 'bg-[#1b1d2a] text-white' : inverted ? 'bg-gradient-to-br from-brand to-[color-mix(in_oklab,var(--brand)_50%,var(--saffron))] text-white' : 'border bg-card',
          )}
        >
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t(section.title)}</h2>
              {t(section.description) && <p className={cn('mt-2', inverted ? 'text-white/80' : 'text-muted-foreground')}>{t(section.description)}</p>}
            </div>
            <SectionButtons buttons={section.buttons} inverted={inverted} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  if (!section.items?.length) return null;
  return (
    <SectionShell section={section} containerClassName="max-w-4xl">
      <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
        {section.items.map((item) => (
          <AccordionItem key={item._id} value={item._id}>
            <AccordionTrigger className="py-4 text-left text-[15px] font-semibold">{t(item.title)}</AccordionTrigger>
            <AccordionContent className="pb-4 text-[15px] leading-relaxed text-muted-foreground">{t(item.description)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionShell>
  );
}

export function TextSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  return (
    <SectionShell section={section} heading={Boolean(t(section.title))}>
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className={section.image?.url ? 'lg:col-span-7' : 'lg:col-span-12'}>
          {section.config?.content && <RichContent html={section.config.content} />}
          {section.items?.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {section.items.map((item) => (
                <li key={item._id} className="flex items-start gap-2 text-sm">
                  <Icon name={item.icon || 'circle-check'} className="mt-0.5 size-4 text-success" />
                  <span>
                    <strong>{t(item.title)}</strong> {t(item.description)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {section.image?.url && (
          <div className="lg:col-span-5">
            <Figure media={section.image} alt={t(section.image.alt) || t(section.title)} />
          </div>
        )}
      </div>
    </SectionShell>
  );
}

export function RelatedLinksSection({ section }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  if (!section.items?.length) return null;
  return (
    <SectionShell section={section}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <li key={item._id}>
            <SmartLink to={item.url} className="group flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-brand/40">
              <BookOpen className="size-5 text-brand" aria-hidden="true" />
              <span className="flex-1 font-semibold group-hover:text-brand">{t(item.title)}</span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </SmartLink>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
