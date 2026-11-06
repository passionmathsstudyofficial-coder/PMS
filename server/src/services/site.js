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

export async function publicReferenceBooks(preview = false) {
  // Read configured entries even when private, so a hidden override suppresses its default menu entry.
  const dbBooks = await Book.find({ category: 'reference' })
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
      if (!preview && (b.status !== 'published' || !b.isVisible || !b.publishedAt || new Date(b.publishedAt) > new Date())) {
        allMap.delete(b.slug);
        continue;
      }
      const existing = allMap.get(b.slug) || {};
      allMap.set(b.slug, {
        ...existing,
        ...b,
        availableClasses: (b.availableClasses && b.availableClasses.length > 0)
          ? b.availableClasses
          : (b.class?.number ? [b.class.number] : []),
        url: `/reference-solutions/${b.slug}`,
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

    return {
      settings,
      terms,
      navigation,
      navigationConfigured: Object.fromEntries(NAV_KEYS.map(key => [key, navDocs.some(doc => doc.key === key)])),
      announcements: announcements.map(({ createdBy, updatedBy, ...rest }) => rest),
      classes,
      seoRoutes: Object.fromEntries(seoRoutes.map((r) => [r.routeKey, r])),
      adSlots,
      referenceBooks,
      academicSessions,
    };
  });
}
