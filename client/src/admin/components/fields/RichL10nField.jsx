import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { mapLegacyLanguages } from '../../../../../shared/languages.js';
import { hasRichContent as filled } from '@/components/content/mathContent.js';
import { lazy, Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { Field } from './Fields.jsx';
import { TranslationStatus } from '../TranslationStatus.jsx';
import { getUiLanguage } from '@/lib/uiLanguage.js';

const RichTextEditor = lazy(() => import('./RichTextEditor.jsx'));

const TABS = [
  { key: 'en', get label() { return uiText("English") + ' (ENG)'; } },
  { key: 'hi', get label() { return uiText("Hindi") + ' (HIN)'; } },
];


/** Rich text in हिंदी / English. Each tab keeps its own editor so nothing is auto-translated. */
export function RichL10nField({ label, hint, error, required, value, onChange, modes = ['hi', 'en'], minimal, placeholder, className }) {
  useUiLanguage();
  const filteredTabs = TABS.filter((t) => modes.includes(t.key));
  const tabs = filteredTabs.length ? filteredTabs : TABS;
  const current = mapLegacyLanguages(value || {});
  const [active, setActive] = useState(() => tabs.some(tab => tab.key === getUiLanguage()) ? getUiLanguage() : tabs[0].key);

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
      aside={
        tabs.length > 1 && (
          <div className="flex rounded-lg bg-muted p-0.5" role="tablist" aria-label={uiTemplate`${label || uiText('Content')} language`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active === tab.key}
                onClick={() => setActive(tab.key)}
                className={cn('relative rounded-md px-2 py-0.5 text-[11px] font-bold', active === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
              >
                {tab.label}
                {filled(current[tab.key]) && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-success" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )
      }
    >
      <Suspense fallback={<div className="min-h-28 animate-pulse rounded-lg border bg-muted/40" />}>
        <RichTextEditor
          key={active}
          value={current[active] || ''}
          onChange={(html) => onChange({ ...current, [active]: html })}
          minimal={minimal}
          placeholder={placeholder}
          ariaLabel={`${label || uiText('Content')} (${active})`}
          lang={active === 'en' ? 'en' : 'hi'}
        />
      </Suspense>
      <TranslationStatus value={current} required={required} />
    </Field>
  );
}
