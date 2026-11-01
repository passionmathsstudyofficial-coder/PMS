import { remaining } from './translations/remaining.js';
import { ADMIN_PATH } from './config.js';
import { application } from './translations/application.js';
import './translations/extended.js';
import { hi, keys } from './translations/hi.js';
const reverse = new Map([...Object.entries(hi).map(([en, hindi]) => [hindi, en]), ...Object.values(remaining).map(e => [e.hi, e.en]), ...Object.values(application).map(e => [e.hi, e.en])]);
const canonicalEntries = new Map(Object.values({ ...remaining, ...application }).flatMap(entry => [[entry.en, entry], [entry.hi, entry]]));
const messagePatterns = [];
for (const [source, entry] of Object.entries({ ...remaining, ...application })) {
  for (const pattern of new Set([source, entry.en, entry.hi])) {
    if (!/\{v\d+\}/.test(pattern) || !/[A-Za-z\u0900-\u097f]/.test(pattern.replace(/\{v\d+\}/g, ''))) continue;
    const names = [];
    const parts = pattern.split(/(\{v\d+\})/g).map(part => {
      if (/^\{v\d+\}$/.test(part)) { names.push(part.slice(1, -1)); return '([\\s\\S]+?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    messagePatterns.push({ expression: new RegExp('^' + parts.join('') + '$'), names, entry, specificity: pattern.replace(/\{v\d+\}/g, '').length });
  }
}
// Prefer a complete context message over a generic prefix such as "Class {v0}".
messagePatterns.sort((a, b) => b.specificity - a.specificity);
let language = 'en';
let languageScope = 'public';
const scopeKey = () => languageScope === 'admin' ? 'pms-admin-lang' : 'pms-lang';
try { const path = window.location.pathname; if (path === ADMIN_PATH || path.startsWith(ADMIN_PATH + '/') || /^\/admin(?:\/|$)/.test(path)) languageScope = 'admin'; } catch {}
const listeners = new Set();
try { language = localStorage.getItem(scopeKey()) === 'hi' ? 'hi' : 'en'; } catch {}
try { const requested = new URLSearchParams(window.location.search).get('lang'); if (requested === 'en' || requested === 'hi') language = requested; } catch {}
if (typeof document !== 'undefined') document.documentElement.lang = language;
export const getUiLanguage = () => language;
export const subscribeUiLanguage = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function setUiLanguage(next) {
  language = next === 'hi' ? 'hi' : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  try { localStorage.setItem(scopeKey(), language); } catch {}
  try { if (languageScope === 'public') document.cookie = `pms-lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {}
  try { const url = new URL(window.location.href); if (url.searchParams.has('lang')) { url.searchParams.set('lang',language); window.history.replaceState(window.history.state,'',url); } } catch {}
  for (const listener of listeners) listener();
}
export function syncLanguageScope(pathname, adminPath = '/pms-control-room') {
  const next = pathname === adminPath || pathname.startsWith(adminPath + '/') || /^\/admin(?:\/|$)/.test(pathname) ? 'admin' : 'public';
  if (next === languageScope) return;
  languageScope = next;
  let stored = 'en';
  try { stored = localStorage.getItem(scopeKey()); } catch {}
  try { const requested = new URLSearchParams(window.location.search).get('lang'); if (requested === 'en' || requested === 'hi') stored = requested; } catch {}
  setUiLanguage(stored);
}
export function translateUi(key, lang = language, variables = {}) {
  const raw = String(key ?? '');
  const source = raw.trim();
  if (!source) return raw;
  const resolved = source.split('.').reduce((value, part) => value?.[part], keys);
  // Unknown nested keys are never printed as raw internal identifiers.
  let entry = application[source] || remaining[source] || canonicalEntries.get(source);
  if (!entry && !reverse.has(source) && !hi[source]) {
    for (const candidate of messagePatterns) {
      const match = candidate.expression.exec(source);
      if (match) {
        entry = candidate.entry;
        variables = { ...Object.fromEntries(candidate.names.map((name, i) => [name, match[i + 1]])), ...variables };
        break;
      }
    }
  }
  const english = entry?.en || (typeof resolved === 'string' ? resolved : reverse.get(source) || (/^[a-z]+(?:\.[a-zA-Z]+)+$/.test(source) ? 'Unavailable' : source));
  const value = lang === 'hi' ? entry?.hi || application[english]?.hi || remaining[english]?.hi || hi[english] || english : english;
  return (raw.match(/^\s*/)?.[0] || '') + value.replace(/\{(\w+)\}/g, (match, name) => variables[name] === undefined ? match : String(variables[name])) + (raw.match(/\s*$/)?.[0] || '');
}
export const uiText = text => translateUi(text);

// Tagged templates retain dynamic values as data; only the surrounding interface message is translated.
export function uiTemplate(strings, ...values) {
  const key = strings.reduce((text, part, i) => text + part + (i < values.length ? `{v${i}}` : ''), '');
  return translateUi(key, language, Object.fromEntries(values.map((value, i) => [`v${i}`, value])));
}
export function hasUiTranslation(source) {
  return Boolean(application[source] || remaining[source] || hi[source]);
}

if (typeof window !== 'undefined') {
  // Explicit preview/deep-link choices also survive the next visit or refresh.
  setUiLanguage(language);
  window.addEventListener('storage', event => { if (event.key === scopeKey()) setUiLanguage(event.newValue); });
  window.addEventListener('popstate', () => { const requested = new URLSearchParams(window.location.search).get('lang'); if (requested === 'en' || requested === 'hi') setUiLanguage(requested); });
}
