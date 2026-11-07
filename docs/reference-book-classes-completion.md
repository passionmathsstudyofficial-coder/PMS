# Reference books: production completion — 7 November 2026

Completed on https://passionmathstudy.in/ using the existing production MongoDB database **test**. Seven shared academic Class records were preserved; **49 new independently editable BookClass records** now link each reference book to Classes 6–12. Six requested books were absent from production and were added. The existing Mathematics for Class 10 by R.D. Sharma book was retained as a separate catalog record.

## All books and classes

**N✓** means: newly created book-class record; MongoDB verified; authenticated admin edit/save verified; anonymous public API and browser route/reload verified; published and visible.

| Book | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| NCERT Solutions | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| K.C. Sinha Mathematics | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| R.S. Aggarwal | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| Mathematics for Class 10 by R.D. Sharma | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| R.D. Sharma | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| M.L. Aggarwal | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |
| K.C. Sinha | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ | N✓ |

## Management and synchronization

- Admin → Reference Book Solutions → **Reference book classes**: https://passionmathstudy.in/pms-control-room/book-classes
- Every book-class record has its own name, description, slug, subjects, SEO, display order, publication date/status and visibility. Reordering and dependency-checked deletion use the existing CMS controls. Additional classes can be created in Class Management and associated through the book-class editor. New reference books initialize memberships for existing academic Classes 6–12.
- Book names, descriptions, covers and slugs use the existing Books editor. Chapters, exercises, questions/solutions, subjects, notes, important questions and authorized uploads continue through the existing CMS; chapter data keeps its original book/class ownership.
- Frontend menus, home reference cards, book hubs, class pages and sidebar links use saved BookClass records and slugs. Disabled/unpublished classes are absent from navigation and return 404. Chapter APIs also respect disabled book-class membership.
- Class metadata owns its heading, description and SEO; generic book landing-page headers no longer mask a saved class edit.

## Verified results

- 49/49 authenticated class edits → direct production MongoDB read-back → admin API → anonymous public API. Temporary verification descriptions were restored.
- 7/7 real browser admin form edits (Class 12 in each book) → save → admin reload → separate SSH/MongoDB read-back → anonymous student page → reload.
- 49/49 student class pages opened and reloaded in an anonymous browser context.
- 7/7 desktop hover menus and 7/7 mobile tap menus displayed all seven classes. Real nested links were clicked; mobile Class 12 was also clicked after expansion finished.
- 7/7 books passed unpublish, republish, disable visibility, navigation removal and 404 tests. All records were restored to published/visible.
- Final release: 49/49 direct HTTPS class routes returned 200 with the current production bundle. Re-running membership initialization left all 49 records unchanged; no duplicates and no verification text remain.
- **202 original educational records** (books/classes/subjects/chapters/exercises/questions/solutions/notes/important questions/resources) were compared by BSON value against the pre-change backup and are unchanged.
- Full backend suite: **132 passed** before final hardening; subsequent focused suites passed **13**, **7**, and **4** tests for the changed header/language/landing-page/class APIs. Full frontend suite: **53 passed**; final navigation regressions: **3 passed**. Final production build passed. Source binding check: **0 unbound references**.
- Hostinger initially served its normal browser-check page to fresh automated browser contexts. The browser was allowed to finish the check normally before testing; no protection was disabled.

## Existing resource preserved

The original catalog book `6ae1e68ff9bcc5e2a6a3cf4e` (Mathematics for Class 10 by R.D. Sharma) still exists under its original slug. Its catalog `class` reference points to Class 10, while its one existing owned chapter is associated with Class 7. Both existing associations were preserved exactly; the chapter remains isolated under that same book and Class 7. No chapter was moved or copied to the separate R.D. Sharma book. This pre-existing catalog/chapter mismatch requires an editorial decision if it should be corrected later. No textbook content was fabricated.

## Backup, deployment and rollback

Before any content changes, the full production `test` database was exported as BSON-preserving EJSON, fully decompressed/deserialized and verified against collection counts and a SHA-256 digest. Private snapshot: `/home/u583042336/.codex-production-audit/test-pre-verification-2026-11-07T16-45-23-076Z.jsonl.gz`. SHA-256: `836ed0c660fa9c0c7bd61ebde42d2bf09cfbb3a9b49ebccff8fb6d1b46a852bf`. The migration also created and verified its normal CMS backup before inserts. Production environment files were not changed.

Source files were checked against the local Git baseline before deployment. Original source/assets are retained in private code snapshots at `/home/u583042336/.codex-production-audit/book-class-code-before-20261107T170305Z.tar.gz`, `...T171118Z.tar.gz`, `...T171716Z.tar.gz`, and `...T171905Z.tar.gz`. Retained snapshots are outside the release directory. For a code rollback, restore these snapshots in reverse order and restart the application, or deploy the pre-change Git revision. The new database records can remain safely in MongoDB during a code rollback. Do not blindly restore the entire database over subsequent editorial work. For selective data rollback, use the inserted IDs below and dependency-checked CMS deletion; existing educational records must be preserved.

The migration is `server/src/scripts/completeBookClasses.js`. It refuses any database other than `test`, defaults to a read-only audit, and requires `--apply` for insert-only repair. Applying requires a verified backup. It never overwrites an existing class/BookClass/chapter record.

## Per-class records

