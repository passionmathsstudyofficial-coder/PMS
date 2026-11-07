# PR #1 — live production deployment verification

Verified on **7 November 2026** against https://passionmathstudy.in/. This report uses the active Hostinger release, live HTTPS requests, real authenticated CMS operations and production MongoDB read-back.

## Commit and deployment status

| Item | Verified result |
| --- | --- |
| Main fetched when verification began | `dab682fe9978fe3cb0437f2166c48ea2fe95fc9f` — PR #1 merge |
| Hostinger at start | Same exact merge commit; automatic deployment had already completed |
| Latest `origin/main` after fixes | **`7a49c9ae2c6b3addf216a4e312ca65f6a4d79fea`** |
| Actual active Hostinger commit | **`7a49c9ae2c6b3addf216a4e312ca65f6a4d79fea`** — matches latest main |
| Active Hostinger version | `01a1b6d2-afe2-708e-a453-321aa8aa22c6` |
| Deployment status | **LIVE VERIFIED**; final publish/restart completed in 41.3s |
| Runtime | Node **v22.23.4**, Passenger startup `server/src/index.js` |
| Environment and database | Production `.env` fingerprint and running application configuration fingerprints unchanged; actual MongoDB database **`test`** |

The active release's Git HEAD was read over SSH. Startup source checksums match the exact Git objects in latest main. Hostinger's build/publish/restart log, actual live page rendering and served entry assets were inspected. Deployment success was not inferred from the GitHub merge or a local build.

[Initial runtime](verification/pr1-production-2026-11-07/pr1-runtime-before.json), [final runtime](verification/pr1-production-2026-11-07/pr1-runtime-after.json), [final Hostinger deployment log](verification/pr1-production-2026-11-07/pr1-deploy-after.log).

## Issues found and fixed

1. **Cold-start listener delay.** The initial merge's application log contained four Hostinger errors stating that `listen()` was not called within three seconds. The entry point awaited MongoDB and CMS initialization first. Commit `5cdfc2196d86b288fbfa8ebece453aba50f34b81` binds the listener before heavy imports and initialization. Requests wait for readiness with a bounded deadline; initialization failure returns a non-cacheable, retryable 503 instead of claiming health. The final application's log has **0 errors**, with **4 listener-bound and 4 application-ready messages**.
2. **Book-cover console errors.** Desktop and mobile Books pages requested a legacy NCERT cover URL that violated the existing image policy. Commit `7a49c9ae2c6b3addf216a4e312ca65f6a4d79fea` shares the allowed-image origins between client and server, prefers CMS-uploaded covers, and renders the existing placeholder for unsupported or failed cover URLs. No CMS book records were changed and the security policy was not broadened. The final browser test has **0 unexpected console errors**. [Before-fix evidence](verification/pr1-production-2026-11-07/console-before-cover-fix.json).

Backend suite: **128 passed**. Subsequent focused server regressions: **10 passed**. Client suite: **53 passed**. Production build passed. Source binding check: **0 unbound references**. Translation audit: **0 unresolved findings**.

## Live page, API and browser results

The final release passed **176 HTTP checks**, with **0 unexpected HTTP errors**, **0 resolver errors**, and **35/35 current entry assets returning 200**. The intentionally nonexistent audit URL correctly returned 404. Anonymous `/api/auth/me` correctly returned 401; this expected authentication response is recorded separately from application errors.

| Actual live URL | Result |
| --- | --- |
| https://passionmathstudy.in/ | 200; desktop/mobile rendering passed |
| https://passionmathstudy.in/api/health | 200 after initialization |
| https://passionmathstudy.in/pms-control-room/login | 200; email/password form rendered; authenticated login API accepted the authorized production account |
| https://passionmathstudy.in/reference-solutions | 200 |
| https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10 | 200; real nested menu navigation passed |
| https://passionmathstudy.in/class-6/maths | 200 |
| https://passionmathstudy.in/class-6/maths/fractions | 200 |
| https://passionmathstudy.in/class-6/maths/fractions/pms-original-practice-1 | 200; exercise page rendered |
| https://passionmathstudy.in/class-6/maths/fractions/pms-original-practice-1/pms-question-1 | 200; question/solution page rendered |
| https://passionmathstudy.in/class-6/maths/notes | 200 |
| https://passionmathstudy.in/class-6/maths/notes/ganita-prakash-fractions-pms-revision | 200 |
| https://passionmathstudy.in/class-10/maths/important-questions | 200 |
| https://passionmathstudy.in/class-11/maths/adhyay-1/prashnavali-1-1 | 200 |
| https://passionmathstudy.in/class-10/maths/books | 200; no blocked-cover console errors |
| https://www.passionmathstudy.in/class-6/maths?lang=en | 308 to the matching non-www URL, preserving path and query |
| http://passionmathstudy.in/ | 301 to HTTPS |

