const DEFAULT_REFERENCE_BOOKS = [
  {
    slug: 'rs-aggarwal',
    title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'R.S. Aggarwal Solutions' },
    author: 'R.S. Aggarwal',
    publisher: 'Bharati Bhawan',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'सीबीएसई कक्षा 6 से 12 के लिए आर.एस. अग्रवाल गणित के अध्याय-वार और प्रश्नावली-वार विस्तृत हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for RS Aggarwal Mathematics Classes 6 to 12.',
    },
  },
  {
    slug: 'rd-sharma',
    title: { hi: 'आर.डी. शर्मा समाधान', en: 'R.D. Sharma Solutions' },
    author: 'Dr. R.D. Sharma',
    publisher: 'Dhanpat Rai Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'सीबीएसई बोर्ड परीक्षा और प्रतियोगी परीक्षाओं के लिए आर.डी. शर्मा गणित के संपूर्ण हल।',
      en: 'Comprehensive RD Sharma Mathematics solutions with all question steps, formulas, and proofs.',
    },
  },
  {
    slug: 'kc-sinha',
    title: { hi: 'के.सी. सिन्हा समाधान', en: 'K.C. Sinha Solutions' },
    author: 'Dr. K.C. Sinha',
    publisher: 'Students Friends / Rastogi Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'कक्षा 6 से 12 के विद्यार्थियों के लिए के.सी. सिन्हा गणित के संपूर्ण और विस्तृत चरणबद्ध हल।',
      en: 'Complete chapter-wise and exercise-wise step-by-step solutions for KC Sinha Mathematics Classes 6 to 12.',
    },
  },
  {
    slug: 'ml-aggarwal',
    title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'M.L. Aggarwal Solutions' },
    author: 'M.L. Aggarwal',
    publisher: 'Arya Publications',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    description: {
      hi: 'आईसीएसई / सीबीएसई गणित के लिए एम.एल. अग्रवाल अंडरस्टैंडिंग मैथमेटिक्स के हल।',
      en: 'Step-by-step solutions for ML Aggarwal Understanding Mathematics for middle and secondary classes.',
    },
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
