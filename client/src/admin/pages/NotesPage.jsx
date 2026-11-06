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
import { Field, L10nField, LanguageModeField, NumberField, SelectField, SlugField, SwitchField, TagsField, TextField } from '../components/fields/Fields.jsx';
import { RefMultiSelect, RefSelect } from '../components/fields/RefSelect.jsx';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { VideoField } from '../components/fields/VideoField.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaField, MediaListField } from '../components/media/MediaFields.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { SolutionBuilder } from '../components/SolutionBuilder.jsx';
import { FormulaListField } from '../components/fields/FormulaListField.jsx';
import { stripTags } from '../lib/format.js';
import { refId, useResourceItem, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
import { DIFFICULTY_OPTIONS } from './QuestionsPage.jsx';

export const IQ_QUESTION_TYPES = [
  { value: 'short_answer', get label() { return uiText("Short answer (लघु उत्तरीय)"); } },
  { value: 'long_answer', get label() { return uiText("Long answer (दीर्घ उत्तरीय)"); } },
  { value: 'mcq', get label() { return uiText("Multiple Choice (MCQ)"); } },
  { value: 'numerical', get label() { return uiText("Numerical Problem (संख्यात्मक प्रश्न)"); } },
  { value: 'case_based', get label() { return uiText("Case-Based / Case Study"); } },
  { value: 'assertion_reason', get label() { return uiText("Assertion and Reason"); } },
  { value: 'competency_based', get label() { return uiText("Competency-Based"); } },
  { value: 'proof', get label() { return uiText("Theorem / Proof (प्रमेय / उपपत्ति)"); } },
  { value: 'subjective', get label() { return uiText("Subjective Question"); } },
  { value: 'short', get label() { return uiText("Short (legacy)"); } },
  { value: 'long', get label() { return uiText("Long (legacy)"); } },
  { value: 'case_study', get label() { return uiText("Case Study (legacy)"); } },
];

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

const NOTE_DEFAULTS = {
  class: null,
  subject: null,
  chapter: null,
  topic: null,
  book: null,
  category: 'ncert_notes',
  academicSession: '2026-27',
  title: {},
  slug: '',
  summary: {},
  introduction: {},
  formulas: [],
  content: {},
  pdfFile: null,
  pdfUrl: '',
  image: null,
  featuredImage: null,
  introVideo: null,
  relatedChapters: [],
  attachments: [],
  video: null,
  tags: [],
  featured: false,
  languageMode: 'auto',
  seo: {},
  status: 'draft',
  isVisible: true,
};

export function NoteEditor({ id }) {
  useUiLanguage();
  const params = new URLSearchParams(window.location.search);
  const editor = useEditorForm({
    resource: 'notes',
    id,
    basePath: adminUrl('notes'),
    defaults: {
      ...NOTE_DEFAULTS,
      class: params.get('class') || null,
      chapter: params.get('chapter') || null,
      book: params.get('book') || null,
      category: params.get('category') || NOTE_DEFAULTS.category,
      academicSession: params.get('session') || NOTE_DEFAULTS.academicSession,
    },
  });
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
            description={uiText("Notes page: formulas, theory, PDF notes, video lessons, and related chapters.")}
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
              <Panel title={uiText("Display")}>
                <div className="space-y-3">
                  <SwitchField label={uiText("Featured on homepage")} checked={form.featured} onChange={(v) => setField('featured', v)} />
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  <TagsField value={form.tags} onChange={(v) => setField('tags', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Location & title")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect label={uiText("Class")} required resource="classes" value={form.class} onChange={(v) => editor.setForm((f) => ({ ...f, class: v, chapter: null, topic: null }))} />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <RefSelect
                  label={uiText("Reference Book (optional — संदर्भ पुस्तक)")}
                  resource="books"
                  clearable
                  value={form.book}
                  onChange={(v) => setField('book', v)}
                  labelOf={(b) => adminText(b.title) || b.name || uiText("Book")}
                />
                <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />
                <RefSelect
                  label={uiText("अध्याय (optional)")}
                  resource="chapters"
                  clearable
                  value={form.chapter}
                  params={refId(form.class) ? { class: refId(form.class), ...(refId(form.book) ? { book: refId(form.book) } : {}) } : {}}
                  onChange={(v) => setField('chapter', v)}
                />
                <RefSelect
                  label={uiText("Topic (optional)")}
                  resource="topics"
                  clearable
                  value={form.topic}
                  params={refId(form.chapter) ? { chapter: refId(form.chapter) } : refId(form.class) ? { class: refId(form.class) } : {}}
                  onChange={(v) => setField('topic', v)}
                />
                <SelectField
                  label={uiText("Content Category")}
                  value={form.category || 'ncert_notes'}
                  onChange={(v) => setField('category', v)}
                  options={[
                    { value: 'ncert_notes', get label() { return uiText("NCERT Chapter-wise Notes"); } },
                    { value: 'formula_sheet', get label() { return uiText("All Maths Formula Sheets"); } },
                    { value: 'rs_aggarwal_notes', get label() { return uiText("RS Aggarwal Notes"); } },
                    { value: 'rd_sharma_notes', get label() { return uiText("RD Sharma Notes"); } },
                    { value: 'kc_sinha_notes', get label() { return uiText("KC Sinha Notes"); } },
                    { value: 'ml_aggarwal_notes', get label() { return uiText("ML Aggarwal Notes"); } },
                    { value: 'vvi_short_notes', get label() { return uiText("VVI Short Notes"); } },
                    { value: 'general', get label() { return uiText("General Notes"); } },
                  ]}
                />
                <div className="sm:col-span-2">
                  <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.title?.en} prefix={classSlug ? `/${classSlug}/${subjectSlug || 'maths'}/notes/` : undefined} />
                </div>
                <L10nField className="sm:col-span-3" label={uiText("Title")} required value={form.title} onChange={(v) => setField('title', v)} placeholder={uiText("Coordinate Geometry Notes / निर्देशांक ज्यामिति नोट्स")} />
                <L10nField className="sm:col-span-3" label={uiText("Short description / Summary")} multiline rows={2} value={form.summary} onChange={(v) => setField('summary', v)} />
              </div>
            </Panel>

            <Panel title={uiText("PDF Solutions / Notes (Optional)")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Notes PDF / Solution Document")} kind="pdf" value={form.pdfFile} onChange={(v) => setField('pdfFile', v)} hint={uiText("Upload handwritten notes or complete PDF.")} />
                <Field label={uiText("Or External PDF URL")}>
                  <input type="url" value={form.pdfUrl || ''} onChange={(e) => setField('pdfUrl', e.target.value)} placeholder="https://..." className="h-9 w-full rounded-md border bg-transparent px-3 text-xs" />
                </Field>
              </div>
            </Panel>

            <Panel title={uiText("Images & video")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Card Image")} value={form.image} onChange={(v) => setField('image', v)} />
                <MediaField label={uiText("Featured Image (top of page)")} value={form.featuredImage} onChange={(v) => setField('featuredImage', v)} />
                <div className="sm:col-span-2">
                  <VideoField label={uiText("Introduction / Lecture Video")} value={form.introVideo || form.video} onChange={(v) => { setField('introVideo', v); setField('video', v); }} />
                </div>
                <div className="sm:col-span-2">
                  <MediaListField label={uiText("Supporting Figures & Diagrams")} value={form.attachments} onChange={(v) => setField('attachments', v)} showKind />
                </div>
              </div>
            </Panel>

            <Panel title={uiText("Introduction")}>
              <RichL10nField value={form.introduction} onChange={(v) => setField('introduction', v)} placeholder={uiText("Brief introduction, concepts overview, and key learning outcomes...")} />
            </Panel>

            <Panel title={uiText("Formulas")}>
              <FormulaListField value={form.formulas} onChange={(v) => setField('formulas', v)} />
            </Panel>

            <Panel title={uiText("Detailed Notes Content")}>
              <RichL10nField value={form.content} onChange={(v) => setField('content', v)} placeholder={uiText("Full theoretical notes, definitions, theorems, and derivations with mathematical symbols...")} />
            </Panel>

            <Panel title={uiText("Related chapters")} description={uiText("Pick chapters to link manually.")}>
              <RefMultiSelect resource="chapters" value={form.relatedChapters} onChange={(v) => setField('relatedChapters', v)} params={refId(form.class) ? { class: refId(form.class) } : {}} />
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
      createPath={adminUrl(`important-questions-legacy/new${filters.class ? `?class=${filters.class}` : ''}`)}
      editPath={(item) => adminUrl(`important-questions-legacy/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.class ? undefined : uiText("Choose a class to reorder.")}
      rowLabel={(q) => stripTags(adminText(q.title) || adminText(q.text)).slice(0, 60) || uiText("Important question")}
      columns={[
        { get header() { return uiText("Q#"); }, className: 'w-14', cell: (q) => <span className="font-heading font-extrabold text-brand">{q.number || '—'}</span> },
        { get header() { return uiText("Question"); }, cell: (q) => <LocalizedCell value={q.title?.en || q.title?.hi ? q.title : q.text} html /> },
        { get header() { return uiText("Class"); }, className: 'hidden sm:table-cell', cell: (q) => (q.class ? uiTemplate`Class ${q.class.number}` : '—') },
        { get header() { return uiText("अध्याय"); }, className: 'hidden md:table-cell', cell: (q) => (q.chapter ? q.chapter.number : '—') },
        { get header() { return uiText("Marks"); }, className: 'hidden lg:table-cell', cell: (q) => q.marks ?? '—' },
        { get header() { return uiText("Level"); }, className: 'hidden lg:table-cell', cell: (q) => <DifficultyBadge difficulty={q.difficulty} /> },
      ]}
    />
  );
}

const IQ_DEFAULTS = {
  class: null,
  subject: null,
  chapter: null,
  topic: null,
  book: null,
  linkedQuestion: null,
  number: '1',
  board: 'CBSE',
  title: {},
  slug: '',
  text: {},
  attachments: [],
  pdfFile: null,
  pdfUrl: '',
  image: null,
  featuredImage: null,
  introVideo: null,
  formulas: [],
  blocks: [],
  answer: {},
  markingScheme: {},
  marks: 4,
  source: '',
  category: 'vvi',
  academicSession: '2026-27',
  year: 2025,
  paperSet: 'Set 1',
  questionType: 'short_answer',
  difficulty: 'medium',
  tags: [],
  featured: false,
  languageMode: 'auto',
  seo: {},
  status: 'draft',
  isVisible: true,
};

export function ImportantQuestionEditor({ id }) {
  useUiLanguage();
  const params = new URLSearchParams(window.location.search);
  const editor = useEditorForm({
    resource: 'important-questions',
    id,
    basePath: adminUrl('important-questions-legacy'),
    defaults: {
      ...IQ_DEFAULTS,
      class: params.get('class') || null,
      chapter: params.get('chapter') || null,
      book: params.get('book') || null,
      category: ({ 'sample-papers': 'sample_paper', 'extra-questions': 'extra_questions' })[params.get('category')] || params.get('category') || IQ_DEFAULTS.category,
      academicSession: params.get('session') || IQ_DEFAULTS.academicSession,
      year: params.get('year') ? Number(params.get('year')) : IQ_DEFAULTS.year,
    },
    label: (doc) => stripTags(adminText(doc?.title) || adminText(doc?.text)).slice(0, 50) || uiText("this question"),
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
            title={editor.isNew ? uiText("New important question") : adminText(form.title) || (form.number ? `Q${form.number}` : uiText("Important question"))}
            description={classNumber ? uiTemplate`Class ${classNumber} — ${form.category ? form.category.toUpperCase() : ''}` : undefined}
            backTo={adminUrl('important-questions')}
            backLabel={uiText("Important Questions Management")}
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
              <Panel title={uiText("Display")}>
                <div className="space-y-3">
                  <SwitchField label={uiText("Featured on homepage")} checked={form.featured} onChange={(v) => setField('featured', v)} />
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  <TagsField value={form.tags} onChange={(v) => setField('tags', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Location & details")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect label={uiText("Class")} required resource="classes" value={form.class} onChange={(v) => editor.setForm((f) => ({ ...f, class: v, chapter: null, topic: null }))} />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <RefSelect
                  label={uiText("Reference Book (optional)")}
                  resource="books"
                  clearable
                  value={form.book}
                  onChange={(v) => setField('book', v)}
                  labelOf={(b) => adminText(b.title) || b.name || uiText("Book")}
                />
                <RefSelect
                  label={uiText("अध्याय (optional)")}
                  resource="chapters"
                  clearable
                  value={form.chapter}
                  params={refId(form.class) ? { class: refId(form.class), ...(refId(form.book) ? { book: refId(form.book) } : {}) } : {}}
                  onChange={(v) => setField('chapter', v)}
                />
                <RefSelect
                  label={uiText("Topic (optional)")}
                  resource="topics"
                  clearable
                  value={form.topic}
                  params={refId(form.chapter) ? { chapter: refId(form.chapter) } : refId(form.class) ? { class: refId(form.class) } : {}}
                  onChange={(v) => setField('topic', v)}
                />
                <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />

                <SelectField
                  label={uiText("Question Category")}
                  value={form.category || 'vvi'}
                  onChange={(v) => setField('category', v)}
                  options={[
                    { value: 'pyq', get label() { return uiText("Previous Year Question (PYQ)"); } },
                    { value: 'sample_paper', get label() { return uiText("CBSE Sample Paper"); } },
                    { value: 'extra_questions', get label() { return uiText("CBSE Extra Questions"); } },
                    { value: 'vvi', get label() { return uiText("VVI / Board Special"); } },
                    { value: 'syllabus', get label() { return uiText("Maths Syllabus"); } },
                    { value: 'general', get label() { return uiText("General"); } },
                  ]}
                />
                <SelectField
                  label={uiText("Question Type")}
                  value={form.questionType || 'short_answer'}
                  onChange={(v) => setField('questionType', v)}
                  options={IQ_QUESTION_TYPES}
                />
                <SelectField label={uiText("Difficulty")} value={form.difficulty} onChange={(v) => setField('difficulty', v)} options={DIFFICULTY_OPTIONS} />

                <TextField label={uiText("Question Number / Code")} value={form.number} onChange={(v) => setField('number', v)} placeholder="1 or 1(a)" />
                <NumberField label={uiText("Marks")} value={form.marks} onChange={(v) => setField('marks', v)} min={0} max={100} />
                <TextField label={uiText("Board (e.g. CBSE, ICSE)")} value={form.board} onChange={(v) => setField('board', v)} placeholder="CBSE" />

                <NumberField label={uiText("Exam Year")} value={form.year} onChange={(v) => setField('year', v)} min={2000} max={2100} />
                <TextField label={uiText("Paper Set")} value={form.paperSet || ''} onChange={(v) => setField('paperSet', v)} placeholder="Set 1 (Code 30/1/1)" />
                <TextField label={uiText("Source")} value={form.source} onChange={(v) => setField('source', v)} placeholder={uiText("CBSE 2024 · NCERT Exemplar")} />

                <div className="sm:col-span-2">
                  <RefSelect label={uiText("Linked NCERT question (optional)")} resource="questions" clearable value={form.linkedQuestion} params={refId(form.chapter) ? { chapter: refId(form.chapter) } : {}} onChange={(v) => setField('linkedQuestion', v)} />
                </div>
                <div className="sm:col-span-1">
                  <SlugField label={uiText("URL slug")} value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.title?.en || stripTags(form.text?.en).slice(0, 50)} />
                </div>

                <L10nField className="sm:col-span-3" label={uiText("Question Title (optional headline)")} value={form.title} onChange={(v) => setField('title', v)} placeholder={uiText("Prove that √5 is irrational / सिद्ध कीजिए कि √5 एक अपरिमेय संख्या है")} />
              </div>
            </Panel>

            <Panel title={uiText("PDF Documents & Answer Keys (Optional)")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Question Paper / Answer Key PDF")} kind="pdf" value={form.pdfFile} onChange={(v) => setField('pdfFile', v)} hint={uiText("Upload question paper or official marking scheme PDF.")} />
                <Field label={uiText("Or External PDF Document URL")}>
                  <input type="url" value={form.pdfUrl || ''} onChange={(e) => setField('pdfUrl', e.target.value)} placeholder="https://..." className="h-9 w-full rounded-md border bg-transparent px-3 text-xs" />
                </Field>
              </div>
            </Panel>

            <Panel title={uiText("Question Statement")} description={uiText("Enter question text with LaTeX math support e.g. $\\int x^2 dx$ or $\\frac{a}{b}$.")}>
              <RichL10nField value={form.text} onChange={(v) => setField('text', v)} />
            </Panel>

            <Panel title={uiText("Images, Diagrams & Video")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Card Image")} value={form.image} onChange={(v) => setField('image', v)} />
                <MediaField label={uiText("Featured / Solution Image")} value={form.featuredImage} onChange={(v) => setField('featuredImage', v)} />
                <div className="sm:col-span-2">
                  <VideoField label={uiText("Video Solution / Walkthrough")} value={form.introVideo} onChange={(v) => setField('introVideo', v)} />
                </div>
                <div className="sm:col-span-2">
                  <MediaListField label={uiText("Diagrams, Figures & Graphs")} value={form.attachments} onChange={(v) => setField('attachments', v)} showKind kind="diagrams" />
                </div>
              </div>
            </Panel>

            <Panel title={uiText("Important Formulas")}>
              <FormulaListField value={form.formulas} onChange={(v) => setField('formulas', v)} />
            </Panel>

            <Panel title={uiText("Step-by-step Solution")} description={uiText("Add steps, calculations, theorems, explanations, and diagrams.")}>
              <SolutionBuilder blocks={form.blocks} onChange={(v) => setField('blocks', v)} />
            </Panel>

            <Panel title={uiText("Short Answer & Marking Scheme")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{uiText("Short Final Answer")}</h4>
                  <RichL10nField value={form.answer} onChange={(v) => setField('answer', v)} minimal />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{uiText("Marking Scheme / Step Breakdown")}</h4>
                  <RichL10nField value={form.markingScheme} onChange={(v) => setField('markingScheme', v)} minimal />
                </div>
              </div>
            </Panel>

            <Panel title={uiText("SEO")}>
              <SeoFields
                value={form.seo}
                onChange={(v) => setField('seo', v)}
                fallbackTitle={adminText(form.title) || `Class ${form.class?.number || ''} Maths Important Question`}
                fallbackDescription={stripTags(adminText(form.text)).slice(0, 158)}
                path={path}
              />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={path} entityType="ImportantQuestion" id={id} data={form} />
        </>
      )}
    </EditorGate>
  );
}
