# Bilingual exercise video deployment

Deploy the server and client together. No new environment variables or destructive database migration are required. MongoDB accepts the two optional Exercise references, `introVideoEn` and `introVideoHi`; the original `introVideo` remains untouched. Existing PDFs, questions, solution blocks and URLs are unchanged.

Legacy video metadata does not establish spoken language reliably. From `server`, run `node src/scripts/migrate-videos.js` to print a read-only inventory. In the exercise editor, preview each legacy video, confirm its spoken language, paste its URL into the correct language field and save that language. Unassigned videos remain preserved but students see a translated missing-video message. Never assign both languages based only on a bilingual title or exercise language setting.

Each language has its own Add/replace URL input, preview, remove control and Save action. For a new exercise, save the exercise once before independent language saves become available. Removing a reference does not delete the underlying Video library record. The existing authenticated, CSRF-protected exercise API validates these references as existing YouTube videos. Video-library usage checks include both new references.

Rollback: redeploy the prior server and client. The original reference still exists and no data has been removed. Keep the new fields in MongoDB so a later redeployment can recover the reviewed assignments.

Chapter navigation now renders only genuine exercise cards with their existing URLs and counts. The former category heading and its duplicate translated label have been removed from that chapter section; unrelated solution pages retain their headings.

Validation: server suite, client suite, Vite production build and language separation audit. Integration tests cover independent save/remove/reload, public resolution in both languages, legacy preservation, invalid references and anonymous access. Rendered component tests cover video language switching, playback reset and missing/invalid videos. Existing tests cover PDFs, solution questions, breadcrumbs and class 6–12 language projection. Manual production visual checks remain necessary after deployment; the supplied attachment contained instructions but no screenshot images.

## Modified files

| File | Change |
| --- | --- |
| `server/src/models/Exercise.js` | Two optional video references, validated against existing YouTube records; legacy retained. |
| `server/src/routes/content.js` | Populate both language references for the existing admin exercise API. |
| `server/src/services/publicContent.js` | Populate both references on exercise resolution and exercise previews. |
| `server/src/services/usage.js` | Protect both language references when checking video-library usage. |
| `server/src/scripts/migrate-videos.js` | Read-only legacy inventory for manual language review. |
| `client/src/admin/lib/resources.js` | Normalize populated language video references to IDs before saving. |
| `client/src/admin/pages/ExercisesPage.jsx` | Integrate bilingual fields into the existing exercise form. |
| `client/src/admin/components/fields/ExerciseVideoFields.jsx` | Independent saves, bilingual labels, previews and preserved legacy preview. |
| `client/src/admin/components/fields/VideoField.jsx` | Optional replacement input while an existing video remains selected. |
| `client/src/components/content/BilingualYouTubeEmbed.jsx` | Strict language selection, missing-video messages and playback reset. |
| `client/src/pages/content/ExercisePage.jsx` | Use bilingual player in the existing page. |
| `client/src/pages/content/ChapterPage.jsx` | Remove the solutions category heading and duplicate label; retain direct exercise cards. |
| `client/src/lib/translations/application.js` | Reviewed English/Hindi labels for the new controls and messages. |
| `client/tests/features.test.js` | Actual component language-switch and missing-video coverage. |
| `server/tests/content.test.js` | Independent persistence, resolution, removal, validation and authorization coverage. |
| `docs/translation-coverage.json` | Regenerated translation audit; 54 unrelated missing keys remain, no raw JSX labels. |
| `docs/bilingual-exercise-videos.md` | Deployment, legacy review, rollback, verification and file summary. |

Checks completed: 34 client tests pass; the full pre-final server run passed 70 tests, and the updated content suite passed 14 tests including the new bilingual persistence test. Production build passes. Language separation reports zero issues. No lint or standalone type-check scripts are configured. No production database or deployment was changed.
