import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChartLine,
  CircleHelp,
  Copy,
  Eye,
  GraduationCap,
  Image,
  LayoutGrid,
  Link2,
  ListOrdered,
  Loader2,
  Megaphone,
  MonitorPlay,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Send,
  Shapes,
  Sparkles,
  Star,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ErrorState } from '@/components/site/States.jsx';
import { adminUrl } from '@/lib/config';
import { imageUrl } from '@/lib/media';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { EditorShell } from '../components/EditorShell.jsx';
import { Field, IconField, L10nField, NumberField, SelectField, SwitchField, TextField } from '../components/fields/Fields.jsx';
import { FormulaInput } from '../components/fields/FormulaInput.jsx';
import { RefMultiSelect } from '../components/fields/RefSelect.jsx';
import { VideoField } from '../components/fields/VideoField.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { MediaPicker } from '../components/media/MediaPicker.jsx';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { PreviewDialog } from '../components/PreviewDialog.jsx';
import { DragHandle, SortableList, clientKey, itemKey, moveItem, withKeys } from '../components/SortableList.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { useResourceList, useResourceMutations } from '../lib/resources.js';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

const RichTextEditor = lazy(() => import('../components/fields/RichTextEditor.jsx'));

export const SECTION_TYPES = {
  hero: { get label() { return uiText("Hero"); }, icon: Sparkles, get description() { return uiText("Main heading, search box, popular searches, buttons, image or video."); }, fields: ['badge', 'title', 'highlight', 'description', 'image', 'video', 'buttons'] },
  statistics: { get label() { return uiText("Statistics"); }, icon: ChartLine, get description() { return uiText("Numbers such as total questions — automatic or typed."); }, fields: ['badge', 'title', 'description'], itemFields: ['value', 'title', 'icon'], itemsLabel: 'Statistics' },
  classGrid: { get label() { return uiText("Class grid"); }, icon: GraduationCap, get description() { return uiText("Cards for every class, loaded from the database."); }, fields: ['badge', 'title', 'description', 'buttons'] },
  referenceBooks: { get label() { return uiText("Reference Books"); }, icon: BookOpen, get description() { return uiText("Showcase of reference books (NCERT, RS Aggarwal, RD Sharma, KC Sinha, ML Aggarwal)."); }, fields: ['badge', 'title', 'highlight', 'description', 'buttons'] },
  steps: { get label() { return uiText("Steps / hierarchy"); }, icon: ListOrdered, get description() { return uiText("Class → अध्याय → प्रश्नावली → … → Final answer."); }, fields: ['badge', 'title', 'description'], itemFields: ['title', 'description', 'icon'], itemsLabel: 'Steps' },
  chapterGrid: { get label() { return uiText("Chapter grid"); }, icon: BookOpen, get description() { return uiText("Selected or featured chapters."); }, fields: ['badge', 'title', 'description', 'buttons'] },
  cardGrid: { get label() { return uiText("Card grid"); }, icon: LayoutGrid, get description() { return uiText("Cards with icon, text, formula and link."); }, fields: ['badge', 'title', 'description', 'buttons'], itemFields: ['title', 'description', 'badge', 'icon', 'url', 'latex', 'image'], itemsLabel: 'Cards' },
  questionList: { get label() { return uiText("Question list"); }, icon: Star, get description() { return uiText("Important questions or selected NCERT questions."); }, fields: ['badge', 'title', 'description', 'buttons'] },
  notes: { get label() { return uiText("Notes"); }, icon: NotebookPen, get description() { return uiText("Latest or selected notes."); }, fields: ['badge', 'title', 'description', 'buttons'] },
  videoSection: { get label() { return uiText("Video section"); }, icon: MonitorPlay, get description() { return uiText("One or more YouTube videos."); }, fields: ['badge', 'title', 'description', 'video', 'buttons'] },
  imageGallery: { get label() { return uiText("Image gallery"); }, icon: Image, get description() { return uiText("Zoomable image grid."); }, fields: ['badge', 'title', 'description'] },
  text: { get label() { return uiText("Text section"); }, icon: Type, get description() { return uiText("Rich text with optional image and bullet points."); }, fields: ['badge', 'title', 'highlight', 'description', 'image', 'buttons'], itemFields: ['title', 'description', 'icon'], itemsLabel: 'Bullet points' },
  faq: { get label() { return uiText("FAQ"); }, icon: CircleHelp, get description() { return uiText("Accordion of questions (adds FAQ schema for Google)."); }, fields: ['badge', 'title', 'description'], itemFields: ['title', 'description'], itemsLabel: 'Questions', itemLabels: { get title() { return uiText("Question"); }, get description() { return uiText("Answer"); } } },
  cta: { get label() { return uiText("Call to action"); }, icon: Megaphone, get description() { return uiText("Highlighted banner with buttons."); }, fields: ['title', 'description', 'buttons'] },
  relatedContent: { get label() { return uiText("Related links"); }, icon: Link2, get description() { return uiText("A grid of links."); }, fields: ['badge', 'title', 'description'], itemFields: ['title', 'url'], itemsLabel: 'Links' },
  custom: { get label() { return uiText("Custom content block"); }, icon: Shapes, get description() { return uiText("Free rich-text block for anything else."); }, fields: ['badge', 'title', 'description', 'image', 'buttons'], itemFields: ['title', 'description', 'icon'], itemsLabel: 'Bullet points' },
};

