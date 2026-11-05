# PMS production readiness audit — 5 November 2026

## Verdict

**NOT PRODUCTION READY — critical release verification remains incomplete.**

Security and functionality fixes are implemented and tested locally. They have **not** been deployed to `https://passionmathstudy.in/`. Live public reads were verified, but production admin authentication failed with the configured account. Hosting deployment access has not been identified. These are release blockers, not a claim that the local build failed.

This is an evidence-based partial certification: opening a module is recorded as inspection, never as a complete workflow pass. A create/edit/publish/unpublish/archive/delete browser matrix for every module and every control remains incomplete. Production admin CRUD, production recovery emails, production backup restoration, hosting logs, and measured Core Web Vitals are not certified.

## A. Automated results

| Validation | Observed result |
|---|---|
| Entire backend suite, including API/integration/auth/security/content/media/documents/backup tests | **96 passed, 0 failed, 0 skipped** |
| Expanded CMS audit | **37 passed**; included in the backend total, not an additional 37 |
| Frontend suite after all fixes | **41 passed, 0 failed, 0 skipped** |
| Production Vite build | Passed; final bundle built locally |
| Client source syntax and unbound-reference check | **174 files, 0 unbound references** |
| Server/API/shared JavaScript syntax | **107 files, 0 failures** |
| Interface translation audit | **0 unresolved findings** |
| Public language-separation audit | **0 findings** |
| Production dependency audit (`npm audit --omit=dev`) | **0 known vulnerabilities** at the time checked |
| TypeScript type checking | Not applicable: this is JavaScript/JSX; no TypeScript configuration exists |
| ESLint | Not configured/installed. A source binding check was added; it is not a full ESLint substitute |

The backend had 87 tests at the start of this continuation, including the 37 audit tests. Nine readiness regressions increased that to 96. The previously reported 85-test run preceded two additional audit cases. Frontend coverage increased from 35 to 41. No failing tests were removed or skipped. Early harness failures (missing jsdom globals and timer cleanup) and a missing modal ARIA attribute were investigated and corrected before the final passing run.

Reproduce from the repository root:

```powershell
npm test
npm test --prefix client
npm run check:source --prefix client
npm run check:translations --prefix client
npm run check:languages --prefix client
npm run build --prefix client
```

## Architecture and deployment inspection

- Frontend: React 19, Vite 8, React Router, TanStack Query, Tailwind 4, TipTap, KaTeX, Radix UI, Framer Motion/GSAP. Admin pages are lazy loaded.
- Backend: Express 5 and Mongoose/MongoDB. Generic content CRUD is combined with dedicated settings, media, auth, student, document, backup and public resolver routes.
- Admin authentication: signed HS256 JWT in an httpOnly cookie plus MongoDB session records, CSRF tokens, explicit origin checks, idle and absolute expiry, role permissions and TOTP.
- Student authentication uses separate accounts, cookies and session records. Student sessions do not grant admin permissions.
- Storage: Cloudinary or local disk. The disposable browser fixture used local disk; configured remote environment selected Cloudinary.
- Cache freshness: write invalidation, persisted activity revision, public revalidation headers and client refresh notifications/polling. Advertisement iframe revisions now change after edits.
- Production-capable entry point: `server/src/index.js` serves the built client and API together. Vercel API adapters also exist, but do not by themselves provide persistent uploads, backup files or a long-running scheduler.
- Live responses identify the edge server as `hcdn`; the actual hosting account/origin deployment was not available. No assumption was made that one of the unrelated accessible Vercel projects owned this domain.
- Live frontend entry `/assets/index-DtVpioWU.js` differs from the newly built release. Local success does not prove the fixes exist on the domain.
- No TODO/FIXME or explicit unimplemented markers were found in the initial source scan. The site contains intentional fallback content and example UI; that is not proof of a live AI tutor or a downloadable PDF.

## B. Admin module verification matrix

“API verified” means requests were made against the running Express app with an isolated MongoDB database and meaningful response/persistence assertions. Browser actions below used a disposable local database and the built frontend. **Live admin workflows remain blocked for every row.**

