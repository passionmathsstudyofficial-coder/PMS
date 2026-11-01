import { useLang } from '@/lib/i18n';
import { missingContent } from '../../../../shared/localization.js';
/** For explicitly single-language legacy/demo blocks. Mathematics and the source stay untouched. */
export function LanguageContent({ languages, children }) {
  const { lang } = useLang();
  return languages.includes(lang) ? children : <p className="rounded-xl border bg-muted/40 p-4 text-sm" role="status">{missingContent(lang)}</p>;
}
