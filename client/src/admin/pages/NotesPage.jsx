import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/notifications.jsx';
import { DifficultyBadge } from '@/components/content/badges.jsx';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ClassFilter, useQueryFilters } from '../components/filters.jsx';
import { AcademicSessionField } from '../components/fields/AcademicSessionField.jsx';
import { L10nField, LanguageModeField, NumberField, SelectField, SlugField, TagsField, TextField } from '../components/fields/Fields.jsx';
import { RefSelect } from '../components/fields/RefSelect.jsx';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { VideoField } from '../components/fields/VideoField.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaListField } from '../components/media/MediaFields.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { SolutionBuilder } from '../components/SolutionBuilder.jsx';
import { stripTags } from '../lib/format.js';
import { refId, useResourceItem, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
import { DIFFICULTY_OPTIONS } from './QuestionsPage.jsx';

function useDefaultSubject(editor) {
  const subjects = useResourceList('subjects', { limit: 50 });
  useEffect(() => {
    if (editor.isNew && editor.form && !editor.form.subject && subjects.data?.items?.length) editor.initialize({ subject: subjects.data.items[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.isNew, subjects.data]);
}

/** Resolves class + subject slugs for preview URLs (form values may be ids or populated objects). */
function useScopeSlugs(form) {
  const cls = useResourceItem('classes', typeof form?.class === 'string' ? form.class : null);
  const subject = useResourceItem('subjects', typeof form?.subject === 'string' ? form.subject : null);
  return {
    classSlug: form?.class?.slug || cls.data?.slug,
    classNumber: form?.class?.number || cls.data?.number,
    subjectSlug: form?.subject?.slug || subject.data?.slug,
  };
}

export function NotesList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class']);
  return (
    <ResourceListPage
      resource="notes"
      title={uiText("Maths Notes")}
      description={uiText("Revision notes and formula sheets, class-wise and optionally linked to an अध्याय.")}
      baseParams={active}
      filters={<ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />}
      createPath={adminUrl(`notes/new${filters.class ? `?class=${filters.class}` : ''}`)}
      editPath={(item) => adminUrl(`notes/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.class ? undefined : uiText("Choose a class to reorder its notes.")}
      columns={[
        { get header() { return uiText("Title"); }, cell: (n) => <LocalizedCell value={n.title} /> },
        { get header() { return uiText("Class"); }, className: 'hidden sm:table-cell', cell: (n) => (n.class ? uiTemplate`Class ${n.class.number}` : '—') },
        { get header() { return uiText("अध्याय"); }, className: 'hidden md:table-cell', cell: (n) => (n.chapter ? `${n.chapter.number}. ${adminText(n.chapter.title) || ''}` : '—') },
      ]}
    />
  );
}

const NOTE_DEFAULTS = { class: null, subject: null, chapter: null, book: null, category: 'ncert_notes', academicSession: '2026-27', title: {}, slug: '', summary: {}, content: {}, attachments: [], video: null, tags: [], languageMode: 'auto', seo: {}, status: 'draft', isVisible: true };

export function NoteEditor({ id }) {
  useUiLanguage();
  const params = new URLSearchParams(window.location.search);
  const editor = useEditorForm({ resource: 'notes', id, basePath: adminUrl('notes'), defaults: { ...NOTE_DEFAULTS, class: params.get('class') || null, chapter: params.get('chapter') || null, book: params.get('book') || null, category: params.get('category') || NOTE_DEFAULTS.category, academicSession: params.get('session') || NOTE_DEFAULTS.academicSession } });
  useDefaultSubject(editor);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField } = editor;
  const { classSlug, subjectSlug } = useScopeSlugs(form);
  const path = classSlug && subjectSlug && form?.slug ? `/${classSlug}/${subjectSlug}/notes/${form.slug}` : null;

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New note") : adminText(form.title) || uiText("Note")}
            backTo={adminUrl('notes')}
            backLabel={uiText("All notes")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (path && !editor.isNew ? setPreviewOpen(true) : toast.info(uiText("Save once to preview.")))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove()}
            sidebar={
              <Panel title={uiText("Settings")}>
                <div className="space-y-3">
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  <TagsField value={form.tags} onChange={(v) => setField('tags', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Note")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect label={uiText("Class")} required resource="classes" value={form.class} onChange={(v) => setForm((f) => ({ ...f, class: v, chapter: null }))} />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <SelectField label={uiText("Content Category")} value={form.category || 'ncert_notes'} onChange={(v) => setField('category', v)} options={[
                  { value: 'ncert_notes', get label() { return uiText("NCERT Notes"); } },
                  { value: 'formula_sheet', get label() { return uiText("Formula Sheet"); } },
                  { value: 'rs_aggarwal_notes', get label() { return uiText("RS Aggarwal Notes"); } },
                  { value: 'rd_sharma_notes', get label() { return uiText("RD Sharma Notes"); } },
                  { value: 'kc_sinha_notes', get label() { return uiText("KC Sinha Notes"); } },
                  { value: 'vvi_short_notes', get label() { return uiText("VVI Short Notes"); } },
                  { value: 'general', get label() { return uiText("General Notes"); } },
                ]} />
                <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />
                <RefSelect label={uiText("Reference Book (optional)")} resource="books" clearable value={form.book} onChange={(v) => setField('book', v)} />
                <RefSelect label={uiText("अध्याय (optional)")} resource="chapters" clearable value={form.chapter} params={refId(form.class) ? { class: refId(form.class), ...(refId(form.book) ? { book: refId(form.book) } : {}) } : {}} onChange={(v) => setField('chapter', v)} />
                <L10nField className="sm:col-span-2" label={uiText("Title")} required value={form.title} onChange={(v) => setField('title', v)} />
                <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.title?.en} />
                <L10nField className="sm:col-span-3" label={uiText("Summary")} multiline rows={2} value={form.summary} onChange={(v) => setField('summary', v)} />
              </div>
            </Panel>
            <Panel title={uiText("Content")}>
              <RichL10nField value={form.content} onChange={(v) => setField('content', v)} />
            </Panel>
            <Panel title={uiText("Images & video")}>
              <div className="space-y-4">
                <MediaListField value={form.attachments} onChange={(v) => setField('attachments', v)} showKind />
                <VideoField value={form.video} onChange={(v) => setField('video', v)} />
              </div>
            </Panel>
            <Panel title={uiText("SEO")}>
              <SeoFields value={form.seo} onChange={(v) => setField('seo', v)} fallbackTitle={adminText(form.title)} fallbackDescription={adminText(form.summary)} path={path} />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={path} entityType="Note" id={id} data={form} />
        </>
      )}
    </EditorGate>
  );

  function setForm(updater) {
    editor.setForm(updater);
  }
}

export function ImportantQuestionsList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class']);
  return (
    <ResourceListPage
      resource="important-questions"
      description={uiText("Exam-oriented questions with their own step-by-step solutions.")}
      baseParams={active}
      filters={<ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />}
      createPath={adminUrl(`important-questions/new${filters.class ? `?class=${filters.class}` : ''}`)}
      editPath={(item) => adminUrl(`important-questions/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.class ? undefined : uiText("Choose a class to reorder.")}
      rowLabel={(q) => stripTags(adminText(q.text)).slice(0, 60) || uiText("Important question")}
      columns={[
        { get header() { return uiText("Question"); }, cell: (q) => <LocalizedCell value={q.text} html /> },
        { get header() { return uiText("Class"); }, className: 'hidden sm:table-cell', cell: (q) => (q.class ? uiTemplate`Class ${q.class.number}` : '—') },
        { get header() { return uiText("अध्याय"); }, className: 'hidden md:table-cell', cell: (q) => (q.chapter ? q.chapter.number : '—') },
        { get header() { return uiText("Marks"); }, className: 'hidden lg:table-cell', cell: (q) => q.marks ?? '—' },
        { get header() { return uiText("Level"); }, className: 'hidden lg:table-cell', cell: (q) => <DifficultyBadge difficulty={q.difficulty} /> },
      ]}
    />
  );
}

const IQ_DEFAULTS = { class: null, subject: null, chapter: null, linkedQuestion: null, slug: '', text: {}, attachments: [], blocks: [], answer: {}, markingScheme: {}, marks: undefined, source: '', category: 'vvi', academicSession: '2026-27', year: undefined, paperSet: '', questionType: 'short', difficulty: 'medium', tags: [], languageMode: 'auto', seo: {}, status: 'draft', isVisible: true };

export function ImportantQuestionEditor({ id }) {
  useUiLanguage();
  const params = new URLSearchParams(window.location.search);
  const editor = useEditorForm({
    resource: 'important-questions',
    id,
    basePath: adminUrl('important-questions-legacy'),
    defaults: { ...IQ_DEFAULTS, class: params.get('class') || null, category: ({ 'sample-papers': 'sample_paper', 'extra-questions': 'extra_questions' })[params.get('category')] || params.get('category') || IQ_DEFAULTS.category, academicSession: params.get('session') || IQ_DEFAULTS.academicSession, year: params.get('year') ? Number(params.get('year')) : undefined },
    label: (doc) => stripTags(adminText(doc?.text)).slice(0, 50) || uiText("this question"),
  });
  useDefaultSubject(editor);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField } = editor;
  const { classSlug, subjectSlug, classNumber } = useScopeSlugs(form);
  const path = classSlug && subjectSlug ? `/${classSlug}/${subjectSlug}/important-questions${form?.slug ? `#${form.slug}` : ''}` : null;

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New important question") : uiText("Important question")}
            description={classNumber ? uiTemplate`Class ${classNumber}` : undefined}
            backTo={adminUrl('important-questions-legacy')}
            backLabel={uiText("All important questions")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (path && !editor.isNew ? setPreviewOpen(true) : toast.info(uiText("Save once to preview (drafts are shown in preview).")))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove()}
            sidebar={
              <Panel title={uiText("Settings")}>
                <div className="space-y-3">
                  <NumberField label={uiText("Marks")} value={form.marks} onChange={(v) => setField('marks', v)} min={0} max={100} />
                  <SelectField label={uiText("Difficulty")} value={form.difficulty} onChange={(v) => setField('difficulty', v)} options={DIFFICULTY_OPTIONS} />
                  <SelectField label={uiText("Question Category")} value={form.category || 'vvi'} onChange={(v) => setField('category', v)} options={[
                    { value: 'vvi', get label() { return uiText("VVI / Board Special"); } },
                    { value: 'pyq', get label() { return uiText("Previous Year Question"); } },
                    { value: 'sample_paper', get label() { return uiText("Sample Paper Question"); } },
                    { value: 'extra_questions', get label() { return uiText("Extra Question"); } },
                    { value: 'general', get label() { return uiText("General"); } },
                  ]} />
                  <SelectField label={uiText("Question Type")} value={form.questionType || 'short'} onChange={(v) => setField('questionType', v)} options={[
                    { value: 'short', get label() { return uiText("Short answer"); } },
                    { value: 'long', get label() { return uiText("Long answer"); } },
                    { value: 'mcq', get label() { return uiText("Multiple choice"); } },
                    { value: 'case_study', get label() { return uiText("Case study"); } },
                  ]} />
                  <TextField label={uiText("Source")} value={form.source} onChange={(v) => setField('source', v)} placeholder={uiText("CBSE 2024 · NCERT Exemplar")} />
                  <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />
                  <NumberField label={uiText("Exam Year")} value={form.year} onChange={(v) => setField('year', v)} min={2000} max={2100} />
                  <TextField label={uiText("Paper Set")} value={form.paperSet || ''} onChange={(v) => setField('paperSet', v)} placeholder="Set 1" />
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  <TagsField value={form.tags} onChange={(v) => setField('tags', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Location")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect label={uiText("Class")} required resource="classes" value={form.class} onChange={(v) => editor.setForm((f) => ({ ...f, class: v, chapter: null }))} />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <RefSelect label={uiText("अध्याय (optional)")} resource="chapters" clearable value={form.chapter} params={refId(form.class) ? { class: refId(form.class) } : {}} onChange={(v) => setField('chapter', v)} />
                <div className="sm:col-span-2">
                  <RefSelect label={uiText("Linked NCERT question (optional)")} resource="questions" clearable value={form.linkedQuestion} params={refId(form.chapter) ? { chapter: refId(form.chapter) } : {}} onChange={(v) => setField('linkedQuestion', v)} />
                </div>
                <SlugField label={uiText("Anchor slug")} value={form.slug} onChange={(v) => setField('slug', v)} suggestion={stripTags(form.text?.en).slice(0, 50)} />
              </div>
            </Panel>
            <Panel title={uiText("Question")}>
              <RichL10nField value={form.text} onChange={(v) => setField('text', v)} />
            </Panel>
            <Panel title={uiText("Images & diagrams")}>
              <MediaListField value={form.attachments} onChange={(v) => setField('attachments', v)} showKind kind="diagrams" />
            </Panel>
            <Panel title={uiText("Solution")}>
              <SolutionBuilder blocks={form.blocks} onChange={(v) => setField('blocks', v)} />
            </Panel>
            <Panel title={uiText("Short answer")}>
              <RichL10nField value={form.answer} onChange={(v) => setField('answer', v)} minimal />
            </Panel>
            <Panel title={uiText("Marking scheme")}>
              <RichL10nField value={form.markingScheme} onChange={(v) => setField('markingScheme', v)} minimal />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={path} />
        </>
      )}
    </EditorGate>
  );
}