| Module | Main API / student surface | Actual local browser coverage | Automated coverage / limitation |
|---|---|---|---|
| Dashboard | `/api/dashboard` | Loaded real fixture counts and recent activity | Counts/activity verified |
| Classes | `/api/classes`, public class/subject pages | Edited name, saved, refreshed and confirmed persistence | Creation, publication, ordering, deletion protections, anonymous edits |
| Subjects | `/api/subjects` | Edited description, saved and refreshed | Private subject list/detail protection and parent visibility |
| Chapters | `/api/chapters`, public chapter pages | Edited title, saved, refreshed; changed title observed in student question context | Hierarchy, public reads, search, protected deletion |
| Exercises | `/api/exercises` | Edited title, saved and refreshed | Video language fields, scheduling, ordering, resolver and pagination |
| Questions | `/api/questions` | Edited question text, saved and refreshed; observed exact changed question on student page | Draft/published/scheduled/preview/delete flows and permissions |
| Solutions | Saved with questions; `/api/solutions` | Changed formula to `x=5-2=3`, saved, refreshed and observed correct student KaTeX output | Block ordering, sanitization, independent language preservation, published-write restrictions |
| Pages | `/api/pages`, `/api/public/resolve` | Created, edited, saved, refreshed, published, checked public text, unpublished, checked 404, republished, canceled deletion, confirmed deletion, checked 404 | Repeated cache-warmed edits and language preservation |
| Topics | `/api/topics` | Edited title, saved and refreshed | CRUD, relationships, preview, anonymous updates |
| Notes | `/api/notes` | Edited title, saved and refreshed | CRUD, exact public content edits, attachments and visibility |
| Important questions | `/api/important-questions` | Edited rich question text, saved and refreshed | CRUD, anonymous text changes and language ownership |
| Books/reference books | `/api/books`, reference menus/hubs | Reproduced and fixed editor crash; edited title and SEO, saved, refreshed; observed updated student book title | Publication, archived/hidden/scheduled defaults, both route aliases and localized SEO regressions |
| PDFs/resources | `/api/resources`, protected file routes | Edited title, saved and refreshed | Real PDF/DOC/DOCX upload/download and parent-publication checks; browser download matrix not exhaustive |
| Templates | `/api/templates` | Edited name, saved and refreshed | CRUD and solution template blocks; admin-only data |
| Homepage | `/api/sections`, `/api/public/home` | Edited section heading, saved, refreshed; observed changed student homepage heading | Reorder, hide, duplicate and warmed-cache refresh assertions |
| Announcements | `/api/announcements`, site bootstrap | Edited text, saved and refreshed; inspected corrected visibility/scheduling controls | Active/date visibility, CRUD, public refresh and detail access protection |
| Website settings | `/api/site-settings` | Tabs/forms inspected | Partial saves preserve unrelated settings; bootstrap refresh verified |
| Header | Settings plus `/api/navigation/header` | Fixed shared editor crash; edited search placeholder, saved and refreshed | Toggles, URL validation, configured label and ordering tests |
| Footer | Settings/footer navigation | Edited footer description, saved and refreshed; observed exact text on student website | Explicitly empty footer menus no longer restore default links |
| Navigation menus | `/api/navigation/:key` | Shared editor inspected and load failure repaired | Ordering, children, visibility and persistence tested; every drag/drop interaction not certified |
| Media | `/api/media` | Uploaded a real image with title/alt metadata and confirmed it remained after reload | Byte checks, SVG sanitization, metadata, replace and deletion protection |
| Diagrams/graphs | Filtered media library | Library/filter screen inspected | Media validation and rich-content rendering tested; graph authoring is not a separate verified editor |
| Videos | `/api/videos` | Edited title, saved and refreshed | YouTube validation, CRUD, use references and language-specific exercise videos |
| SEO | SEO settings/audit and entity metadata | SEO screen inspected; book SEO edited and persisted | Per-language metadata, canonical, HTML response, sitemap and book resolver tests |
| Search configuration | Header/homepage placeholders, search SEO | Header placeholder edited; search controls inspected | Search/suggestion language and content assertions; no separate search-engine configuration module exists |
| Language/terminology | Site settings and localized content | Language screen inspected; student formula rendering observed | Interface audit, independent admin preference, strict selected-language projection |
| Related content | `/api/related-content` | Screen inspected | CRUD and resolved related content tested; complete browser authoring not certified |
| Ad spaces | `/api/ad-slots`, `/api/public/ad-frame/:id` | Screen inspected | Owner code restriction, edit/disable behavior, cache headers and changing iframe URL tests |
| Students | `/api/students`, `/api/student/auth` | Empty isolated student list inspected | Registration, login/logout, deactivation, session revocation and admin isolation |
| Admin accounts/roles | `/api/admins` | Owner/editor fixture accounts; admin list inspected | Account creation, password policy, self-protection and forbidden editor actions |
| Account/security | `/api/auth/*` | Login worked locally; password/2FA/session controls inspected | TOTP enrollment/login, reset tokens, CSRF, rate limiting, expiry, logout and secure flags tested. No production credential changed |
| Activity logs | `/api/activity-logs` | Screen inspected | Content changes and security events recorded; dashboard reflects changes |
| Backups/restore | `/api/backups` | Created and verified archive; restored **18 collections**; observed automatic pre-restore safety backup | Full restore and owner restrictions tested separately. Production restore was not attempted |