const DEFAULT_CONFIG = {
  background: 'none',
  align: 'left',
  limit: 8,
  columns: 4,
  layout: 'default',
  showSearch: true,
  searchPlaceholder: {},
  searchButtonLabel: {},
  popularLabel: {},
  popularSearches: [],
  autoStats: false,
  content: '',
  classes: [],
  chapters: [],
  questions: [],
  importantQuestions: [],
  notes: [],
  videos: [],
  gallery: [],
};

export function HomepagePage() {
  useUiLanguage();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { can } = useAdminAuth();
  const list = useResourceList('sections', { pageKey: 'home', limit: 100 });
  const { save, duplicate, remove, reorder, setStatus } = useResourceMutations('sections');
  const [items, setItems] = useState([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canEdit = can('settings:write');

  useEffect(() => {
    if (list.data?.items && !orderDirty) setItems(list.data.items);
  }, [list.data, orderDirty]);

  const add = async (type) => {
    const meta = SECTION_TYPES[type];
    try {
      const doc = await save.mutateAsync({ data: { type, page: 'home', name: meta.label, title: { en: meta.label }, status: 'draft', sortOrder: items.length, config: { ...DEFAULT_CONFIG } } });
      toast.success(uiTemplate`${meta.label} section added as a draft`);
      navigate(adminUrl(`homepage/${doc._id}`));
    } catch {
      /* toast shown */
    }
  };

  const changeOrder = (next) => {
    setItems(next);
    setOrderDirty(true);
  };

  return (
    <div>
      <PageHeader
        title={uiText("Homepage")}
        description={uiText("The homepage is built from these sections, top to bottom. Add, hide, reorder and edit them without touching code.")}
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => setPreviewOpen(true)}>
              <Eye />{uiText("Preview homepage")}</Button>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg">
                    <Plus />{uiText("Add section")}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
                  {Object.entries(SECTION_TYPES).map(([type, meta]) => {
                    const IconComponent = meta.icon;
                    return (
                      <DropdownMenuItem key={type} onSelect={() => add(type)} className="items-start">
                        <IconComponent className="mt-0.5" />
                        <span>
                          <span className="block font-semibold">{meta.label}</span>
                          <span className="block text-xs text-muted-foreground">{meta.description}</span>
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {orderDirty && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-saffron/40 bg-saffron-soft px-4 py-2.5 text-sm">
          <span className="font-semibold text-warning">{uiText("Section order changed")}</span>
          <span className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOrderDirty(false)}>{uiText("Cancel")}</Button>
            <Button size="sm" disabled={reorder.isPending} onClick={() => reorder.mutate(items.map((s) => s._id), { onSuccess: () => setOrderDirty(false) })}>
              {reorder.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save order")}</Button>
          </span>
        </div>
      )}

      {list.isError && <ErrorState error={list.error} onRetry={list.refetch} />}
      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        <SortableList
          items={items}
          onChange={canEdit ? changeOrder : () => {}}
          className="space-y-2"
          renderItem={(section, index, { ref, style, handleProps, isDragging }) => {
            const meta = SECTION_TYPES[section.type] || SECTION_TYPES.custom;
            const IconComponent = meta.icon;
            return (
              <li ref={ref} style={style} className={`flex items-center gap-2 rounded-2xl border bg-card p-2 pr-3 ${isDragging ? 'shadow-xl' : ''} ${section.isVisible === false ? 'opacity-60' : ''}`}>
                {canEdit && <DragHandle {...handleProps} />}
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <IconComponent className="size-5" />
                </span>
                <Link to={adminUrl(`homepage/${section._id}`)} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold hover:text-brand">{adminText(section.title) || section.name || meta.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {index + 1}. {meta.label}
                    {section.name ? ` · ${section.name}` : ''}
                  </span>
                </Link>
                <StatusBadge doc={section} className="hidden sm:inline-flex" />
                {canEdit && (
                  <label className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">{uiText("Visible")}<Switch
                      checked={section.isVisible !== false}
                      onCheckedChange={(isVisible) => save.mutate({ id: section._id, data: { isVisible } }, { onSuccess: () => toast.success(isVisible ? uiText("Section shown") : uiText("Section hidden")) })}
                      aria-label={uiText("Visible on homepage")}
                    />
                  </label>
                )}
                <span className="hidden sm:flex">
                  <Button variant="ghost" size="icon-sm" disabled={!canEdit || index === 0} onClick={() => changeOrder(moveItem(items, index, index - 1))} aria-label={uiText("Move up")}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={!canEdit || index === items.length - 1} onClick={() => changeOrder(moveItem(items, index, index + 1))} aria-label={uiText("Move down")}>
                    <ArrowDown />
                  </Button>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={uiText("Section actions")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate(adminUrl(`homepage/${section._id}`))}>
                      <Pencil />{uiText("Edit")}</DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuItem onSelect={() => duplicate.mutate(section._id)}>
                          <Copy />{uiText("Duplicate")}</DropdownMenuItem>
                        {section.status === 'published' ? (
                          <DropdownMenuItem onSelect={() => setStatus.mutate({ id: section._id, status: 'draft' })}>
                            <Undo2 />{uiText("Unpublish")}</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setStatus.mutate({ id: section._id, status: 'published' })}>
                            <Send />{uiText("Publish")}</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            confirm({
                              get title() { return uiTemplate`Delete “${section.title?.en || meta.label}”?`; },
                              get description() { return uiText("The section is removed from the homepage. Classes, chapters and questions it shows are not affected."); },
                              get confirmLabel() { return uiText("Delete section"); },
                              destructive: true,
                              onConfirm: () => remove.mutateAsync({ id: section._id }),
                            })
                          }
                        >
                          <Trash2 />{uiText("Delete")}</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          }}
        />
      )}
      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path="/" />
    </div>
  );
}

function ListEditor({ label, hint, value = [], onChange, renderFields, createItem, addLabel = uiText("Add item") }) {
  useUiLanguage();
  const items = withKeys(value);
  const update = (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <Field label={label} hint={hint}>
      {items.length > 0 && (
        <SortableList
          items={items}
          onChange={onChange}
          className="space-y-2"
          renderItem={(item, index, { ref, style, handleProps }) => (
            <li ref={ref} style={style} className="rounded-xl border bg-background p-3">
              <div className="mb-2 flex items-center gap-1">
                <DragHandle {...handleProps} />
                <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                <span className="ml-auto flex">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index - 1))} disabled={index === 0} aria-label={uiText("Move up")}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index + 1))} disabled={index === items.length - 1} aria-label={uiText("Move down")}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={uiText("Remove")}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </span>
              </div>
              {renderFields(item, (patch) => update(index, patch))}
            </li>
          )}
        />
      )}
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...items, { _key: clientKey(), ...createItem() }])}>
        <Plus /> {addLabel}
      </Button>
    </Field>
  );
}