| Book | Class | Origin | MongoDB | Admin editable | Public route/reload | Publication | Record ID |
|---|---|---|---|---|---|---|---|
| NCERT Solutions | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-6) | Published / visible | `6aef59cdb886514311503ae5` |
| NCERT Solutions | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-7) | Published / visible | `6aef59cdb886514311503ae6` |
| NCERT Solutions | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-8) | Published / visible | `6aef59cdb886514311503ae7` |
| NCERT Solutions | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-9) | Published / visible | `6aef59cdb886514311503ae8` |
| NCERT Solutions | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-10) | Published / visible | `6aef59cdb886514311503ae9` |
| NCERT Solutions | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-11) | Published / visible | `6aef59cdb886514311503aea` |
| NCERT Solutions | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ncert/class-12) | Published / visible | `6aef59cdb886514311503aeb` |
| K.C. Sinha Mathematics | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-6) | Published / visible | `6aef59cdb886514311503aed` |
| K.C. Sinha Mathematics | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-7) | Published / visible | `6aef59cdb886514311503aee` |
| K.C. Sinha Mathematics | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-8) | Published / visible | `6aef59cdb886514311503aef` |
| K.C. Sinha Mathematics | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-9) | Published / visible | `6aef59cdb886514311503af0` |
| K.C. Sinha Mathematics | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-10) | Published / visible | `6aef59cdb886514311503af1` |
| K.C. Sinha Mathematics | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-11) | Published / visible | `6aef59cdb886514311503af2` |
| K.C. Sinha Mathematics | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha-maths/class-12) | Published / visible | `6aef59cdb886514311503af3` |
| R.S. Aggarwal | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-6) | Published / visible | `6aef59ceb886514311503af5` |
| R.S. Aggarwal | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-7) | Published / visible | `6aef59ceb886514311503af6` |
| R.S. Aggarwal | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-8) | Published / visible | `6aef59ceb886514311503af7` |
| R.S. Aggarwal | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-9) | Published / visible | `6aef59ceb886514311503af8` |
| R.S. Aggarwal | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-10) | Published / visible | `6aef59ceb886514311503af9` |
| R.S. Aggarwal | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-11) | Published / visible | `6aef59ceb886514311503afa` |
| R.S. Aggarwal | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-12) | Published / visible | `6aef59ceb886514311503afb` |
| Mathematics for Class 10 by R.D. Sharma | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-6) | Published / visible | `6aef59ceb886514311503b14` |
| Mathematics for Class 10 by R.D. Sharma | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-7) | Published / visible | `6aef59ceb886514311503b15` |
| Mathematics for Class 10 by R.D. Sharma | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-8) | Published / visible | `6aef59ceb886514311503b16` |
| Mathematics for Class 10 by R.D. Sharma | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-9) | Published / visible | `6aef59cfb886514311503b17` |
| Mathematics for Class 10 by R.D. Sharma | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-10) | Published / visible | `6aef59cfb886514311503b18` |
| Mathematics for Class 10 by R.D. Sharma | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-11) | Published / visible | `6aef59cfb886514311503b19` |
| Mathematics for Class 10 by R.D. Sharma | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/mathematics-for-class-10-by-r-d-sharma/class-12) | Published / visible | `6aef59cfb886514311503b1a` |
| R.D. Sharma | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-6) | Published / visible | `6aef59ceb886514311503afd` |
| R.D. Sharma | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-7) | Published / visible | `6aef59ceb886514311503afe` |
| R.D. Sharma | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-8) | Published / visible | `6aef59ceb886514311503aff` |
| R.D. Sharma | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-9) | Published / visible | `6aef59ceb886514311503b00` |
| R.D. Sharma | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-10) | Published / visible | `6aef59ceb886514311503b01` |
| R.D. Sharma | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-11) | Published / visible | `6aef59ceb886514311503b02` |
| R.D. Sharma | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/rd-sharma/class-12) | Published / visible | `6aef59ceb886514311503b03` |
| M.L. Aggarwal | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-6) | Published / visible | `6aef59ceb886514311503b05` |
| M.L. Aggarwal | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-7) | Published / visible | `6aef59ceb886514311503b06` |
| M.L. Aggarwal | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-8) | Published / visible | `6aef59ceb886514311503b07` |
| M.L. Aggarwal | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-9) | Published / visible | `6aef59ceb886514311503b08` |
| M.L. Aggarwal | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-10) | Published / visible | `6aef59ceb886514311503b09` |
| M.L. Aggarwal | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-11) | Published / visible | `6aef59ceb886514311503b0a` |
| M.L. Aggarwal | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/ml-aggarwal/class-12) | Published / visible | `6aef59ceb886514311503b0b` |
| K.C. Sinha | 6 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-6) | Published / visible | `6aef59ceb886514311503b0d` |
| K.C. Sinha | 7 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-7) | Published / visible | `6aef59ceb886514311503b0e` |
| K.C. Sinha | 8 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-8) | Published / visible | `6aef59ceb886514311503b0f` |
| K.C. Sinha | 9 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-9) | Published / visible | `6aef59ceb886514311503b10` |
| K.C. Sinha | 10 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-10) | Published / visible | `6aef59ceb886514311503b11` |
| K.C. Sinha | 11 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-11) | Published / visible | `6aef59ceb886514311503b12` |
| K.C. Sinha | 12 | New | Verified | Verified | [Verified](https://passionmathstudy.in/reference-solutions/kc-sinha/class-12) | Published / visible | `6aef59ceb886514311503b13` |

## Evidence files

[Database/API checks](verification/book-classes-2026-11-07/database-api-results.json), [browser checks](verification/book-classes-2026-11-07/browser-results.json), [admin-to-MongoDB read-backs](verification/book-classes-2026-11-07/admin-database-readbacks.jsonl), [final release checks](verification/book-classes-2026-11-07/final-release-checks.json), [full backup receipt](verification/book-classes-2026-11-07/backup-receipt.json).
