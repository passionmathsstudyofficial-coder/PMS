import { useUiLanguage } from './useUiTranslation.jsx';
import { setUiLanguage, translateUi } from './uiLanguage.js';
import { mapLegacyLanguages } from '../../../shared/languages.js';
import { localizedValue, isLocalized, missingContent } from '../../../shared/localization.js';
import { hasRichContent } from '@/components/content/mathContent.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext({ lang: 'en', setLang: () => {} });

export function LanguageProvider({ children }) {
  const lang = useUiLanguage();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang: setUiLanguage }), [lang]);
  return <LanguageContext value={value}>{children}</LanguageContext>;
}
export const useLang = () => useContext(LanguageContext);
export const useContentLang = useLang;

export function hasContent(value) {
  if (!value) return false;
  if (value._translationMissing) return true;
  if (typeof value === 'string') return hasRichContent(value);
  return ['hi', 'en', 'mixed'].some((k) => hasContent(value[k]));
}

/** Strict selection. Legacy per-record display modes never override the visitor's preference. */
export function pickL10n(value, lang, mode = 'auto') {
  return localizedValue(value, lang);
}

/** Which languages a localized value is available in. */
export function availableLanguages(value) {
  if (!value || typeof value === 'string') return [];
  return ['hi', 'en'].filter((k) => hasContent(localizedValue(value,k)));
}

export function useL10n() {
  const { lang } = useContentLang();
  return useCallback((value, mode) => pickL10n(value, lang) || (value?._translationMissing || isLocalized(value) && Object.values(value).some(item => typeof item === 'string' && item.trim()) || typeof value === 'string' && value.trim() ? missingContent(lang) : ''), [lang]);
}

export function useInterfaceL10n() {
  const { lang } = useLang();
  return useCallback((value, mode) => translateUi(pickL10n(value, lang), lang) || (value?._translationMissing ? missingContent(lang) : ''), [lang]);
}