const BUTTON_VARIANTS = [
  { value: 'primary', get label() { return uiText("Primary"); } },
  { value: 'secondary', get label() { return uiText("Secondary"); } },
  { value: 'outline', get label() { return uiText("Outline"); } },
  { value: 'ghost', get label() { return uiText("Ghost"); } },
  { value: 'link', get label() { return uiText("Text link"); } },
];

function ButtonsEditor({ value, onChange }) {
  useUiLanguage();
  return (
    <ListEditor
      label={uiText("Buttons")}
      value={value}
      onChange={onChange}
      addLabel={uiText("Add button")}
      createItem={() => ({ label: {}, url: '', variant: 'primary', newTab: false })}
      renderFields={(button, set) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <L10nField label={uiText("Label")} value={button.label} onChange={(label) => set({ label })} />
          <TextField label={uiText("Link")} value={button.url} onChange={(url) => set({ url })} placeholder={uiText("/class-10/maths · #classes · https://…")} />
          <SelectField label={uiText("Style")} value={button.variant || 'primary'} onChange={(variant) => set({ variant })} options={BUTTON_VARIANTS} />
          <SwitchField label={uiText("Open in new tab")} checked={button.newTab} onChange={(newTab) => set({ newTab })} />
        </div>
      )}
    />
  );
}

