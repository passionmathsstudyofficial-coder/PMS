// Selection is derived from the URL, independently of dropdown and hover state.
export function isPathActive(target, current) {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return false;
  const base = 'https://navigation.local';
  const url = new URL(target, base);
  const location = new URL(current, base);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';
  return (currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`)))
    && url.search === location.search && url.hash === location.hash;
}

export function activeNavigationItem(items, current) {
  // Prefer the most specific destination; duplicate CMS URLs get one owner.
  return items.filter(item => item.isVisible !== false && isPathActive(item.url, current))
    .sort((a, b) => b.url.length - a.url.length)[0];
}