## C. Student-facing synchronization

Public API assertions cover exact saved values for all 11 main publishable content resources, warm caches before writes, preserve the untouched language, verify revisions change, and check draft/archived/scheduled/parent visibility. Additional tests cover homepage sections, announcements, navigation, settings and ads.

Browser observations confirmed changed page text, homepage heading, footer description, book title, question text and mathematical solution. The page lifecycle included inaccessible-after-unpublish and inaccessible-after-delete checks. A browser refresh confirmed saved values in the other editors described above.

Local and live responsive samples used these **actual measured Edge viewport sizes**: 390×844, 360×800, 768×1024, 1366×768 and 1920×1080. The sampled local question page and live homepage had no document-wide horizontal overflow, no observed broken loaded images and no KaTeX errors. These are viewport emulations, not physical Android/iPhone or Safari tests, and do not cover every page. A clipped mobile control was found despite no document-wide overflow, fixed, and then directly tested.

Evidence: [responsive measurements](verification/production-2026-11-05/responsive-results.json), [browser actions](verification/production-2026-11-05/browser-evidence.json), [local desktop](verification/production-2026-11-05/student-desktop.png), [local phone](verification/production-2026-11-05/student-android.png). The first iPhone screenshot capture was scaled incorrectly by the capture tool and is excluded; the measured 390-pixel viewport result is retained.

To reproduce the disposable browser environment after building, run `node server/tests/browser-fixture.mjs` from the repository root. It creates a dedicated local test database and uses local temporary storage; it does not seed or reset the production database. Stop it after testing. Test account details are confined to the existing test helper and fixture source.

## D. Bugs fixed locally

