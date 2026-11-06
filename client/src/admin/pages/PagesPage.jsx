import { adminText } from '../lib/format.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/notifications.jsx';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { L10nField, LanguageModeField, SelectField, SlugField, SwitchField, TextField } from '../components/fields/Fields.jsx';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { stripTags } from '../lib/format.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export function PagesList() {
  useUiLanguage();
  return (
    <ResourceListPage
      resource="pages"
      description={uiText("Create, edit, preview, publish, and manage standalone website pages and their SEO content.")}
      createPath={adminUrl('pages/new')}
      editPath={(p) => adminUrl(`pages/${p._id}`)}
      columns={[
        { get header() { return uiText("Title"); }, cell: (p) => <LocalizedCell value={p.title} /> },
        { get header() { return uiText("URL"); }, cell: (p) => <code className="text-xs">/{p.slug}</code> },
        { get header() { return uiText("Template"); }, className: 'hidden sm:table-cell', cell: (p) => uiText(p.template) },
      ]}
    />
  );
}

const LANDING_KEYS = [
  'study-materials', 'study-materials/ncert-books', 'study-materials/previous-year-questions', 'study-materials/pyq', 'study-materials/cbse-sample-papers', 'study-materials/maths-syllabus', 'study-materials/syllabus', 'study-materials/cbse-extra-questions', 'study-materials/extra-questions', 'study-materials/vvi-questions', 'study-materials/important-questions',
  'notes', 'notes/ncert-chapter-wise-notes', 'notes/ncert-notes', 'notes/maths-formula-sheets', 'notes/rs-aggarwal-formulas-notes', 'notes/rd-sharma-formulas-notes', 'notes/ml-aggarwal-formulas-notes', 'notes/kc-sinha-formulas-notes', 'notes/vvi-questions-short-notes',
  'reference-solutions', 'reference-solutions/rs-aggarwal', 'reference-solutions/rd-sharma', 'reference-solutions/ml-aggarwal', 'reference-solutions/kc-sinha',
];
const PAGE_DEFAULTS = { landingKey: '', title: {}, slug: '', excerpt: {}, content: {}, hero: { title: {}, description: {}, image: null, banner: null }, sections: [], template: 'default', languageMode: 'auto', seo: {}, status: 'draft', isVisible: true };