function ItemsEditor({ type, value, onChange }) {
  useUiLanguage();
  const meta = SECTION_TYPES[type];
  const fields = new Set(meta.itemFields || []);
  const labels = meta.itemLabels || {};
  return (
    <ListEditor
      label={meta.itemsLabel || uiText("Items")}
      hint={type === 'statistics' ? uiText("Values can use {classes}, {chapters}, {exercises} or {questions} for live counts.") : undefined}
      value={value}
      onChange={onChange}
      addLabel={uiTemplate`Add ${(meta.itemsLabel || 'item').toLowerCase().replace(/s$/, '')}`}
      createItem={() => ({ title: {}, description: {}, badge: {}, icon: '', url: '', value: '', latex: '', image: null, isVisible: true })}
      renderFields={(item, set) => (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.has('value') && <TextField label={uiText("Value")} value={item.value} onChange={(v) => set({ value: v })} placeholder={uiText("{questions} or 100%")} />}
          {fields.has('title') && <L10nField label={labels.title || uiText("Title")} value={item.title} onChange={(title) => set({ title })} />}
          {fields.has('badge') && <L10nField label={uiText("Badge")} value={item.badge} onChange={(badge) => set({ badge })} />}
          {fields.has('url') && <TextField label={uiText("Link")} value={item.url} onChange={(url) => set({ url })} />}
          {fields.has('description') && <L10nField className="sm:col-span-2" label={labels.description || uiText("Description")} multiline rows={2} value={item.description} onChange={(description) => set({ description })} />}
          {fields.has('latex') && (
            <div className="sm:col-span-2">
              <FormulaInput label={uiText("Formula (optional)")} value={item.latex} onChange={(latex) => set({ latex })} rows={1} />
            </div>
          )}
          {fields.has('image') && (
            <div className="sm:col-span-2">
              <MediaField label={uiText("Image (optional)")} value={item.image} onChange={(image) => set({ image })} />
            </div>
          )}
          {fields.has('icon') && (
            <div className="sm:col-span-2">
              <IconField value={item.icon} onChange={(icon) => set({ icon })} />
            </div>
          )}
          <SwitchField label={uiText("Visible")} checked={item.isVisible !== false} onChange={(isVisible) => set({ isVisible })} />
        </div>
      )}
    />
  );
}

function GalleryField({ value = [], onChange }) {
  useUiLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Field label={uiText("Gallery images")}>
      {value.length > 0 && (
        <SortableList
          items={value}
          onChange={onChange}
          as="ul"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          renderItem={(media, index, { ref, style, handleProps }) => (
            <li ref={ref} style={style} className="relative rounded-xl border bg-white p-1">
              <img src={imageUrl(media, 240)} alt="" className="aspect-square w-full object-contain" />
              <span className="absolute top-1 left-1 rounded bg-background/90">
                <DragHandle {...handleProps} className="size-7" />
              </span>
              <Button type="button" variant="secondary" size="icon-sm" className="absolute top-1 right-1" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={uiText("Remove image")}>
                <Trash2 />
              </Button>
            </li>
          )}
        />
      )}
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setOpen(true)}>
        <Plus />{uiText("Add images")}</Button>
      <MediaPicker open={open} onOpenChange={setOpen} multiple onSelect={(list) => onChange([...value, ...list.filter((m) => !value.some((v) => itemKey(v) === m._id))])} />
    </Field>
  );
}

