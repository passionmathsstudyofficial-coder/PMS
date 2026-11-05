import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SmartLink } from './SmartLink.jsx';

export function SponsoredResourcesBar({ className }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();

  const cfg = site?.settings?.sponsoredBar;
  if (!cfg || cfg.enabled === false) return null;

  const badgeText = t(cfg?.badge) || uiText("प्रायोजित संसाधन");
  const messageText =
    t(cfg?.text) ||
    uiText("🎯 IIT-JEE फाउंडेशन & NTSE 2026: गणित टेस्ट सीरीज लाइव उपलब्ध");
  const linkLabel = t(cfg?.linkLabel) || uiText("अन्वेषण करें →");
  const linkUrl = cfg?.linkUrl || '/#classes';
  const isExternal = Boolean(cfg?.isExternal || linkUrl.startsWith('http'));

  return (
    <div
      data-purpose="sponsored-resources-bar"
      className={cn(
        'w-full bg-slate-50/95 dark:bg-card/85 border-b border-slate-200/80 dark:border-border/60 transition-colors py-2 text-xs',
        className,
      )}
    >
      <div className="container-page flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap sm:flex-nowrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase shrink-0">
            <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
            {badgeText}
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
            {messageText}
          </span>
        </div>

        {linkUrl && linkLabel && (
          <SmartLink
            to={linkUrl}
            newTab={isExternal}
            className="inline-flex items-center gap-1 font-bold text-brand hover:underline shrink-0 text-xs transition-colors"
          >
            <span>{linkLabel}</span>
            {isExternal && <ExternalLink className="size-3" />}
          </SmartLink>
        )}
      </div>
    </div>
  );
}

export default SponsoredResourcesBar;
