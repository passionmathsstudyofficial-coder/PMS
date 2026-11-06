import { getReferenceBooks, referenceBookUrl } from '@/lib/referenceBooks.js';
import { isPathActive, activeNavigationItem } from '@/lib/navigationActive.js';
import { navigationChildren, navigationId, studyNavigationItem } from '@/lib/studyNavigation.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Library,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { SearchBar } from './SearchBar.jsx';
import { SmartLink } from './SmartLink.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

// Multi-level accordion for Reference Books on Mobile:
// Reference Books -> expands to Books -> expands to Classes (6-12)
function MobileReferenceBooksAccordion({ currentPath, isOpen, onToggle, onClose }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();

  const [expandedBook, setExpandedBook] = useState(null);

  const books = getReferenceBooks(site);
  const panelId = useId();

  const isMainActive =
    currentPath.startsWith('/reference-books') ||
    currentPath.startsWith('/reference-solutions');

  return (
    <div className="border-b border-border/50 last:border-b-0 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-muted',
          isMainActive ? 'text-brand bg-brand/5' : 'text-foreground',
        )}
      >
        <span className="flex items-center gap-2">
          <Library className="size-4 text-brand" />
          <span>{uiText("संदर्भ पुस्तकें (Reference Books)")}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-brand',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            id={panelId}
            className="overflow-hidden pl-4 pr-1 pt-1 pb-2 space-y-2"
          >
            {books.map((book) => {
              const bookTitle = t(book.title) || book.author || 'Book';
              const classes =
                book.availableClasses && book.availableClasses.length > 0
                  ? book.availableClasses
                  : [6, 7, 8, 9, 10, 11, 12];
              const isBookOpen = expandedBook === book.slug;
              const isBookActive = isPathActive(`/reference-solutions/${book.slug}`, currentPath) && !/\/class-\d+/.test(currentPath);

              return (
                <div
                  key={book.slug || book._id}
                  className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedBook(isBookOpen ? null : book.slug)}
                    aria-expanded={isBookOpen}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-muted/60',
                      isBookActive ? 'text-brand font-extrabold' : 'text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-brand" />
                      <span>{bookTitle}</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-3.5 text-muted-foreground transition-transform duration-200',
                        isBookOpen && 'rotate-180 text-brand',
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isBookOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="overflow-hidden px-3 pt-1 pb-3 space-y-2 border-t border-border/40 bg-background/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {uiText("कक्षा चुनें:")}
                          </span>
                          <Link
                            to={referenceBookUrl(book)}
                            aria-current={isBookActive ? 'page' : undefined}
                            onClick={onClose}
                            className="text-[11px] font-bold text-brand hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{uiText("संपूर्ण पुस्तक")}</span>
                            <ChevronRight className="size-3" />
                          </Link>
                        </div>

                        {/* Class buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {classes.map((clsNum) => {
                            const classUrl = `/reference-solutions/${book.slug}/class-${clsNum}`;
                            const isClassActive = isPathActive(classUrl, currentPath);
                            return (
                              <Link
                                key={clsNum}
                                to={classUrl}
                                aria-current={isClassActive ? 'page' : undefined}
                                onClick={onClose}
                                className={cn(
                                  'flex items-center justify-center rounded-lg border py-1.5 text-center text-xs font-bold transition-colors',
                                  isClassActive
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-card text-foreground/80 hover:bg-brand/10 hover:text-brand border-border/60',
                                )}
                              >
                                {uiText("कक्षा")}{' '}{clsNum}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <Link
              to="/reference-solutions"
              onClick={onClose}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold text-brand hover:bg-brand/10 transition-colors"
            >
              <span>{uiText("सभी संदर्भ पुस्तकें देखें →")}</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Standard dropdown accordion for NCERT, State Boards, Important Links
function MobileDropdownAccordion({ item, currentPath, open, onToggle, onClose }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const label = t(item.label) || '';
  const site = useSite();
  const panelId = useId();
  const children = navigationChildren(item, site?.classes);

  const isTriggerActive =
    isPathActive(item.url, currentPath) ||
    children.some((child) => isPathActive(child.url, currentPath));

  return (
    <div className="border-b border-border/50 last:border-b-0 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-muted',
          isTriggerActive ? 'text-brand bg-brand/5' : 'text-foreground',
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-brand',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            id={panelId}
            className="overflow-hidden pl-3 pr-1 pt-1 pb-2 space-y-1"
          >
            {children.map((child) => {
              const childActive = activeNavigationItem(children, currentPath) === child;
              return (
                <SmartLink
                  key={child._id || child.label?.en || child.url}
                  to={child.url}
                  aria-current={childActive ? 'page' : undefined}
                  newTab={child.newTab}
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                    childActive
                      ? 'bg-brand/10 font-bold text-brand'
                      : 'text-foreground/80 hover:bg-muted hover:text-brand',
                  )}
                >
                  <span>{t(child.label)}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </SmartLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenu({ open, onClose }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const location = useLocation();
  const currentPath = location.pathname + location.search + location.hash;

  const [openDropdown, setOpenDropdown] = useState(null);
  useEffect(() => { setOpenDropdown(null); }, [open, currentPath]);

  // Group raw items into clean mobile list
  const configuredItems = (site?.navigation?.header || []).filter((i) => i.isVisible !== false);
  const rawItems = configuredItems.length ? configuredItems : [
    { label: { en: 'Home', hi: 'होम' }, url: '/', type: 'link' },
    { label: { en: 'Mathematics', hi: 'गणित' }, type: 'classes' },
    { label: { en: 'Important Questions', hi: 'महत्वपूर्ण प्रश्न' }, url: '/study-materials/important-questions' },
    { label: { en: 'Notes', hi: 'नोट्स' }, url: '/study-materials/ncert-notes' },
    { label: { en: 'About Us', hi: 'हमारे बारे में' }, url: '/about-us', type: 'link' },
  ];

  const navItems = [];
  let hasRefBooks = false;

  for (const item of rawItems) {
    const enLabel = (item.label?.en || '').toLowerCase();
    if (item.type === 'reference-books' || item.type === 'mega' || enLabel.includes('reference book') || item.url === '/reference-solutions' || item.url === '/reference-books') {
      if (!hasRefBooks) {
        navItems.push({
          _id: 'nav-reference-books',
          label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
          url: '/reference-solutions',
          type: 'mega',
        });
        hasRefBooks = true;
      }
    } else {
      navItems.push(studyNavigationItem(item));
    }
  }

  if (!hasRefBooks) {
    const ncertIdx = navItems.findIndex((i) => i.type === 'classes' || (i.label?.en || '').toLowerCase().includes('math'));
    const insertAt = ncertIdx >= 0 ? ncertIdx + 1 : Math.min(2, navItems.length);
    navItems.splice(insertAt, 0, {
      _id: 'nav-reference-books',
      label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
      url: '/reference-solutions',
      type: 'mega',
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          {/* Backdrop */}
          <DialogPrimitive.Overlay asChild forceMount><motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          /></DialogPrimitive.Overlay>

          {/* Drawer */}
          <DialogPrimitive.Content asChild forceMount aria-modal="true" aria-describedby={undefined}><motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-background shadow-2xl border-l border-border/80 lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">{uiText("Main Navigation")}</DialogPrimitive.Title>
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
              <Logo showText={true} onClick={onClose} />
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label={uiText("Close menu")}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="p-4 border-b shrink-0">
              <SearchBar autoFocus={false} onNavigate={onClose} />
            </div>

            {/* Navigation List */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => {
                const enLabel = (item.label?.en || '').toLowerCase();
                const isReference =
                  item.type === 'mega' ||
                  enLabel.includes('reference') ||
                  item.url === '/reference-solutions' ||
                  item.url === '/reference-books';

                // 1. Reference Books Multi-level Accordion
                if (isReference) {
                  return (
                    <MobileReferenceBooksAccordion
                      key={item._id || 'nav-ref-books'}
                      currentPath={currentPath}
                      isOpen={openDropdown === 'reference-books'}
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown === 'reference-books' ? null : 'reference-books',
                        )
                      }
                      onClose={onClose}
                    />
                  );
                }

                // 2. Dropdowns (NCERT, State Boards, Important Links)
                if (item.type === 'dropdown' || item.type === 'classes') {
                  const id = navigationId(item);
                  return (
                    <MobileDropdownAccordion
                      key={id}
                      item={item}
                      currentPath={currentPath}
                      open={openDropdown === id}
                      onToggle={() => setOpenDropdown(openDropdown === id ? null : id)}
                      onClose={onClose}
                    />
                  );
                }

                // 3. Direct Link
                const active = isPathActive(item.url, currentPath);
                return (
                  <div key={item._id || item.url} className="border-b border-border/50 last:border-b-0 py-1">
                    <SmartLink
                      to={item.url}
                      aria-current={active ? 'page' : undefined}
                      newTab={item.newTab}
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
                        active
                          ? 'bg-brand/10 text-brand font-bold'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <span>{t(item.label)}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </SmartLink>
                  </div>
                );
              })}
            </div>

            {/* Footer Utilities */}
            <div className="border-t p-4 bg-muted/20 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {uiText("भाषा / Language & Theme")}
                </span>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
              </div>

              {/* WhatsApp follow button */}
              {site?.settings?.whatsappBanner?.enabled !== false && (
                <a
                  href={site?.settings?.whatsappBanner?.url || 'https://whatsapp.com/channel/0029Vb8ePtV6xCSKZnaBfu0N'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
                >
                  <span>{uiText("Follow on WhatsApp")}</span>
                </a>
              )}
            </div>
          </motion.div></DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export const MobileNavigation = MobileMenu;
export default MobileMenu;
