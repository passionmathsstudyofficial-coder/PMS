import { getReferenceBooks } from '@/lib/referenceBooks.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, Library, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SmartLink } from './SmartLink.jsx';

export function ReferenceBooksMegaMenu({ label = uiText('Reference Books'), currentPath = '' }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  // Close when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  // Preserve the published catalog supplied by the backend.
  const books = getReferenceBooks(site);

  const isActive =
    currentPath.startsWith('/reference-books') ||
    currentPath.startsWith('/reference-solutions');

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap',
          isActive
            ? 'text-brand font-bold bg-brand/10'
            : 'text-foreground/80 hover:text-brand hover:bg-muted/60',
          isOpen && 'text-brand bg-brand/5',
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-200 opacity-70',
            isOpen && 'rotate-180 text-brand opacity-100',
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 w-[740px] max-w-[92vw]"
          >
            <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
              {/* Header inside Mega Dropdown */}
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
                    <Library className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {uiText("गणित संदर्भ पुस्तकें (Reference Books)")}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {uiText("कक्षा 6 से 12 तक अध्याय-वार व प्रश्नावली-वार चरणबद्ध हल")}
                    </p>
                  </div>
                </div>

                <Link
                  to="/reference-solutions"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  <span>{uiText("सभी पुस्तकें देखें")}</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {/* Multi-column Book Cards Grid */}
              <div className={cn(
                'grid gap-3.5',
                books.length <= 2 ? 'grid-cols-2' : books.length === 3 ? 'grid-cols-3' : 'grid-cols-3',
              )}>
                {books.map((book) => {
                  const bookTitle = t(book.title) || book.author || 'Reference Book';
                  const bookDesc = t(book.description) || '';
                  const classes =
                    book.availableClasses && book.availableClasses.length > 0
                      ? book.availableClasses
                      : [];
                  const bookUrl = `/reference-solutions/${book.slug}`;
                  const coverSrc = book.coverImage?.url || book.coverUrl;

                  return (
                    <div
                      key={book.slug || book._id}
                      className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-all hover:border-brand/40 hover:bg-card hover:shadow-md"
                    >
                      <div>
                        {/* Book Header Link */}
                        <Link
                          to={bookUrl}
                          onClick={() => setIsOpen(false)}
                          className="flex items-start gap-2.5"
                        >
                          {coverSrc ? (
                            <img
                              src={coverSrc}
                              alt={bookTitle}
                              className="size-9 rounded-md object-cover border border-border/50 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand/15 via-brand/10 to-saffron/15 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                              <BookOpen className="size-4.5" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading text-xs font-bold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                              {bookTitle}
                            </h4>
                            <p className="text-[10.5px] font-medium text-muted-foreground line-clamp-1">
                              {book.author || uiText("Comprehensive Solutions")}
                            </p>
                          </div>
                        </Link>

                        {/* Short Description */}
                        {bookDesc && (
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                            {bookDesc}
                          </p>
                        )}
                      </div>

                      {/* Available Classes Chips */}
                      <div className="mt-3 pt-2.5 border-t border-border/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {uiText("कक्षा चुनें / Select Class:")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {classes.map((clsNum) => (
                            <Link
                              key={clsNum}
                              to={`/reference-solutions/${book.slug}/class-${clsNum}`}
                              onClick={() => setIsOpen(false)}
                              className="rounded-md bg-background px-1.5 py-0.5 text-[10.5px] font-bold text-foreground/80 hover:bg-brand hover:text-white transition-colors border border-border/50 shadow-2xs"
                            >
                              {clsNum}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Bar */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-brand" />
                  <span>{uiText("CBSE एवं राज्य बोर्ड परीक्षाओं के लिए 100% सत्यापित समाधान")}</span>
                </span>
                <Link
                  to="/reference-solutions"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-brand hover:underline inline-flex items-center gap-0.5"
                >
                  {uiText("Explore All Book Solutions →")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReferenceBooksMegaMenu;

