import { activeNavigationItem } from '@/lib/navigationActive.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  FileCheck2,
  HelpCircle,
  Home,
  Info,
  Mail,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInterfaceL10n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SmartLink } from './SmartLink.jsx';

const DEFAULT_LINKS = [
  { _id: 'il-home', label: { hi: 'होम', en: 'Home' }, url: '/', icon: Home },
  { _id: 'il-maths', label: { hi: 'गणित', en: 'Mathematics' }, url: '/#classes', icon: BookOpen },
  { _id: 'il-search', label: { hi: 'खोजें', en: 'Search' }, url: '/search', icon: Search },
  { _id: 'il-about', label: { hi: 'हमारे बारे में', en: 'About Us' }, url: '/about-us', icon: Info },
  { _id: 'il-contact', label: { hi: 'संपर्क करें', en: 'Contact' }, url: '/contact', icon: Mail },
  { _id: 'il-privacy', label: { hi: 'गोपनीयता नीति', en: 'Privacy Policy' }, url: '/privacy-policy', icon: ShieldCheck },
  { _id: 'il-terms', label: { hi: 'नियम एवं शर्तें', en: 'Terms & Conditions' }, url: '/terms-and-conditions', icon: FileCheck2 },
];

export function ImportantLinksDropdown({ item, label = uiText('Important Links'), currentPath = '' }) {
  useUiLanguage();
  const t = useInterfaceL10n();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
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

  const children = item?.children?.length
    ? item.children.filter((c) => c.isVisible !== false)
    : DEFAULT_LINKS;

  const isTriggerActive = children.some((child) => {
    if (!child.url) return false;
    const clean = child.url.split('?')[0].split('#')[0];
    if (clean === '/') return currentPath === '/';
    return currentPath === clean || currentPath.startsWith(clean + '/');
  });

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
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap',
          isTriggerActive
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
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 w-64"
          >
            <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-xl p-2 shadow-xl ring-1 ring-black/5 dark:ring-white/10 space-y-0.5">
              {children.map((child) => {
                const childLabel = t(child.label) || '';
                const clean = child.url?.split('?')[0].split('#')[0] || '';
                const isChildActive = activeNavigationItem(children, location.pathname + location.search + location.hash) === child;

                return (
                  <SmartLink
                    key={child._id || child.url}
                    to={child.url}
                    aria-current={isChildActive ? 'page' : undefined}
                    newTab={child.newTab}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 text-xs xl:text-sm transition-colors',
                      isChildActive
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-foreground/80 hover:bg-muted hover:text-brand',
                    )}
                  >
                    <span>{childLabel}</span>
                  </SmartLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImportantLinksDropdown;

