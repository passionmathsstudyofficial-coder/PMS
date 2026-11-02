import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { DifficultyBadge } from '@/components/content/badges.jsx';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ChapterFilter, ClassFilter, ExerciseFilter, useQueryFilters } from '../components/filters.jsx';
import { LanguageModeField, NumberField, SelectField, SlugField, SwitchField, TagsField, TextField } from '../components/fields/Fields.jsx';
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
import { refId, useResourceItem } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', get label() { return uiText("Easy (सरल)"); } },
  { value: 'medium', get label() { return uiText("Medium (मध्यम)"); } },
  { value: 'hard', get label() { return uiText("Hard / HOTS (कठिन)"); } },
];

export function QuestionsList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'chapter', 'exercise']);
  return (
    <ResourceListPage
      resource="questions"
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
      editPath={(item) => adminUrl(`questions/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.exercise ? undefined : uiText("Choose a class, अध्याय and प्रश्नावली to reorder questions.")}
      rowLabel={(q) => uiTemplate`Question ${q.number}${q.exercise ? uiTemplate` (प्रश्नावली ${q.exercise.number})` : ''}`}
      columns={[
        { get header() { return uiText("Q"); }, className: 'w-12', cell: (q) => <span className="font-heading font-extrabold text-brand">{q.number}</span> },
        { get header() { return uiText("Question"); }, cell: (q) => <LocalizedCell value={q.text} html /> },
        { get header() { return uiText("प्रश्नावली"); }, className: 'hidden md:table-cell', cell: (q) => (q.exercise ? q.exercise.number : '—') },
        { get header() { return uiText("Class"); }, className: 'hidden lg:table-cell', cell: (q) => (q.class ? uiTemplate`Class ${q.class.number}` : '—') },
        { get header() { return uiText("Level"); }, className: 'hidden sm:table-cell', cell: (q) => <DifficultyBadge difficulty={q.difficulty} /> },
      ]}
    />
  );
}

const QUESTION_DEFAULTS = {
  exercise: null,
  number: '',
  slug: '',
  text: {},
  languageMode: 'auto',
  attachments: [],
  video: { video: null, placement: 'afterSolution' },
  hint: {},
  answer: {},
  importantPoint: {},
  difficulty: 'medium',
  marks: undefined,
  tags: [],
  isImportant: false,
  seo: {},
  status: 'draft',
  isVisible: true,
  solution: { blocks: [], languageMode: 'auto' },
};

const toQuestionForm = (doc) => ({
  ...doc,
  video: { video: doc.video?.video || null, placement: doc.video?.placement || 'afterSolution' },
  solution: { blocks: doc.solution?.blocks || [], languageMode: doc.solution?.languageMode || 'auto' },
});

export function QuestionEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const editor = useEditorForm({
    resource: 'questions',
    id,
    basePath: adminUrl('questions'),
    defaults: { ...QUESTION_DEFAULTS, exercise: params.get('exercise') || null },
    toForm: toQuestionForm,
    label: (doc) => uiTemplate`Question ${doc?.number}`,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const { form, setField, setForm } = editor;
  const exerciseDetail = useResourceItem('exercises', refId(form?.exercise));
  const exercise = exerciseDetail.data;

  useEffect(() => {
    if (exercise && !chapterId) {
      setChapterId(exercise.chapter?._id || '');
      setClassId(exercise.chapter?.class?._id || '');
    }
  }, [exercise, chapterId]);

  const chapter = exercise?.chapter;
  const path = chapter?.class?.slug && chapter?.subject?.slug && exercise?.slug && form?.slug ? `/${chapter.class.slug}/${chapter.subject.slug}/${chapter.slug}/${exercise.slug}/${form.slug}` : null;
  const setSolution = (patch) => setForm((f) => ({ ...f, solution: { ...f.solution, ...patch } }));

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New question") : uiTemplate`Question ${form.number}`}
            description={exercise ? uiTemplate`Class ${chapter?.class?.number} · अध्याय ${chapter?.number} · प्रश्नावली ${exercise.number}` : uiText("Choose where this question belongs.")}
            backTo={adminUrl(`questions${exercise ? `?class=${chapter?.class?._id}&chapter=${chapter?._id}&exercise=${exercise._id}` : ''}`)}
            backLabel={uiText("Questions")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (path && !editor.isNew ? setPreviewOpen(true) : toast.info(uiText("Save once to preview.")))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove({ get description() { return uiText("Deletes this question and its solution only. The प्रश्नावली and other questions are not affected."); } })}
            sidebar={
              <Panel title={uiText("Question settings")}>
                <div className="space-y-3">
                  <SelectField label={uiText("Difficulty")} value={form.difficulty} onChange={(v) => setField('difficulty', v)} options={DIFFICULTY_OPTIONS} />
                  <NumberField label={uiText("Marks")} value={form.marks} onChange={(v) => setField('marks', v)} min={0} max={100} />
                  <SwitchField label={uiText("Important question")} hint={uiText("Highlight as exam-important.")} checked={form.isImportant} onChange={(v) => setField('isImportant', v)} />
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  <TagsField value={form.tags} onChange={(v) => setField('tags', v)} hint={uiText("Topics (e.g. pythagoras, triangle). Used for related content.")} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("1. Location")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <RefSelect
                  label={uiText("Class")}
                  resource="classes"
                  value={classId || null}
                  onChange={(v) => {
                    setClassId(v?._id || '');
                    setChapterId('');
                    setField('exercise', null);
                  }}
                />
                <RefSelect
                  label={uiText("अध्याय")}
                  resource="chapters"
                  value={chapterId || null}
                  disabled={!classId}
                  params={{ class: classId }}
                  onChange={(v) => {
                    setChapterId(v?._id || '');
                    setField('exercise', null);
                  }}
                />
                <RefSelect label={uiText("प्रश्नावली")} required resource="exercises" value={form.exercise} disabled={!chapterId && !form.exercise} params={chapterId ? { chapter: chapterId } : classId ? { class: classId } : {}} onChange={(v) => setField('exercise', v)} />
                <TextField label={uiText("Question number")} required value={form.number} onChange={(v) => setField('number', v)} placeholder={uiText("3 or 3(ii)")} />
                <div className="sm:col-span-2">
                  <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.number ? `prashn-${form.number}` : ''} />
                </div>
              </div>
            </Panel>

            <Panel title={uiText("2. Question")} description={uiText("Type in हिंदी or English. Use the Σ button (or $…$) for formulas, e.g. $\\angle A = 60^\\circ$.")}>
              <RichL10nField value={form.text} onChange={(v) => setField('text', v)} placeholder={uiText("यदि त्रिभुज ABC में ∠A = 60° और ∠B = 70°, तो ∠C ज्ञात कीजिए।")} />
            </Panel>

            <Panel title={uiText("3. Images, figures, diagrams & graphs")} description={uiText("Unlimited images. Choose whether each shows with the question or below the solution. If none are added, the section is hidden.")}>
              <MediaListField value={form.attachments} onChange={(v) => setField('attachments', v)} showKind showPlacement kind="diagrams" />
            </Panel>

            <Panel title={uiText("4. YouTube video")}>
              <VideoField
                value={form.video?.video}
                onChange={(video) => setField('video', { ...form.video, video })}
                placement={form.video?.placement}
                onPlacementChange={(placement) => setField('video', { ...form.video, placement })}
                hint={uiText("Paste a YouTube link and choose where the player appears. You can also add a YouTube block between solution steps.")}
              />
            </Panel>

            <Panel title={uiText("5. Step-by-step solution")} description={uiText("Add blocks (Explanation → Steps → Formula → Diagram → Video → Final Answer) in any order. Drag to reorder.")}>
              <div className="space-y-4">
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
                <div className="max-w-sm">
                  <LanguageModeField label={uiText("Solution language mode")} value={form.solution?.languageMode} onChange={(languageMode) => setSolution({ languageMode })} />
                </div>
              </div>
            </Panel>

            <Panel title={uiText("6. Hint, short answer & important point")}>
              <div className="space-y-4">
                <RichL10nField label={uiText("Hint (students can reveal it)")} value={form.hint} onChange={(v) => setField('hint', v)} minimal />
                <RichL10nField label={uiText("Short answer")} hint={uiText("Used as the final answer when the solution has no “Final answer” block, and in search/FAQ snippets.")} value={form.answer} onChange={(v) => setField('answer', v)} minimal />
                <RichL10nField label={uiText("Important point")} value={form.importantPoint} onChange={(v) => setField('importantPoint', v)} minimal />
              </div>
            </Panel>

            <Panel title={uiText("7. SEO")}>
              <SeoFields
                value={form.seo}
                onChange={(v) => setField('seo', v)}
                fallbackTitle={exercise ? `Class ${chapter?.class?.number} Maths अध्याय ${chapter?.number} प्रश्नावली ${exercise.number} प्रश्न ${form.number} Solution` : ''}
                fallbackDescription={stripTags(adminText(form.text)).slice(0, 158)}
                path={path}
              />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={path} entityType="Question" id={id} data={form} solution={form.solution} />
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
