import { useSyncExternalStore } from 'react';
import { getUiLanguage, subscribeUiLanguage, translateUi } from './uiLanguage.js';
export function useUiLanguage() { return useSyncExternalStore(subscribeUiLanguage, getUiLanguage, () => 'en'); }
export function useUiTranslation() { const language = useUiLanguage(); return (key, variables) => translateUi(key, language, variables); }
export function UiText({ text }) { const t = useUiTranslation(); return typeof text === 'string' ? t(text) : text; }
