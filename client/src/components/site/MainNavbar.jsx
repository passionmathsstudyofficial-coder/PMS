import { isPathActive, activeNavigationItem } from '@/lib/navigationActive.js';
import { navigationChildren, navigationId, studyNavigationItem } from '@/lib/studyNavigation.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ChevronDown, ChevronRight, Menu, Search } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite, useTerm } from '@/lib/site';
import { cn } from '@/lib/utils';
import { ImportantLinksDropdown } from './ImportantLinksDropdown.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { ReferenceBooksDropdown } from './ReferenceBooksDropdown.jsx';
import { SearchBar } from './SearchBar.jsx';
import { SmartLink } from './SmartLink.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';



function DropdownMenuItemComponent({ item, currentPath, openMenu, setOpenMenu }) {
  item = studyNavigationItem(item);
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const location = useLocation();
  const label = t(item.label) || '';

  const menuId = navigationId(item);
  const isOpen = openMenu === menuId;
  const setIsOpen = value => setOpenMenu(previous => {
    const next = typeof value === 'function' ? value(previous === menuId) : value;
    return next ? menuId : previous === menuId ? null : previous;
  });
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const panelRef = useRef(null);
  const clickedOpen = useRef(false);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const align = () => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.marginLeft = '0px';
      const bounds = panel.getBoundingClientRect();
      panel.style.marginLeft = `${Math.max(16 - bounds.left, Math.min(0, window.innerWidth - 16 - bounds.right))}px`;
    };
    align();
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, [isOpen]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    clickedOpen.current = false;
    setOpenMenu(null);
  }, [location.pathname, location.search, location.hash, setOpenMenu]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        containerRef.current?.querySelector('button')?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (window.matchMedia('(hover: hover)').matches) {
      if (!isOpen) clickedOpen.current = false;
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const children = navigationChildren(item, site?.classes);

  const isTriggerActive =
    isPathActive(item.url, currentPath) ||
    children.some((child) => isPathActive(child.url, currentPath));

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      onKeyDown={event => {
        const links = [...containerRef.current.querySelectorAll('[role="menuitem"]')];
        const index = links.indexOf(document.activeElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            requestAnimationFrame(() => {
              const items = containerRef.current?.querySelectorAll('[role="menuitem"]');
              items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus();
            });
          } else {
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
              : (index + (event.key === 'ArrowUp' ? -1 : 1) + links.length) % links.length;
            links[next]?.focus();
          }
        }
      }}
    >
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
        aria-controls={isOpen ? `dropdown-${menuId}` : undefined}
        className={cn(
          'inline-flex h-8 xl:h-9 items-center gap-1 rounded-md px-2 xl:px-2.5 text-xs xl:text-sm font-semibold transition-colors duration-150 hover:text-brand hover:bg-muted/60 whitespace-nowrap cursor-pointer',
          isTriggerActive || isOpen
            ? 'text-brand font-bold bg-brand/10'
            : 'text-foreground/80',
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-brand',
          )}
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={`dropdown-${menuId}`}
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-2 text-gray-800 shadow-lg"
        >
          <div className="space-y-0.5 max-h-[min(28rem,70vh)] overflow-y-auto">
            {children.map((child) => {
              const childActive = activeNavigationItem(children, currentPath) === child;
              return (
                <SmartLink
                  key={child._id || child.label?.en || child.url}
                  role="menuitem"
                  to={child.url}
                  aria-current={childActive ? 'page' : undefined}
                  newTab={child.newTab}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-5 py-3 text-sm xl:text-base font-medium transition-colors hover:bg-orange-50 hover:text-brand focus-visible:bg-orange-50 focus-visible:outline-2 focus-visible:outline-brand',
                    childActive ? 'bg-brand/10 font-bold text-brand' : 'text-gray-700',
                  )}
                >
                  <span className="whitespace-normal">{t(child.label)}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </SmartLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MainNavbar({ onOpenMobileMenu }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const location = useLocation();
  const currentPath = location.pathname + location.search + location.hash;

  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const rawItems = (site?.navigation?.header || []).filter((i) => i.isVisible !== false);

  // Normalize header navigation items to guarantee:
  // PMS Logo | Home | Mathematics ⌄ | Reference Books ⌄ | Important Questions ⌄ | Notes ⌄ | About Us | Hindi
  const navItems = useMemo(() => {
    if (!rawItems.length) {
      return [
        { label: { hi: 'होम', en: 'Home' }, url: '/', type: 'link' },
        { label: { hi: 'NCERT गणित', en: 'NCERT Mathematics' }, url: '', type: 'classes' },
        { label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' }, url: '/reference-solutions', type: 'reference-books' },
        { label: { hi: 'महत्वपूर्ण प्रश्न', en: 'Important Questions' }, url: '/study-materials/previous-year-questions', type: 'dropdown' },
        { label: { hi: 'नोट्स', en: 'Notes' }, url: '/notes/ncert-chapter-wise-notes', type: 'dropdown' },
        { label: { hi: 'हमारे बारे में', en: 'About Us' }, url: '/about-us', type: 'link' },
      ];
    }

    const result = [];
    let refBookItem = null;

    for (const item of rawItems) {
      const enLabel = (item.label?.en || '').toLowerCase();
      const hiLabel = (item.label?.hi || '');
      const isStateBoards =
        enLabel.includes('state board') ||
        hiLabel.includes('राज्य बोर्ड') ||
        item.url?.includes('state-boards');

      if (isStateBoards) continue;

      const isReference =
        item.type === 'reference-books' ||
        item.type === 'mega' ||
        enLabel.includes('reference book') ||
        item.url === '/reference-solutions' ||
        item.url === '/reference-books';

      if (isReference) {
        if (!refBookItem) {
          refBookItem = {
            ...item,
            _id: item._id || 'nav-reference-books',
            label: item.label || { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
            url: item.url || '/reference-solutions',
            type: 'reference-books',
          };
        }
      } else {
        const isMathItem = item.type === 'classes' || enLabel === 'mathematics' || enLabel === 'maths' || enLabel.includes('ncert math');
        if (isMathItem) {
          result.push({
            ...item,
            type: 'classes',
            label: {
              hi: 'NCERT गणित',
              en: 'NCERT Mathematics',
            },
          });
        } else {
          result.push(item);
        }
      }
    }

    if (!refBookItem) {
      refBookItem = {
        _id: 'nav-reference-books',
        label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
        url: '/reference-solutions',
        type: 'reference-books',
      };
    }

    // Insert Reference Books right between Mathematics and Important Questions
    const mathIdx = result.findIndex((i) => {
      const en = (i.label?.en || '').toLowerCase();
      return i.type === 'classes' || en.includes('math');
    });

    const impIdx = result.findIndex((i) => {
      const en = (i.label?.en || '').toLowerCase();
      return en.includes('important question') || (i.label?.hi || '').includes('महत्वपूर्ण प्रश्न');
    });

    let insertAt = 2;
    if (mathIdx >= 0 && impIdx > mathIdx) {
      insertAt = mathIdx + 1;
    } else if (mathIdx >= 0) {
      insertAt = mathIdx + 1;
    } else if (impIdx >= 0) {
      insertAt = impIdx;
    }

    result.splice(insertAt, 0, refBookItem);
    return result;
  }, [rawItems]);

  return (
    <div
      data-purpose="main-navigation-row"
      className="relative z-40 h-16 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 transition-all"
    >
      <div className="container-page h-full flex items-center justify-between gap-2 xl:gap-4 flex-nowrap">
        {/* Left Side: PMS Logo, Passion Maths Study, Subtitle */}
        <div className="flex min-w-0 flex-1 items-center lg:flex-none">
          <Logo className="min-w-0 shrink gap-2 sm:gap-3" textClassName="min-w-0 shrink" />
        </div>

        {/* Right Side: Desktop Nav (Exactly 1 row) + Utility Controls */}
        <div className="flex items-center gap-1 xl:gap-2 shrink-0 flex-nowrap">
          {/* Desktop Navigation Links */}
          <nav
            aria-label={uiText("Main Navigation")}
            className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-nowrap"
          >
            {navItems.map((rawItem) => {
              const item = studyNavigationItem(rawItem);
              const enLabel = (item.label?.en || '').toLowerCase();
              const isReference =
                item.type === 'reference-books' ||
                item.type === 'mega' ||
                enLabel.includes('reference') ||
                item.url === '/reference-solutions' ||
                item.url === '/reference-books';
              const isImportant =
                enLabel.includes('important link') ||
                item._id === 'nav-links';

              // 1. Reference Books Dropdown (Small vertical dropdown with flyout to right)
              if (isReference) {
                return (
                  <ReferenceBooksDropdown
                    key={item._id || 'nav-reference-books'}
                    label={t(item.label) || uiText("Reference Books")}
                    currentPath={currentPath}
                  />
                );
              }

              // 2. Important Links Dropdown (if present)
              if (isImportant) {
                return (
                  <ImportantLinksDropdown
                    key={item._id || 'nav-important-links'}
                    item={item}
                    label={t(item.label) || uiText("महत्वपूर्ण लिंक (Important Links)")}
                    currentPath={currentPath}
                  />
                );
              }

              // 3. Dropdown Menus (Mathematics, Important Questions, Notes, etc.)
              if (item.type === 'dropdown' || item.type === 'classes') {
                return (
                  <DropdownMenuItemComponent
                    key={item._id || item.url || item.label?.en}
                    item={item}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                    currentPath={currentPath}
                  />
                );
              }

              // 4. Standard Direct Link (Home, About Us, Contact)
              const active = isPathActive(item.url, currentPath);
              return (
                <SmartLink
                  key={item._id || item.url || item.label?.en}
                  to={item.url}
                  newTab={item.newTab}
                  className={cn(
                    'rounded-md px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap',
                    active
                      ? 'text-brand font-bold bg-brand/10'
                      : 'text-foreground/80 hover:text-brand hover:bg-muted/60',
                  )}
                >
                  {t(item.label)}
                </SmartLink>
              );
            })}
          </nav>

          {/* Vertical Divider */}
          <div className="hidden lg:block h-5 w-px bg-border/80 mx-0.5 xl:mx-1" />

          {/* Quick Search Button */}
          {site?.settings?.header?.showSearch !== false && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={uiText("खोजें / Search")}
              className="inline-flex size-8 xl:size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Search className="size-4" />
            </button>
          )}

          {/* Theme Toggle */}
          {site?.settings?.header?.showThemeSwitch !== false && (
            <ThemeToggle className="size-8 xl:size-9 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted" />
          )}

          {/* Language Switcher (Hindi / English) */}
          {site?.settings?.header?.showLanguageSwitch !== false && (
            <LanguageSwitcher />
          )}

          {/* Mobile Menu Trigger Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="lg:hidden size-9 rounded-lg"
            aria-label={uiText("Open navigation menu")}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {/* Quick Search Modal Dialog */}
      {site?.settings?.header?.showSearch !== false && searchOpen && (
        <DialogPrimitive.Root open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed top-[15%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl">
                <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
}

export default MainNavbar;
