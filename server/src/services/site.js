import { cache } from '../lib/cache.js';
import {
  AdSlot,
  Book,
  Announcement,
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
  const filter = preview ? { category: 'reference' } : { category: 'reference', isVisible: { $ne: false }, status: { $ne: 'draft' } };
  const dbBooks = await Book.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate({ path: 'coverImage', select: MEDIA_SELECT })
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
      const existing = allMap.get(b.slug) || {};
      allMap.set(b.slug, {
        ...existing,
        ...b,
        availableClasses: (b.availableClasses && b.availableClasses.length > 0)
          ? b.availableClasses
          : (existing.availableClasses || [6, 7, 8, 9, 10, 11, 12]),
        url: `/reference-solutions/${b.slug}`,
      });
    }
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

    const [navDocs, announcements, classes, terms, seoRoutes, adSlots, referenceBooks] = await Promise.all([
      Navigation.find({ key: { $in: NAV_KEYS } }).lean(),
      Announcement.find(Announcement.activeFilter()).sort({ sortOrder: 1 }).limit(3).lean(),
      publicClasses(),
      getTerms(),
      SeoSetting.find().populate({ path: 'ogImage', select: MEDIA_SELECT }).lean(),
      settings.ads?.enabled
        ? AdSlot.find({ isEnabled: true }).sort({ sortOrder: 1 }).select('name placement device pageTypes minHeightMobile minHeightDesktop').lean()
        : [],
      publicReferenceBooks(),
    ]);

    const navigation = Object.fromEntries(NAV_KEYS.map((key) => [key, []]));
    for (const nav of navDocs) {
      navigation[nav.key] = nav.items
        .filter((i) => i.isVisible)
        .map((i) => ({ ...i, children: (i.children || []).filter((c) => c.isVisible) }));
    }

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
    };
  });
}
