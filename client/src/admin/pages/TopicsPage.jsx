import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowDown, ArrowUp, ExternalLink, HelpCircle, Plus, Sparkles, Trash2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ClassFilter, useQueryFilters } from '../components/filters.jsx';
import { Field, L10nField, LanguageModeField, NumberField, SelectField, SlugField, SwitchField } from '../components/fields/Fields.jsx';
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

export function TopicsList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'chapter']);
  return (
    <ResourceListPage
      resource="topics"
      title={uiText("Topics (विषय / टॉपिक)")}
      description={uiText("Class → Mathematics → Chapter → Topics. Full digital classroom topic learning page.")}
      baseParams={active}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />
          {filters.class && (
            <RefSelect
              resource="chapters"
              params={{ class: filters.class, limit: 100 }}
              value={filters.chapter}
              onChange={(v) => setFilter('chapter', v)}
              placeholder={uiText("All Chapters (अध्याय)")}
              labelOf={(c) => uiTemplate`अध्याय ${c.number} — ${adminText(c.title) || ''}`}
              className="w-56"
            />
          )}
        </div>
      }
      createPath={adminUrl(`topics/new${filters.class ? `?class=${filters.class}` : ''}${filters.chapter ? `&chapter=${filters.chapter}` : ''}`)}
      createLabel={uiText("New Topic")}
      editPath={(item) => adminUrl(`topics/${item._id}`)}
      reorderable
      reorderDisabledReason={filters.chapter ? undefined : uiText("Choose a chapter to reorder its topics.")}
      rowLabel={(tp) => uiTemplate`Topic ${tp.number} — ${adminText(tp.title) || ''}`}
      columns={[
        { get header() { return uiText("No."); }, className: 'w-14', cell: (tp) => <span className="font-heading font-extrabold text-brand">{tp.number}</span> },
        { get header() { return uiText("Title"); }, cell: (tp) => <LocalizedCell value={tp.title} /> },
        { get header() { return uiText("Chapter"); }, className: 'hidden sm:table-cell', cell: (tp) => (tp.chapter ? uiTemplate`अध्याय ${tp.chapter.number}` : '—') },
        { get header() { return uiText("Class"); }, className: 'hidden md:table-cell', cell: (tp) => (tp.class ? uiTemplate`Class ${tp.class.number}` : '—') },
        {
          get header() { return uiText("Difficulty"); },
          className: 'hidden lg:table-cell',
          cell: (tp) => (
            <span className="capitalize text-xs font-semibold text-muted-foreground">{uiText(tp.difficulty || 'beginner')}</span>
          ),
        },
      ]}
    />
  );
}

function TopicFormulasField({ value = [], onChange }) {
  useUiLanguage();
  const items = value.map((f) => (itemKey(f) ? f : { ...f, _key: clientKey() }));
  const update = (index, patch) => onChange(items.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  return (
    <Field label={uiText("Topic Formulas (सूत्र)")} hint={uiText("Mathematical formulas and theorems highlighted for this topic.")}>
      <SortableList
        items={items}
        onChange={onChange}
        className="space-y-3"
        renderItem={(formula, index, { ref, style, handleProps }) => (
          <li ref={ref} style={style} className="rounded-xl border bg-background p-3">
            <div className="mb-2 flex items-center gap-1">
              <DragHandle {...handleProps} />
              <span className="text-xs font-semibold text-muted-foreground">{uiText("Formula")}{index + 1}</span>
              <span className="ml-auto flex">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index - 1))} disabled={index === 0} aria-label={uiText("Move up")}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index + 1))} disabled={index === items.length - 1} aria-label={uiText("Move down")}>
                  <ArrowDown />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={uiText("Remove formula")}>
                  <Trash2 className="text-destructive" />
                </Button>
              </span>
            </div>
            <div className="grid gap-3">
              <L10nField label={uiText("Formula Name")} value={formula.title} onChange={(title) => update(index, { title })} placeholder={uiText("e.g. Quadratic Formula / द्विघाती सूत्र")} />
              <FormulaInput value={formula.latex} onChange={(latex) => update(index, { latex })} />
              <L10nField label={uiText("Short Explanation")} value={formula.description} onChange={(description) => update(index, { description })} />
            </div>
          </li>
        )}
      />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...items, { _key: clientKey(), title: {}, latex: '', description: {} }])}>
        <Plus />{uiText("Add Formula")}</Button>
    </Field>
  );
}

