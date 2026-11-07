import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SmartLink } from './SmartLink.jsx';

const VARIANTS = {
  brand: 'bg-gradient-to-r from-brand via-[color-mix(in_oklab,var(--brand)_70%,var(--saffron))] to-saffron text-white',
  info: 'bg-indigo text-white',
  success: 'bg-success text-white',
  warning: 'bg-saffron text-ink',
};

const storageKey = (a) => `pms-announcement-${a._id}-${a.updatedAt}`;

export function AnnouncementBar() {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const announcement = site?.announcements?.[0];
  const [dismissed, setDismissed] = useState(() => {
    try {
      return announcement ? sessionStorage.getItem(storageKey(announcement)) === '1' : false;
    } catch {
      return false;
    }
  });

  if (!announcement || site?.settings?.header?.showAnnouncement === false) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey(announcement), '1');
    } catch {
      /* ignore */
    }
  };

  const DEFAULT_ANNOUNCEMENT = {
    badge: { hi: 'नया सत्र 2026-27', en: 'NEW SESSION 2026-27' },
    text: {
      hi: 'नए शैक्षणिक सत्र 2026-27 में आपका स्वागत है! नए सत्र की सभी कक्षाएं और स्टडी मटेरियल अब उपलब्ध हैं।',
      en: '"Dear students, welcome to the new academic session 2026-27! New content and study materials are now available."',
    },
    linkLabel: { hi: 'शुरू करें →', en: 'Start Learning →' },
  };

  const rawBadge = announcement ? t(announcement.badge) : '';
  const rawText = announcement ? t(announcement.text) : '';
  const rawLinkLabel = announcement ? t(announcement.linkLabel) : '';

  const isInvalid = (val) => !val || val.includes('Content not available in English.') || val.includes('इस भाषा में सामग्री उपलब्ध नहीं है।');

  const badgeText = isInvalid(rawBadge) ? t(DEFAULT_ANNOUNCEMENT.badge) : rawBadge;
  const mainText = isInvalid(rawText) ? t(DEFAULT_ANNOUNCEMENT.text) : rawText;
  const linkLabel = isInvalid(rawLinkLabel) ? t(DEFAULT_ANNOUNCEMENT.linkLabel) : rawLinkLabel;
  const linkUrl = announcement?.linkUrl || '/#classes';

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          data-purpose="header-announcement-row"
        >
          <div
            className={cn(
              'relative py-2 pr-12 pl-4 sm:px-12 text-xs sm:text-sm font-medium',
              VARIANTS[announcement.variant] || VARIANTS.brand,
            )}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap text-center">
              {badgeText && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] sm:text-[11px] font-extrabold tracking-wide uppercase text-white shrink-0 shadow-2xs">
                  <Sparkles className="size-3 text-amber-200" />
                  {badgeText}
                </span>
              )}
              <span className="text-white/95 line-clamp-1 sm:line-clamp-none font-medium">
                {mainText}
              </span>
              {linkUrl && linkLabel && (
                <SmartLink
                  to={linkUrl}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white transition-colors shrink-0 underline-offset-4 hover:underline"
                >
                  <span>{linkLabel}</span>
                  <span aria-hidden="true">→</span>
                </SmartLink>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label={uiText("Dismiss announcement")}
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnnouncementBar;
