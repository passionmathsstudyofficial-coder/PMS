# Production repair evidence — 7 November 2026

## SSH follow-up — verified Hostinger staging

This section supersedes the earlier access/database/deployment unknowns below. **The production release has not been activated.**

- Connected directly through SSH on the supplied host and port, verifying the supplied ED25519 fingerprint. The existing user terminal was left untouched. No password is stored in this report or release files.
- Actual application root: `/home/u583042336/domains/passionmathstudy.in/hbuilds/current/nodejs`. `public_html` contains the Passenger configuration rather than the frontend build. Startup file: `server/src/index.js`; runtime: Node **22.23.4**. Billing-plan name remains unknown.
- Active release: `versions/01a1b371-32f6-7237-b1ac-f90da5c9457e`. Deployment logs and source checkout confirm GitHub `passionmathsstudyofficial-coder/PMS`, branch `main`, commit `623ffc058b107cf2d62b605a23e5a07541eea85f`.
- Read the actual running process environment privately and queried its database read-only. Production uses database **`test`**, and its Class 6 ID matches the live API. Local `.env` uses **`pms`**, confirming the configuration difference. Production database selection was preserved; no migration, database switch or content change was made.
- Production contains one configured reference book: `mathematics-for-class-10-by-r-d-sharma`, Class 10. Other synthetic menu books have no matching reference records. The repair does not fabricate the missing books/content.
- Existing configured credentials successfully authenticated through the real production login API: HTTP **200**, role **superadmin**, no second factor requested. This proves login, not CMS content persistence. No production content was edited.
- Copied the running release to separate staging directory `versions/codex-repair-20261107-0700/nodejs`, then overlaid the repair archive. The archive contains 190 source/build files and no environment file, credential, upload or dependency replacement. SHA-256: `fea9b22d8983c2ce9d9247cb77276e5f9b71ff49b93bb1c21168f223a9b76138`.
- Archive checksum and both changed backend files passed syntax checks under Hostinger's Node 22 runtime. Direct read-only content-service checks against the confirmed live database passed: bootstrap/hub catalog agreement, actual configured book/class, valid legacy NCERT destination, genuine missing-content 404s, homepage catalog agreement and repaired frontend asset availability. The live database offered no reference exercise/question in the sampled class result, so no production question-permalink success is claimed.
- Loopback HTTP tests in the SSH environment failed with `ECONNREFUSED`; they are not counted as passes. Direct service checks do not certify staging HTTP, mobile/browser rendering or production acceptance.
- The original release remains retained for rollback; `.htaccess` has a separate rollback copy. The `current` symlink still points to the original release. A live follow-up returned `/api/health` **200** and the broken legacy route **404**, confirming that live activation has not occurred.

Concrete activation plan: atomically switch `hbuilds/current` to `versions/codex-repair-20261107-0700`, request Passenger restart, verify the real HTTPS domain's assets/routes, then exercise temporary authorized CMS test records with cleanup. Rollback restores `current` to `versions/01a1b371-32f6-7237-b1ac-f90da5c9457e` and restarts Passenger. Runtime environment, database, uploads and hosting configuration remain unchanged. The supplied deployment prompt explicitly requires approval before a live deployment; activation awaits that approval.

Evidence: [downloaded Hostinger deployment plan and service-check results](../test-results/hostinger-deployment-plan.json), [local archive manifest](../test-results/hostinger-repair-manifest.json).

## Earlier audit status (before SSH access)

Local repairs and regression checks are complete for the defects listed below. **Production acceptance is NOT complete. No deployment or production content write was performed.** Hostinger account configuration, runtime database connection and authenticated admin workflows remain inaccessible. The live site still serves the failing build.

## Reproduction and root causes