function ConfigFields({ type, config, onChange }) {
  useUiLanguage();
  const set = (patch) => onChange({ ...config, ...patch });
  const limit = <NumberField label={uiText("Maximum items")} value={config.limit} onChange={(v) => set({ limit: v })} min={1} max={48} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {type === 'hero' && (
        <>
          <SwitchField className="sm:col-span-2" label={uiText("Show search box")} checked={config.showSearch !== false} onChange={(v) => set({ showSearch: v })} />
          <L10nField label={uiText("Search placeholder")} value={config.searchPlaceholder} onChange={(v) => set({ searchPlaceholder: v })} />
          <L10nField label={uiText("Search button label")} value={config.searchButtonLabel} onChange={(v) => set({ searchButtonLabel: v })} />
          <L10nField label={uiText("Popular searches label")} value={config.popularLabel} onChange={(v) => set({ popularLabel: v })} />
          <div className="sm:col-span-2">
            <ListEditor
              label={uiText("Popular searches")}
              value={config.popularSearches}
              onChange={(v) => set({ popularSearches: v })}
              addLabel={uiText("Add popular search")}
              createItem={() => ({ label: {}, query: '' })}
              renderFields={(item, setItem) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <L10nField label={uiText("Chip label")} value={item.label} onChange={(label) => setItem({ label })} />
                  <TextField label={uiText("Search query")} value={item.query} onChange={(query) => setItem({ query })} placeholder={uiText("Class 10 Ex 5.2")} />
                </div>
              )}
            />
          </div>
        </>
      )}
      {type === 'classGrid' && (
        <>
          <RefMultiSelect label={uiText("Classes")} hint={uiText("Leave empty to show every published class.")} resource="classes" value={config.classes} onChange={(v) => set({ classes: v })} />
          <SelectField
            label={uiText("Layout")}
            value={config.layout || 'default'}
            onChange={(v) => set({ layout: v })}
            options={[
              { value: 'default', get label() { return uiText("Equal cards"); } },
              { value: 'featured', get label() { return uiText("Featured classes as large cards"); } },
            ]}
          />
        </>
      )}
      {type === 'chapterGrid' && (
        <>
          <RefMultiSelect label={uiText("Chapters")} hint={uiText("Leave empty to show chapters marked as featured.")} resource="chapters" value={config.chapters} onChange={(v) => set({ chapters: v })} />
          {limit}
        </>
      )}
      {type === 'questionList' && (
        <>
          <RefMultiSelect label={uiText("Important questions")} hint={uiText("Leave both empty to show the latest important questions.")} resource="important-questions" value={config.importantQuestions} onChange={(v) => set({ importantQuestions: v })} />
          <RefMultiSelect label={uiText("NCERT questions")} resource="questions" value={config.questions} onChange={(v) => set({ questions: v })} />
          {limit}
        </>
      )}
      {type === 'notes' && (
        <>
          <RefMultiSelect label={uiText("Notes")} hint={uiText("Leave empty to show the latest notes.")} resource="notes" value={config.notes} onChange={(v) => set({ notes: v })} />
          {limit}
        </>
      )}
      {type === 'videoSection' && <RefMultiSelect label={uiText("More videos")} hint={uiText("Shown after the main video.")} resource="videos" value={config.videos} onChange={(v) => set({ videos: v })} />}
      {type === 'imageGallery' && (
        <div className="sm:col-span-2">
          <GalleryField value={config.gallery} onChange={(v) => set({ gallery: v })} />
        </div>
      )}
      {type === 'statistics' && <SwitchField label={uiText("Live counts from the database")} hint={uiText("Enables {classes}, {chapters}, {exercises}, {questions}.")} checked={config.autoStats} onChange={(v) => set({ autoStats: v })} />}
      {['statistics', 'cardGrid'].includes(type) && <NumberField label={uiText("Columns (desktop)")} value={config.columns} onChange={(v) => set({ columns: v })} min={1} max={6} />}
      {['text', 'custom'].includes(type) && (
        <Field label={uiText("Content")} className="sm:col-span-2">
          <Suspense fallback={<div className="min-h-28 animate-pulse rounded-lg border bg-muted/40" />}>
            <RichTextEditor value={config.content} onChange={(content) => set({ content })} />
          </Suspense>
        </Field>
      )}
      {type !== 'hero' && (
        <>
          <SelectField
            label={uiText("Background")}
            value={config.background || 'none'}
            onChange={(v) => set({ background: v })}
            options={[
              { value: 'none', get label() { return uiText("None"); } },
              { value: 'muted', get label() { return uiText("Soft grey"); } },
              { value: 'grid', get label() { return uiText("Notebook grid"); } },
              { value: 'brand', get label() { return uiText("Brand colour"); } },
              { value: 'dark', get label() { return uiText("Dark"); } },
            ]}
          />
          <SelectField
            label={uiText("Heading alignment")}
            value={config.align || 'left'}
            onChange={(v) => set({ align: v })}
            options={[
              { value: 'left', get label() { return uiText("Left"); } },
              { value: 'center', get label() { return uiText("Center"); } },
            ]}
          />
        </>
      )}
    </div>
  );
}

