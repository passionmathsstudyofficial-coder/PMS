import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { L10nField, NumberField, SlugField } from '../components/fields/Fields.jsx';
import { StudyPlacement } from '../components/StudyPlacement.jsx';
import { StudyBatchImport } from '../components/StudyBatchImport.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { useQueryFilters } from '../components/filters.jsx';
import { refId, RESOURCES } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
import { adminText } from '../lib/format.js';
import { ImportantQuestionEditor, NoteEditor } from './NotesPage.jsx';

const sectionConfig = {
  classes: ['study-classes', 'Class Management', 'class'],
  chapters: ['study-chapters', 'Chapter Management', 'chapter'],
  topics: ['study-topics', 'Topics Management', 'topic'],
  categories: ['question-categories', 'Question Category Management', 'category'],
  sets: ['question-sets', 'Question Set Management', 'set'],
  questions: ['important-questions', 'Question Management', 'question'],
  notes: ['notes', 'Notes Management', 'note'],
  formulas: ['notes', 'Formula Sheet Management', 'note'],
};
const sectionsByModule = {
  'important-questions': ['categories', 'classes', 'chapters', 'sets', 'questions', 'topics'],
  'notes-formulas': ['classes', 'chapters', 'notes', 'formulas', 'topics'],
};

const parentsBySection = {
  chapters: ['studyClass'],
  topics: ['studyClass', 'studyChapter'],
  sets: ['questionCategory', 'studyClass', 'studyChapter'],
  questions: ['questionCategory', 'studyClass', 'questionSet', 'studyChapter', 'studyTopic'],
  notes: ['studyClass', 'studyChapter', 'studyTopic'],
  formulas: ['studyClass', 'studyChapter', 'studyTopic'],
};
const titleOf = item => adminText(item.title) || (item.number == null ? item.slug : String(item.number));

function StudyList({ module, section, basePath }) {
  const [resource, title] = sectionConfig[section];
  const { can } = useAdminAuth();
  const bulk = ['questions', 'notes', 'formulas'].includes(section);
  const parentKeys = parentsBySection[section] || [];
  const [values, setFilter, active] = useQueryFilters(parentKeys);
  const baseParams = {
    ...active,
    ...(['classes', 'chapters', 'topics'].includes(section) ? { module } : {}),
    ...(section === 'questions' ? { scoped: 'true' } : {}),
    ...(resource === 'notes' ? { scoped: 'true', category: section === 'formulas' ? 'formula_sheet' : 'ncert_notes' } : {}),
  };
  return <>
    <nav className="flex flex-wrap gap-3 pb-4 text-sm" aria-label="CMS sections">
      {sectionsByModule[module].map(key => <Link key={key} aria-current={key === section ? 'page' : undefined}
        className={key === section ? 'font-semibold text-brand' : 'underline'}
        to={adminUrl(`study-cms/${module}/${key}`)}>{sectionConfig[key][1]}</Link>)}
      <Link className="underline" to={'/' + module}>Student page</Link>
    </nav>
    <ResourceListPage resource={resource} title={title} baseParams={baseParams}
      bulkStatus={bulk}
      showScheduledFilter
      headerActions={bulk && can('content:write') ? <StudyBatchImport resource={resource} category={baseParams.category} placement={active} /> : undefined}
      filters={<div className="flex flex-wrap gap-3">
        <StudyPlacement module={module} keys={parentKeys} values={values} onChange={(key, value) => setFilter(key, refId(value))} />
      </div>}
      createPath={`${basePath}/new?${new URLSearchParams(active)}`}
      editPath={item => `${basePath}/${item._id}`}
      canDuplicate={section !== 'classes'} reorderable rowLabel={titleOf} columns={[
        { header: 'Title', cell: titleOf },
        { header: 'Number', cell: item => item.number ?? '—' },
      ]} />
  </>;
}

function StudyRecordEditor({ module, section, id, basePath }) {
  const [resource, title, type] = sectionConfig[section];
  const params = new URLSearchParams(window.location.search);
  const parentKeys = parentsBySection[section] || [];
  const editor = useEditorForm({
    resource, id, basePath,
    defaults: { title: {}, description: {}, content: {}, status: 'draft', isVisible: true,
      ...(section === 'classes' ? { module, number: 6 } : {}),
      ...(section === 'chapters' ? { number: 1 } : {}),
      ...Object.fromEntries(parentKeys.map(key => [key, params.get(key)])),
    },
    fromForm: data => {
      const result = { ...data };
      if (section === 'topics') delete result.studyClass;
      return result;
    },
  });
  const [preview, setPreview] = useState(false);
  const { form, setField } = editor;
  const path = editor.isNew ? null : `/${module}/${type}/${id}`;
  return <EditorGate editor={editor}>{() => <EditorShell title={title} backTo={basePath}
    doc={editor.doc} form={form} setField={setField} dirty={editor.dirty} saving={editor.saving}
    onSave={editor.save} onDelete={editor.isNew ? undefined : () => editor.remove()}
    onPreview={path ? () => setPreview(true) : undefined}>
    <Panel title="Details">
      <div className="grid gap-4 sm:grid-cols-2">
        <StudyPlacement module={module} keys={section === 'topics' && !editor.isNew ? ['studyChapter'] : parentKeys} values={form}
          onChange={(key, value) => editor.setForm(current => ({
            ...current, ...Object.fromEntries(parentKeys.slice(parentKeys.indexOf(key) + 1).map(child => [child, null])), [key]: value,
          }))}
          required={parentKeys.filter(key => section !== 'sets' || key !== 'studyChapter')} disabled={!editor.isNew} />
        {['classes', 'chapters'].includes(section) && <NumberField label="Number" value={form.number} onChange={v => setField('number', v)} />}
        <NumberField label="Display order" value={form.sortOrder ?? 0} onChange={v => setField('sortOrder', v)} />
        <SlugField value={form.slug} suggestion={form.title?.en} onChange={v => setField('slug', v)} />
        <L10nField label="Title" value={form.title} onChange={v => setField('title', v)} />
        <L10nField label="Description" multiline value={form.description} onChange={v => setField('description', v)} />
        <MediaField label="Image" kind="image" value={form.thumbnail} onChange={v => setField('thumbnail', v)} />
        <MediaField label="PDF" kind="pdf" value={form.pdfFile} onChange={v => setField('pdfFile', v)} />
      </div>
    </Panel>
    <Panel title="Content"><RichL10nField value={form.content} onChange={v => setField('content', v)} /></Panel>
    <Panel title="SEO"><SeoFields value={form.seo} onChange={v => setField('seo', v)} /></Panel>
    <PreviewDialog open={preview} onOpenChange={setPreview} path={path} entityType={RESOURCES[resource].entityType} id={id} data={form} />
  </EditorShell>}</EditorGate>;
}

export default function StudyCmsPage() {
  const { module, section, id } = useParams();
  if (!sectionsByModule[module]?.includes(section)) return <Navigate to={adminUrl('study-cms/important-questions/categories')} replace />;
  const basePath = adminUrl(`study-cms/${module}/${section}`);
  if (!id) return <StudyList key={basePath} module={module} section={section} basePath={basePath} />;
  if (section === 'questions') return <ImportantQuestionEditor key={id} id={id} studyBasePath={basePath} />;
  if (section === 'notes' || section === 'formulas') return <NoteEditor key={`${section}/${id}`} id={id}
    studyBasePath={basePath} studyCategory={section === 'formulas' ? 'formula_sheet' : 'ncert_notes'} />;
  return <StudyRecordEditor key={`${basePath}/${id}`} module={module} section={section} id={id} basePath={basePath} />;
}