1. The live `/reference-solutions/ncert/class-6` returns HTTP 404 and its resolver returns `Reference book not found`. A browser also rendered “Page not found”. The Express/Helmet response, working `/api/health` and application-specific resolver error establish an application/content failure; there is no evidence that this particular error needs an Apache SPA rewrite.
2. `server/src/services/site.js` formerly inserted five synthetic canonical books, renamed database slugs to aliases and expanded one/two configured classes to Classes 6–12. `resolveReferenceSolutionsPath` instead queries actual published `category: reference` records by exact slug. Menus and resolvers therefore advertised different entities. Live RD Sharma was advertised under `rd-sharma`, while the actual reference hub exposed `mathematics-for-class-10-by-r-d-sharma`.
3. `ReferenceBooksSection` independently restored canonical books and substituted titles/classes. This overrode CMS edits and visibility even when the saved record was correct. Footer/sidebar/default dropdowns generated additional unsupported book/class URLs.
4. Reference exercise resolution ignored the sixth segment, so a question permalink could return an exercise page and even an invented question could look successful. Paths beyond six segments were silently truncated. Both behaviors are corrected.
5. The configured local remote database and live public API have different Class 6 identities. This is evidence that local configuration cannot certify the live deployment; it does NOT prove that the deployed admin and public API use different databases. Both deployed interfaces must be compared using actual Hostinger runtime settings.
6. The live asset entry differs from both repository HEAD and the repaired build. The deployed commit cannot be identified without hosting deployment records. Asset differences alone do not establish the exact age of the deployment.

Code references: `site.js:45`, `publicContent.js:1076`, `publicContent.js:1164`, `publicContent.js:1246`, `publicContent.js:1439`, `Sections.jsx:236`, `Footer.jsx:58`, `StudySidebar.jsx:37`.

## Implemented behavior

- Menus, homepage book cards, footer book columns and sidebar consume actual published reference records. Exact slugs, saved titles, extra books and one/two-class configurations are preserved. Hidden/draft/archived/future books stay private. No educational record was deleted or seeded.
- Missing books are no longer invented. RS Aggarwal, RD Sharma, ML Aggarwal, KC Sinha and custom books remain supported when configured in the CMS. The repair does not create missing book chapters or solutions.
- The legacy NCERT class URL resolves to `/class-6/maths` only after that published destination resolves successfully. Direct HTML requests return 301; client API requests return a validated redirect. Missing classes/chapters remain genuine 404s. An actual configured reference book with slug `ncert` continues through its own reference hierarchy.
- Reference question URLs return the requested published question and its permitted solution, canonical URL, breadcrumbs and sibling navigation. Missing/draft questions and extra path segments return 404.
- Database schemas, authentication, permissions, rich editors and mathematical storage formats are preserved. No migration, production database modification, cache purge, DNS or `.htaccess` change was performed.

## Architecture and content lifecycle

React/Vite/React Router/TanStack Query frontend, TipTap and KaTeX; Express/Mongoose/MongoDB backend. `server/src/index.js` connects one Mongoose connection, initializes configured defaults and serves the client build plus API. `/api/content/*` aliases the same content router as `/api/*`. The private admin uses JWT/session records, CSRF and role permissions; drafts require authenticated previews.

Generic save routes in `server/src/services/crud.js` await document persistence, reload the saved record and invalidate public caches. `useEditorForm` awaits the API before reporting success and preserves the form after failed saves. Activity-log revisions synchronize process caches; the client polls revisions and listens to local save notifications. Existing regression coverage tests warmed-cache edits, public reads, publication rules and language preservation. No new evidence established a general persistence failure in these mechanisms.

Production runtime environment variables are unknown. Local `.env` claims production mode and connects remotely to database `pms`, but its Class 6 ID differs from the live API. Credentials and database URI are intentionally omitted. Read-only evidence: [database identity](../test-results/production-database-identity.json).

## Local test evidence

