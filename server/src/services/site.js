import { cache } from '../lib/cache.js';
import {
  AcademicSession,
  AdSlot,
  Book,
  BookClass,
  Announcement,
  Chapter,
  ClassLevel,
  Navigation,
  NAV_KEYS,
  SeoSetting,
  SiteSettings,
  Subject,
} from '../models/index.js';
import { MEDIA_SELECT } from './populate.js';
import { getTerms } from './terms.js';
import { urls } from './urls.js';

export async function publicClasses(preview = false) {
  const filter = preview ? {} : ClassLevel.publicFilter();
  const classes = await ClassLevel.find(filter)
    .sort({ sortOrder: 1, number: 1 })
    .select('number name slug description badge highlights featured subjects thumbnail')
    .populate({ path: 'thumbnail', select: MEDIA_SELECT })
    .lean();
  const subjectIds = [...new Set(classes.flatMap((c) => c.subjects.map(String)))];
  const subjects = await Subject.find({
    _id: { $in: subjectIds },
    ...(preview ? {} : { ...Subject.publicFilter(), isPublic: true }),
  })
    .select('name slug icon sortOrder')
    .sort({ sortOrder: 1 })
    .lean();
  const byId = new Map(subjects.map((s) => [String(s._id), s]));
  return classes.map((c) => {
    const list = c.subjects.map((id) => byId.get(String(id))).filter(Boolean);
    return {
      ...c,
      url: list.length === 1 ? urls.subject(c, list[0]) : urls.class(c),
      subjects: list.map((s) => ({ _id: s._id, name: s.name, slug: s.slug, icon: s.icon, url: urls.subject(c, s) })),
    };
  });
}

const EXCLUDED_REF_SLUGS = new Set([
  'kc-sinha', // standalone K.C. Sinha only
  'mathematics-for-class-10-by-r-d-sharma',
  'ncert',
  'ncert-solutions',
  'ncert-mathematics-textbook-for-class-10',
]);

