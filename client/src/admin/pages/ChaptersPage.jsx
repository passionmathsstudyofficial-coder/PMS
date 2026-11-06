import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ClassFilter, useQueryFilters } from '../components/filters.jsx';
import { Field, L10nField, LanguageModeField, NumberField, SlugField, SwitchField } from '../components/fields/Fields.jsx';
import { AcademicSessionField } from '../components/fields/AcademicSessionField.jsx';
import { FormulaInput } from '../components/fields/FormulaInput.jsx';
import { RefMultiSelect, RefSelect } from '../components/fields/RefSelect.jsx';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { VideoField } from '../components/fields/VideoField.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { DragHandle, SortableList, clientKey, itemKey, moveItem } from '../components/SortableList.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { refId, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export function ChaptersList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class']);
  return (
    <ResourceListPage
      resource="chapters"
      title={uiText("Chapters (अध्याय)")}
      description={uiText("Class → Mathematics → अध्याय. Choose a class to drag-and-drop the chapter order.")}
      baseParams={active}
      filters={<ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />}
      createPath={adminUrl(`chapters/new${filters.class ? `?class=${filters.class}` : ''}`)}
      createLabel={uiText("New अध्याय")}
      editPath={(item) => adminUrl(`chapters/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.class ? undefined : uiText("Choose a class to reorder its अध्याय.")}
      rowLabel={(c) => uiTemplate`अध्याय ${c.number} — ${adminText(c.title) || ''}`}
      columns={[
        { get header() { return uiText("No."); }, className: 'w-14', cell: (c) => <span className="font-heading font-extrabold text-brand">{c.number}</span> },
        { get header() { return uiText("Title"); }, cell: (c) => <LocalizedCell value={c.title} /> },
        { get header() { return uiText("Class"); }, className: 'hidden sm:table-cell', cell: (c) => (c.class ? uiTemplate`Class ${c.class.number}` : '—') },
        { get header() { return uiText("Featured"); }, className: 'hidden md:table-cell', cell: (c) => (c.featured ? <Star className="size-4 fill-current text-saffron" aria-label={uiText("Featured")} /> : null) },
      ]}
    />
  );
}

import { FormulaListField } from '../components/fields/FormulaListField.jsx';
export { FormulaListField };

function ChapterExercisesPanel({ chapterId, classId }) {
  useUiLanguage();
  const list = useResourceList('exercises', { chapter: chapterId, limit: 100 });
  return (
    <Panel
      title={uiText("प्रश्नावली in this अध्याय")}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to={adminUrl(`exercises/new?chapter=${chapterId}`)}>
            <Plus />{uiText("Add")}</Link>
        </Button>
      }
    >
      {list.data?.items?.length ? (
        <ul className="space-y-1">
          {list.data.items.map((ex) => (
            <li key={ex._id}>
              <Link to={adminUrl(`exercises/${ex._id}`)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">{' '}{uiText("प्रश्नावली")}{' '}{ex.number} <StatusBadge doc={ex} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{uiText("No प्रश्नावली yet.")}</p>
      )}
      <Button asChild variant="link" size="sm" className="mt-2 px-0">
        <Link to={adminUrl(`exercises?class=${classId || ''}&chapter=${chapterId}`)}>{uiText("Manage & reorder →")}</Link>
      </Button>
    </Panel>
  );
}

const CHAPTER_DEFAULTS = {
  class: null,
  subject: null,
  book: null,
  academicSession: '2026-27',
  number: undefined,
  title: {},
  slug: '',
  shortDescription: {},
  image: null,
  featuredImage: null,
  introVideo: null,
  pdfFile: null,
  pdfUrl: '',
  introduction: {},
  formulas: [],
  notes: {},
  relatedChapters: [],
  featured: false,
  languageMode: 'auto',
  seo: {},
  status: 'draft',
  isVisible: true,
};

export function ChapterEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const editor = useEditorForm({ resource: 'chapters', id, basePath: adminUrl('chapters'), defaults: { ...CHAPTER_DEFAULTS, class: params.get('class') || null, book: params.get('book') || null, academicSession: params.get('session') || CHAPTER_DEFAULTS.academicSession } });
  const subjects = useResourceList('subjects', { limit: 50 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField } = editor;

  useEffect(() => {
    if (editor.isNew && form && !form.subject && subjects.data?.items?.length) editor.initialize({ subject: subjects.data.items[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.isNew, subjects.data]);

  const classSlug = form?.class?.slug;
  const subjectSlug = form?.subject?.slug;
  const path = classSlug && subjectSlug && form.slug ? `/${classSlug}/${subjectSlug}/${form.slug}` : null;

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New अध्याय (chapter)") : uiTemplate`अध्याय ${form.number} — ${adminText(form.title) || ''}`}
            description={uiText("Chapter page: introduction, formulas, video, notes and the list of प्रश्नावली.")}
            backTo={adminUrl('chapters')}
            backLabel={uiText("All chapters")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (path ? setPreviewOpen(true) : toast.info(uiText("Save once to preview.")))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove()}
            sidebar={
              <>
                <Panel title={uiText("Display")}>
                  <div className="space-y-3">
                    <SwitchField label={uiText("Featured on homepage")} checked={form.featured} onChange={(v) => setField('featured', v)} />
                    <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                  </div>
                </Panel>
                {!editor.isNew && <ChapterExercisesPanel chapterId={id} classId={refId(form.class)} />}
              </>
            }
          >
            <Panel title={uiText("Location & title")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <RefSelect label={uiText("Class")} required resource="classes" value={form.class} onChange={(v) => setField('class', v)} />
                <RefSelect label={uiText("Subject")} required resource="subjects" value={form.subject} onChange={(v) => setField('subject', v)} />
                <RefSelect
                  label={uiText("Reference Book (Optional — संदर्भ पुस्तक)")}
                  resource="books"
                  value={form.book}
                  onChange={(v) => setField('book', v)}
                  labelOf={(b) => adminText(b.title) || b.name || uiText("Book")}
                />
                <AcademicSessionField value={form.academicSession} onChange={(v) => setField('academicSession', v)} />
                <NumberField label={uiText("अध्याय number")} required value={form.number} onChange={(v) => setField('number', v)} min={0} />
                <NumberField label={uiText('Syllabus marks (optional)')} value={form.syllabusMarks} onChange={(v) => setField('syllabusMarks', v)} min={0} />
                <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.number !== undefined ? `adhyay-${form.number}` : ''} prefix={classSlug ? `/${classSlug}/${subjectSlug || 'maths'}/` : undefined} />
                <L10nField className="sm:col-span-2" label={uiText("Title")} required value={form.title} onChange={(v) => setField('title', v)} placeholder={uiText("समांतर श्रेढ़ियाँ / Arithmetic Progressions")} />
                <L10nField className="sm:col-span-2" label={uiText("Short description")} multiline rows={2} value={form.shortDescription} onChange={(v) => setField('shortDescription', v)} />
              </div>
            </Panel>
            <Panel title={uiText("PDF Solutions / Chapter Notes (Optional)")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Chapter PDF / Solution")} kind="pdf" value={form.pdfFile} onChange={(v) => setField('pdfFile', v)} hint={uiText("Upload full chapter notes/solution PDF.")} />
                <Field label={uiText("Or External Chapter PDF URL")}>
                  <input type="url" value={form.pdfUrl || ''} onChange={(e) => setField('pdfUrl', e.target.value)} placeholder="https://..." className="h-9 w-full rounded-md border bg-transparent px-3 text-xs" />
                </Field>
              </div>
            </Panel>
            <Panel title={uiText("Images & video")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaField label={uiText("Chapter image (cards)")} value={form.image} onChange={(v) => setField('image', v)} />
                <MediaField label={uiText("Featured image (top of page)")} value={form.featuredImage} onChange={(v) => setField('featuredImage', v)} />
                <div className="sm:col-span-2">
                  <VideoField label={uiText("Introduction video")} value={form.introVideo} onChange={(v) => setField('introVideo', v)} hint={uiText("Shown near the top of the अध्याय page.")} />
                </div>
              </div>
            </Panel>
            <Panel title={uiText("Introduction")}>
              <RichL10nField value={form.introduction} onChange={(v) => setField('introduction', v)} />
            </Panel>
            <Panel title={uiText("Formulas")}>
              <FormulaListField value={form.formulas} onChange={(v) => setField('formulas', v)} />
            </Panel>
            <Panel title={uiText("Notes")}>
              <RichL10nField value={form.notes} onChange={(v) => setField('notes', v)} />
            </Panel>
            <Panel title={uiText("Related chapters")} description={uiText("Pick chapters to link manually. Nearby chapters are suggested automatically when empty.")}>
              <RefMultiSelect resource="chapters" value={form.relatedChapters} onChange={(v) => setField('relatedChapters', v)} params={refId(form.class) ? { class: refId(form.class) } : {}} />
            </Panel>
            <Panel title={uiText("SEO")}>
              <SeoFields
                value={form.seo}
                onChange={(v) => setField('seo', v)}
                fallbackTitle={`Class ${form.class?.number || ''} Maths अध्याय ${form.number ?? ''} – ${form.title?.hi || ''}`}
                fallbackDescription={adminText(form.shortDescription)}
                path={path}
              />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={path} entityType="Chapter" id={id} data={form} />
        </>
      )}
    </EditorGate>
  );
}
