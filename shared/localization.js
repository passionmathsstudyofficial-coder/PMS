// Selection only: never rewrites stored text, joins language slots or translates mathematics.
export const LANGUAGES = ['en', 'hi'];
export const isLanguage = value => LANGUAGES.includes(value);
export const missingContent = language => language === 'hi' ? 'इस भाषा में सामग्री उपलब्ध नहीं है।' : 'Content not available in English.';
export const isLocalized = value => Boolean(value && typeof value === 'object' && !Array.isArray(value) && ['en','hi','mixed'].some(key => typeof value[key] === 'string'));
export function contentProse(value) {
  return String(value || '').replace(/<math\b[\s\S]*?<\/math>/gi, '').replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g, '').replace(/<[^>]*>/g, '').replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ').trim();
}
export function compatibleText(value, language) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const prose = contentProse(value);
  if (!prose) return true; // image/math-only rich content
  if (language === 'en') return !/[\u0900-\u097f]/.test(prose);
  return /[\u0900-\u097f]/.test(prose) || !/[A-Za-z]{3,}/.test(prose) || /^(?:Passion Maths Study|NCERT|CBSE|ICSE|PDF|DOCX?|LaTeX|KaTeX|YouTube|WhatsApp|Instagram|Facebook)$/i.test(prose);
}
export function localizedValue(value, language = 'en') {
  const selected = isLocalized(value) ? value[language] : typeof value === 'string' ? value : '';
  return compatibleText(selected, language) ? selected : '';
}
export function translationStatus(value) {
  return Object.fromEntries(LANGUAGES.map(language => [language, Boolean(localizedValue(value, language))]));
}
export function projectLanguage(value, language = 'en') {
  if (Array.isArray(value)) return value.map(item => projectLanguage(item, language));
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  if (typeof value.toObject === 'function') value = value.toObject();
  if (isLocalized(value)) {
    const selected = localizedValue(value, language);
    const metadata = Object.fromEntries(Object.entries(value).filter(([key]) => !['en','hi','mixed','_translationMissing'].includes(key)).map(([key,item]) => [key,projectLanguage(item,language)]));
    return { ...metadata, [language]: selected, ...(!selected && (value._translationMissing || ['en','hi','mixed'].some(key => typeof value[key] === 'string' && value[key].trim())) ? { _translationMissing: true } : {}) };
  }
  if (Object.keys(value).length && Object.keys(value).every(key => LANGUAGES.includes(key))) return { [language]: projectLanguage(value[language] || {},language) };
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !['searchText','mixed'].includes(key)).map(([key,item]) => {
    if (key === 'seo' && item && typeof item === 'object') {
      const seo = projectLanguage(item,language);
      for (const field of ['title','description','ogTitle','ogDescription']) if (typeof item[field] === 'string') seo[field] = localizedValue(item.translations?.[language]?.[field],language) || localizedValue(item[field],language);
      seo.keywords = (item.keywordsByLanguage?.[language] || item.keywords || []).filter(word => compatibleText(word,language));
      return [key,seo];
    }
    if (key === 'tags' && Array.isArray(item) && item.every(word => typeof word === 'string')) return [key,item.filter(word => compatibleText(word,language))];
    return [key,projectLanguage(item,language)];
  }));
}
// A partial language update must not replace an existing sibling or drop a legacy slot.
export function mergeLanguageFields(existing, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  if (Object.getPrototypeOf(patch) !== Object.prototype) return patch;
  if (isLocalized(patch)) return { ...(existing || {}), ...patch };
  return { ...(existing && typeof existing === 'object' ? existing : {}), ...Object.fromEntries(Object.entries(patch).filter(([,item]) => item !== undefined).map(([key,item]) => [key, Array.isArray(item) ? item.map((row,index) => mergeLanguageFields(row?._id ? existing?.[key]?.find?.(old => String(old?._id) === String(row._id)) : existing?.[key]?.[index], row)) : mergeLanguageFields(existing?.[key],item)])) };
}
