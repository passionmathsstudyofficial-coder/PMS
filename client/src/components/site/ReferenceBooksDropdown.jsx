import { isPathActive } from '@/lib/navigationActive.js';
import { getReferenceBooks, referenceBookUrl } from '@/lib/referenceBooks.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite, useTerm } from '@/lib/site';
import { cn } from '@/lib/utils';

export function ReferenceBooksDropdown({ label, currentPath }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const location = useLocation();
  const path = currentPath || location.pathname + location.search + location.hash;

  const [isOpen, setIsOpen] = useState(false);
  const [activeBookSlug, setActiveBookSlug] = useState(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const clickedOpen = useRef(false);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    setIsOpen(false);
    setActiveBookSlug(null);
    clickedOpen.current = false;
  }, [location.pathname, location.search, location.hash]);

  const books = getReferenceBooks(site);

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
    if (window.matchMedia('(hover: hover)').matches) {
      if (!isOpen) clickedOpen.current = false;
      setIsOpen(true);
    }
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
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setIsOpen(false); setActiveBookSlug(null); } }}
      onKeyDown={event => {
        const trigger = containerRef.current?.querySelector('button');
        const current = document.activeElement;
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault(); event.stopPropagation(); setIsOpen(false); setActiveBookSlug(null); trigger?.focus();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (current === trigger) {
            setIsOpen(true); clickedOpen.current = true;
            setTimeout(() => { const links = containerRef.current?.querySelector('[role="menu"]')?.querySelectorAll(':scope > div > div > a'); links?.[event.key === 'ArrowUp' || event.key === 'End' ? links.length - 1 : 0]?.focus(); }, 0);
          } else {
            const menu = current?.closest('[role="menu"]');
            const links = [...(menu?.querySelectorAll('[role="menuitem"]') || [])].filter(link => link.closest('[role="menu"]') === menu);
            const index = links.indexOf(current);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + links.length) % links.length;
            links[next]?.focus();
          }
        } else if (event.key === 'ArrowRight' && current?.dataset.referenceBook) {
          event.preventDefault(); setActiveBookSlug(current.dataset.referenceBook);
          setTimeout(() => current.parentElement?.querySelector('[role="menuitem"]:not([data-reference-book])')?.focus(), 0);
        } else if (event.key === 'ArrowLeft' && current?.closest('[data-reference-submenu]')) {
          event.preventDefault(); const parent = current.closest('[data-reference-submenu]').parentElement;
          parent.querySelector('[data-reference-book]')?.focus(); setActiveBookSlug(null);
        }
      }}
    >
      {/* Trigger Button: Matches existing Mathematics dropdown design exactly */}
      <button
        type="button"
        onClick={() => {
          clearTimeout(timeoutRef.current);
          const next = !isOpen || !clickedOpen.current;
          clickedOpen.current = next;
          setIsOpen(next);
        }}
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
              const classes = (book.availableClasses || [])
                .slice()
                .sort((a, b) => a - b);
              const isHovered = activeBookSlug === book.slug;
              const isBookActive = isPathActive(referenceBookUrl(book), path) && !/\/class-\d+/.test(path);

              return (
                <div
                  key={book.slug}
                  className="relative group/item"
                  onMouseEnter={() => setActiveBookSlug(book.slug)}
                >
                  <Link
                    role="menuitem"
                    data-reference-book={book.slug}
                    aria-haspopup={classes.length ? 'menu' : undefined}
                    aria-expanded={classes.length ? isHovered : undefined}
                    onFocus={() => setActiveBookSlug(book.slug)}
                    to={referenceBookUrl(book)}
                    aria-current={isBookActive ? 'page' : undefined}
                    onClick={() => {
                      setIsOpen(false);
                      setActiveBookSlug(null);
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 text-xs xl:text-sm font-medium transition-colors duration-150 hover:bg-muted hover:text-brand',
                      isBookActive
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
                      data-reference-submenu="true"
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
                            role="menuitem"
                            key={clsNum}
                            to={`/reference-solutions/${book.slug}/class-${clsNum}`}
                            aria-current={isPathActive(`/reference-solutions/${book.slug}/class-${clsNum}`, path) ? 'page' : undefined}
                            onClick={() => {
                              setIsOpen(false);
                              setActiveBookSlug(null);
                            }}
                            className={cn(
                              'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors duration-150 hover:bg-brand/10 hover:text-brand hover:font-bold',
                              isPathActive(`/reference-solutions/${book.slug}/class-${clsNum}`, path)
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