| Check | Result | Evidence |
|---|---|---|
| Backend suite | 122 passed, 0 failed, 0 skipped | [log](../test-results/production-server-tests.log) |
| Frontend suite | 51 passed, 0 failed, 0 skipped | [log](../test-results/production-client-tests.log) |
| New routing regressions | 4 passed; included in backend total | [focused log](../test-results/production-routing-tests.log) |
| Source bindings | 198 files, 0 unbound references | [log](../test-results/production-source-check.log) |
| Vite production build | Passed | [log](../test-results/production-build.log) |
| Language separation | 0 findings | [log](../test-results/production-languages.log) |
| Translation coverage | FAILED: 661 findings, identical count on unchanged HEAD | [current](../test-results/production-translations.log), [baseline](../test-results/baseline-translations.log) |

Tests use disposable local test databases and authorized fixture accounts; the configured remote database was inspected read-only. Existing backup tests exercise temporary test backups, not production backups. Frontend tests use DOM/Vite fixtures and do not certify real mobile touch/hover rendering. The existing mocked Playwright navigation script was updated but not executed; no all-device browser pass is claimed.

## CMS module coverage and limits

| Modules | Verified locally | Production |
|---|---|---|
| Classes, subjects, chapters, exercises, questions, topics | Authenticated create/update, saved/public reads, publication/privacy and language preservation | Authenticated verification blocked |
| Solutions/reference-book hierarchy | Stored math and methods, independent solution publication, session isolation; new question permalink checks | Blocked; live reference links fail |
| Books | CRUD, exact saved menu titles/slugs/classes, private/scheduled filtering and database readback | Blocked |
| Notes, important questions, pages | Published edits, formatted/math content, translation preservation, draft filtering and resolver workflows in suite | Blocked |
| Homepage sections, settings, navigation, announcements | Save/reload and warmed public cache revision checks in suite | Blocked |
| Media, resources, templates, related content, advertisements, videos | Existing API CRUD/access/document checks in suite | Authenticated verification blocked |
| SEO/footer settings | API partial-save/public-bootstrap regression coverage | Browser display of every setting not certified |
| Blog | No separate blog resource identified; a Page-based blog was not independently certified | Unverified |

No claim is made that every CMS screen or every failure mode was exercised in a real browser. In particular, custom footer navigation display remains only partially driven by settings, and all-module production CRUD acceptance remains outstanding.

## Live navigation and Hostinger audit

HTTP audit window: 2026-11-07T06:20:08.340Z to 2026-11-07T06:21:16.234Z (UTC). The crawler checked 160 distinct paths plus two origin/redirect requests: **112 HTTP 200, one HTTP 301, 49 HTTP 404**. One 404 is the deliberately nonexistent control; 48 are discovered broken destinations. The crawler exhausted its discovered queue without hitting its 180-path cap, but does not claim to discover all database URLs, paginated content or browser-only interactions.

| Surface | Observed live result |
|---|---|
| Homepage, health, site/home/revision APIs | HTTP 200 |
| NCERT Classes 6–12 `/class-N/maths` | All seven HTTP 200; content completeness not guaranteed |
| Class 6 browser content | “Coming soon”; 0 chapters, 0 exercises, 0 questions |
| Reference Books | Canonical synthetic hub/class links fail; real long-slug RD Sharma URL resolves only for its configured class |
| Important Questions | Discovered Class 9 and 10 routes HTTP 200 |
| Notes | Six discovered list/detail routes HTTP 200 |
| Header/footer menu interaction | Browser exposed the failing reference menu; entire mobile/keyboard matrix not certified |
| Entry-page assets | All 35 observed JS/CSS assets HTTP 200 |
| HTTP → HTTPS | HTTP 301 to HTTPS |
| www canonicalization | HTTPS www returns 200, not canonical redirect; remains to configure |
| TLS | HTTPS requests succeeded with standard certificate validation; full certificate installation/renewal audit unavailable |
| Cache | HTML `private, no-cache`; public APIs `public, no-cache`; revision/errors `no-store`; hashed assets immutable; hcdn reports dynamic responses in sampled requests |
| Actual hosting | Headers report Hostinger/hPanel/hcdn and application backend responses |
| Plan/document root/permissions/Node app configuration | Unknown without hPanel/SSH; do not assume `public_html` |

DNS snapshot (edge addresses can change and do not identify the origin document root):