export function PageEditor({ id }) {
  useUiLanguage();
  const editor = useEditorForm({ resource: 'pages', id, defaults: PAGE_DEFAULTS, basePath: adminUrl('pages') });
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField, setForm } = editor;
  const previewPath = form.landingKey ? `/${form.landingKey}` : `/${form.slug}`;
  const setItems = (sectionIndex, items) => setField('sections', form.sections.map((section, i) => i === sectionIndex ? { ...section, items } : section));
  const setPath = (path, value) => setForm((current) => {
    const keys = path.split('.');
    const next = { ...current };
    let target = next;
    let source = current;
    keys.slice(0, -1).forEach((key) => { target[key] = { ...(source?.[key] || {}) }; target = target[key]; source = source?.[key]; });
    target[keys[keys.length - 1]] = value;
    return next;
  });
  const moveSection = (index, direction) => {
    const next = [...(form.sections || [])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setField('sections', next.map((section, sortOrder) => ({ ...section, sortOrder })));
  };
  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={editor.isNew ? uiText("New page") : adminText(form.title)}
            backTo={adminUrl('pages')}
            backLabel={uiText("All pages")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => (editor.isNew ? toast.info(uiText("Save once to preview.")) : setPreviewOpen(true))}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove()}
            sidebar={
              <Panel title={uiText("Layout")}>
                <div className="space-y-3">
                  <SelectField label={uiText("Editable landing page (optional)")} value={form.landingKey || ''} onChange={(v) => setField('landingKey', v)} options={[{ value: '', label: uiText('Standalone page') }, ...LANDING_KEYS.map((value) => ({ value, label: value }))]} />
                  <SelectField
                    label={uiText("Template")}
                    value={form.template}
                    onChange={(v) => setField('template', v)}
                    options={[
                      { value: 'default', get label() { return uiText("Default"); } },
                      { value: 'contact', get label() { return uiText("Contact (shows contact details)"); } },
                      { value: 'legal', get label() { return uiText("Legal (shows last updated date)"); } },
                    ]}
                  />
                  <LanguageModeField value={form.languageMode} onChange={(v) => setField('languageMode', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Page")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField label={uiText("Title")} required value={form.title} onChange={(v) => setField('title', v)} />
                <SlugField value={form.slug} onChange={(v) => setField('slug', v)} suggestion={form.title?.en} prefix="/" />
                <L10nField className="sm:col-span-2" label={uiText("Intro line")} multiline rows={2} value={form.excerpt} onChange={(v) => setField('excerpt', v)} />
              </div>
            </Panel>
            <Panel title={uiText("Content")}>
              <RichL10nField value={form.content} onChange={(v) => setField('content', v)} />
            </Panel>
            <Panel title={uiText('Landing hero')} description={uiText('Used on the matching public category page when this page is published.')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField label={uiText('Hero title')} value={form.hero?.title} onChange={(v) => setPath('hero.title', v)} />
                <L10nField label={uiText('Hero description')} multiline value={form.hero?.description} onChange={(v) => setPath('hero.description', v)} />
                <MediaField label={uiText('Hero image')} value={form.hero?.image} onChange={(v) => setPath('hero.image', v)} />
                <MediaField label={uiText('Banner image')} value={form.hero?.banner} onChange={(v) => setPath('hero.banner', v)} />
              </div>
            </Panel>
            <Panel title={uiText('Editable sections')} actions={<Button type="button" variant="outline" size="sm" onClick={() => setField('sections', [...(form.sections || []), { type: 'richText', title: {}, text: {}, visible: true, sortOrder: form.sections?.length || 0, items: [] }])}>{uiText('Add section')}</Button>}>
              <div className="space-y-4">{(form.sections || []).map((section, index) => <div key={index} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SelectField label={uiText('Section type')} value={section.type || 'richText'} onChange={(v) => setField('sections', form.sections.map((item, i) => i === index ? { ...item, type: v } : item))} options={['richText', 'image', 'resourceCards', 'buttons', 'faq'].map((value) => ({ value, label: value }))} />
                  <SwitchField label={uiText('Visible')} checked={section.visible !== false} onChange={(v) => setField('sections', form.sections.map((item, i) => i === index ? { ...item, visible: v } : item))} />
                  <Button type="button" variant="outline" size="sm" disabled={!index} onClick={() => moveSection(index, -1)}>{uiText('Move up')}</Button>
                  <Button type="button" variant="outline" size="sm" disabled={index === form.sections.length - 1} onClick={() => moveSection(index, 1)}>{uiText('Move down')}</Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setField('sections', form.sections.filter((_, i) => i !== index))}>{uiText('Delete')}</Button>
                </div>
                <L10nField label={uiText('Section heading')} value={section.title} onChange={(v) => setField('sections', form.sections.map((item, i) => i === index ? { ...item, title: v } : item))} />
                <RichL10nField value={section.text} onChange={(v) => setField('sections', form.sections.map((item, i) => i === index ? { ...item, text: v } : item))} />
                <MediaField label={uiText('Section image')} value={section.image} onChange={(v) => setField('sections', form.sections.map((item, i) => i === index ? { ...item, image: v } : item))} />
                {['resourceCards', 'buttons', 'faq'].includes(section.type) && <div className="space-y-3">
                  {(section.items || []).map((entry, entryIndex) => {
                    const update = (key, value) => setItems(index, section.items.map((item, i) => i === entryIndex ? { ...item, [key]: value } : item));
                    return <div key={entry._id || entryIndex} className="space-y-3 rounded-xl border p-3">
                      <L10nField label={uiText('Title')} value={entry.title} onChange={(value) => update('title', value)} />
                      <L10nField label={uiText('Description')} multiline value={entry.text} onChange={(value) => update('text', value)} />
                      {section.type !== 'faq' && <>
                        <L10nField label={uiText('Button label')} value={entry.label} onChange={(value) => update('label', value)} />
                        <TextField label={uiText('URL')} value={entry.url} onChange={(value) => update('url', value)} />
                        <MediaField label={uiText('Image')} value={entry.image} onChange={(value) => update('image', value)} />
                      </>}
                      <Button type="button" size="sm" variant="outline" disabled={!entryIndex} onClick={() => {
                        const items = [...section.items];
                        [items[entryIndex - 1], items[entryIndex]] = [items[entryIndex], items[entryIndex - 1]];
                        setItems(index, items);
                      }}>{uiText('Move up')}</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => setItems(index, section.items.filter((_, i) => i !== entryIndex))}>{uiText('Delete')}</Button>
                    </div>;
                  })}
                  <Button type="button" variant="outline" onClick={() => setItems(index, [...(section.items || []), { title: {}, text: {}, label: {}, url: '' }])}>{uiText('Add item')}</Button>
                </div>}
              </div>)}</div>
            </Panel>
            <Panel title={uiText("SEO")}>
              <SeoFields value={form.seo} onChange={(v) => setField('seo', v)} fallbackTitle={form.title?.en} fallbackDescription={form.excerpt?.en || stripTags(form.content?.en).slice(0, 158)} path={`/${form.slug}`} />
            </Panel>
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={previewPath} entityType="Page" id={id} data={form} />
        </>
      )}
    </EditorGate>
  );
}
