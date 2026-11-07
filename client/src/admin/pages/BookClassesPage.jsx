import { Link, useSearchParams } from 'react-router';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { L10nField, SlugField, NumberField } from '../components/fields/Fields.jsx';
import { RefSelect, RefMultiSelect } from '../components/fields/RefSelect.jsx';
import { SeoFields } from '../components/SeoFields.jsx';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';
export function BookClassesList() {
 const [params] = useSearchParams();
 return <ResourceListPage baseParams={params.get('book') ? { book: params.get('book') } : {}} resource="book-classes" title="Reference book classes" reorderable
 description="Each book has independent class names, descriptions, SEO, publication and visibility."
 createPath={adminUrl('book-classes/new')} editPath={item => adminUrl(`book-classes/${item._id}`)}
 columns={[{ header: 'Book', cell: row => row.book?.title?.en }, { header: 'Class', cell: row => row.name?.en || row.class?.number }]} />;
}
export function BookClassEditor({ id }) {
 const editor = useEditorForm({resource:'book-classes', id, defaults:{book:null,class:null,name:{},description:{},slug:'',subjects:[],seo:{},status:'draft',isVisible:true},basePath:adminUrl('book-classes')});
 const {form,setField}=editor;
 return <EditorGate editor={editor}>{() => <EditorShell title="Reference book class" backTo={adminUrl('book-classes')} doc={editor.doc} form={form} setField={setField} dirty={editor.dirty} saving={editor.saving} onSave={editor.save} onDelete={() => editor.remove()}>
 <Panel title="Class details"><div className="grid gap-4 sm:grid-cols-2">
 {editor.isNew ? <><RefSelect label="Book" resource="books" value={form.book} onChange={v=>setField('book',v)} /><RefSelect label="Class" resource="classes" value={form.class} onChange={v=>setField('class',v)} /></> : <p>Book and class ownership are preserved. Create a separate record for a different book or class.</p>}
 <L10nField label="Class name" value={form.name} onChange={v=>setField('name',v)} />
 <NumberField label="Display order" value={form.sortOrder || 0} onChange={v=>setField("sortOrder",v)} />
 <SlugField value={form.slug} onChange={v=>setField('slug',v)} />
 <L10nField label="Description" multiline value={form.description} onChange={v=>setField('description',v)} />
 <RefMultiSelect label="Subjects" resource="subjects" value={form.subjects} onChange={v=>setField('subjects',v)} />
 </div></Panel><Panel title="SEO"><SeoFields value={form.seo} onChange={v=>setField('seo',v)} /></Panel>
 <Link to={adminUrl('reference-books-manager')}>Manage book chapters, exercises and questions</Link>
 </EditorShell>}</EditorGate>;
}
