import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ChevronDown, ChevronRight, Menu, Search } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
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

function isPathActive(targetUrl, currentPath) {
  if (!targetUrl) return false;
  const cleanTarget = targetUrl.split('?')[0].split('#')[0];
  if (cleanTarget === '/') return currentPath === '/';
  return currentPath === cleanTarget || currentPath.startsWith(cleanTarget + '/');
}

function DropdownMenuItemComponent({ item, currentPath }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const location = useLocation();
  const label = t(item.label) || '';

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

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
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const rawClasses = site?.classes?.length ? site.classes : [
    { number: 12, url: '/class-12/maths' },
    { number: 11, url: '/class-11/maths' },
    { number: 10, url: '/class-10/maths' },
    { number: 9, url: '/class-9/maths' },
    { number: 8, url: '/class-8/maths' },
    { number: 7, url: '/class-7/maths' },
    { number: 6, url: '/class-6/maths' },
  ];
  const classesList = [...rawClasses].sort((a, b) => b.number - a.number);

  let children = (item.children || []).filter((c) => c.isVisible !== false);
  if (!children.length) {
    const en = (item.label?.en || '').toLowerCase();
    if (item.type === 'classes' || en.includes('math')) {
      children = classesList.map((cls) => ({
        url: cls.url || `/class-${cls.number}/maths`,
        label: { hi: `कक्षा ${cls.number} गणित`, en: `Class ${cls.number} Maths` },
        isVisible: true,
      }));
    } else if (en.includes('important question') || (item.label?.hi || '').includes('महत्वपूर्ण प्रश्न')) {
      children = classesList.map((cls) => ({
        url: `/class-${cls.number}/maths/important-questions`,
        label: { hi: `कक्षा ${cls.number} महत्वपूर्ण प्रश्न`, en: `Class ${cls.number} Important Questions` },
        isVisible: true,
      }));
    } else if (en.includes('note') || (item.label?.hi || '').includes('नोट्स')) {
      children = classesList.map((cls) => ({
        url: `/class-${cls.number}/maths/notes`,
        label: { hi: `कक्षा ${cls.number} गणित नोट्स`, en: `Class ${cls.number} Maths Notes` },
        isVisible: true,
      }));
    }
  }

  const isTriggerActive =
    isPathActive(item.url, currentPath) ||
    children.some((child) => isPathActive(child.url, currentPath));

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
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
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full mt-1 z-50 w-64 min-w-[16rem] rounded-xl border border-border bg-popover/98 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {children.map((child) => {
              const childActive = isPathActive(child.url, currentPath);
              return (
                <SmartLink
                  key={child._id || child.url}
                  to={child.url}
                  newTab={child.newTab}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-xs xl:text-sm font-medium transition-colors hover:bg-muted hover:text-brand',
                    childActive ? 'bg-brand/10 font-bold text-brand' : 'text-foreground/80',
                  )}
                >
                  <span className="truncate">{t(child.label)}</span>
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
  const currentPath = location.pathname;

  const [searchOpen, setSearchOpen] = useState(false);

  const rawItems = (site?.navigation?.header || []).filter((i) => i.isVisible !== false);

  // Normalize header navigation items to guarantee:
  // PMS Logo | Home | Mathematics ⌄ | Reference Books ⌄ | Important Questions ⌄ | Notes ⌄ | About Us | Hindi
  const navItems = useMemo(() => {
    if (!rawItems.length) {
      return [
        { label: { hi: 'होम', en: 'Home' }, url: '/', type: 'link' },
        { label: { hi: 'गणित', en: 'Mathematics' }, url: '', type: 'classes' },
        { label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' }, url: '/reference-solutions', type: 'reference-books' },
        { label: { hi: 'महत्वपूर्ण प्रश्न', en: 'Important Questions' }, url: '/class-10/maths/important-questions', type: 'dropdown' },
        { label: { hi: 'नोट्स', en: 'Notes' }, url: '/class-10/maths/notes', type: 'dropdown' },
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
        result.push(item);
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
            {navItems.map((item) => {
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

          {/* Configured Login Button */}
          {site?.settings?.header?.showLoginButton && (
            <Button size="sm" asChild>
              <SmartLink allowAdmin to={site.settings.header.loginUrl || '/login'}>
                {t(site.settings.header.loginLabel) || uiText("Login")}
              </SmartLink>
            </Button>
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
                <SearchBar autoFocus onSelect={() => setSearchOpen(false)} />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
}

export default MainNavbar;