- `passionmathstudy.in:A`: `["147.79.69.3", "88.222.243.116"]`
- `www.passionmathstudy.in:A`: `["91.108.106.54", "147.79.69.72"]`
- `passionmathstudy.in:AAAA`: `["2a02:4780:3d:abe:1f8f:41eb:462d:2dc9", "2a02:4780:20:bf3e:3484:2a6:872b:276a"]`
- `www.passionmathstudy.in:AAAA`: `["2a02:4780:1f:eed6:ce33:6e55:cc6a:3e7f", "2a02:4780:20:e299:eaf0:c84c:cdb7:b462"]`
- `passionmathstudy.in:NS`: `["horizon.dns-parking.com", "orbit.dns-parking.com"]`
- `www.passionmathstudy.in:NS`: `{"error": "ENODATA"}`
- `passionmathstudy.in:CNAME`: `{"error": "ENODATA"}`
- `www.passionmathstudy.in:CNAME`: `["www.passionmathstudy.in.cdn.hstgr.net"]`

Complete HTTP/DNS/asset evidence: [production-http.json](../test-results/production-http.json). The browser independently confirmed the specified 404, clicked the visible canonical NCERT Class 6 link and observed the empty-content state, then opened the reference menu and saw the five synthetic book links.

### Broken destination inventory

| URL path | HTTP | Resolver reason |
|---|---|---|
| `/reference-solutions/ncert/class-6` | 404 | Reference book not found |
| `/this-page-does-not-exist-audit` | 404 | Expected nonexistent control |
| `/secondary-school-mathematics-for-class-10-by-r-s-aggarwal` | 404 | Page not found |
| `/reference-solutions/ncert` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-7` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-8` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-9` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-10` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-11` | 404 | Reference book not found |
| `/reference-solutions/ncert/class-12` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-6` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-7` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-8` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-9` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-10` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-11` | 404 | Reference book not found |
| `/reference-solutions/rs-aggarwal/class-12` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-6` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-7` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-8` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-9` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-10` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-11` | 404 | Reference book not found |
| `/reference-solutions/rd-sharma/class-12` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-6` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-7` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-8` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-9` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-10` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-11` | 404 | Reference book not found |
| `/reference-solutions/ml-aggarwal/class-12` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-6` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-7` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-8` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-9` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-10` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-11` | 404 | Reference book not found |
| `/reference-solutions/kc-sinha/class-12` | 404 | Reference book not found |
| `/class-11/maths/adhyay-1/prashnavali-1-1` | 404 | Page not found |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-12` | 404 | This reference book is not configured for the selected class |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-11` | 404 | This reference book is not configured for the selected class |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-9` | 404 | This reference book is not configured for the selected class |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-8` | 404 | This reference book is not configured for the selected class |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-7` | 404 | This reference book is not configured for the selected class |
| `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-6` | 404 | This reference book is not configured for the selected class |

The invalid canonical book links and class-switcher combinations are corrected at their source locally. The stale configured footer URL `/secondary-school-mathematics-for-class-10-by-r-s-aggarwal` and `/class-11/maths/adhyay-1/prashnavali-1-1` need review against the actual production records; their intended destinations have not been invented or modified in a different database.

## Files changed

