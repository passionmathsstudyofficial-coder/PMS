Subsequent live repairs and verification: [remaining production report](remaining-production-verification-2026-11-07.md).

# Live production deployment and acceptance — 7 November 2026

## Result

The repair is deployed on the actual Hostinger website at commit **`6b6014e751f582431eddf7d440b773c57a319611`**. The deployed source and GitHub `main` match. The requested homepage/reference/NCERT/notes/important-question routes passed live HTTP checks. Authenticated admin API saves, actual MongoDB readback, anonymous public reads, browser reloads, separate anonymous browser contexts, and mobile touch navigation were verified. Temporary records were removed. **Two pre-existing content/navigation links remain unresolved; this is not a claim that every internal URL or CMS screen is certified.**

## Production identity and deployment

- Final application directory: `/home/u583042336/domains/passionmathstudy.in/hbuilds/versions/01a1b5ca-9813-7325-a1b3-6fe6b2964972/nodejs`.
- Domain: [passionmathstudy.in](https://passionmathstudy.in/). Runtime: Hostinger Node 22.23.4 with LiteSpeed/Passenger-style application configuration. Startup: `server/src/index.js`.
- Final Hostinger build: `01a1b5ca-9813-7325-a1b3-6fe6b2964972`. Hostinger logged checkout of `6b6014e`, build completion in 10.3 seconds, application restart and deployment completion in 41.2 seconds.
- Repository: `passionmathsstudyofficial-coder/PMS`; production `main` and `codex/production-acceptance` both resolve to `6b6014e751f582431eddf7d440b773c57a319611`.
- Database **`test` was preserved**. The local development `.env` database `pms` was not substituted. The final running process environment and MongoDB connection were checked again after Hostinger completed its Git deployment.
- Frontend entry: `/assets/index-CJVNZi5X.js`, unchanged between the browser acceptance run and the final provider-created release. The activation crawl loaded all 35 observed entry-page JS/CSS assets successfully.

Evidence: [provider deployment log](verification/production-2026-11-07/final-deployment.log), [final runtime/database identity](verification/production-2026-11-07/final-provider-runtime.json), [activation receipt](verification/production-2026-11-07/activation-final.json).

## Backup and rollback

Fresh pre-test backup verification completed at `2026-11-07T11:21:17.126Z` (16:51 IST). It includes **392 documents across 30 collections**, plus collection options and indexes. Authentication/session collections were included. The backup remains on the hosting account outside all public and rotating build directories:

`/home/u583042336/.codex-production-audit/test-pre-verification-2026-11-07T11-21-16-752Z.jsonl.gz`

SHA-256: `a87c2600eadff4243b53ec56332997d48749519e44f3f736d46f8cf393b1c490`. Size: 85,724 bytes.

Verification re-read and fully decompressed the gzip file, parsed every BSON-preserving EJSON record, checked header/footer completeness and per-collection document counts, and calculated the checksum. No production restore was performed. The backup file itself is private; only its receipt is included here.

Rollback locations retained:

- Original source/build commit `623ffc058b107cf2d62b605a23e5a07541eea85f`: `/home/u583042336/domains/passionmathstudy.in/codex-releases/rollback-623ffc0/nodejs`.
- Prior repaired release `456d2e9`: `/home/u583042336/domains/passionmathstudy.in/codex-releases/repair-456d2e9-0710/nodejs`.
- Tested cache repair copy: `/home/u583042336/domains/passionmathstudy.in/codex-releases/repair-6b6014e/nodejs`.
- Saved hosting configuration: `/home/u583042336/.codex-production-audit/rollback.htaccess`.

Hostinger had already rotated away the original physical build and first staging directory before this approved deployment began. The original tracked source/build was recovered from the verified Git history at `623ffc0` and retained with the rollback configuration outside that rotation. Existing educational records were not restored or changed.

Evidence: [verified backup receipt](verification/production-2026-11-07/backup-receipt.json), [rollback/runtime check](verification/production-2026-11-07/final-runtime.json).

## Activation and restart

The release pointer was switched atomically using a temporary symlink and `os.replace`, with explicit checks of the previous target, staged commit and backup checksum. No live directory was deleted. The original database configuration was retained.

The documented Hostinger `tmp/restart.txt` method was requested in both application and document-root locations. Older LiteSpeed workers for the main, www and temporary preview hosts persisted. Each affected worker was positively identified by account owner, exact `LSNODE_ROOT`, `server/src/index.js` startup file and application socket before receiving a graceful SIGTERM. LiteSpeed respawned workers from the new application directory; HTTP health remained successful. The subsequent normal Hostinger Git deployment also logged its own successful Node restart. [Hostinger restart guidance](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

No post-activation application 5xx or health failure was observed, so a production rollback was not necessary. [Worker restart evidence](verification/production-2026-11-07/restart-workers.json).

## Actual final HTTPS checks

These requests were repeated after the final Hostinger Git deployment on 7 November 2026 at approximately 17:07 IST. Redirects were inspected without automatically following them, then the canonical destination was tested independently.

| Production URL | Observed HTTP result |
|---|---|
| [https://passionmathstudy.in/](https://passionmathstudy.in/) | 200 |
| [https://passionmathstudy.in/reference-solutions](https://passionmathstudy.in/reference-solutions) | 200 |
| [https://passionmathstudy.in/reference-solutions/ncert/class-6](https://passionmathstudy.in/reference-solutions/ncert/class-6) | 301 → `/class-6/maths` |
| [https://passionmathstudy.in/class-6/maths](https://passionmathstudy.in/class-6/maths) | 200 |
| [https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10) | 200 |
| [https://passionmathstudy.in/class-10/maths/notes](https://passionmathstudy.in/class-10/maths/notes) | 200 |
| [https://passionmathstudy.in/class-10/maths/important-questions](https://passionmathstudy.in/class-10/maths/important-questions) | 200 |

The deleted temporary page returned 404, and a nonexistent public resolver request returned 404 with `Cache-Control: no-store`. These are expected negative checks. [Timestamped HTTP evidence](verification/production-2026-11-07/acceptance-urls.json).

## Admin → production database → public API → browser

Authenticated as the existing superadmin through the real production login endpoint, using its session cookie and CSRF token. All content writes were made through the actual HTTPS admin APIs; the script then independently read each saved record from production MongoDB and requested its student-facing resolver response without admin credentials. The test used six new temporary content records plus one question-owned solution. No missing reference book was invented: the existing configured RD Sharma book was used as the temporary chapter parent.

Run: `pms-verify-1794050813712`. Updated marker: `pms-verify-1794050813712 UPDATED`.

| Content type | Exact saved field read from MongoDB | Public result |
|---|---|---|
| `pages` (`6aef0afe91b50009f4ad8e51`) | `content.en` matched the saved value | HTTP 200; value present at `/pms-verify-1794050813712` |
| `chapters` (`6aef0afe91b50009f4ad8e5d`) | `title.en` matched the saved value | HTTP 200; value present at `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10/pms-verify-1794050813712` |
| `exercises` (`6aef0afe91b50009f4ad8e65`) | `title.en` matched the saved value | HTTP 200; value present at `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10/pms-verify-1794050813712/pms-verify-1794050813712` |
| `questions` (`6aef0afe91b50009f4ad8e6d`) | `text.en` matched the saved value | HTTP 200; value present at `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10/pms-verify-1794050813712/pms-verify-1794050813712/pms-verify-1794050813712` |
| `solutions` (`6aef0afe91b50009f4ad8e6e`) | `blocks.0.latex` matched the saved value | HTTP 200; value present at `/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10/pms-verify-1794050813712/pms-verify-1794050813712/pms-verify-1794050813712` |
| `notes` (`6aef0aff91b50009f4ad8e7f`) | `content.en` matched the saved value | HTTP 200; value present at `/class-10/maths/notes/pms-verify-1794050813712` |
| `importantquestions` (`6aef0aff91b50009f4ad8e87`) | `text.en` matched the saved value | HTTP 200; value present at `/class-10/maths/important-questions` |

The temporary page was first saved as a draft and returned 404 anonymously, then published and updated. The solution was changed from `x=1` to `x=7`; production MongoDB, the public API and the rendered KaTeX formula agreed. All seven saved values were re-read through independent public requests after all writes.

The first probe exposed an immediately stale 404 after publication even though the database save had persisted; a later read returned 200. API error responses had no cache-control directive. The error middleware was changed to emit `Cache-Control: no-store`, with a regression covering draft → publish → unpublish and unauthenticated errors. The full backend suite passed **123 tests**, and the real production repeat passed all seven readbacks with no retry masking of failed publication. The precise cache layer that held the initial miss was not independently isolated.

Evidence: [complete API requests, database readbacks, test URLs and cleanup](verification/production-2026-11-07/cms-verification.json), [original failed probe](verification/production-2026-11-07/cms-first-probe.json), [backend tests](../test-results/production-server-tests-final.log).

## Browser verification

**19 live browser checks passed; zero browser JavaScript errors were captured.** These were actual HTTPS production pages in installed Chrome, controlled by the user-authorized Playwright test script. No response mocking was used.

- Desktop Reference Books menu: actual hover and click through the configured RD Sharma book and its Class 10 submenu. The menu contained the real book/class routes and did not restore synthetic missing books.
- Legacy NCERT Class 6 URL: browser navigation followed the permanent redirect to `/class-6/maths`.
- Published page, chapter, question, note and important question: updated content appeared in the student UI and remained after browser reload.
- Question solution: visible `role=math`, `aria-label=x=7`, and rendered KaTeX output were verified.
- A separate anonymous browser context started with no cookies or prior localStorage/query cache; it loaded the saved page, question, note and important question with their updated content.
- A mobile-sized touch context opened the hamburger menu and nested Reference Books → configured book → Class 10, then reached the expected class page.

Native Windows Computer Use stopped when it could not establish a browser URL for the existing Chrome window. That window was left untouched. The separate automated browser tests used fresh isolated contexts and known production URLs, as requested in the original audit prompt.

Evidence: [browser results and actual URLs](verification/production-2026-11-07/browser-results.json), [test script](../scripts/verify-production-browser.mjs), [published solution screenshot](verification/production-2026-11-07/published-question.png), [fresh-session screenshot](verification/production-2026-11-07/fresh-session-important.png), [mobile menu screenshot](verification/production-2026-11-07/mobile-reference-menu.png). The screenshots show temporary records before their required cleanup; their detail URLs now correctly return 404.

## Cleanup and original-content integrity

Every temporary record was removed through the admin API in dependency order. Each deletion was checked directly in production MongoDB; the owned solution was also confirmed absent. Five temporary detail URLs returned actual HTTP 404 after cleanup, and the important-question list remained HTTP 200 with the test marker absent.

| Collection | Before | After cleanup |
|---|---|---|
| `books` | 4 | 4 |
| `chapters` | 57 | 57 |
| `exercises` | 13 | 13 |
| `questions` | 8 | 8 |
| `solutions` | 8 | 8 |
| `notes` | 3 | 3 |
| `importantquestions` | 3 | 3 |
| `pages` | 31 | 31 |

Beyond counts, canonical BSON/EJSON SHA-256 comparisons verified **all 184 original educational/settings documents across 23 collections** against the fresh pre-test backup. There were **zero mismatches**. Authentication sessions and activity logs were excluded from that content comparison because real authentication/testing intentionally changes them.

Evidence: [full content hash comparison](verification/production-2026-11-07/content-integrity.json), [post-cleanup URLs](verification/production-2026-11-07/cleanup-urls.json), [final database check: zero temporary records](verification/production-2026-11-07/final-provider-runtime.json).

## Files in the final application fix

- `server/src/middleware/error.js`: apply `no-store` to errors before serialization, preventing missing/draft/authentication errors from remaining cacheable.
- `server/tests/production-routing.test.js`: regression for noncacheable draft/missing/unauthenticated responses and immediate publish/unpublish visibility.
- Prior repair commit `456d2e9` contains the shared published reference catalog, correct slugs/class constraints, homepage/footer/sidebar/menu fixes, validated legacy NCERT URL, real reference question routes and excess-path 404 handling; see [earlier implementation report](production-repair-2026-11-07.md).

No schema migration, database switch, educational content rewrite or hosting-secret change was performed. Audit scripts, receipts and screenshots are retained locally for review. The final source fix is committed and pushed to production `main`.

## Remaining issues and scope limits

1. `/secondary-school-mathematics-for-class-10-by-r-s-aggarwal` remains a 404 in stored footer/footer-bottom configuration. There is no verified matching published solution destination. The repaired live book menus use the real catalog; the stale stored link still needs a deliberate CMS decision.
2. `/class-11/maths/adhyay-1/prashnavali-1-1` remains a 404. Two published Class 11 chapter records share `adhyay-1`: the canonical unassigned seeded record and a later record attached to the “NCERT Mathematics Textbook for Class 10” book. The listed exercise belongs to the latter, while the canonical chapter resolver selects the former. The source records were preserved, rather than changing a real content relationship without confirming its intended book/class mapping. [Exact public record evidence](verification/production-2026-11-07/remaining-route-evidence.json).
3. Class 6 and the configured RD Sharma Class 10 routes resolve, but existing published chapter content is absent in the selected session after test cleanup. Temporary verification content proved synchronization; it was not retained as educational material.
4. The earlier broad translation audit still reports 661 pre-existing findings. Full multilingual editorial correctness and every CMS screen were not certified in this deployment. www canonicalization also remains as documented in the earlier audit.
5. Production synchronization was tested for the seven content types above. Homepage/settings/navigation, classes/subjects, media and other editors were covered by earlier local/API tests, not by a new production mutation of every module.

Local regression totals: **123 backend + 51 frontend tests passed**. Production acceptance above is supported separately by real HTTPS, MongoDB and browser evidence; compilation alone was not used as proof.
