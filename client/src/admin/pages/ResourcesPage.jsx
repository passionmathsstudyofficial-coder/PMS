import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Download, Eye, FileText, Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ClassFilter, useQueryFilters } from '../components/filters.jsx';
import { Field, L10nField, SelectField, SwitchField } from '../components/fields/Fields.jsx';
import { AcademicSessionField } from '../components/fields/AcademicSessionField.jsx';
import { RefSelect } from '../components/fields/RefSelect.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { refId, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export function ResourcesList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'resourceType']);
  return (
    <ResourceListPage
      resource="resources"
      title={uiText("PDFs & Downloadable Resources (पीडीएफ व अध्ययन सामग्री)")}
      description={uiText("Manage PDF notes, worksheets, assignments, formula sheets, sample papers, and practice files.")}
      baseParams={active}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />
          <SelectField
            value={filters.resourceType || ''}
            onChange={(v) => setFilter('resourceType', v)}
            placeholder={uiText("All Resource Types")}
            options={[
              { value: '', get label() { return uiText("All Resource Types"); } },
              { value: 'notes', get label() { return uiText("Chapter Notes"); } },
              { value: 'ncert_notes', get label() { return uiText("NCERT Notes"); } },
              { value: 'ncert_books', get label() { return uiText("NCERT Books"); } },
              { value: 'cbse_sample_papers', get label() { return uiText("CBSE Sample Papers"); } },
              { value: 'extra_questions', get label() { return uiText("Extra Questions"); } },
              { value: 'important_questions', get label() { return uiText("Important Questions"); } },
              { value: 'english_summaries', get label() { return uiText("English Summaries"); } },
              { value: 'syllabus', get label() { return uiText("Syllabus"); } },
              { value: 'formula_sheet', get label() { return uiText("Formula Sheet"); } },
              { value: 'worksheet', get label() { return uiText("Worksheet"); } },
              { value: 'assignment', get label() { return uiText("Assignment"); } },
              { value: 'practice_paper', get label() { return uiText("Practice Paper"); } },
              { value: 'sample_paper', get label() { return uiText("Sample Paper"); } },
              { value: 'previous_year_paper', get label() { return uiText("Previous Year Paper"); } },
              { value: 'solution', get label() { return uiText("Solution PDF"); } },
              { value: 'form', get label() { return uiText("Registration / Form"); } },
              { value: 'revision', get label() { return uiText("Revision Material"); } },
              { value: 'question_bank', get label() { return uiText("Question Bank"); } },
              { value: 'other', get label() { return uiText("Other Document"); } },
            ]}
            className="w-52"
          />
        </div>
      }
      createPath={adminUrl(`resources/new?${new URLSearchParams({ ...(filters.class ? { class: filters.class } : {}), ...(filters.resourceType ? { resourceType: filters.resourceType } : {}) }).toString()}`)}
      createLabel={uiText("Upload / Add Resource")}
      editPath={(item) => adminUrl(`resources/${item._id}`)}
      rowLabel={(r) => adminText(r.title) || uiText("Resource")}
      columns={[
        { get header() { return uiText("Title"); }, cell: (r) => <LocalizedCell value={r.title} /> },
        {
          get header() { return uiText("Type"); },
          className: 'hidden sm:table-cell',
          cell: (r) => (
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand uppercase">
              {uiText(r.resourceType)}
            </span>
          ),
        },
        { get header() { return uiText("Class"); }, className: 'hidden md:table-cell', cell: (r) => (r.class ? uiTemplate`Class ${r.class.number}` : uiText("All")) },
        { get header() { return uiText("Chapter"); }, className: 'hidden lg:table-cell', cell: (r) => (r.chapter ? uiTemplate`अध्याय ${r.chapter.number}` : '—') },
        {
          get header() { return uiText("Download"); },
          className: 'hidden sm:table-cell',
          cell: (r) => (
            <span className={`text-xs font-semibold ${r.downloadAllowed !== false ? 'text-emerald-600' : 'text-rose-500'}`}>
              {r.downloadAllowed !== false ? uiText("Allowed") : uiText("Disabled")}
            </span>
          ),
        },
      ]}
    />
  );
}

