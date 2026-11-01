import { translationStatus } from '../../../../shared/localization.js';
import { useUiTranslation } from '@/lib/useUiTranslation.jsx';
import { uiTemplate } from '@/lib/uiLanguage.js';
export function TranslationStatus({ value, required = false }) {
  const t = useUiTranslation();
  const status = translationStatus(value);
  const count = Object.values(status).filter(Boolean).length;
  return <div className="mt-1 text-xs" role="status">
    <span className={count === 2 ? 'text-success' : 'text-muted-foreground'}>{uiTemplate`${count}/2 translations complete`}</span>
    {(required || count > 0) && count < 2 && <p className="text-warning">{uiTemplate`Missing translation: ${['en','hi'].filter(code => !status[code]).map(code => t(code === 'en' ? 'English' : 'Hindi')).join(', ')}`}</p>}
    {value?.mixed && <p className="text-warning">{t('Legacy content is preserved. Assign it to English or Hindi manually.')}</p>}
  </div>;
}
