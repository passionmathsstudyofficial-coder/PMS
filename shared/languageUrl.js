export function languageUrl(path,language) {
  const url = new URL(path || '/', 'https://pms.invalid');
  url.searchParams.delete('lang');
  if (language === 'hi') url.searchParams.set('lang','hi');
  return url.pathname + url.search + url.hash;
}