export function ResourceEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const form = useEditorForm({
    resource: 'resources',
    id,
    basePath: adminUrl('resources'),
    entityType: 'Resource',
    defaults: () => ({
      class: params.get('class') || '',
      chapter: params.get('chapter') || '',
      exercise: params.get('exercise') || '',
      book: params.get('book') || '',
      topic: '',
      title: { hi: '', en: '', mixed: '' },
      description: { hi: '', en: '', mixed: '' },
      resourceType: params.get('resourceType') || 'notes',
      academicSession: params.get('session') || '2026-27',
      year: undefined,
      paperSet: '',
      file: null,
      fileUrl: '',
      fileSize: '',
      fileType: 'pdf',
      videoUrl: '',
      externalUrl: '',
      thumbnail: null,
      downloadAllowed: true,
      featured: false,
      status: 'draft',
      isVisible: true,
      sortOrder: 0,
      tags: [],
    }),
  });

  const { doc, set, isNew } = form;
  const classId = refId(doc?.class);
  const chapterId = refId(doc?.chapter);

  const classes = useResourceList('classes', { limit: 50 });
  const classItems = classes.data?.items || [];
  const selectedClass = classItems.find((c) => String(c._id) === String(classId));
  const mathSubject = selectedClass?.subjects?.[0];

  useEffect(() => {
    if (mathSubject && doc && !doc.subject) {
      set('subject', mathSubject._id || mathSubject);
    }
  }, [mathSubject, doc?.subject, set]);

  return (
    <EditorGate form={form}>
      {() => (
        <EditorShell
          form={form}
          title={isNew ? uiText("New PDF / Downloadable Resource") : uiTemplate`Resource — ${adminText(doc?.title) || ''}`}
        >
        <div className="grid gap-6">
          <Panel title={uiText("Resource Details")}>
            <L10nField label={uiText("Resource Title")} value={doc.title} onChange={(title) => set('title', title)} placeholder={uiText("e.g. Chapter 04 Quadratic Equations Notes PDF")} required />
            <L10nField label={uiText("Description")} value={doc.description} onChange={(description) => set('description', description)} placeholder={uiText("Short description of this study material or worksheet")} />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={uiText("Resource Type / श्रेणी")}
                value={doc.resourceType || 'notes'}
                onChange={(resourceType) => set('resourceType', resourceType)}
                options={[
                  { value: 'notes', get label() { return uiText("Chapter Notes (अध्याय नोट्स)"); } },
                  { value: 'ncert_notes', get label() { return uiText("NCERT Notes (एनसीईआरटी नोट्स)"); } },
                  { value: 'ncert_books', get label() { return uiText("NCERT Textbooks (एनसीईआरटी पुस्तकें)"); } },
                  { value: 'cbse_sample_papers', get label() { return uiText("CBSE Sample Papers (सैंपल पेपर्स)"); } },
                  { value: 'extra_questions', get label() { return uiText("Extra Questions (अतिरिक्त प्रश्न)"); } },
                  { value: 'important_questions', get label() { return uiText("Important Questions (महत्वपूर्ण प्रश्न)"); } },
                  { value: 'english_summaries', get label() { return uiText("English Summaries"); } },
                  { value: 'syllabus', get label() { return uiText("Syllabus (पाठ्यक्रम)"); } },
                  { value: 'formula_sheet', get label() { return uiText("Formula Sheet (सूत्र पत्रक)"); } },
                  { value: 'worksheet', get label() { return uiText("Practice Worksheet (अभ्यास पत्रक)"); } },
                  { value: 'assignment', get label() { return uiText("Homework Assignment (गृहकार्य)"); } },
                  { value: 'practice_paper', get label() { return uiText("Practice Paper"); } },
                  { value: 'sample_paper', get label() { return uiText("Sample Paper"); } },
                  { value: 'previous_year_paper', get label() { return uiText("Previous Year Paper"); } },
                  { value: 'solution', get label() { return uiText("Step-by-step Solution PDF"); } },
                  { value: 'form', get label() { return uiText("Registration / Activity Form"); } },
                  { value: 'revision', get label() { return uiText("Quick Revision Notes"); } },
                  { value: 'question_bank', get label() { return uiText("Question Bank"); } },
                  { value: 'other', get label() { return uiText("Other Downloadable File"); } },
                ]}
                required
              />
              <Field label={uiText("File Size (e.g. 2.4 MB)")} hint={uiText("Optional manual size label if not auto-computed")}>
                <input
                  type="text"
                  value={doc.fileSize || ''}
                  onChange={(e) => set('fileSize', e.target.value)}
                  placeholder={uiText("e.g. 2.4 MB")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
              <AcademicSessionField value={doc.academicSession} onChange={(v) => set('academicSession', v)} />
              <Field label={uiText("Examination Year")}>
                <input type="number" min="2000" max="2100" value={doc.year || ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : undefined)} placeholder="2026" className="h-9 w-full rounded-md border bg-transparent px-3 text-xs" />
              </Field>
              <Field label={uiText("Paper Set / Series")}>
                <input type="text" value={doc.paperSet || ''} onChange={(e) => set('paperSet', e.target.value)} placeholder={uiText("Set 1")} className="h-9 w-full rounded-md border bg-transparent px-3 text-xs" />
              </Field>
            </div>
          </Panel>

          <Panel title={uiText("Educational Placement (Class / Chapter / Exercise / Book)")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RefSelect
                label={uiText("Class (कक्षा)")}
                resource="classes"
                params={{ limit: 50 }}
                value={classId}
                onChange={(c) => {
                  set('class', c);
                  set('chapter', '');
                  set('exercise', '');
                  set('topic', '');
                }}
                labelOf={(c) => uiTemplate`Class ${c.number} — ${adminText(c.name) || ''}`}
              />
              <RefSelect
                label={uiText("Chapter (अध्याय)")}
                resource="chapters"
                params={{ class: classId, limit: 100 }}
                disabled={!classId}
                value={chapterId}
                onChange={(ch) => {
                  set('chapter', ch);
                  set('exercise', '');
                  set('topic', '');
                }}
                labelOf={(ch) => uiTemplate`अध्याय ${ch.number} — ${adminText(ch.title) || ''}`}
              />
              <RefSelect
                label={uiText("Exercise (Optional — प्रश्नावली)")}
                resource="exercises"
                params={{ chapter: chapterId, limit: 100 }}
                disabled={!chapterId}
                value={refId(doc.exercise)}
                onChange={(ex) => set('exercise', ex)}
                labelOf={(ex) => uiTemplate`Ex ${ex.number || ''} — ${adminText(ex.title) || ''}`}
              />
              <RefSelect
                label={uiText("Reference Book (Optional — संदर्भ पुस्तक)")}
                resource="books"
                params={{ limit: 50 }}
                value={refId(doc.book)}
                onChange={(b) => set('book', b)}
                labelOf={(b) => adminText(b.title) || b.name || uiText("Book")}
              />
            </div>
          </Panel>

          <Panel title={uiText("File Attachment, Video & Links")}>
            <MediaField
              label={uiText("Upload PDF / Document File")}
              kind="pdf"
              value={doc.file}
              onChange={(file) => set('file', file)}
              hint={uiText("Upload PDF, DOC or DOCX from your computer or choose from Media Library.")}
            />

            <Field label={uiText("Or External File URL")} hint={uiText("Direct link to hosted PDF / Google Drive / Cloud storage file.")}>
              <input
                type="url"
                value={doc.fileUrl || ''}
                onChange={(e) => set('fileUrl', e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>

            <Field label={uiText("YouTube / Video Lesson URL")} hint={uiText("Embed video lesson (e.g. https://www.youtube.com/watch?v=...)")}>
              <input
                type="url"
                value={doc.videoUrl || ''}
                onChange={(e) => set('videoUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>

            <Field label={uiText("External Website URL")} hint={uiText("Optional link to external study portal or resource.")}>
              <input
                type="url"
                value={doc.externalUrl || ''}
                onChange={(e) => set('externalUrl', e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>

            <MediaField label={uiText("Optional Document Thumbnail / Preview Cover")} value={doc.thumbnail} onChange={(thumbnail) => set('thumbnail', thumbnail)} />
          </Panel>

          <Panel title={uiText("Permissions & Options")}>
            <div className="space-y-3">
              <SwitchField
                label={uiText("Allow Student Downloads")}
                hint={uiText("When enabled, students will see a 'Download PDF' button. If disabled, students can only preview.")}
                checked={doc.downloadAllowed !== false}
                onChange={(downloadAllowed) => set('downloadAllowed', downloadAllowed)}
              />
              <SwitchField
                label={uiText("Featured Resource")}
                hint={uiText("Highlight this PDF on the Subject / Dashboard downloads area.")}
                checked={Boolean(doc.featured)}
                onChange={(featured) => set('featured', featured)}
              />
            </div>
          </Panel>
        </div>
      </EditorShell>
    )}
  </EditorGate>
  );
}
