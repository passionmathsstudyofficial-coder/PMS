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

/** Strict selection with graceful fallback to prevent falsely hiding content when single-language authoring is used. */
export function pickL10n(value, lang, mode = 'auto') {
  const direct = localizedValue(value, lang);
  if (direct) return direct;
  if (isLocalized(value)) {
    const siblingLang = lang === 'hi' ? 'en' : 'hi';
    const siblingVal = localizedValue(value, siblingLang) || value[siblingLang] || value.mixed;
    if (typeof siblingVal === 'string' && siblingVal.trim()) return siblingVal;
  }
  if (typeof value === 'string' && value.trim()) return value;
  return '';
}

/** Which languages a localized value is available in. */
export function availableLanguages(value) {
  if (!value || typeof value === 'string') return [];
  return ['hi', 'en'].filter((k) => hasContent(localizedValue(value,k)));
}

export function useL10n() {
  const { lang } = useContentLang();
  return useCallback((value, mode) => {
    const picked = pickL10n(value, lang, mode);
    if (picked) return picked;
    if (value?._translationMissing) return missingContent(lang);
    return '';
  }, [lang]);
}

export function useInterfaceL10n() {
  const { lang } = useLang();
  return useCallback((value, mode) => {
    const picked = pickL10n(value, lang, mode);
    if (picked) return translateUi(picked, lang);
    if (value?._translationMissing) return missingContent(lang);
    return '';
  }, [lang]);
}
