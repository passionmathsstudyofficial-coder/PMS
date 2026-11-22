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

  // Always keep all 4 canonical reference books
  if (['ml-aggarwal', 'rd-sharma', 'rs-aggarwal', 'kc-sinha-maths'].includes(cleanSlug) ||
      ['ml-aggarwal', 'rd-sharma', 'rs-aggarwal', 'kc-sinha-maths'].includes(rawSlug)) {
    return false;
  }

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

export const CANONICAL_REF_TITLES = {
  'ml-aggarwal': { en: 'M.L. Aggarwal', hi: 'एम. एल. अग्रवाल' },
  'rd-sharma': { en: 'R.D. Sharma', hi: 'आर. डी. शर्मा' },
  'rs-aggarwal': { en: 'R.S. Aggarwal', hi: 'आर. एस. अग्रवाल' },
  'kc-sinha-maths': { en: 'K.C. Sinha Mathematics', hi: 'के. सी. सिन्हा गणित' },
};

export const CANONICAL_REF_ORDER = ['ml-aggarwal', 'rd-sharma', 'rs-aggarwal', 'kc-sinha-maths'];

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

  // Ensure all 4 canonical books exist in the map
  for (const slug of CANONICAL_REF_ORDER) {
    if (!bookMap.has(slug)) {
      bookMap.set(slug, {
        slug,
        title: CANONICAL_REF_TITLES[slug],
        author: slug === 'rd-sharma' ? 'Dr. R.D. Sharma' : slug === 'kc-sinha-maths' ? 'Prof. K.C. Sinha' : CANONICAL_REF_TITLES[slug].en,
        availableClasses: [6, 7, 8, 9, 10, 11, 12],
        isVisible: true,
        hasSolutions: true,
      });
    }
  }

  return CANONICAL_REF_ORDER
    .map((slug) => bookMap.get(slug))
    .filter((book) => book && book.isVisible !== false && !isExcludedReferenceBook(book));
}

export function getReferenceBookDisplayTitle(book, lang = 'en', t = null) {
  if (!book) return '';
  const canonical = CANONICAL_REF_TITLES[book.slug];
  if (canonical) {
    return lang === 'hi' ? canonical.hi : canonical.en;
  }
  const translated = t ? t(book.title) : '';
  const isInvalid = !translated || translated.includes('Content not available') || translated.includes('उपलब्ध नहीं') || translated.includes('सामग्री उपलब्ध नहीं');
  if (!isInvalid) return translated;
  const directHi = typeof book.title === 'object' ? book.title?.hi : '';
  const directEn = typeof book.title === 'object' ? book.title?.en : (typeof book.title === 'string' ? book.title : '');
  if (lang === 'hi' && directHi && !directHi.includes('उपलब्ध नहीं') && !directHi.includes('Content not available')) return directHi;
  if (directEn && !directEn.includes('Content not available') && !directEn.includes('उपलब्ध नहीं')) return directEn;
  return book.author || book.name || book.slug || '';
}

export const referenceBookUrl = book => `/reference-solutions/${book.slug}`;
