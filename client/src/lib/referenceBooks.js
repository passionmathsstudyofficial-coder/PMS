// Exclude standalone K.C. Sinha, NCERT Solutions, and Mathematics for Class 10 by R.D. Sharma.
// K.C. Sinha Mathematics is restored and preserved.
export const EXCLUDED_REFERENCE_BOOK_SLUGS = new Set([
  'kc-sinha', // standalone K.C. Sinha
  'mathematics-for-class-10-by-r-d-sharma',
  'ncert',
  'ncert-solutions',
  'ncert-mathematics-textbook-for-class-10',
]);

export function isExcludedReferenceBook(book) {
  if (!book) return true;
  const rawSlug = (book.slug || '').trim().toLowerCase();
  const cleanSlug = rawSlug.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Keep K.C. Sinha Mathematics!
  const en = (book.title?.en || (typeof book.title === 'string' ? book.title : '') || book.author || book.name || '').toLowerCase().trim();
  const hi = (book.title?.hi || '').toLowerCase().trim();

  const isKcSinhaMaths =
    cleanSlug === 'kc-sinha-maths' ||
    cleanSlug.includes('kc-sinha-math') ||
    en.includes('k.c. sinha mathematics') ||
    en.includes('kc sinha mathematics') ||
    hi.includes('के. सी. सिन्हा गणित') ||
    hi.includes('के.सी. सिन्हा गणित') ||
    hi.includes('के सी सिन्हा गणित');

  if (isKcSinhaMaths) {
    return false;
  }

  // Standalone K.C. Sinha is excluded
  if (
    cleanSlug === 'kc-sinha' ||
    rawSlug === 'kc-sinha' ||
    en === 'k.c. sinha' ||
    en === 'kc sinha' ||
    en === 'k.c. sinha solutions' ||
    en === 'kc sinha solutions' ||
    hi === 'के.सी. सिन्हा' ||
    hi === 'के. सी. सिन्हा' ||
    hi === 'के.सी. सिन्हा समाधान' ||
    hi === 'के.सी. सिन्हा हल'
  ) {
    return true;
  }

  if (EXCLUDED_REFERENCE_BOOK_SLUGS.has(rawSlug) || EXCLUDED_REFERENCE_BOOK_SLUGS.has(cleanSlug)) {
    return true;
  }

  // Mathematics for Class 10 by R.D. Sharma
  if (
    cleanSlug === 'mathematics-for-class-10-by-r-d-sharma' ||
    en.includes('mathematics for class 10 by r.d. sharma') ||
    en.includes('mathematics for class 10 by rd sharma')
  ) {
    return true;
  }

  // NCERT Solutions
  if (
    cleanSlug === 'ncert' ||
    cleanSlug === 'ncert-solutions' ||
    cleanSlug === 'ncert-mathematics-textbook-for-class-10' ||
    en === 'ncert solutions' ||
    en.includes('ncert solution') ||
    hi === 'ncert समाधान' ||
    hi === 'ncert हल'
  ) {
    return true;
  }

  return false;
}

// Shared by the navbar and footer; filters out excluded categories and preserves published classes.
export function getReferenceBooks(site) {
  const rawBooks = Array.isArray(site?.referenceBooks) ? site.referenceBooks : [];
  const bookMap = new Map();
  for (const book of rawBooks) {
    if (!book.slug || isExcludedReferenceBook(book)) continue;
    const existing = bookMap.get(book.slug) || {};
    bookMap.set(book.slug, {
      ...existing,
      ...book,
      availableClasses: book.availableClasses?.length
        ? book.availableClasses
        : (Array.isArray(book.availableClasses) ? book.availableClasses : (existing.availableClasses || [])),
    });
  }
  return [...bookMap.values()].filter(book => book.isVisible !== false && !isExcludedReferenceBook(book));
}

export const referenceBookUrl = book => `/reference-solutions/${book.slug}`;
