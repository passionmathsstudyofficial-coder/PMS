// Shared by the navbar and footer; an explicit empty API list stays empty.
export function getReferenceBooks(site) {
  const rawBooks = Array.isArray(site?.referenceBooks) ? site.referenceBooks : [];
  const bookMap = new Map();
  for (const book of rawBooks) {
    if (!book.slug) continue;
    const existing = bookMap.get(book.slug) || {};
    bookMap.set(book.slug, {
      ...existing,
      ...book,
      availableClasses: book.availableClasses?.length ? book.availableClasses : (Array.isArray(book.availableClasses) ? book.availableClasses : (existing.availableClasses || [])),
    });
  }
  return [...bookMap.values()].filter(book => book.isVisible !== false);
}

export const referenceBookUrl = book => `/reference-solutions/${book.slug}`;
