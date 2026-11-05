const DEFAULT_REFERENCE_BOOKS = [
  {
    slug: 'rs-aggarwal',
    title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'R.S. Aggarwal Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'rd-sharma',
    title: { hi: 'आर.डी. शर्मा समाधान', en: 'R.D. Sharma Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'kc-sinha',
    title: { hi: 'के.सी. सिन्हा समाधान', en: 'K.C. Sinha Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    slug: 'ml-aggarwal',
    title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'M.L. Aggarwal Solutions' },
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
  },
];

// Shared by the navbar and footer; an explicit empty API list stays empty.
export function getReferenceBooks(site) {
  const rawBooks = Array.isArray(site?.referenceBooks) ? site.referenceBooks : DEFAULT_REFERENCE_BOOKS;
  const bookMap = new Map();
  for (const book of rawBooks) {
    if (!book.slug) continue;
    const existing = bookMap.get(book.slug) || {};
    bookMap.set(book.slug, {
      ...existing,
      ...book,
      availableClasses: book.availableClasses?.length ? book.availableClasses : (existing.availableClasses || [6, 7, 8, 9, 10, 11, 12]),
    });
  }
  return [...bookMap.values()].filter(book => book.isVisible !== false);
}

export const referenceBookUrl = book => `/reference-solutions/${book.slug}`;