const SECTION_DEFAULTS = { page: 'home', type: 'text', name: '', badge: {}, title: {}, highlight: {}, description: {}, image: null, video: null, buttons: [], items: [], config: DEFAULT_CONFIG, status: 'draft', isVisible: true };
const toSectionForm = (doc) => ({ ...doc, config: { ...DEFAULT_CONFIG, ...(doc.config || {}) } });

export function SectionEditor({ id }) {
  useUiLanguage();
  const editor = useEditorForm({ resource: 'sections', id, defaults: SECTION_DEFAULTS, basePath: adminUrl('homepage'), toForm: toSectionForm, label: (s) => s?.title?.en || s?.name });
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, setField } = editor;
  const meta = SECTION_TYPES[form?.type] || SECTION_TYPES.custom;
  const fields = new Set(meta.fields);

  return (
    <EditorGate editor={editor}>
      {() => (
        <>
          <EditorShell
            title={uiTemplate`${meta.label} section`}
            description={meta.description}
            backTo={adminUrl('homepage')}
            backLabel={uiText("Homepage sections")}
            doc={editor.doc}
            form={form}
            setField={setField}
            dirty={editor.dirty}
            saving={editor.saving}
            onSave={editor.save}
            onPreview={() => {
              if (editor.dirty) toast.info(uiText("Save your changes first — the preview shows the saved version (drafts included)."));
              setPreviewOpen(true);
            }}
            onDuplicate={editor.duplicate}
            onDelete={() => editor.remove({ get description() { return uiText("The section is removed from the homepage. The content it shows is not deleted."); } })}
            sidebar={
              <Panel title={uiText("Section")}>
                <div className="space-y-3">
                  <SelectField label={uiText("Section type")} value={form.type} onChange={(v) => setField('type', v)} options={Object.entries(SECTION_TYPES).map(([value, m]) => ({ value, label: m.label }))} />
                  <TextField label={uiText("Internal name / anchor")} hint={uiText("Used as the #anchor, e.g. #classes.")} value={form.name} onChange={(v) => setField('name', v)} />
                </div>
              </Panel>
            }
          >
            <Panel title={uiText("Heading & text")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.has('badge') && <L10nField label={uiText("Badge")} value={form.badge} onChange={(v) => setField('badge', v)} />}
                {fields.has('title') && <L10nField label={uiText("Heading")} value={form.title} onChange={(v) => setField('title', v)} />}
                {fields.has('highlight') && <L10nField label={uiText("Highlighted words")} hint={uiText("Shown in brand colour after the heading.")} value={form.highlight} onChange={(v) => setField('highlight', v)} />}
                {fields.has('description') && <L10nField className="sm:col-span-2" label={uiText("Description")} multiline rows={3} value={form.description} onChange={(v) => setField('description', v)} />}
              </div>
            </Panel>
            {(fields.has('image') || fields.has('video')) && (
              <Panel title={uiText("Image & video")}>
                <div className="grid gap-4">
                  {fields.has('image') && <MediaField label={uiText("Image")} value={form.image} onChange={(v) => setField('image', v)} />}
                  {fields.has('video') && <VideoField label={uiText("YouTube video")} value={form.video} onChange={(v) => setField('video', v)} />}
                </div>
              </Panel>
            )}
            <Panel title={uiText("Settings")}>
              <ConfigFields type={form.type} config={form.config} onChange={(v) => setField('config', v)} />
            </Panel>
            {meta.itemFields && (
              <Panel title={meta.itemsLabel}>
                <ItemsEditor type={form.type} value={form.items} onChange={(v) => setField('items', v)} />
              </Panel>
            )}
            {fields.has('buttons') && (
              <Panel title={uiText("Buttons")}>
                <ButtonsEditor value={form.buttons} onChange={(v) => setField('buttons', v)} />
              </Panel>
            )}
          </EditorShell>
          <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} path={`/${form.name ? `#${form.name}` : ''}`} />
        </>
      )}
    </EditorGate>
  );
}

export { ListEditor };
