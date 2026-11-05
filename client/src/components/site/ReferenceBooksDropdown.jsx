import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite, useTerm } from '@/lib/site';
import { cn } from '@/lib/utils';

const DEFAULT_REFERENCE_BOOKS = [
  {
    slug: 'rs-aggarwal',
    title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'R.S. Aggarwal Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'rd-sharma',
    title: { hi: 'आर.डी. शर्मा समाधान', en: 'R.D. Sharma Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'kc-sinha',
    title: { hi: 'के.सी. सिन्हा समाधान', en: 'K.C. Sinha Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'ml-aggarwal',
    title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'M.L. Aggarwal Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
];

export function ReferenceBooksDropdown({ label, currentPath }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const location = useLocation();
  const path = currentPath || location.pathname;

  const [isOpen, setIsOpen] = useState(false);
  const [activeBookSlug, setActiveBookSlug] = useState(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fetch dynamically configured books from backend or fallback to canonical 4
  const rawBooks = Array.isArray(site?.referenceBooks) ? site.referenceBooks : DEFAULT_REFERENCE_BOOKS;

  // The API already merges defaults and publication overrides; never restore omitted books.
  const bookMap = new Map();
  for (const b of rawBooks) {
    if (b.slug) {
      const existing = bookMap.get(b.slug) || {};
      bookMap.set(b.slug, {
        ...existing,
        ...b,
        availableClasses: (b.availableClasses && b.availableClasses.length > 0)
          ? b.availableClasses
          : (existing.availableClasses || [6, 7, 8, 9, 10, 11, 12]),
      });
    }
  }
  const books = Array.from(bookMap.values()).filter((b) => b.isVisible !== false);

  const isCurrentActive =
    path.startsWith('/reference-books') ||
    path.startsWith('/reference-solutions');

  // Handle closing on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveBookSlug(null);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveBookSlug(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveBookSlug(null);
    }, 150);
  };

  const displayLabel = label || uiText("Reference Books");

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button: Matches existing Mathematics dropdown design exactly */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'inline-flex h-8 xl:h-9 items-center gap-1 rounded-md px-2 xl:px-2.5 text-xs xl:text-sm font-semibold transition-colors duration-150 hover:text-brand hover:bg-muted/60 whitespace-nowrap cursor-pointer',
          isCurrentActive
            ? 'text-brand font-bold bg-brand/10'
            : 'text-foreground/80',
        )}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-brand',
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label={displayLabel}
          className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-border bg-popover/98 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="space-y-0.5">
            {books.map((book) => {
              const bookTitle = t(book.title) || book.author || book.name || book.slug;
              const classes = (book.availableClasses?.length ? book.availableClasses : [6, 7, 8, 9, 10, 11, 12])
                .slice()
                .sort((a, b) => a - b);
              const isHovered = activeBookSlug === book.slug;
              const isBookActive = path.includes(book.slug);

              return (
                <div
                  key={book.slug}
                  className="relative group/item"
                  onMouseEnter={() => setActiveBookSlug(book.slug)}
                >
                  <Link
                    to={`/reference-solutions/${book.slug}`}
                    onClick={() => {
                      setIsOpen(false);
                      setActiveBookSlug(null);
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 text-xs xl:text-sm font-medium transition-colors duration-150 hover:bg-muted hover:text-brand',
                      isHovered || isBookActive
                        ? 'bg-muted text-brand font-semibold'
                        : 'text-foreground/85',
                    )}
                  >
                    <span className="truncate">{bookTitle}</span>
                    <ChevronRight
                      className={cn(
                        'size-4 shrink-0 transition-transform duration-150',
                        isHovered ? 'text-brand translate-x-0.5' : 'text-muted-foreground',
                      )}
                    />
                  </Link>

                  {/* Classes Submenu to the Right */}
                  {isHovered && (
                    <div
                      role="menu"
                      aria-label={uiTemplate`${bookTitle} Classes`}
                      className="absolute left-full top-0 ml-1 z-50 w-36 sm:w-40 rounded-xl border border-border bg-popover/98 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 slide-in-from-left-2 duration-150"
                    >
                      <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
                        {term('class')}
                      </div>
                      <div className="space-y-0.5 max-h-64 overflow-y-auto">
                        {classes.map((clsNum) => (
                          <Link
                            key={clsNum}
                            to={`/reference-solutions/${book.slug}/class-${clsNum}`}
                            onClick={() => {
                              setIsOpen(false);
                              setActiveBookSlug(null);
                            }}
                            className={cn(
                              'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors duration-150 hover:bg-brand/10 hover:text-brand hover:font-bold',
                              path === `/reference-solutions/${book.slug}/class-${clsNum}`
                                ? 'bg-brand/10 font-bold text-brand'
                                : 'text-foreground/80',
                            )}
                          >
                            <span>{term('class')} {clsNum}</span>
                            <span className="text-[10px] text-muted-foreground">→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReferenceBooksDropdown;