function TopicQuestionsField({ value = [], onChange }) {
  useUiLanguage();
  const items = value.map((q) => (itemKey(q) ? q : { ...q, _key: clientKey() }));
  const update = (index, patch) => onChange(items.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <Field label={uiText("Practice Questions (अभ्यास प्रश्न)")} hint={uiText("Topic-specific problems with step-by-step solutions for students to practice.")}>
      <SortableList
        items={items}
        onChange={onChange}
        className="space-y-4"
        renderItem={(item, index, { ref, style, handleProps }) => (
          <li ref={ref} style={style} className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-1 border-b pb-2">
              <DragHandle {...handleProps} />
              <span className="text-xs font-bold text-brand">{uiText("Question")}{index + 1}</span>
              <span className="ml-auto flex">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index - 1))} disabled={index === 0} aria-label={uiText("Move up")}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index + 1))} disabled={index === items.length - 1} aria-label={uiText("Move down")}>
                  <ArrowDown />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={uiText("Remove question")}>
                  <Trash2 className="text-destructive" />
                </Button>
              </span>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={uiText("Difficulty")}
                  value={item.difficulty || 'easy'}
                  onChange={(difficulty) => update(index, { difficulty })}
                  options={[
                    { value: 'beginner', get label() { return uiText("Beginner"); } },
                    { value: 'easy', get label() { return uiText("Easy"); } },
                    { value: 'medium', get label() { return uiText("Medium"); } },
                    { value: 'hard', get label() { return uiText("Hard"); } },
                  ]}
                />
                <NumberField label={uiText("Marks")} value={item.marks || 1} onChange={(marks) => update(index, { marks })} min={1} max={20} />
              </div>

              <L10nField label={uiText("Question Text")} value={item.question} onChange={(question) => update(index, { question })} placeholder={uiText("State the question...")} />
              <L10nField label={uiText("Hint (Optional)")} value={item.hint} onChange={(hint) => update(index, { hint })} placeholder={uiText("Helpful hint for students...")} />
              <L10nField label={uiText("Final Answer")} value={item.answer} onChange={(answer) => update(index, { answer })} placeholder={uiText("e.g. x = 2 or x = 3")} />
              <RichL10nField label={uiText("Step-by-Step Solution")} value={item.solution} onChange={(solution) => update(index, { solution })} />
            </div>
          </li>
        )}
      />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...items, { _key: clientKey(), question: {}, hint: {}, answer: {}, solution: {}, difficulty: 'easy', marks: 1 }])}>
        <Plus />{uiText("Add Practice Question")}</Button>
    </Field>
  );
}

function TopicExternalLinksField({ value = [], onChange }) {
  useUiLanguage();
  const items = value.map((l) => (itemKey(l) ? l : { ...l, _key: clientKey() }));
  const update = (index, patch) => onChange(items.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <Field label={uiText("Additional Reference Links")} hint={uiText("External articles, Geogebra applets, simulation tools, or helpful learning sites.")}>
      <SortableList
        items={items}
        onChange={onChange}
        className="space-y-3"
        renderItem={(link, index, { ref, style, handleProps }) => (
          <li ref={ref} style={style} className="rounded-xl border bg-background p-3">
            <div className="mb-2 flex items-center gap-1">
              <DragHandle {...handleProps} />
              <span className="text-xs font-semibold text-muted-foreground">{uiText("Link")}{index + 1}</span>
              <span className="ml-auto flex">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={uiText("Remove link")}>
                  <Trash2 className="text-destructive" />
                </Button>
              </span>
            </div>
            <div className="grid gap-2">
              <L10nField label={uiText("Link Title")} value={link.title} onChange={(title) => update(index, { title })} placeholder={uiText("e.g. Interactive Quadratic Graph Explorer")} />
              <Field label={uiText("Target URL")}>
                <input
                  type="url"
                  value={link.url || ''}
                  onChange={(e) => update(index, { url: e.target.value })}
                  placeholder="https://..."
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
              <L10nField label={uiText("Description")} value={link.description} onChange={(description) => update(index, { description })} />
            </div>
          </li>
        )}
      />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...items, { _key: clientKey(), title: {}, url: '', description: {}, category: 'reference' }])}>
        <Plus />{uiText("Add Reference Link")}</Button>
    </Field>
  );
}