| File | Purpose |
|---|---|
| `server/src/services/site.js` | Removed invented book defaults, slug aliases, title overrides and inflated class lists. Public menu now uses published reference records and existing public classes; database query errors propagate. |
| `server/src/services/publicContent.js` | Verified legacy NCERT destinations, supported-class filtering, reference question templates with solutions/previous-next/SEO, and rejection of excess URL segments. |
| `client/src/lib/referenceBooks.js` | One catalog helper; missing or explicitly empty catalogs/classes do not fabricate entries. |
| `client/src/components/home/Sections.jsx` | Removed canonical-book reinsertion and title/class overrides; respects saved catalog and selected-language section copy. |
| `client/src/components/site/Footer.jsx` | Reference columns use configured books/classes; NCERT class links use public classes; legal links no longer rely on a fixed column index. |
| `client/src/components/site/StudySidebar.jsx` | Uses the live book catalog and supported class choices rather than hardcoded reference destinations. |
| `client/src/components/site/ReferenceBooksDropdown.jsx` | Removed class-list fallback from the desktop nested menu. |
| `client/src/components/site/ReferenceBooksMegaMenu.jsx` | Removed independent default books and invented class links. |
| `client/src/components/site/MobileMenu.jsx` | Removed invented class links from mobile reference navigation. |
| `client/src/components/content/QuestionCard.jsx` | Single-method heading presence checks the selected language, avoiding an empty heading based on another language. |
| `server/tests/production-routing.test.js` | Four new integration regressions cover saved book metadata/persistence, legacy NCERT destinations, question permalinks/publication, direct HTML loads and real API/HTML 404s. |
| `server/tests/audit.test.js` | Visibility regression creates a real published book instead of assuming a fabricated default exists; retains hidden/archived/draft assertions. |
| `client/tests/reference-books.test.js` | Explicitly tests empty catalogs and classes without fabricated defaults. |
| `client/tests/features.test.js` | Footer assertions require actual catalog links and reject hardcoded unavailable books. |
| `client/scripts/audit-navigation.mjs` | Supplies an explicit fixture catalog instead of relying on production fallbacks; this mocked browser script was not run in this audit. |
| `scripts/audit-production.mjs` | Reusable read-only DNS, redirect, asset and public URL/API crawl with JSON evidence and an explicit crawl cap. |
| `docs/translation-coverage.json` | Regenerated audit output; 661 findings also reproduced on unchanged HEAD. |

The tracked `client/dist` output was rebuilt, including `index.html` and content-hashed chunks. Removed chunk names are obsolete output from the previous build, not source or educational content deletion. All source/build status entries are listed in [change manifest](../test-results/production-change-manifest.txt).

## Deployment identity and next steps

Local starting commit: `623ffc058b107cf2d62b605a23e5a07541eea85f`. These fixes are uncommitted working-tree changes. Production commit/branch, repository and deployment logs remain unknown. Runtime used locally: Node v25.2.1. Select a Hostinger-supported runtime satisfying the project dependency engines and validate the build there.

Live entry: `/assets/index-YKnpt6Ee.js`. Repository HEAD entry: `/assets/index-BA30psZ7.js`. Repaired build entry: `/assets/index-CLXAZxY4.js`. A different bundle is not proof of an exact deployed commit.

Required access/information to finish:

1. Hostinger website dashboard with hosting plan, connected domain, Node application settings, actual app root/document root, startup/build commands and deployment logs; or SSH/SFTP access to the named application. No hPanel/SSH deployment credentials were found in project configuration.
2. Production runtime environment configuration, compared privately with the intended MongoDB cluster/database and deployment branch/commit. Do not paste secrets into this report.
3. An authorized production test admin account and disposable content records so every major module can be edited, verified in the actual database/public API/new student session, and restored.
4. Verified production backup and rollback artifact before any data migration. No migration is needed for the local code repair.

Safe deployment sequence after access and the requested deployment approval: confirm the actual Node deployment and runtime database; retain the live release and backup; build this revision in staging using the repository lockfiles; start the repository application (`npm start` from repository root) with the correct server environment and built `client/dist`; verify health and routes; deploy atomically using the configured Hostinger mechanism; rerun the HTTP audit plus browser/admin-to-student acceptance and compare deployed assets/commit. Do not upload only static frontend files over a functioning Node deployment, and do not overwrite `.htaccess`, secrets, uploads or database contents.

Outstanding acceptance items: production deployment; actual runtime database identity; all-module production CRUD/browser verification; comprehensive desktop/mobile/keyboard checks; missing Class 6 learning content; stale production CMS links; www canonical redirect; 661 existing translation audit findings; actual hosting plan/root/logs/backup/rollback verification. **The live website must not be described as repaired until these checks are completed.**
