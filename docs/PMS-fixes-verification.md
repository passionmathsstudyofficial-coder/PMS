# PMS fixes and verification

## Root causes confirmed

1. The shared admin uploader filtered out every PDF/Word file and its file input advertised images only, including when opened from an "Upload PDF / Document" field.
2. The configured Cloudinary account accepted a temporary PDF upload but its direct delivery URL returned HTTP 401 (`deny or ACL failure`). Signed API delivery returned HTTP 200. This was verified with temporary assets, which were removed; account permissions were not changed. Cloudinary documents its restricted PDF delivery and signed download mechanisms: [PDF delivery](https://cloudinary.com/documentation/ts_how_to_upload_manage_and_deliver_pdf_files), [signed downloads](https://cloudinary.com/documentation/control_access_to_media).
3. Normal chapter/exercise public queries omitted `pdfFile` population and their student pages omitted standalone PDF cards. Document attachments were also passed through image renderers. Word uploads were unsupported throughout the media pipeline.
4. Relative upload URLs pointed to the frontend origin in split deployments. Every document viewer assumed PDF, and the original CSP blocked Cloudinary PDF frames.
5. Text-color marks were absent from TipTap and the backend sanitizer stripped span color styles.

A read-only inspection of the configured database found six Resource records with no uploaded Media references, and two Media records labeled `kind: pdf` that actually contained JPEGs. No broken Media ObjectId references were found. Those records and the existing files were left untouched; a JPEG was not relabeled as a real PDF. Local storage also contains an existing PDF. No existing content/file was deleted or overwritten.

## Implemented behavior

### Upload and delivery

- The existing authenticated multipart upload accepts PDF, DOC and DOCX, plus the existing images. The server checks size, extension, MIME type and actual content. Word ZIP/OLE structures are inspected using `fflate`/`cfb`; archive expansion is bounded, macros/embedded objects/encrypted Word files are rejected, and PDFs receive structural/active-content checks. These checks are format validation, not an antivirus service.
- Files retain original display filenames and use randomized storage keys. Document metadata drives resource file type/size. Images cannot be selected accidentally in a document-only picker, or documents in the editor image picker.
- New Cloudinary raw documents are private. The permanent application link is `/api/public/files/:id/document.pdf` (or `.doc`/`.docx`); signed URLs are generated only server-side, expire after 60 seconds and are streamed through the app. Signatures and API credentials never enter CMS content or client responses.
- Anonymous readers can access files referenced by published, visible learning content with published parent content. CMS staff retain draft preview access subject to existing permissions/2FA policy. Unreferenced/draft files return 404. The current platform has public learning content and CMS accounts, not an enrollment/student-account model; no new enrollment policy was invented.
- Existing local URLs with Media records redirect through the access-checked route; pre-existing public disk files without records retain their original static-serving behavior. Existing Cloudinary keys and embedded links resolve compatibly without destructive record migrations. Existing public cloud assets retain their original permissions; newly uploaded documents use private delivery.
- PDFs have preview/open/download actions and a fallback message; Word files get document cards/downloads. Explicit `?download=1` sets attachment disposition and preserves Unicode filenames. Image renderers handle document attachments as cards. Rich text keeps valid file links, equations, images and supported formatting.
- Split deployments resolve application/storage URLs using `VITE_API_URL`; no new localhost URL is persisted. Vercel uploads fail clearly if persistent Cloudinary storage is not configured rather than writing to ephemeral disk.

### Languages and public navigation

- Only Hindi and English appear in editor tabs, language switches and default-language settings. The floating widget uses the same language state, with no Google Translate injection or additional language menu.
- The `auto` content mode remains: it follows the two-language switch; it is not a third language. Existing Mixed modes/blocks map to auto/text. Legacy original text is retained verbatim and copied according to Devanagari content; distinct legacy text is appended if its destination already has other text, without replacing either original. Mapping is idempotent and retained `mixed` database fields provide backward compatibility.
- Hardcoded admin links were removed from desktop header, footer and mobile menu. Public SmartLink also suppresses configured administrative destinations. Existing `/login`, `/admin/login` and configured admin routes remain, along with the original authentication/CSRF/permission system.

### Text color

TipTap's supported TextStyle and Color extensions apply color to the saved selection. The toolbar offers a palette, native custom picker, HEX input and reset. Selection is preserved while controls take focus. A narrowly allowed span color style survives backend sanitization, editor reopen and the sanitized student renderer, while unrelated/unsafe styles are discarded.

## Verification

- Backend: `npm test`, using a separate local MongoDB test database: **40 passed, 0 failed**.
- Client: `npm test --prefix client`: **17 passed, 0 failed**.
- Production build: `npm run build`: **passed**. Vite retains a warning for a main chunk above 900 kB.
- `git diff --check`: passed.
- Root workspace clean-install validation: `npm ci --dry-run --ignore-scripts`: passed. Workspace and standalone lockfiles were refreshed; stale standalone locks previously conflicted with the manifests.
- No lint or TypeScript check scripts are configured in this JavaScript repository.
- Integration coverage includes PDF/DOC/DOCX multipart uploads, stored Media/resource references, public API retrieval, open/download headers, app restart persistence, embedded links, legacy URL aliases, parent visibility, anonymous upload denial, draft document denial, language compatibility, malicious formats/HTML and color/math round trips.
- Configured Cloudinary account smoke test: private PDF upload; unpublished access **404**; published open **200/application/pdf/inline**; published download **200/application/pdf/attachment**. Temporary cloud asset and isolated test database were removed. Production database was inspected read-only.
- Browser check against a separate local test database: existing admin login reached the protected dashboard; editor showed only two language tabs; selected Hindi text accepted custom HEX green and saved; student DOM showed the same `rgb(22, 163, 74)` color. English/Hindi switching worked. At 390 × 844, the document link, equations and two-language widget displayed without horizontal overflow, and the mobile menu contained no admin link. Screenshots are kept outside the repository in the chat artifact folder. The extended browser check spanned several hours; a later hard reload returned to sign-in under the existing 60-minute idle-expiry policy. Authentication code and cookie policy were unchanged, and API session regression tests passed.

## Deployment and remaining limits

No database migration or new secret/environment variable is required. Install from the root with `npm ci`, build, and deploy frontend and backend together so the new file endpoint is available. Retain the existing Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) and configure production `PUBLIC_SITE_URL`, `CLIENT_ORIGINS` and, for split hosting, `VITE_API_URL`. Disk-based deployments need a persistent `UPLOAD_DIR`; Vercel needs Cloudinary. No cloud bucket/account was made public and no deployment was performed in this task.

