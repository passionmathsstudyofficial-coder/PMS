import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useSite } from '@/lib/site';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';

export function FloatingLanguageWidget() {
  useUiLanguage();
  const site = useSite();
  if (site?.settings?.header?.showLanguageSwitch === false) return null;
  return <div className="fixed bottom-5 left-5 z-40 rounded-full border bg-card p-1 shadow-lg"><LanguageSwitcher /></div>;
}