- **26 final desktop/mobile page checks passed**, with no JavaScript runtime errors, unexpected console errors or unexpected HTTP errors.
- Responsive/keyboard checks passed at **320, 375, 430, 768, 1366 and 1920 px**, including mobile focus containment/restoration and dropdown keyboard navigation.
- English/Hindi interface switching and English persistence after reload passed. Authored educational language fields remain separate; missing Hindi content was not fabricated.
- Mathematical rendering passed: the controlled published question rendered the saved `x=7` solution in KaTeX. Existing original practice/solution pages also rendered.
- A controlled **622-byte PDF** was uploaded through the production CMS, published, downloaded anonymously, and previewed on desktop/mobile. Both browser downloads matched uploaded SHA-256 `0c65b370c4b1cf1a4bf0c1f913418d3b41227b7fc9b140243623b71d9deaa9cd` and displayed a PDF preview canvas. The temporary PDF and its references were removed afterwards.

[Final HTTP evidence](verification/pr1-production-2026-11-07/http-final-release.json), [final page/console checks](verification/pr1-production-2026-11-07/final-smoke-browser.json), [responsive/keyboard checks](verification/pr1-production-2026-11-07/navigation-results.json), [language checks](verification/pr1-production-2026-11-07/language-browser-results.json), [PDF/admin browser checks](verification/pr1-production-2026-11-07/pdf-admin-browser.json).

## Admin-to-student synchronization

A fresh verified production backup preceded all test writes. Six explicitly temporary CMS records and an owned solution exercised **Pages, Chapters, Exercises, Questions, Solutions, Notes and Important Questions** using the real authenticated API. All seven saved values were checked in production MongoDB and anonymous public responses.

The browser suite passed **19 checks**, including rendered formulas, mobile navigation, reloads and separate anonymous contexts. After the startup repair restarted production, another admin update was saved to the temporary note. All seven database/public assertions were rechecked, and the new note text appeared after reload in fresh desktop and mobile contexts (**4 post-restart browser checks passed**).

All temporary CMS records, their owned solution and the temporary PDF media record were removed. Their detail/file routes are consequently unavailable after cleanup. Test fixture URLs and timestamps remain in the evidence for audit purposes.

[CMS write/read-back and cleanup](verification/pr1-production-2026-11-07/cms-verification.json), [CMS browser evidence](verification/pr1-production-2026-11-07/browser-results.json), [post-restart browser evidence](verification/pr1-production-2026-11-07/post-restart-browser.json), [PDF storage/download/cleanup evidence](verification/pr1-production-2026-11-07/pr1-pdf-verification.json).

## Production data and environment integrity

The pre-test backup is a complete BSON/EJSON gzip export with collection indexes/options. Every record was decompressed/deserialized, counts checked and checksum verified. No production restore or database replacement was performed.

- Database: **`test`** throughout.
- Backup verified: `2026-11-07T15:10:35.580Z` UTC.
- Backup SHA-256: `9367bb90e41d78b99e0b215d1e7eb92378757e0d590e7b61ca43e2d135e694fd`.
- Backup remains private at `/home/u583042336/.codex-production-audit/test-pre-verification-2026-11-07T15-10-35-181Z.jsonl.gz`; only its receipt is included here.
- **290 original documents unchanged**, plus one admin document differing only in login/audit timestamps.
- **0 missing original records, 0 changed original content records, 0 extra non-audit records**.
- Student/admin identities, credentials and permissions were preserved. Activity/session records from legitimate verification logins are expected audit changes.
- Production `.env` bytes and running application configuration values match the before/after fingerprints. Credentials and environment values are not included in the report.

| Collection | Before | After cleanup |
| --- | --- | --- |
| admins | 1 | 1 |
| users | 0 | 0 |
| books | 4 | 4 |
| chapters | 67 | 67 |
| exercises | 23 | 23 |
| questions | 38 | 38 |
| solutions | 38 | 38 |
| notes | 13 | 13 |
| importantquestions | 3 | 3 |
| pages | 31 | 31 |
| media | 6 | 6 |

[Backup receipt](verification/pr1-production-2026-11-07/backup-receipt.json), [full integrity comparison](verification/pr1-production-2026-11-07/pr1-integrity.json).

## Rollback and remaining issues

The original release, earlier successful release and PR merge rollback copy remain outside Hostinger's rotating version directory, including `codex-releases/rollback-623ffc0/nodejs`, `codex-releases/repair-d3770be/nodejs`, `codex-releases/repair-dab682f/nodejs` and `codex-releases/repair-5cdfc21/nodejs`. The saved original `.htaccess` is intact. Earlier hashed assets were retained additively so deployment does not break existing open tabs. No rollback was required.

No reproducible application deployment failures remain in the tested live routes. One early browser profile returned HTTP 403 on the admin login page; the configured English/India desktop and mobile checks subsequently passed, without weakening hosting security. This profile-dependent response remains an observation rather than a proven application-code fault.

External NCERT/third-party download availability and educational translations that have not been authored are outside these deployment checks. Production advertisements remain disabled. This verification does not claim exhaustive testing of every third-party resource or enabled advertising.