PDF preview depends on browser support; external third-party URLs can still forbid embedding and use the open/download fallback. Files that were already lost from ephemeral storage cannot be reconstructed from database metadata alone. Existing externally public cloud files and orphan public disk URLs cannot be made private merely by changing application links; their permissions were deliberately left untouched. `downloadAllowed` controls UI actions, not DRM: a user who can view a PDF can save it with browser tools.

Dependency audit advisories remain in the existing dependency tree; broad dependency/security upgrades were not included. Run a smoke test against the deployed frontend/backend before claiming deployment verification; this task verified local code and the configured Cloudinary storage integration.

## Changed files

The following inventory covers implementation, tests, dependencies and this report. Source files reuse the existing Express/Mongoose, Cloudinary and React/TipTap architecture.

### Backend validation, delivery and access

- `server/src/app.js`
- `server/src/lib/documentInfo.js`
- `server/src/lib/sanitize.js`
- `server/src/lib/storage.js`
- `server/src/middleware/error.js`
- `server/src/middleware/sanitizeInput.js`
- `server/src/models/SiteSettings.js`
- `server/src/models/SolutionBlock.js`
- `server/src/models/schemas/common.js`
- `server/src/routes/content.js`
- `server/src/routes/documents.js`
- `server/src/routes/index.js`
- `server/src/routes/media.js`
- `server/src/services/documents.js`
- `server/src/services/publicContent.js`
- `server/src/services/usage.js`

### Frontend editor, student resources and navigation

- `client/src/admin/components/SolutionBuilder.jsx`
- `client/src/admin/components/fields/Fields.jsx`
- `client/src/admin/components/fields/ImageDialog.jsx`
- `client/src/admin/components/fields/RichL10nField.jsx`
- `client/src/admin/components/fields/RichTextEditor.jsx`
- `client/src/admin/components/media/MediaFields.jsx`
- `client/src/admin/components/media/MediaPicker.jsx`
- `client/src/admin/pages/MediaPages.jsx`
- `client/src/admin/pages/QuestionsPage.jsx`
- `client/src/admin/pages/ResourcesPage.jsx`
- `client/src/admin/pages/SettingsPages.jsx`
- `client/src/components/content/DocumentAttachment.jsx`
- `client/src/components/content/Figure.jsx`
- `client/src/components/content/PdfViewerDialog.jsx`
- `client/src/components/content/RichContent.jsx`
- `client/src/components/content/SolutionRenderer.jsx`
- `client/src/components/site/FloatingLanguageWidget.jsx`
- `client/src/components/site/Footer.jsx`
- `client/src/components/site/Header.jsx`
- `client/src/components/site/LanguageSwitcher.jsx`
- `client/src/components/site/MobileMenu.jsx`
- `client/src/components/site/SmartLink.jsx`
- `client/src/index.css`
- `client/src/lib/config.js`
- `client/src/lib/i18n.jsx`
- `client/src/lib/media.js`
- `client/src/pages/content/ChapterPage.jsx`
- `client/src/pages/content/ExercisePage.jsx`
- `client/src/pages/content/ReferenceSolutionsPage.jsx`
- `client/src/pages/content/ResourcesListPage.jsx`
- `client/src/pages/content/StudyMaterialsPage.jsx`
- `client/src/pages/content/TopicPage.jsx`

### Shared mapping, tests, dependency manifests/locks and report

- `client/package-lock.json`
- `client/package.json`
- `client/tests/features.test.js`
- `docs/PMS-fixes-verification.md`
- `package-lock.json`
- `server/package-lock.json`
- `server/package.json`
- `server/tests/documents.test.js`
- `shared/languages.js`

