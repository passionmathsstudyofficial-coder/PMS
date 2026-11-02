// Legacy text is retained verbatim. Preserve both versions when a language field already contains different text.
export function mapLegacyLanguages(value) {
  if (Array.isArray(value)) return value.map(mapLegacyLanguages);
  if (!value || typeof value !== 'object' || value instanceof Date || Object.getPrototypeOf(value) !== Object.prototype) return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapLegacyLanguages(item)]));
  // Keep unassigned legacy copy in `mixed` for editorial migration. Never append it to an authored slot.
  if (result.languageMode === 'mixed') result.languageMode = 'auto';
  if (result.type === 'mixedText') result.type = 'text';
  if (result.default === 'mixed') result.default = 'hi';
  return result;
}
