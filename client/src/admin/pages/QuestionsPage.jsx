import { adminText, stripTags } from '../lib/format.js';
import { uiTemplate, uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { DifficultyBadge } from '@/components/content/badges.jsx';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ChapterFilter, ClassFilter, ExerciseFilter, useQueryFilters } from '../components/filters.jsx';
import { AcademicSessionField } from '../components/fields/AcademicSessionField.jsx';
import {
  Field,
  L10nField,
  LanguageModeField,
  NumberField,
  SelectField,
  SlugField,
  SwitchField,
  TagsField,
  TextField,
} from '../components/fields/Fields.jsx';
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
import { refId, useResourceItem, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
import { BookOpen, CheckCircle2, CircleHelp, ExternalLink, Layers, ListOrdered, Plus, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', get label() { return uiText("Easy (सरल)"); } },
  { value: 'medium', get label() { return uiText("Medium (मध्यम)"); } },
  { value: 'hard', get label() { return uiText("Hard / HOTS (कठिन)"); } },
];

export const QUESTION_TYPE_OPTIONS = [
  { value: 'subjective', get label() { return uiText("Subjective Question (विषयपरक प्रश्न)"); } },
  { value: 'short_answer', get label() { return uiText("Short Answer (लघु उत्तरीय प्रश्न)"); } },
  { value: 'long_answer', get label() { return uiText("Long Answer (दीर्घ उत्तरीय प्रश्न)"); } },
  { value: 'numerical', get label() { return uiText("Numerical Problem (संख्यात्मक प्रश्न)"); } },
  { value: 'mcq', get label() { return uiText("Multiple Choice Question (MCQ)"); } },
  { value: 'case_based', get label() { return uiText("Case-Based / Case Study (केस आधारित प्रश्न)"); } },
  { value: 'assertion_reason', get label() { return uiText("Assertion and Reason (अभिकथन और कारण)"); } },
  { value: 'competency_based', get label() { return uiText("Competency-Based (योग्यता आधारित)"); } },
  { value: 'proof', get label() { return uiText("Theorem / Proof (प्रमेय / उपपत्ति)"); } },
  { value: 'objective', get label() { return uiText("Objective Question (वस्तुनिष्ठ प्रश्न)"); } },
];

export function QuestionsList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'chapter', 'exercise']);
  return (
    <ResourceListPage
      resource="questions"
      title={uiText("Questions & Solutions")}
      description={uiText("Class → अध्याय → प्रश्नावली → Question. Choose a प्रश्नावली to drag-and-drop the question order.")}
      baseParams={active}
      filters={
        <>
          <ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />
          <ChapterFilter classId={filters.class} value={filters.chapter} onChange={(v) => setFilter('chapter', v)} />
          <ExerciseFilter chapterId={filters.chapter} value={filters.exercise} onChange={(v) => setFilter('exercise', v)} />
        </>
      }
      createPath={adminUrl(`questions/new${filters.exercise ? `?exercise=${filters.exercise}` : ''}`)}
      createLabel={uiText("Create New Question")}
      editPath={(item) => adminUrl(`questions/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.exercise ? undefined : uiText("Choose a class, अध्याय and प्रश्नावली to reorder questions.")}
      rowLabel={(q) => uiTemplate`Question ${q.number}${q.exercise ? uiTemplate` (प्रश्नावली ${q.exercise.number})` : ''}`}
      columns={[
        { get header() { return uiText("Q#"); }, className: 'w-14', cell: (q) => <span className="font-heading font-extrabold text-brand">{q.number}</span> },
        { get header() { return uiText("Question"); }, cell: (q) => <LocalizedCell value={q.title?.en || q.title?.hi ? q.title : q.text} html /> },
        { get header() { return uiText("प्रश्नावली"); }, className: 'hidden md:table-cell', cell: (q) => (q.exercise ? q.exercise.number : '—') },
        { get header() { return uiText("Class"); }, className: 'hidden lg:table-cell', cell: (q) => (q.class ? uiTemplate`Class ${q.class.number}` : '—') },
        { get header() { return uiText("Level"); }, className: 'hidden sm:table-cell', cell: (q) => <DifficultyBadge difficulty={q.difficulty} /> },
        { get header() { return uiText("Marks"); }, className: 'hidden sm:table-cell', cell: (q) => (q.marks ? `${q.marks}M` : '—') },
      ]}
    />
  );
}

// Subquestions / Question Parts helper component
function QuestionPartsField({ value = [], onChange }) {
  useUiLanguage();
  const update = (index, patch) => onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const addPart = () => {
    const nextChar = String.fromCharCode(97 + (value.length % 26));
    onChange([...value, { label: `(${nextChar})`, text: {}, marks: 1, answer: {} }]);
  };
  const removePart = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-4 pt-2">
      {value.map((part, index) => (
        <div key={index} className="rounded-xl border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand uppercase">{uiText("Part")} {index + 1}</span>
              <input
                type="text"
                value={part.label || ''}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="(a) or (i)"
                className="h-8 w-24 rounded-lg border bg-transparent px-2.5 text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{uiText("Marks")}:</span>
              <input
                type="number"
                min={0}
                value={part.marks ?? ''}
                onChange={(e) => update(index, { marks: Number(e.target.value) })}
                className="h-8 w-16 rounded-lg border bg-transparent px-2 text-xs"
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removePart(index)} className="text-destructive h-8 w-8" aria-label="Remove part">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <RichL10nField label={uiText("Part Statement")} value={part.text} onChange={(text) => update(index, { text })} minimal />
          <RichL10nField label={uiText("Part Final Answer")} value={part.answer} onChange={(answer) => update(index, { answer })} minimal />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addPart} className="gap-1.5 font-bold">
        <Plus className="size-3.5" />
        {uiText("Add Question Part / Subquestion")}
      </Button>
    </div>
  );
}

// MCQ Options helper component
function McqOptionsField({ options = [], onChange, explanation = {}, onExplanationChange }) {
  useUiLanguage();
  const keys = ['A', 'B', 'C', 'D'];
  const currentOptions = keys.map((key) => {
    const existing = (options || []).find((o) => o.key === key);
    return existing || { key, text: {}, isCorrect: false };
  });

  const setCorrect = (key) => {
    onChange(currentOptions.map((o) => ({ ...o, isCorrect: o.key === key })));
  };

  const updateText = (key, text) => {
    onChange(currentOptions.map((o) => (o.key === key ? { ...o, text } : o)));
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {currentOptions.map((opt) => (
          <div
            key={opt.key}
            className={cn(
              'rounded-xl border p-3.5 transition-all',
              opt.isCorrect ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'bg-background'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-brand uppercase">Option {opt.key}</span>
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="correct_mcq_option"
                  checked={Boolean(opt.isCorrect)}
                  onChange={() => setCorrect(opt.key)}
                  className="size-3.5 accent-brand"
                />
                <span className={opt.isCorrect ? 'text-brand' : ''}>Correct Option</span>
              </label>
            </div>
            <L10nField label={`Option ${opt.key} Text`} value={opt.text} onChange={(text) => updateText(opt.key, text)} placeholder={`Option ${opt.key} value...`} />
          </div>
        ))}
      </div>
      <div>
        <h4 className="text-xs font-bold text-foreground mb-1.5">{uiText("MCQ Explanation / Reason")}</h4>
        <RichL10nField value={explanation} onChange={onExplanationChange} minimal placeholder={uiText("Explain why this option is correct...")} />
      </div>
    </div>
  );
}

function QuestionInfoPanel({ form, exercise, chapter }) {
  useUiLanguage();
  return (
    <Panel title={uiText("Question Information")}>
      <div className="space-y-2 text-xs">
        {form?.book && (
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">{uiText("Reference Book")}:</span>
            <span className="font-semibold">{adminText(form.book.title) || form.book.name || 'Book'}</span>
          </div>
        )}
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("Class")}:</span>
          <span className="font-semibold">{chapter?.class?.number ? `Class ${chapter.class.number}` : form?.class?.number ? `Class ${form.class.number}` : '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("अध्याय (Chapter)")}:</span>
          <span className="font-semibold">{chapter ? `Ch ${chapter.number}` : form?.chapter?.number ? `Ch ${form.chapter.number}` : '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("प्रश्नावली (Exercise)")}:</span>
          <span className="font-semibold">{exercise ? `Ex ${exercise.number}` : form?.exercise?.number ? `Ex ${form.exercise.number}` : '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("Question No.")}:</span>
          <span className="font-bold text-brand">{form?.number ? `Q ${form.number}` : '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("Question Type")}:</span>
          <span className="font-semibold uppercase">{form?.questionType || 'subjective'}</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="text-muted-foreground">{uiText("Difficulty")}:</span>
          <span className="font-semibold uppercase">{form?.difficulty || 'medium'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">{uiText("Marks")}:</span>
          <span className="font-semibold">{form?.marks ?? 2} Marks</span>
        </div>
      </div>
    </Panel>
  );
}

const QUESTION_DEFAULTS = {
  exercise: null,
  chapter: null,
  class: null,
  subject: null,
  book: null,
  topic: null,
  academicSession: '2026-27',
  number: '',
  code: '',
  title: {},
  shortDescription: {},
  slug: '',
  questionType: 'subjective',
  difficulty: 'medium',
  marks: 2,
  board: 'CBSE',
  year: undefined,
  paperSet: '',
  source: '',
  text: {},
  languageMode: 'auto',
  parts: [],
  mcqOptions: [
    { key: 'A', text: {}, isCorrect: false },
    { key: 'B', text: {}, isCorrect: false },
    { key: 'C', text: {}, isCorrect: false },
    { key: 'D', text: {}, isCorrect: false },
  ],
  mcqExplanation: {},
  pdfFile: null,
  pdfUrl: '',
  image: null,
  featuredImage: null,
  introVideo: null,
  attachments: [],
  video: { video: null, placement: 'afterSolution' },
  formulas: [],
  solution: { blocks: [], methods: [], status: 'draft', languageMode: 'auto' },
  hint: {},
  answer: {},
  importantPoint: {},
  markingScheme: {},
  notes: {},
  relatedQuestions: [],
  relatedChapters: [],
  isImportant: false,
  featured: false,
  tags: [],
  seo: {},
  status: 'draft',
  isVisible: true,
};

const toQuestionForm = (doc) => ({
  ...doc,
  title: doc.title || {},
  shortDescription: doc.shortDescription || {},
  text: doc.text || {},
  notes: doc.notes || {},
  hint: doc.hint || {},
  answer: doc.answer || {},
  importantPoint: doc.importantPoint || {},
  markingScheme: doc.markingScheme || {},
  mcqExplanation: doc.mcqExplanation || {},
  mcqOptions: doc.mcqOptions?.length
    ? doc.mcqOptions
    : [
        { key: 'A', text: {}, isCorrect: false },
        { key: 'B', text: {}, isCorrect: false },
        { key: 'C', text: {}, isCorrect: false },
        { key: 'D', text: {}, isCorrect: false },
      ],
  parts: doc.parts || [],
  formulas: doc.formulas || [],
  relatedQuestions: doc.relatedQuestions || [],
  relatedChapters: doc.relatedChapters || [],
  attachments: doc.attachments || [],
  video: {
    video: doc.introVideo || doc.video?.video || null,
    placement: doc.video?.placement || 'afterSolution',
  },
  solution: {
    ...doc.solution,
    blocks: doc.solution?.blocks || [],
    methods: doc.solution?.methods || [],
    status: doc.solution?.status || (doc.solution ? 'published' : 'draft'),
    languageMode: doc.solution?.languageMode || 'auto',
  },
});

export function QuestionEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const initialExercise = params.get('exercise') || null;
  const initialChapter = params.get('chapter') || null;
  const initialClass = params.get('class') || null;
  const initialBook = params.get('book') || null;
  const initialSession = params.get('session') || '2026-27';
  const initialNumber = params.get('number') || '';

  const editor = useEditorForm({
    resource: 'questions',
    id,
    basePath: adminUrl('questions'),
    defaults: {
      ...QUESTION_DEFAULTS,
      exercise: initialExercise,
      chapter: initialChapter,
      class: initialClass,
      book: initialBook,
      academicSession: initialSession,
      number: initialNumber,
    },
    toForm: toQuestionForm,
    label: (doc) => uiTemplate`Question ${doc?.number}`,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [classId, setClassId] = useState(initialClass || '');
  const [chapterId, setChapterId] = useState(initialChapter || '');
  const { form, setField, setForm } = editor;

  const exerciseDetail = useResourceItem('exercises', refId(form?.exercise));
  const exercise = exerciseDetail.data;

  // Sync parent chapter, class, subject, book when exercise loads
  useEffect(() => {
    if (exercise) {
      if (exercise.chapter?._id) {
        setChapterId(exercise.chapter._id);
        if (!form.chapter) setField('chapter', exercise.chapter);
      }
      if (exercise.chapter?.class?._id) {
        setClassId(exercise.chapter.class._id);
        if (!form.class) setField('class', exercise.chapter.class);
      }
      if (exercise.chapter?.subject && !form.subject) setField('subject', exercise.chapter.subject);
      if (exercise.chapter?.book && !form.book) setField('book', exercise.chapter.book);
      if (exercise.academicSession && !form.academicSession) setField('academicSession', exercise.academicSession);
    }
  }, [exercise]);

  const chapter = exercise?.chapter || form?.chapter;
  const cls = chapter?.class || form?.class;
  const sub = chapter?.subject || form?.subject;
  const classSlug = cls?.slug;
  const subjectSlug = sub?.slug;
  const chapterSlug = chapter?.slug;
  const exerciseSlug = exercise?.slug;

  const path =
    classSlug && subjectSlug && chapterSlug && exerciseSlug && form?.slug
      ? `/${classSlug}/${subjectSlug}/${chapterSlug}/${exerciseSlug}/${form.slug}`
      : null;

  const setSolution = (patch) => setForm((f) => ({ ...f, solution: { ...f.solution, ...patch } }));

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={
              editor.isNew
                ? uiText("Create New Question")
                : form.number
                ? uiTemplate`Question ${form.number}${form.title?.en ? ` — ${form.title.en}` : ''}`
                : uiText("Edit Question")
            }
            description={
              exercise
                ? uiTemplate`Class ${cls?.number || ''} · अध्याय ${chapter?.number || ''} · प्रश्नावली ${exercise.number || ''}`
                : uiText("Full-page Educational CMS Question Editor with step-by-step solutions, formulas, and media.")
            }
            backTo={adminUrl(`questions${form?.exercise ? `?class=${classId || ''}&chapter=${chapterId || ''}&exercise=${refId(form.exercise)}` : ''}`)}
            backLabel={uiText("Questions")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (path && !editor.isNew ? setPreviewOpen(true) : toast.info(uiText("Save once to preview (drafts are shown in preview).")))}
            onDuplicate={editor.duplicate}
            onDelete={() =>
              editor.remove({
                get description() {
                  return uiText("Deletes this question and its solution only. The प्रश्नावली and other questions are not affected.");
                },
              })
            }
            sidebar={
              <>
                <Panel title={uiText("Display")}>
                  <div className="space-y-3">
                    <SwitchField label={uiText("Featured on homepage")} checked={form.featured} onChange={(v) => setField('featured', v)} />
                    <SwitchField label={uiText("Important question (VVI)")} hint={uiText("Highlight as exam-important.")} checked={form.isImportant} onChange={(v) => setField('isImportant', v)} />
                    <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                    <TagsField value={form.tags} onChange={(v) => setField('tags', v)} hint={uiText("Topics (e.g. pythagoras, trigonometry, calculus).")} />
                  </div>
                </Panel>
                <QuestionInfoPanel form={form} exercise={exercise} chapter={chapter} />
              </>
            }
          >
            {/* Panel 1: Location & Question Details */}
            <Panel title={uiText("1. Location & Question Details")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect
                  label={uiText("Class")}
                  required
                  resource="classes"
                  value={form.class || classId || null}
                  onChange={(v) => {
                    const idVal = v?._id || '';
                    setClassId(idVal);
                    setField('class', v);
                    setChapterId('');
                    setField('chapter', null);
                    setField('exercise', null);
                  }}
                />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <RefSelect
                  label={uiText("Reference Book (Optional — संदर्भ पुस्तक)")}
                  resource="books"
                  clearable
                  value={form.book}
                  onChange={(v) => setField('book', v)}
                  labelOf={(b) => adminText(b.title) || b.name || uiText("Book")}
                />
                <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />
                <RefSelect
                  label={uiText("अध्याय (Chapter)")}
                  resource="chapters"
                  clearable
                  value={form.chapter || chapterId || null}
                  disabled={!classId && !form.class}
                  params={{ class: classId || refId(form.class), ...(form.book ? { book: refId(form.book) } : {}) }}
                  onChange={(v) => {
                    const idVal = v?._id || '';
                    setChapterId(idVal);
                    setField('chapter', v);
                    setField('exercise', null);
                  }}
                />
                <RefSelect
                  label={uiText("प्रश्नावली (Exercise)")}
                  required
                  resource="exercises"
                  value={form.exercise}
                  disabled={!chapterId && !form.chapter && !form.exercise}
                  params={chapterId || refId(form.chapter) ? { chapter: chapterId || refId(form.chapter) } : classId ? { class: classId } : {}}
                  onChange={(v) => setField('exercise', v)}
                />
                <RefSelect
                  label={uiText("Question Topic (Optional)")}
                  resource="topics"
                  clearable
                  value={form.topic}
                  params={chapterId || refId(form.chapter) ? { chapter: chapterId || refId(form.chapter) } : classId ? { class: classId } : {}}
                  onChange={(v) => setField('topic', v)}
                />
                <TextField label={uiText("Question Number")} required value={form.number} onChange={(v) => setField('number', v)} placeholder={uiText("1 or 1(a) or 2(ii)")} />
                <TextField label={uiText("Question Code (Optional)")} value={form.code || ''} onChange={(v) => setField('code', v)} placeholder="e.g. Q-10-01-01" />

                <SelectField
                  label={uiText("Question Type")}
                  value={form.questionType || 'subjective'}
                  onChange={(v) => setField('questionType', v)}
                  options={QUESTION_TYPE_OPTIONS}
                />
                <SelectField label={uiText("Difficulty Level")} value={form.difficulty} onChange={(v) => setField('difficulty', v)} options={DIFFICULTY_OPTIONS} />
                <NumberField label={uiText("Marks")} value={form.marks} onChange={(v) => setField('marks', v)} min={0} max={100} />

                <TextField label={uiText("Board (e.g. CBSE, ICSE, State)")} value={form.board || ''} onChange={(v) => setField('board', v)} placeholder="CBSE" />
                <NumberField label={uiText("Examination Year")} value={form.year} onChange={(v) => setField('year', v)} min={2000} max={2100} />
                <TextField label={uiText("Paper Set (e.g. Set 1)")} value={form.paperSet || ''} onChange={(v) => setField('paperSet', v)} placeholder="Set 1 (Code 30/1/1)" />
                <TextField className="sm:col-span-2" label={uiText("Source")} value={form.source || ''} onChange={(v) => setField('source', v)} placeholder={uiText("CBSE Board Exam 2024 · NCERT Exemplar")} />

                <div className="sm:col-span-1">
                  <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.number ? `prashn-${form.number}` : ''} />
                </div>

                <L10nField className="sm:col-span-3" label={uiText("Question Title (Optional Headline)")} value={form.title} onChange={(v) => setField('title', v)} placeholder={uiText("Find the coordinates of the point which divides the join of...")} />
                <L10nField className="sm:col-span-3" label={uiText("Short Description / Summary")} multiline rows={2} value={form.shortDescription} onChange={(v) => setField('shortDescription', v)} />
              </div>
            </Panel>

            {/* Panel 2: PDF Solutions / Question Documents (Optional) */}
            <Panel title={uiText("2. PDF Solutions / Question Documents (Optional)")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField
                  label={uiText("Question PDF / Solution Document")}
                  kind="pdf"
                  value={form.pdfFile}
                  onChange={(v) => setField('pdfFile', v)}
                  hint={uiText("Upload scanned question paper, handwritten solution or answer key PDF.")}
                />
                <Field label={uiText("Or External PDF Document URL")}>
                  <input
                    type="url"
                    value={form.pdfUrl || ''}
                    onChange={(e) => setField('pdfUrl', e.target.value)}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                  />
                </Field>
              </div>
            </Panel>

            {/* Panel 3: Images & Video */}
            <Panel title={uiText("3. Images & Video")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Question Image (cards / thumbnail)")} value={form.image} onChange={(v) => setField('image', v)} />
                <MediaField label={uiText("Featured Image (top of page)")} value={form.featuredImage} onChange={(v) => setField('featuredImage', v)} />
                <div className="sm:col-span-2">
                  <VideoField
                    label={uiText("Video Solution / Walkthrough")}
                    value={form.introVideo || form.video?.video}
                    onChange={(video) => {
                      setField('introVideo', video);
                      setField('video', { ...form.video, video });
                    }}
                    placement={form.video?.placement}
                    onPlacementChange={(placement) => setField('video', { ...form.video, placement })}
                    hint={uiText("Paste a YouTube link and choose where the player appears.")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <MediaListField
                    label={uiText("Diagrams, Figures & Graphs")}
                    value={form.attachments}
                    onChange={(v) => setField('attachments', v)}
                    showKind
                    showPlacement
                    kind="diagrams"
                  />
                </div>
              </div>
            </Panel>

            {/* Panel 4: Question Statement */}
            <Panel
              title={uiText("4. Question Statement")}
              description={uiText("Type in हिंदी or English. Use the Σ button (or $…$) for formulas, e.g. $\\angle A = 60^\\circ$ or $\\sqrt{x^2+y^2}$.")}
            >
              <div className="space-y-4">
                <RichL10nField
                  value={form.text}
                  onChange={(v) => setField('text', v)}
                  placeholder={uiText("यदि त्रिभुज ABC में ∠A = 60° और ∠B = 70°, तो ∠C ज्ञात कीजिए। / If in triangle ABC, angle A = 60°...")}
                />

                {/* Subquestions / Parts */}
                <div className="pt-2 border-t">
                  <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <ListOrdered className="size-3.5 text-brand" />
                    <span>{uiText("Question Parts / Subquestions (Optional)")}</span>
                  </h4>
                  <QuestionPartsField value={form.parts} onChange={(parts) => setField('parts', parts)} />
                </div>

                {/* MCQ Options (when MCQ is selected) */}
                {form.questionType === 'mcq' && (
                  <div className="pt-2 border-t">
                    <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-brand" />
                      <span>{uiText("Multiple Choice Options (MCQ)")}</span>
                    </h4>
                    <McqOptionsField
                      options={form.mcqOptions}
                      onChange={(mcqOptions) => setField('mcqOptions', mcqOptions)}
                      explanation={form.mcqExplanation}
                      onExplanationChange={(mcqExplanation) => setField('mcqExplanation', mcqExplanation)}
                    />
                  </div>
                )}
              </div>
            </Panel>

            {/* Panel 5: Important Formulas */}
            <Panel title={uiText("5. Important Formulas")}>
              <FormulaListField
                value={form.formulas}
                onChange={(v) => setField('formulas', v)}
                label={uiText("Key Formulas used in this Question")}
                hint={uiText("Shown in the solution box and searchable by students.")}
              />
            </Panel>

            {/* Panel 6: Step-by-Step Solution Builder */}
            <Panel
              title={uiText("6. Step-by-Step Solution Builder")}
              description={uiText("Add blocks (Explanation → Steps → Calculation → Formula → Diagram → Video → Final Answer) in any order. Drag to reorder.")}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-muted/20">
                  <div className="flex-1 min-w-[200px]">
                    <SelectField
                      label={uiText("Solution Publication Status")}
                      value={form.solution?.status || 'draft'}
                      onChange={(status) => setSolution({ status })}
                      options={['draft', 'published', 'archived'].map((value) => ({ value, label: uiText(value) }))}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <LanguageModeField
                      label={uiText("Solution Language Mode")}
                      value={form.solution?.languageMode}
                      onChange={(languageMode) => setSolution({ languageMode })}
                    />
                  </div>
                </div>

                {/* Standard Blocks Solution */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-brand" />
                    <span>{uiText("Primary Solution Blocks")}</span>
                  </h4>
                  <SolutionBuilder
                    blocks={form.solution?.blocks}
                    onChange={(blocks) => setSolution({ blocks })}
                    onTemplateApplied={(template) =>
                      setForm((f) => ({
                        ...f,
                        difficulty: template.questionDefaults?.difficulty || f.difficulty,
                        video: { ...f.video, placement: template.questionDefaults?.videoPlacement || f.video?.placement },
                      }))
                    }
                  />
                </div>

                {/* Multiple Solution Methods (Alternative, Shortcut, Verification) */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{uiText("Additional Solution Methods (Shortcut / Alternative)")}</h4>
                      <p className="text-[11px] text-muted-foreground">{uiText("Add multiple verified methods for this question.")}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSolution({
                          methods: [
                            ...(form.solution?.methods || []),
                            {
                              title: { en: `Method ${(form.solution?.methods?.length || 0) + 2}`, hi: `विधि ${(form.solution?.methods?.length || 0) + 2}` },
                              methodType: 'alternative',
                              blocks: [],
                              finalAnswer: {},
                            },
                          ],
                        })
                      }
                      className="gap-1.5 font-bold"
                    >
                      <Plus className="size-3.5" />
                      {uiText("Add Solution Method")}
                    </Button>
                  </div>

                  {(form.solution?.methods || []).map((method, index) => {
                    const update = (patch) =>
                      setSolution({
                        methods: form.solution.methods.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                      });
                    return (
                      <div key={method._id || index} className="rounded-xl border bg-muted/10 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand uppercase">Method {index + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!index}
                              onClick={() => {
                                const methods = [...form.solution.methods];
                                [methods[index - 1], methods[index]] = [methods[index], methods[index - 1]];
                                setSolution({ methods });
                              }}
                            >
                              {uiText("Move up")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSolution({
                                  methods: form.solution.methods.filter((_, i) => i !== index),
                                })
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              {uiText("Delete")}
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <L10nField label={uiText("Method Title")} value={method.title} onChange={(title) => update({ title })} />
                          <SelectField
                            label={uiText("Method Type")}
                            value={method.methodType || 'standard'}
                            onChange={(methodType) => update({ methodType })}
                            options={['standard', 'shortcut', 'alternative', 'custom'].map((value) => ({ value, label: uiText(value) }))}
                          />
                        </div>
                        <SolutionBuilder blocks={method.blocks || []} onChange={(blocks) => update({ blocks })} />
                        <RichL10nField label={uiText("Final Answer for this method")} value={method.finalAnswer} onChange={(finalAnswer) => update({ finalAnswer })} minimal />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* Panel 7: Hint, Short Answer & Marking Scheme */}
            <Panel title={uiText("7. Hint, Short Answer & Marking Scheme")}>
              <div className="space-y-4">
                <RichL10nField label={uiText("Hint (students can reveal it)")} value={form.hint} onChange={(v) => setField('hint', v)} minimal />
                <RichL10nField
                  label={uiText("Short Final Answer")}
                  hint={uiText("Used in search, quick verification, and FAQ snippets.")}
                  value={form.answer}
                  onChange={(v) => setField('answer', v)}
                  minimal
                />
                <RichL10nField label={uiText("Important Point / Key Takeaway")} value={form.importantPoint} onChange={(v) => setField('importantPoint', v)} minimal />
                <RichL10nField label={uiText("Marking Scheme / Step Breakdown")} value={form.markingScheme} onChange={(v) => setField('markingScheme', v)} minimal />
              </div>
            </Panel>

            {/* Panel 8: Notes / Additional Explanation */}
            <Panel
              title={uiText("8. Notes / Additional Explanation")}
              description={uiText("Important concepts, mathematical properties, definitions, related theorems, and exam tips.")}
            >
              <RichL10nField value={form.notes} onChange={(v) => setField('notes', v)} placeholder={uiText("Important note, exam cautions, alternative formulas...")} />
            </Panel>

            {/* Panel 9: Related Content */}
            <Panel title={uiText("9. Related Content")} description={uiText("Link related questions, exercises, or chapters.")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1.5">{uiText("Related Questions")}</h4>
                  <RefMultiSelect
                    resource="questions"
                    value={form.relatedQuestions}
                    onChange={(v) => setField('relatedQuestions', v)}
                    params={refId(form.exercise) ? { exercise: refId(form.exercise) } : {}}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1.5">{uiText("Related Chapters")}</h4>
                  <RefMultiSelect
                    resource="chapters"
                    value={form.relatedChapters}
                    onChange={(v) => setField('relatedChapters', v)}
                    params={classId || refId(form.class) ? { class: classId || refId(form.class) } : {}}
                  />
                </div>
              </div>
            </Panel>

            {/* Panel 10: SEO Settings */}
            <Panel title={uiText("10. SEO Settings")}>
              <SeoFields
                value={form.seo}
                onChange={(v) => setField('seo', v)}
                fallbackTitle={
                  exercise
                    ? `Class ${cls?.number || ''} Maths अध्याय ${chapter?.number || ''} प्रश्नावली ${exercise.number || ''} प्रश्न ${form.number || ''} Solution`
                    : `Maths Question ${form.number || ''} Solution`
                }
                fallbackDescription={stripTags(adminText(form.text)).slice(0, 158)}
                path={path}
              />
            </Panel>
          </EditorShell>
          <PreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            path={path}
            entityType="Question"
            id={id}
            data={form}
            solution={form.solution}
          />
        </>
      )}
    </EditorGate>
  );
}

export function SolutionsList() {
  useUiLanguage();
  return (
    <ResourceListPage
      resource="solutions"
      description={uiText("Every question has one block-based solution. Open a row to edit it inside the question editor.")}
      hasStatus={false}
      canDuplicate={false}
      editPath={(s) => adminUrl(`questions/${s.question?._id}`)}
      rowLabel={(s) => uiTemplate`Solution of question ${s.question?.number || ''}`}
      columns={[
        { get header() { return uiText("Question"); }, cell: (s) => (s.question ? uiTemplate`Q${s.question.number}` : uiText("Deleted question")) },
        { get header() { return uiText("प्रश्नावली"); }, className: 'hidden sm:table-cell', cell: (s) => s.question?.exercise?.number || '—' },
        { get header() { return uiText("Class"); }, className: 'hidden md:table-cell', cell: (s) => (s.question?.class ? uiTemplate`Class ${s.question.class.number}` : '—') },
        { get header() { return uiText("Blocks"); }, cell: (s) => s.blocks?.length || 0 },
        { get header() { return uiText("Types"); }, className: 'hidden lg:table-cell', cell: (s) => <span className="text-xs text-muted-foreground">{[...new Set((s.blocks || []).map((b) => b.type))].join(' · ')}</span> },
      ]}
    />
  );
}
