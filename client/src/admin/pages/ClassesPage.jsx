import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Shapes, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { L10nField, NumberField, SlugField, SwitchField, TextField } from '../components/fields/Fields.jsx';
import { RefMultiSelect } from '../components/fields/RefSelect.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
import { useResourceList } from '../lib/resources.js';

export function ClassesList() {
  useUiLanguage();
  return (
    <ResourceListPage
      resource="classes"
      description={uiText("Classes 6–12 (add future classes any time). Drag to change the order shown on the website.")}
      createPath={adminUrl('classes/new')}
      editPath={(item) => adminUrl(`classes/${item._id}`)}
      reorderable
      rowLabel={(c) => uiTemplate`Class ${c.number} — ${adminText(c.name) || ''}`}
      headerActions={
        <Button asChild variant="outline" size="lg">
          <Link to={adminUrl('subjects')}>
            <Shapes />{uiText("Subjects")}</Link>
        </Button>
      }
      columns={[
        { get header() { return uiText("Class"); }, className: 'w-16', cell: (c) => <span className="font-heading text-lg font-extrabold text-brand">{c.number}</span> },
        { get header() { return uiText("Name"); }, cell: (c) => <LocalizedCell value={c.name} /> },
        { get header() { return uiText("Subjects"); }, className: 'hidden md:table-cell', cell: (c) => c.subjects?.map((s) => s.name?.en || s.slug).join(', ') || '—' },
        { get header() { return uiText("Featured"); }, className: 'hidden sm:table-cell', cell: (c) => (c.featured ? <Star className="size-4 fill-current text-saffron" aria-label={uiText("Featured")} /> : null) },
      ]}
    />
  );
}

const CLASS_DEFAULTS = { number: undefined, name: {}, slug: '', description: {}, badge: {}, featured: false, subjects: [], thumbnail: null, seo: {}, status: 'draft', isVisible: true };

export function ClassEditor({ id }) {
  useUiLanguage();
  const editor = useEditorForm({ resource: 'classes', id, defaults: CLASS_DEFAULTS, basePath: adminUrl('classes') });
  const subjects = useResourceList('subjects', { limit: 50 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField } = editor;

  useEffect(() => {
    if (editor.isNew && form && !form.subjects?.length && subjects.data?.items?.length) editor.initialize({ subjects: [subjects.data.items[0]] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.isNew, subjects.data]);

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New class") : uiTemplate`Class ${form.number}`}
            description={uiText("Class landing page, card on the homepage and SEO.")}
            backTo={adminUrl('classes')}
            backLabel={uiText("All classes")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (editor.isNew ? toast.info(uiText("Save once to preview.")) : setPreviewOpen(true))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove()}
          >
            <Panel title={uiText("Class details")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField label={uiText("Class number")} required value={form.number} onChange={(v) => setField('number', v)} min={1} max={20} />
                <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.number ? `class-${form.number}` : ''} prefix="/" />
                <L10nField label={uiText("Class name")} required value={form.name} onChange={(v) => setField('name', v)} placeholder={uiText("कक्षा 10 गणित / Class 10 Mathematics")} />
                <L10nField label={uiText("Badge")} value={form.badge} onChange={(v) => setField('badge', v)} placeholder={uiText("Board Exam Special")} />
                <L10nField className="sm:col-span-2" label={uiText("Description")} multiline value={form.description} onChange={(v) => setField('description', v)} />
                <RefMultiSelect label={uiText("Subjects")} hint={uiText("Mathematics today; more subjects later.")} resource="subjects" value={form.subjects} onChange={(v) => setField('subjects', v)} />
                <SwitchField label={uiText("Featured (large card on homepage)")} checked={form.featured} onChange={(v) => setField('featured', v)} />
                <MediaField className="sm:col-span-2" label={uiText("Thumbnail / image")} value={form.thumbnail} onChange={(v) => setField('thumbnail', v)} kind="thumbnail" />
              </div>
            </Panel>
            <Panel title={uiText("SEO")}>
              <SeoFields value={form.seo} onChange={(v) => setField('seo', v)} fallbackTitle={`NCERT Solutions for Class ${form.number || ''} Maths`} fallbackDescription={form.description?.en} path={`/${form.slug || `class-${form.number || ''}`}`} />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={`/${form.slug}`} />
        </>
      )}
    </EditorGate>
  );
}

export function SubjectsList() {
  useUiLanguage();
  return (
    <div>
      <ResourceListPage
        resource="subjects"
        description={uiText("Subjects are shared across classes. Keep future subjects (Science, English…) private until you are ready to launch them.")}
        createPath={adminUrl('subjects/new')}
        editPath={(item) => adminUrl(`subjects/${item._id}`)}
        reorderable
        columns={[
          { get header() { return uiText("Subject"); }, cell: (s) => <LocalizedCell value={s.name} /> },
          { get header() { return uiText("Slug"); }, cell: (s) => <code className="text-xs">{s.slug}</code> },
          { get header() { return uiText("On website"); }, cell: (s) => (s.isPublic ? uiText("Public") : uiText("Private")) },
        ]}
      />
    </div>
  );
}

const SUBJECT_DEFAULTS = { name: {}, slug: '', description: {}, icon: 'sigma', isPublic: false, seo: {}, status: 'draft', isVisible: true };

export function SubjectEditor({ id }) {
  useUiLanguage();
  const editor = useEditorForm({ resource: 'subjects', id, defaults: SUBJECT_DEFAULTS, basePath: adminUrl('subjects') });
  const { form, setField } = editor;
  return (
    <EditorGate editor={editor}>
      {() => (
        <EditorShell
          title={editor.isNew ? uiText("New subject") : form.name?.en || uiText("Subject")}
          backTo={adminUrl('subjects')}
          backLabel={uiText("All subjects")}
          doc={editor.doc}
          form={form}
          setField={setField}
          dirty={editor.dirty}
          saving={editor.saving}
          onSave={editor.save}
          onDelete={() => editor.remove()}
        >
          <Panel title={uiText("Subject")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <L10nField label={uiText("Name")} required value={form.name} onChange={(v) => setField('name', v)} />
              <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.name?.en === 'Mathematics' ? 'maths' : form.name?.en} prefix="/class-10/" />
              <L10nField className="sm:col-span-2" label={uiText("Description")} multiline value={form.description} onChange={(v) => setField('description', v)} />
              <TextField label={uiText("Icon name")} value={form.icon} onChange={(v) => setField('icon', v)} />
              <SwitchField label={uiText("Public on the student website")} hint={uiText("Keep off for subjects that are still being prepared.")} checked={form.isPublic} onChange={(v) => setField('isPublic', v)} />
            </div>
          </Panel>
        </EditorShell>
      )}
    </EditorGate>
  );
}

export { PageHeader };