export function TopicEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const [previewOpen, setPreviewOpen] = useState(false);
  const form = useEditorForm({
    resource: 'topics',
    id,
    basePath: adminUrl('topics'),
    entityType: 'Topic',
    defaults: () => ({
      class: params.get('class') || '',
      chapter: params.get('chapter') || '',
      number: 1,
      title: { hi: '', en: '', mixed: '' },
      slug: '',
      shortDescription: { hi: '', en: '', mixed: '' },
      difficulty: 'beginner',
      estimatedTime: { hi: '30 मिनट', en: '30 min', mixed: '30 min' },
      notes: { hi: '', en: '', mixed: '' },
      formulas: [],
      practiceQuestions: [],
      externalLinks: [],
      resources: [],
      books: [],
      status: 'draft',
      isVisible: true,
      sortOrder: 0,
      languageMode: 'auto',
    }),
  });

  const { doc, set, isNew } = form;
  const classId = refId(doc?.class);
  const chapterId = refId(doc?.chapter);

  const classes = useResourceList('classes', { limit: 50 });
  const classItems = classes.data?.items || [];
  const selectedClass = classItems.find((c) => String(c._id) === String(classId));
  const mathSubject = selectedClass?.subjects?.[0];

  const chapters = useResourceList('chapters', classId ? { class: classId, limit: 100 } : { limit: 100 });
  const chapterItems = chapters.data?.items || [];
  const selectedChapter = chapterItems.find((ch) => String(ch._id) === String(chapterId)) || (typeof doc?.chapter === 'object' ? doc?.chapter : null);
  const classSlug = selectedClass?.slug || (typeof doc?.class === 'object' ? doc?.class?.slug : null) || (doc?.class?.number ? `class-${doc.class.number}` : 'class-10');
  const chapterSlug = selectedChapter?.slug || (typeof doc?.chapter === 'object' ? doc?.chapter?.slug : null) || 'adhyay-4';
  const previewPath = doc?.slug
    ? `/${classSlug}/maths/${chapterSlug}/topic/${doc.slug}`
    : undefined;

  useEffect(() => {
    if (mathSubject && doc && !doc.subject) {
      set('subject', mathSubject._id || mathSubject);
    }
  }, [mathSubject, doc?.subject, set]);

  return (
    <EditorGate form={form}>
      {() => (
        <>
          <EditorShell
            form={form}
            title={isNew ? uiText("New Topic") : uiTemplate`Topic ${doc?.number ?? ''} — ${adminText(doc?.title) || ''}`}
            onPreview={() => (previewPath && !isNew ? setPreviewOpen(true) : toast.info(uiText("Save once to preview.")))}
          >
        <div className="grid gap-6">
          <Panel title={uiText("Placement & Hierarchy")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <RefSelect
                label={uiText("Class (कक्षा)")}
                resource="classes"
                params={{ limit: 50 }}
                value={classId}
                onChange={(c) => {
                  set('class', c);
                  set('chapter', '');
                }}
                labelOf={(c) => uiTemplate`Class ${c.number} — ${adminText(c.name) || ''}`}
                required
              />
              <RefSelect
                label={uiText("Chapter (अध्याय)")}
                resource="chapters"
                params={{ class: classId, limit: 100 }}
                disabled={!classId}
                value={chapterId}
                onChange={(ch) => set('chapter', ch)}
                labelOf={(ch) => uiTemplate`अध्याय ${ch.number} — ${adminText(ch.title) || ''}`}
                required
              />
            </div>
          </Panel>

          <Panel title={uiText("Topic Identification")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label={uiText("Topic Number")} value={doc.number} onChange={(number) => set('number', number)} min={0} required />
              <SelectField
                label={uiText("Difficulty Level")}
                value={doc.difficulty || 'beginner'}
                onChange={(difficulty) => set('difficulty', difficulty)}
                options={[
                  { value: 'beginner', get label() { return uiText("Beginner / शुरुआती"); } },
                  { value: 'easy', get label() { return uiText("Easy / आसान"); } },
                  { value: 'medium', get label() { return uiText("Medium / मध्यम"); } },
                  { value: 'hard', get label() { return uiText("Hard / कठिन"); } },
                ]}
              />
              <L10nField label={uiText("Estimated Learning Time")} value={doc.estimatedTime} onChange={(estimatedTime) => set('estimatedTime', estimatedTime)} placeholder={uiText("e.g. 30 min")} />
            </div>

            <L10nField label={uiText("Topic Title")} value={doc.title} onChange={(title) => set('title', title)} placeholder={uiText("e.g. Introduction to Quadratic Equations")} required />
            <SlugField value={doc.slug} onChange={(slug) => set('slug', slug)} source={doc.title?.en || doc.title?.hi} />
            <L10nField label={uiText("Short Description / Concept Summary")} value={doc.shortDescription} onChange={(shortDescription) => set('shortDescription', shortDescription)} />
            <LanguageModeField value={doc.languageMode} onChange={(m) => set('languageMode', m)} />
          </Panel>

          <Panel title={uiText("Video Lessons (वीडियो कक्षाएं)")}>
            <VideoField label={uiText("Featured / Main Video")} value={doc.video} onChange={(video) => set('video', video)} hint={uiText("Primary video lecture displayed at the top of the topic learning page.")} />
            <RefMultiSelect
              label={uiText("Additional Playlist Videos")}
              resource="videos"
              value={doc.videos}
              onChange={(videos) => set('videos', videos)}
              labelOf={(v) => adminText(v.title) || v.url}
              hint={uiText("Additional video lessons or problem walk-throughs for this topic.")}
            />
          </Panel>

          <Panel title={uiText("Complete Study Notes (अध्ययन नोट्स)")}>
            <RichL10nField
              label={uiText("Topic Notes Content")}
              value={doc.notes}
              onChange={(notes) => set('notes', notes)}
              hint={uiText("Formatted notes with headings, paragraphs, definitions, and KaTeX mathematical formulas.")}
            />
          </Panel>

          <Panel title={uiText("Important Formulas (मुख्य सूत्र)")}>
            <TopicFormulasField value={doc.formulas || []} onChange={(formulas) => set('formulas', formulas)} />
          </Panel>

          <Panel title={uiText("Practice Questions & Solutions (अभ्यास प्रश्न)")}>
            <TopicQuestionsField value={doc.practiceQuestions || []} onChange={(practiceQuestions) => set('practiceQuestions', practiceQuestions)} />
          </Panel>

          <Panel title={uiText("Attached Study Materials & Reference Books")}>
            <div className="grid gap-4">
              <RefMultiSelect
                label={uiText("Attached PDF Resources")}
                resource="resources"
                params={{ class: classId }}
                value={doc.resources}
                onChange={(resources) => set('resources', resources)}
                labelOf={(r) => `${uiText(r.resourceType)}: ${adminText(r.title) || 'PDF'}`}
                hint={uiText("Attach specific PDF notes or worksheets from the Resources Library to this topic.")}
              />
              <RefMultiSelect
                label={uiText("Recommended Reference Books")}
                resource="books"
                params={{ class: classId }}
                value={doc.books}
                onChange={(books) => set('books', books)}
                labelOf={(b) => `${b.author} — ${adminText(b.title) || 'Book'}`}
                hint={uiText("Attach recommended books with external purchase links.")}
              />
            </div>
          </Panel>

          <Panel title={uiText("External Learning Links")}>
            <TopicExternalLinksField value={doc.externalLinks || []} onChange={(externalLinks) => set('externalLinks', externalLinks)} />
          </Panel>

          <Panel title={uiText("Visuals & Media")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaField label={uiText("Topic Thumbnail / Card Image")} value={doc.image} onChange={(image) => set('image', image)} />
              <MediaField label={uiText("Featured Hero Image")} value={doc.featuredImage} onChange={(featuredImage) => set('featuredImage', featuredImage)} />
            </div>
          </Panel>

          <Panel title={uiText("SEO & Meta Information")}>
            <SeoFields value={doc.seo} onChange={(seo) => set('seo', seo)} />
          </Panel>
        </div>
      </EditorShell>
      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        path={previewPath}
        entityType="Topic"
        id={id}
        data={form.form}
      />
    </>
  )}
</EditorGate>
  );
}
