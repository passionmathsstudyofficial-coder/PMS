import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { stripTags } from '../lib/format.js';
import { localizedValue, missingContent } from '../../../../shared/localization.js';

/** Hindi on top, English below — used in admin tables. */
export function LocalizedCell({ value, html = false, max = 90 }) {
  const language = useUiLanguage();
  const clean = (text) => (html ? stripTags(text) : text || '').slice(0, max);
  const selected = clean(localizedValue(value,language));
  return (
    <div className="min-w-0 max-w-md">
      <p className="truncate font-semibold">{selected || missingContent(language)}</p>
    </div>
  );
}