| Finding / root cause | Implemented correction | Regression evidence |
|---|---|---|
| Required-2FA sessions gained private read privileges through optional authentication | Pending enrollment sessions are treated anonymously on public/optional-auth routes; role middleware also checks enrollment | Draft list/detail and preview denied while enrollment endpoints remain available |
| CSRF origin authorization trusted request-supplied host/forwarding headers | Origins must match explicit configured origins/site origin | Forged forwarding-host login test denied |
| Private subjects were exposed by generic public subject routes | Enforce `isPublic` in anonymous list and detail reads | Private subjects absent and return 404; authorized CMS read remains allowed |
| Hidden/future announcements could be read through direct IDs | Apply public filters and visibility to anonymous detail reads | Hidden and future announcements return 404 |
| Archived/scheduled reference books and hidden defaults could reappear through independent menu/hub fallbacks | Suppress private overrides in both bootstrap and route resolver; unknown/private book URLs return 404; frontend honors empty/filtered book lists | Both reference route aliases and publication states tested |
| Empty footer menus restored hardcoded default links | Respect configured empty footer and footer-bottom menus | Actual footer render regression |
| Ad frame responses remained browser-cacheable; already loaded frames retained old URLs | Revalidate responses, include `updatedAt` in bootstrap, version iframe URL, use configured API base | Backend edit/disable test plus frontend revision URL regression |
| Lazy editor defaults were stored as functions | Evaluate defaults once and use the resulting object for form/baseline | Hook regression asserts values, initial clean state and dirty tracking |
| Existing book editor crashed before data arrived | Guard pre-load available-class access | Uncached pending/new editor test and real-browser recheck |
| Book SEO used unsupported fields/dotted state keys; reference resolver ignored custom SEO | Use shared schema-compatible SEO controls and `seoFor` in the book hub | Browser save/reload plus English/Hindi public resolver regression |
| New book/resource defaults were published, so an editor's normal save could be forbidden | Start new records as drafts | New editor defaults checked; role restrictions preserved |
| Announcement form evaluated missing data before its gate, lacked a new-record base path and displayed unsupported status actions | Defer editor rendering, configure base path, use visibility/start/end fields and remove false status controls | Actual editor regression and browser save/reload |
| Shared header/footer editor referenced an unimported icon, crashing several routes | Import `Sparkles`; add a source binding check | Source audit detects original failure; fixed editor used to save header/footer values |
| Interface audit found untranslated/bilingual literal UI copy | Add reviewed English/Hindi entries and route literal copy through translation helpers; exempt only literal URL patterns | Translation and language separation checks pass |
| Mobile header clipped its menu control because branding and controls both refused to shrink | Allow brand text to truncate while preserving logo and control space | Real phone-sized button bounds and open-drawer check |
| Custom mobile drawer lacked modal focus handling and Escape dismissal | Use existing Radix modal primitives with a named dialog and modal semantics | Browser open/Escape check and frontend keyboard regression |

## E. Security and operations findings

- Local regression coverage includes JWT/session separation, idle and absolute session expiry, secure/httpOnly/SameSite cookie flags, CSRF and origin enforcement, TOTP, role checks, MongoDB operator injection rejection, file byte/type validation, XSS sanitization and login rate limiting with the normal test bypass disabled.
- This application does not use SQL. MongoDB operator injection is the relevant injection surface tested; no unsupported “SQL injection certified” claim is made.
- The configured remote database answered a ping. Read-only metadata inspection found **29 model collections**, no missing model collections and no missing expected unique index keys. No destructive migration or index rebuild was run. This does not prove every historical record matches today's schema.
- Local environment inspection found production mode combined with localhost public origins, 2FA disabled, automatic backup scheduling disabled and password-reset email credentials absent. These observations apply to the local configuration; **the deployed environment is not assumed identical**.
- Live HTTPS responses include HSTS/CSP. Untrusted-origin health requests did not receive an allow-origin header. Anonymous admin/session endpoints returned 401.
- Secrets were not printed into the report. Real student records were not used as fixtures. Production CMS content was not created, overwritten or deleted. One unsuccessful production login attempt was made; ordinary security logging/failed-attempt accounting may record it.
- Static JavaScript/source checks cannot establish that an application has no vulnerabilities. Production logging, monitoring, alerting, credential rotation history, mail delivery and backup retention were not verified.

## F. Live verification and deployment status

| Surface | Observed result |
|---|---|
| `https://passionmathstudy.in/` | 200; rendered in browser; live responsive samples recorded |
| `/api/health` | 200, JSON health response |
| `/api/public/site?lang=en` | 200; seven public classes |
| `/api/public/home?lang=en` | 200; homepage sections returned |
| `/api/public/revision` | 200; revision present |
| `/api/auth/me`, `/api/admins`, `/api/classes?scope=admin` without login | 401 |
| `/robots.txt`, `/sitemap.xml` | 200; correct production domain in sitemap references |
| `/class-10/maths`, `/about-us`, `/contact`, `/privacy-policy`, `/terms-and-conditions` | 200 |
| Footer R.S. Aggarwal link `/secondary-school-mathematics-for-class-10-by-r-s-aggarwal` | **404 — unresolved live content/navigation issue** |
| Production admin login | Configured credentials rejected; user sign-in requested; no repeated guessing |
| Production deployment of this work | **Not performed**; owning host/project/SSH or pipeline access unavailable |
| Live verification of patched build | **Not performed** |

