# Strict English/Hindi language separation — implementation report

Completed locally on 1 November 2026. This supersedes the earlier independent interface/content language behavior.

## Result

One persistent language preference controls public interface and educational content. English is the initial default. Only the requested language is rendered or returned publicly; missing content shows a notice in that language. Cross-language fallback, bilingual secondary headings and the second public preference were removed. Mathematics, rich text, diagrams, identifiers and proper names remain intact.

Shared selection and projection logic handles pages centrally. Request/query caches include language; captured request languages prevent rapid-toggle races. Search and suggestions query the selected language. SEO titles, descriptions, keywords, canonical URLs, hreflang and structured data follow the requested language.

## Files created and modified

See [the complete task-specific inventory](strict-language-files.json). The inventory compares source hashes against the beginning of this task, preserving changes from earlier work. Main additions include shared strict localization and canonical URL helpers, public language middleware/projection, admin translation status, language audits, and client/server integration fixtures and tests.

## Database and data safety

No destructive migration or bulk content rewrite was performed. Optional `seo.translations.en/hi` fields and `seo.keywordsByLanguage` extend the existing schemas. Existing English, Hindi, legacy mixed fields, relationships and mathematical source remain stored. Legacy mixed text is not copied into either language. Partial administrative updates merge language fields without deleting the other language, including nested solution blocks.

Production data was not modified or inventoried. Automated and browser checks used isolated disposable databases.

## API contract

Public content and search accept `?lang=en|hi`; invalid values return 400. Without an explicit query, the language cookie is used, then English. Responses carry `Content-Language`; implicit cookie-based responses vary by Cookie. Cached raw content is projected after retrieval so opposite-language fields do not leak between requests. Missing authored values carry `_translationMissing` for the localized notice. Shared metadata and mathematical content are preserved.

Authenticated private admin reads retain both language slots. Anonymous public/nested reads and explicit language projections return the requested language. Search/suggestion and SEO-audit cache keys include language. Existing update endpoints support independent language saves without requiring a breaking endpoint migration.

## Pages and admin coverage

Public templates covered home, study materials/categories, classes 6–12, Maths and Science, subjects, chapters, exercises, questions and solutions, topics, notes, books/reference series, sample papers, extra/important questions, summaries, syllabus, static information, search and missing-content states.

Admin editors provide separate English/Hindi tabs, completion counts, missing/partial warnings, independent field values, localized list labels, separate SEO fields and language-specific desktop/tablet/mobile preview. Legacy display modes cannot override the visitor's selected language. Dashboard, activity and SEO labels use language-compatible values.

## Verification

- Client tests: **30 passed, 0 failed**.
- Server tests: **47 passed, 0 failed**. Includes all seven classes/both subjects/both languages, public projection and invalid languages, independent saves, equations, search/suggestions, SEO, content lifecycle and SSR metadata.
- Final production build: **passed**.
- Translation AST audit: **0 unresolved**, 160 source files scanned.
- Strict separation source guard: **0 unresolved**.
- Browser: 131 public URLs checked, plus all 77 scoped catalog/class checks (these sets overlap); 30 admin destinations checked in both modes. No language leakage remained in the recorded checks.
- Browser editor: English and Hindi unsaved tab values persisted; each language saved independently and survived reload; both preview languages verified.
- Browser question/exercise: fractions and matrices rendered in both modes. Missing-English content displayed the English notice. Search and header suggestions respected language.
- Mobile question at 390×844: both modes verified, mathematical layout rendered, no horizontal document overflow. Desktop rendering also inspected.
- `git diff --check`: passed (repository CRLF normalization notices only).

Browser checkpoint: [strict-browser-verification.json](strict-browser-verification.json). Source audit: [language-separation-coverage.json](language-separation-coverage.json). Build and automated test output are retained under `docs/verification/strict-*.log`.

## Remaining authored translations and limits

The code does not invent or machine-translate educational content. Existing records with a missing selected slot, incompatible single-string text or unassigned legacy mixed content display the localized unavailable notice until an editor supplies that language. Exact production counts are unknown because production data was not audited. Run the read-only `npm run audit:languages --workspace server` against the intended database to inventory these records; the command does not migrate data.

Verification covers the route templates, fixture records and workflows described above, not every possible production record or future URL. The build retains the existing large-chunk advisory. Changes are local; no deployment was performed.
