import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { BookOpen, ExternalLink, Plus, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { ClassFilter, useQueryFilters } from '../components/filters.jsx';
import { Field, L10nField, SelectField, SwitchField } from '../components/fields/Fields.jsx';
import { RefSelect } from '../components/fields/RefSelect.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { refId, useResourceList } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export function BooksList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'category']);
  return (
    <ResourceListPage
      resource="books"
      title={uiText("Reference Books (संदर्भ पुस्तकें)")}
      description={uiText("Manage recommended mathematics textbooks, reference guides, and external purchasing links (Amazon, Flipkart).")}
      baseParams={active}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <ClassFilter value={filters.class} onChange={(v) => setFilter('class', v)} />
          <SelectField
            value={filters.category || ''}
            onChange={(v) => setFilter('category', v)}
            placeholder={uiText("All Categories")}
            options={[
              { value: '', get label() { return uiText("All Categories"); } },
              { value: 'recommended', get label() { return uiText("Recommended Books"); } },
              { value: 'ncert', get label() { return uiText("NCERT Mathematics"); } },
              { value: 'reference', get label() { return uiText("Reference Books (RD Sharma, RS Aggarwal)"); } },
              { value: 'exam_prep', get label() { return uiText("Exam Preparation Books"); } },
              { value: 'practice', get label() { return uiText("Practice & Workbooks"); } },
              { value: 'olympiad', get label() { return uiText("Olympiad & Competitive"); } },
            ]}
            className="w-48"
          />
        </div>
      }
      createPath={adminUrl(`books/new${filters.class ? `?class=${filters.class}` : ''}`)}
      createLabel={uiText("Add Reference Book")}
      editPath={(item) => adminUrl(`books/${item._id}`)}
      rowLabel={(b) => `${b.author} — ${adminText(b.title) || 'Book'}`}
      columns={[
        { get header() { return uiText("Title"); }, cell: (b) => <LocalizedCell value={b.title} /> },
        { get header() { return uiText("Author"); }, cell: (b) => <span className="text-xs font-semibold">{b.author}</span> },
        {
          get header() { return uiText("Category"); },
          className: 'hidden sm:table-cell',
          cell: (b) => (
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase dark:bg-orange-950 dark:text-orange-300">
              {b.category?.replace(/_/g, ' ')}
            </span>
          ),
        },
        { get header() { return uiText("Class"); }, className: 'hidden md:table-cell', cell: (b) => (b.class ? uiTemplate`Class ${b.class.number}` : uiText("All")) },
        {
          get header() { return uiText("Purchase Link"); },
          className: 'hidden lg:table-cell',
          cell: (b) =>
            b.purchaseUrl ? (
              <a
                href={b.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >{uiText("Link")}<ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}

export function BookEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const form = useEditorForm({
    resource: 'books',
    id,
    basePath: adminUrl('books'),
    entityType: 'Book',
    defaults: () => ({
      class: params.get('class') || '',
      chapter: params.get('chapter') || '',
      topic: '',
      title: { hi: '', en: '', mixed: '' },
      slug: '',
      hasSolutions: true,
      pdfFile: null,
      pdfUrl: '',
      author: '',
      publisher: '',
      edition: '',
      category: 'recommended',
      description: { hi: '', en: '', mixed: '' },
      recommendedFor: { hi: '', en: '', mixed: '' },
      coverImage: null,
      coverUrl: '',
      purchaseUrl: '',
      price: '',
      availability: 'available',
      featured: false,
      rating: 4.8,
      status: 'published',
      isVisible: true,
      sortOrder: 0,
      tags: [],
    }),
  });

  const { doc, set, isNew } = form;
  const classId = refId(doc?.class);
  const chapterId = refId(doc?.chapter);

  const classes = useResourceList('classes', { limit: 50 });
  const classItems = classes.data?.items || [];
  const selectedClass = classItems.find((c) => String(c._id) === String(classId));
  const mathSubject = selectedClass?.subjects?.[0];

  useEffect(() => {
    if (mathSubject && doc && !doc.subject) {
      set('subject', mathSubject._id || mathSubject);
    }
  }, [mathSubject, doc?.subject, set]);

  return (
    <EditorGate form={form}>
      {() => (
        <EditorShell
          form={form}
          title={isNew ? uiText("New Reference Book") : uiTemplate`Book — ${adminText(doc?.title) || doc?.author || ''}`}
        >
        <div className="grid gap-6">
          <Panel title={uiText("Book Information")}>
            <L10nField label={uiText("Book Title")} value={doc.title} onChange={(title) => set('title', title)} placeholder={uiText("e.g. NCERT Mathematics Class 10 / R.D. Sharma")} required />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={uiText("URL Slug (e.g. rs-aggarwal, rd-sharma, ml-aggarwal)")} hint={uiText("Unique identifier for reference solution URLs. Leave blank to auto-generate.")}>
                <input
                  type="text"
                  value={doc.slug || ''}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder={uiText("e.g. rs-aggarwal")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
              <Field label={uiText("Author (लेखक)")} required>
                <input
                  type="text"
                  value={doc.author || ''}
                  onChange={(e) => set('author', e.target.value)}
                  placeholder={uiText("e.g. NCERT / Dr. R.D. Sharma")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
              <Field label={uiText("Publisher (प्रकाशक)")}>
                <input
                  type="text"
                  value={doc.publisher || ''}
                  onChange={(e) => set('publisher', e.target.value)}
                  placeholder={uiText("e.g. Dhanpat Rai Publications")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
              <Field label={uiText("Edition (संस्करण)")}>
                <input
                  type="text"
                  value={doc.edition || ''}
                  onChange={(e) => set('edition', e.target.value)}
                  placeholder={uiText("e.g. 2026 Edition")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={uiText("Book Category / श्रेणी")}
                value={doc.category || 'recommended'}
                onChange={(category) => set('category', category)}
                options={[
                  { value: 'recommended', get label() { return uiText("Recommended Books (अनुशंसित पुस्तकें)"); } },
                  { value: 'ncert', get label() { return uiText("NCERT Textbooks & Exemplars"); } },
                  { value: 'reference', get label() { return uiText("Reference Books (R.D. Sharma / R.S. Aggarwal)"); } },
                  { value: 'exam_prep', get label() { return uiText("Board Exam Preparation & PYQ"); } },
                  { value: 'practice', get label() { return uiText("Workbooks & Practice Books"); } },
                  { value: 'olympiad', get label() { return uiText("Olympiad & Competitive Maths"); } },
                  { value: 'other', get label() { return uiText("Other Educational Book"); } },
                ]}
                required
              />
              <Field label={uiText("Optional Price Display")}>
                <input
                  type="text"
                  value={doc.price || ''}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder={uiText("e.g. ₹450 / Approx ₹399")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
            </div>

            <L10nField label={uiText("Recommended For (Student Guidance)")} value={doc.recommendedFor} onChange={(recommendedFor) => set('recommendedFor', recommendedFor)} placeholder={uiText("e.g. Best for CBSE Board Exams & Concept Clarity")} />
            <L10nField label={uiText("Detailed Description")} value={doc.description} onChange={(description) => set('description', description)} placeholder={uiText("Overview of book topics, chapters covered, and benefits")} />
          </Panel>

          <Panel title={uiText("Purchasing Link (Amazon / Flipkart / Publisher)")}>
            <Field
              label={uiText("External Buying / Purchase Link")}
              hint={uiText("Paste the direct Amazon, Flipkart, or publisher bookstore URL where students can purchase this book.")}
            >
              <div className="relative">
                <input
                  type="url"
                  value={doc.purchaseUrl || ''}
                  onChange={(e) => set('purchaseUrl', e.target.value)}
                  placeholder="https://www.amazon.in/dp/..."
                  className="h-9 w-full rounded-md border bg-transparent pr-8 pl-3 text-xs"
                />
                {doc.purchaseUrl && (
                  <a
                    href={doc.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-brand hover:text-brand/80"
                    title={uiText("Test Link")}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            </Field>
          </Panel>

          <Panel title={uiText("Educational Association (Class / Chapter / Topic)")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <RefSelect
                label={uiText("Class (कक्षा)")}
                resource="classes"
                params={{ limit: 50 }}
                value={classId}
                onChange={(c) => {
                  set('class', c);
                  set('chapter', '');
                  set('topic', '');
                }}
                labelOf={(c) => uiTemplate`Class ${c.number} — ${adminText(c.name) || ''}`}
              />
              <RefSelect
                label={uiText("Specific Chapter (Optional)")}
                resource="chapters"
                params={{ class: classId, limit: 100 }}
                disabled={!classId}
                value={chapterId}
                onChange={(ch) => {
                  set('chapter', ch);
                  set('topic', '');
                }}
                labelOf={(ch) => uiTemplate`अध्याय ${ch.number} — ${adminText(ch.title) || ''}`}
              />
              <RefSelect
                label={uiText("Specific Topic (Optional)")}
                resource="topics"
                params={{ chapter: chapterId, limit: 100 }}
                disabled={!chapterId}
                value={refId(doc.topic)}
                onChange={(tp) => set('topic', tp)}
                labelOf={(tp) => uiTemplate`Topic ${tp.number} — ${adminText(tp.title) || ''}`}
              />
            </div>
          </Panel>

          <Panel title={uiText("Cover Image & Visuals")}>
            <MediaField label={uiText("Upload Book Cover Image")} value={doc.coverImage} onChange={(coverImage) => set('coverImage', coverImage)} />
            <Field label={uiText("Or External Cover Image URL")}>
              <input
                type="url"
                value={doc.coverUrl || ''}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://images-na.ssl-images-amazon.com/images/..."
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>
          </Panel>

          <Panel title={uiText("PDF Preview / Solutions (Optional)")}>
            <MediaField
              label={uiText("Upload Book / Solutions PDF")}
              kind="pdf"
              value={doc.pdfFile}
              onChange={(pdfFile) => set('pdfFile', pdfFile)}
              hint={uiText("Upload book notes or solutions PDF for student preview.")}
            />
            <Field label={uiText("Or External PDF URL")}>
              <input
                type="url"
                value={doc.pdfUrl || ''}
                onChange={(e) => set('pdfUrl', e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>
          </Panel>

          <Panel title={uiText("Display & Highlighting")}>
            <div className="space-y-3">
              <SwitchField
                label={uiText("Has Reference Solutions (संदर्भ समाधान उपलब्ध)")}
                hint={uiText("Enable if this book has chapter & exercise solutions under Reference Solutions section.")}
                checked={doc.hasSolutions !== false}
                onChange={(hasSolutions) => set('hasSolutions', hasSolutions)}
              />
              <SwitchField
                label={uiText("Featured Book")}
                hint={uiText("Highlight this book on the student homepage and chapter recommended books shelf.")}
                checked={Boolean(doc.featured)}
                onChange={(featured) => set('featured', featured)}
              />
            </div>
          </Panel>
        </div>
      </EditorShell>
    )}
  </EditorGate>
  );
}
