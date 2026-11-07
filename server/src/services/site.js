import { cache } from '../lib/cache.js';
import {
  AcademicSession,
  AdSlot,
  Book,
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
import { CANONICAL_REFERENCE_BOOKS } from './publicContent.js';
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

const ALIAS_BOOK_SLUGS = {
  'mathematics-for-class-10-by-r-d-sharma': 'rd-sharma',
  'secondary-school-mathematics-for-class-10-by-r-s-aggarwal': 'rs-aggarwal',
  'ncert-mathematics-textbook-for-class-10': 'ncert',
};

export async function publicReferenceBooks(preview = false) {
  // Read configured entries even when private, so a hidden override suppresses its default menu entry.
  const dbBooks = await Book.find({
    $or: [
      { category: 'reference' },
      { slug: { $in: ['ncert', 'rs-aggarwal', 'rd-sharma', 'kc-sinha', 'ml-aggarwal'] } },
    ],
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate([{ path: 'coverImage', select: MEDIA_SELECT }, { path: 'class', select: 'number' }])
    .lean();

  const allMap = new Map();
  for (const b of CANONICAL_REFERENCE_BOOKS) {
    allMap.set(b.slug, {
      ...b,
      availableClasses: b.classes || [6, 7, 8, 9, 10, 11, 12],
      url: `/reference-solutions/${b.slug}`,
    });
  }
  for (const b of dbBooks) {
    if (b.slug) {
      const cleanSlug = String(b.slug).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const targetSlug = ALIAS_BOOK_SLUGS[cleanSlug] || cleanSlug;
      if (!preview && (b.status !== 'published' || !b.isVisible || !b.publishedAt || new Date(b.publishedAt) > new Date())) {
        if (cleanSlug === targetSlug) {
          allMap.delete(targetSlug);
        }
        continue;
      }
      const existing = allMap.get(targetSlug) || {};
      const isCanon = CANONICAL_REFERENCE_BOOKS.some((c) => c.slug === targetSlug);
      const preserveCanonTitle = isCanon && (
        !b.title?.en ||
        b.title.en.includes('Class 10') ||
        b.title.en.includes('Class 12')
      );

      const coverUrl = (b.coverUrl && !b.coverUrl.includes('media-amazon.com')) ? b.coverUrl : '';

      allMap.set(targetSlug, {
        ...existing,
        ...b,
        slug: targetSlug,
        coverUrl: coverUrl || existing.coverUrl,
        title: (isCanon && preserveCanonTitle) ? existing.title : (b.title || existing.title),
        availableClasses: (b.availableClasses && b.availableClasses.length >= 3)
          ? b.availableClasses
          : (existing.availableClasses || (b.class?.number ? [b.class.number] : [6, 7, 8, 9, 10, 11, 12])),
        url: `/reference-solutions/${targetSlug}`,
      });
    }
  }

  const chapterFilter = preview ? {} : Chapter.publicFilter();
  const chapterCounts = await Chapter.aggregate([
    { $match: chapterFilter },
    { $group: { _id: '$book', count: { $sum: 1 } } },
  ]).catch(() => []);
  const countByBookId = new Map(chapterCounts.map((c) => [String(c._id || ''), c.count]));

  for (const book of allMap.values()) {
    let count = 0;
    if (book._id) {
      count = countByBookId.get(String(book._id)) || 0;
    }
    if (book.slug === 'ncert') {
      count += countByBookId.get('') || 0;
    }
    book.chapterCount = count;
  }

  return Array.from(allMap.values()).filter((b) => b.isVisible !== false);
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