The live homepage also displays “Content not available in English” in announcement/CTA copy. Some authored English fields are missing. This should be completed in the CMS, preserving existing Hindi content; no automatic translation or production overwrite was performed.

Live checks and HTTP timings are recorded in [live-readonly.json](verification/production-2026-11-05/live-readonly.json). These short request timings are not Core Web Vitals or a load test.

## G. Remaining issues and release steps

| Severity / gate | Required action |
|---|---|
| **High — release blocker** | Identify the hosting account/project and deploy the patched frontend **and** backend. The currently live asset hash is older |
| **High — verification blocker** | Sign into production using a valid isolated admin test account; finish the authenticated workflow matrix without touching real student records |
| **High — operations verification** | Verify deployed origins, TLS/proxy/cookie behavior, 2FA enrollment/enforcement, reset-email delivery, durable backups and monitoring. Local settings are not proof of host settings |
| **Medium — confirmed live defect** | Repair the R.S. Aggarwal footer/bottom navigation target and verify its destination. This is existing CMS data; production access is required |
| **Medium — content quality** | Supply missing English announcement/CTA copy through the CMS while preserving Hindi |
| **Medium — test coverage gate** | Complete creation, archive/schedule, deletion, modal/dropdown/filter/pagination/reorder and public visibility browser tests for every applicable module. Only the actions in the module table are certified |
| **Medium — performance gate** | Connect Chrome DevTools tracing and measure LCP/INP/CLS/mobile CPU/network behavior; complete broader keyboard/contrast/screen-reader testing |
| **Medium — storage gate** | Verify Cloudinary image/document/video upload and download on the deployed environment with disposable files. Local disk and API fixtures do not certify deployed delivery |
| **Low — test environment** | Node emits a non-fatal `--localstorage-file` warning during language tests; tests pass |

Deployment sequence once the real host is available:

1. Use the current owning host/pipeline and an isolated staging release. Do not create an unrelated Vercel project or reset/seed production.
2. Take and verify an external production backup through the authorized operations process. Preserve current environment files, uploads and backup storage.
3. Build from the repository root with `npm ci --include=dev` and `npm run build --prefix client`; run the validation commands above. Review and deploy the changed source plus the built `client/dist`, server and shared modules.
4. Verify host-injected configuration: `NODE_ENV=production`, `PUBLIC_SITE_URL=https://passionmathstudy.in`, exact authorized `CLIENT_ORIGINS`, matching client/server admin path, existing secret values, correct MongoDB/Cloudinary bindings and proxy settings. Enroll the owner before requiring 2FA. Configure the recovery-email provider and durable backup destination/schedule. Never copy test credentials or the disposable fixture into production startup.
5. For the existing combined Node architecture, run/restart `npm start --prefix server` under the host's process manager. Keep the existing DNS/domain/proxy mapping. Use an atomic release/rollback path so already-open pages do not reference deleted hashed assets.
6. Verify public/API/domain connectivity, correct new asset hash, admin login/session persistence, upload/download, harmless isolated CMS edits and public synchronization, drafts/archives/schedules, sitemap/metadata, logs and backup creation. Do not restore over production just to test restoration; rehearse on a separate staging database.
7. If the actual host is serverless, first provide durable storage/scheduling and a supported large-upload flow. Vercel's [documented request/response payload limit](https://vercel.com/docs/functions/limitations) is 4.5 MB; the existing larger multipart/video routes are not automatically compatible. Cookie/proxy setup must match the host, as described in the [Express production security guidance](https://expressjs.com/en/advanced/best-practice-security/).
8. Rerun the missing browser/performance gates and issue a new verdict only after the patched live application is verified.

The [web-performance skill](C:/Users/Sharv/.codex/skills/web-perf/SKILL.md) states: “If unavailable, STOP—the chrome-devtools MCP server isn't configured.” The required trace tools were absent, so no Lighthouse/Core Web Vitals result was invented. Add the `chrome-devtools-mcp` server to enable that remaining audit.

## H. Final decision

**NOT PRODUCTION READY** until the patched release is deployed, production admin access works, and the remaining critical operational/browser checks are verified. The local fixes and passing suites are ready for review; this report is not approval to bypass the unresolved gates.