function isExcludedRefBook(book) {
  if (!book) return true;
  const rawSlug = (book.slug || '').trim().toLowerCase();
  const cleanSlug = rawSlug.replace(/[\u200B-\u200D\uFEFF]/g, '');

  const en = (book.title?.en || (typeof book.title === 'string' ? book.title : '') || book.author || '').toLowerCase().trim();
  const hi = (book.title?.hi || '').toLowerCase().trim();

  // Keep K.C. Sinha Mathematics!
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

  if (EXCLUDED_REF_SLUGS.has(rawSlug) || EXCLUDED_REF_SLUGS.has(cleanSlug)) return true;

  if (
    cleanSlug === 'mathematics-for-class-10-by-r-d-sharma' ||
    en.includes('mathematics for class 10 by r.d. sharma') ||
    en.includes('mathematics for class 10 by rd sharma')
  ) {
    return true;
  }

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

export async function publicReferenceBooks(preview = false) {
  // Use the same records, slugs and class constraints as the public resolver.
  const books = await Book.find(preview ? { category: 'reference' } : Book.publicFilter({ category: 'reference' }))
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate([{ path: 'coverImage', select: MEDIA_SELECT }, { path: 'class', select: 'number' }])
    .lean();
  const classes = await ClassLevel.find(preview ? {} : ClassLevel.publicFilter()).select('number').lean();
  const numbers = new Set(classes.map(cls => cls.number));
  const entries = await BookClass.find(preview ? {} : BookClass.publicFilter()).populate('class', 'number slug').sort({ sortOrder: 1 }).lean();
  const managedBooks = new Set((await BookClass.distinct('book')).map(String));
  const counts = await Chapter.aggregate([
    { $match: preview ? {} : Chapter.publicFilter() },
    { $group: { _id: '$book', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map(row => [String(row._id), row.count]));
  return books
    .filter(book => book.slug && !isExcludedRefBook(book))
    .map(book => {
      const bookEntries = entries.filter(entry => String(entry.book) === String(book._id) && numbers.has(entry.class?.number));
      const availableClasses = managedBooks.has(String(book._id))
        ? bookEntries.map(entry => entry.class.number)
        : (book.availableClasses?.length ? book.availableClasses : [6, 7, 8, 9, 10, 11, 12]).filter(number => numbers.has(number));
      const classRecords = bookEntries.length > 0
        ? bookEntries.map(entry => ({ ...entry, number: entry.class.number, url: `/reference-solutions/${book.slug}/${entry.slug}` }))
        : availableClasses.map(num => ({ number: num, slug: `class-${num}`, url: `/reference-solutions/${book.slug}/class-${num}` }));

      return {
        ...book,
        classRecords,
        availableClasses,
        url: urls.referenceBook(book),
        chapterCount: byId.get(String(book._id)) || 0,
      };
    });
}

export async function getSiteBootstrap() {
  await cache.sync();
  return cache.wrap('site', 60_000, async () => {
    const settingsDoc = await SiteSettings.getSingleton();
    await settingsDoc.populate([
      { path: 'brand.logo', select: MEDIA_SELECT },
      { path: 'brand.footerLogo', select: MEDIA_SELECT },
      { path: 'brand.favicon', select: MEDIA_SELECT },
      { path: 'seo.defaultOgImage', select: MEDIA_SELECT },
      { path: 'whatsappBanner.icon', select: MEDIA_SELECT },
    ]);
    const settings = settingsDoc.toObject();
    delete settings.updatedBy;
    delete settings.__v;

    const [navDocs, announcements, classes, terms, seoRoutes, adSlots, referenceBooks, sessions] = await Promise.all([
      Navigation.find({ key: { $in: NAV_KEYS } }).lean(),
      Announcement.find(Announcement.activeFilter()).sort({ sortOrder: 1 }).limit(3).lean(),
      publicClasses(),
      getTerms(),
      SeoSetting.find().populate({ path: 'ogImage', select: MEDIA_SELECT }).lean(),
      settings.ads?.enabled
        ? AdSlot.find({ isEnabled: true }).sort({ sortOrder: 1 }).select('name placement device pageTypes minHeightMobile minHeightDesktop updatedAt').lean()
        : [],
      publicReferenceBooks(),
      AcademicSession.find({ isActive: true }).sort({ sortOrder: 1, year: -1 }).lean(),
    ]);

    const navigation = Object.fromEntries(NAV_KEYS.map((key) => [key, []]));
    for (const nav of navDocs) {
      navigation[nav.key] = nav.items
        .filter((i) => i.isVisible)
        .map((i) => ({ ...i, children: (i.children || []).filter((c) => c.isVisible) }));
    }

    const defaultSessions = [
      { name: '2026–27', slug: '2026-27', year: 2026, isCurrent: true, isActive: true },
      { name: '2025–26', slug: '2025-26', year: 2025, isCurrent: false, isActive: true },
      { name: '2024–25', slug: '2024-25', year: 2024, isCurrent: false, isActive: true },
    ];
    const academicSessions = sessions?.length ? sessions : defaultSessions;

    const defaultAnnouncement = {
      badge: { hi: 'नया सत्र 2026-27', en: 'NEW SESSION 2026-27' },
      text: {
        hi: 'नए शैक्षणिक सत्र 2026-27 में आपका स्वागत है! नए सत्र की सभी कक्षाएं और स्टडी मटेरियल अब उपलब्ध हैं।',
        en: '"Dear students, welcome to the new academic session 2026-27! New content and study materials are now available."',
      },
      linkLabel: { hi: 'शुरू करें →', en: 'Start Learning →' },
      linkUrl: '/#classes',
      variant: 'brand',
      isVisible: true,
    };

    const cleanAnnouncements = announcements
      .filter((a) => (a.text?.en && a.text.en.trim() && !a.text._translationMissing) || (a.text?.hi && a.text.hi.trim()))
      .map(({ createdBy, updatedBy, ...rest }) => rest);

    const effectiveAnnouncements = cleanAnnouncements.length > 0 ? cleanAnnouncements : [defaultAnnouncement];

    return {
      settings,
      terms,
      navigation,
      navigationConfigured: Object.fromEntries(NAV_KEYS.map(key => [key, navDocs.some(doc => doc.key === key)])),
      announcements: effectiveAnnouncements,
      classes,
      seoRoutes: Object.fromEntries(seoRoutes.map((r) => [r.routeKey, r])),
      adSlots,
      referenceBooks,
      academicSessions,
    };
  });
}
