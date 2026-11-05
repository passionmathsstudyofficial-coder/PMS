import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { BookOpen, ExternalLink, Globe, Layers, Plus, ShoppingBag, Sparkles, Star, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export function BooksList() {
  useUiLanguage();
  const [filters, setFilter, active] = useQueryFilters(['class', 'category']);
  return (
    <ResourceListPage
      resource="books"
      title={uiText("Reference Books (संदर्भ पुस्तकें)")}
      description={uiText("Manage reference textbooks, solutions, classes, and mega-menu links (RS Aggarwal, RD Sharma, KC Sinha).")}
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
              { value: 'reference', get label() { return uiText("Reference Books (RD Sharma, RS Aggarwal, KC Sinha)"); } },
              { value: 'recommended', get label() { return uiText("Recommended Books"); } },
              { value: 'ncert', get label() { return uiText("NCERT Mathematics"); } },
              { value: 'exam_prep', get label() { return uiText("Exam Preparation Books"); } },
              { value: 'practice', get label() { return uiText("Practice & Workbooks"); } },
              { value: 'olympiad', get label() { return uiText("Olympiad & Competitive"); } },
            ]}
            className="w-56"
          />
        </div>
      }
      createPath={adminUrl(`books/new${filters.class ? `?class=${filters.class}` : ''}`)}
      createLabel={uiText("Add Reference Book")}
      editPath={(item) => adminUrl(`books/${item._id}`)}
      rowLabel={(b) => `${b.author} — ${adminText(b.title) || 'Book'}`}
      columns={[
        {
          get header() { return uiText("Title"); },
          cell: (b) => (
            <div className="flex items-center gap-2.5">
              {b.coverImage?.url ? (
                <img
                  src={b.coverImage.url}
                  alt={adminText(b.title) || 'Cover'}
                  className="size-8 rounded object-cover border shrink-0"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded bg-brand/10 text-brand shrink-0">
                  <BookOpen className="size-4" />
                </span>
              )}
              <div className="min-w-0">
                <LocalizedCell value={b.title} />
                <p className="text-[11px] text-muted-foreground">{b.author}</p>
              </div>
            </div>
          ),
        },
        {
          get header() { return uiText("Available Classes"); },
          cell: (b) => {
            const classes = b.availableClasses?.length ? b.availableClasses : [6, 7, 8, 9, 10, 11, 12];
            return (
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {classes.map((c) => (
                  <span
                    key={c}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-bold text-foreground/80"
                  >
                    {c}
                  </span>
                ))}
              </div>
            );
          },
        },
        {
          get header() { return uiText("Slug & URL"); },
          className: 'hidden sm:table-cell',
          cell: (b) => (
            <div className="text-xs">
              <span className="font-mono text-muted-foreground">/{b.slug}</span>
              {b.slug && (
                <div className="mt-0.5">
                  <a
                    href={`/reference-solutions/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <span>{uiText("Preview Hub")}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          ),
        },
        {
          get header() { return uiText("Category"); },
          className: 'hidden md:table-cell',
          cell: (b) => (
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase dark:bg-orange-950 dark:text-orange-300">
              {b.category?.replace(/_/g, ' ')}
            </span>
          ),
        },
        {
          get header() { return uiText("Order"); },
          className: 'hidden lg:table-cell',
          cell: (b) => <span className="font-mono text-xs">{b.sortOrder ?? 0}</span>,
        },
        {
          get header() { return uiText("Visibility"); },
          cell: (b) => (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                b.isVisible !== false
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
              )}
            >
              {b.isVisible !== false ? uiText("Active") : uiText("Hidden")}
            </span>
          ),
        },
      ]}
    />
  );
}

export function BookEditor({ id }) {
  useUiLanguage();
  const [params] = useSearchParams();
  const [customClass, setCustomClass] = useState('');

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
      category: 'reference',
      description: { hi: '', en: '', mixed: '' },
      recommendedFor: { hi: '', en: '', mixed: '' },
      availableClasses: [6, 7, 8, 9, 10, 11, 12],
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
      seo: {
        metaTitle: { hi: '', en: '', mixed: '' },
        metaDescription: { hi: '', en: '', mixed: '' },
        canonical: '',
      },
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

  const currentClasses = Array.isArray(doc.availableClasses)
    ? doc.availableClasses
    : [6, 7, 8, 9, 10, 11, 12];

  const toggleClass = (num) => {
    const list = [...currentClasses];
    const idx = list.indexOf(num);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(num);
      list.sort((a, b) => a - b);
    }
    set('availableClasses', list);
  };

  const addCustomClass = () => {
    const num = parseInt(customClass.trim(), 10);
    if (!Number.isNaN(num) && num > 0 && !currentClasses.includes(num)) {
      const list = [...currentClasses, num].sort((a, b) => a - b);
      set('availableClasses', list);
      setCustomClass('');
    }
  };

  const selectAllClasses = () => {
    set('availableClasses', [6, 7, 8, 9, 10, 11, 12]);
  };

  const clearClasses = () => {
    set('availableClasses', []);
  };

  return (
    <EditorGate form={form}>
      {() => (
        <EditorShell
          form={form}
          title={isNew ? uiText("New Reference Book") : uiTemplate`Book — ${adminText(doc?.title) || doc?.author || ''}`}
        >
        <div className="grid gap-6">
          {/* Panel 1: Primary Book Information */}
          <Panel title={uiText("Book Information")}>
            <L10nField
              label={uiText("Book Title")}
              value={doc.title}
              onChange={(title) => set('title', title)}
              placeholder={uiText("e.g. R.S. Aggarwal Mathematics / R.D. Sharma Solutions")}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={uiText("URL Slug (e.g. rs-aggarwal, rd-sharma, kc-sinha, rd-gupta)")}
                hint={uiText("Unique identifier for reference solution URLs. Leave blank to auto-generate.")}
              >
                <input
                  type="text"
                  value={doc.slug || ''}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder={uiText("e.g. rs-aggarwal")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs font-mono"
                />
              </Field>

              <Field label={uiText("Author (लेखक)")} required>
                <input
                  type="text"
                  value={doc.author || ''}
                  onChange={(e) => set('author', e.target.value)}
                  placeholder={uiText("e.g. Dr. R.D. Sharma / R.S. Aggarwal")}
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
                  placeholder={uiText("e.g. 2026-27 Edition")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={uiText("Book Category / श्रेणी")}
                value={doc.category || 'reference'}
                onChange={(category) => set('category', category)}
                options={[
                  { value: 'reference', get label() { return uiText("Reference Books (R.D. Sharma / R.S. Aggarwal / K.C. Sinha)"); } },
                  { value: 'recommended', get label() { return uiText("Recommended Books (अनुशंसित पुस्तकें)"); } },
                  { value: 'ncert', get label() { return uiText("NCERT Textbooks & Exemplars"); } },
                  { value: 'exam_prep', get label() { return uiText("Board Exam Preparation & PYQ"); } },
                  { value: 'practice', get label() { return uiText("Workbooks & Practice Books"); } },
                  { value: 'olympiad', get label() { return uiText("Olympiad & Competitive Maths"); } },
                  { value: 'other', get label() { return uiText("Other Educational Book"); } },
                ]}
                required
              />

              <Field label={uiText("Display Order (क्रम संख्या)")} hint={uiText("Lower number appears first in mega menu and footer.")}>
                <input
                  type="number"
                  value={doc.sortOrder ?? 0}
                  onChange={(e) => set('sortOrder', parseInt(e.target.value, 10) || 0)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs font-mono"
                />
              </Field>
            </div>

            <L10nField
              label={uiText("Short Description (लघु विवरण)")}
              value={doc.description}
              onChange={(description) => set('description', description)}
              placeholder={uiText("Overview of book topics, chapters covered, and benefits")}
            />
          </Panel>

          {/* Panel 2: Available Classes for Solutions */}
          <Panel title={uiText("Available Classes for Solutions (कक्षा चयन)")}>
            <p className="text-xs text-muted-foreground mb-3">
              {uiText("Select which classes have solutions for this book. These will appear as interactive chips in the Reference Books mega menu and on the book's class selection page.")}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[6, 7, 8, 9, 10, 11, 12].map((num) => {
                const isSelected = currentClasses.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleClass(num)}
                    className={cn(
                      'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all border shadow-2xs',
                      isSelected
                        ? 'bg-brand text-white border-brand'
                        : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {uiText("Class")}{' '}{num} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Custom Class Adder */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              <input
                type="number"
                placeholder={uiText("Class #")}
                value={customClass}
                onChange={(e) => setCustomClass(e.target.value)}
                className="h-8 w-24 rounded-md border bg-transparent px-2 text-xs font-mono"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomClass}>
                <Plus className="mr-1 size-3.5" />
                {uiText("Add Class")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={selectAllClasses}>
                {uiText("Select 6–12")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearClasses}>
                {uiText("Clear")}
              </Button>
            </div>

            {/* Live URL Preview */}
            {doc.slug && (
              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs border border-border/60">
                <span className="font-bold text-foreground">{uiText("Book Solutions URL:")}</span>
                <span className="ml-2 font-mono text-brand">/reference-solutions/{doc.slug}</span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {uiText("Individual class URLs will be /reference-solutions/")}
                  <span className="font-mono">{doc.slug}/class-[6-12]</span>
                </p>
              </div>
            )}
          </Panel>

          {/* Panel 3: Cover Image & Visuals */}
          <Panel title={uiText("Cover Image & Visuals")}>
            <MediaField
              label={uiText("Upload Book Cover Image")}
              value={doc.coverImage}
              onChange={(coverImage) => set('coverImage', coverImage)}
              hint={uiText("Recommended size: 400x550px portrait image")}
            />
            <Field label={uiText("Or External Cover Image URL")}>
              <input
                type="url"
                value={doc.coverUrl || ''}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
              />
            </Field>
          </Panel>

          {/* Panel 4: SEO Settings */}
          <Panel title={uiText("SEO Settings (खोज इंजन अनुकूलन)")}>
            <L10nField
              label={uiText("SEO Meta Title")}
              value={doc.seo?.metaTitle}
              onChange={(metaTitle) => set('seo.metaTitle', metaTitle)}
              placeholder={uiText("e.g. RS Aggarwal Mathematics Solutions for Classes 6 to 12 | PMS")}
            />
            <L10nField
              label={uiText("SEO Meta Description")}
              value={doc.seo?.metaDescription}
              onChange={(metaDescription) => set('seo.metaDescription', metaDescription)}
              placeholder={uiText("Free step-by-step chapter-wise exercise solutions with formulas and explanations")}
            />
            <Field label={uiText("Canonical URL Override (Optional)")}>
              <input
                type="text"
                value={doc.seo?.canonical || ''}
                onChange={(e) => set('seo.canonical', e.target.value)}
                placeholder="https://"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs font-mono"
              />
            </Field>
          </Panel>

          {/* Panel 5: Visibility & Publication Status */}
          <Panel title={uiText("Visibility & Status")}>
            <div className="space-y-3">
              <SwitchField
                label={uiText("Active & Visible in Reference Books Dropdown")}
                hint={uiText("When enabled, this book automatically appears in the header mega menu and footer columns.")}
                checked={doc.isVisible !== false}
                onChange={(isVisible) => set('isVisible', isVisible)}
              />
              <SwitchField
                label={uiText("Has Solutions (समाधान उपलब्ध)")}
                hint={uiText("Enable if students can browse exercise solutions for this book.")}
                checked={doc.hasSolutions !== false}
                onChange={(hasSolutions) => set('hasSolutions', hasSolutions)}
              />
              <SwitchField
                label={uiText("Featured Book")}
                hint={uiText("Highlight this book on the student homepage.")}
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

export default BooksList;
