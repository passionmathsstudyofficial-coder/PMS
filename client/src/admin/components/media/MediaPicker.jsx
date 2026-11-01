import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImageUp, Loader2, Search, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage, get } from '@/lib/api';
import { imageUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { L10nField, SelectField, TextField } from '../fields/Fields.jsx';
import { formatBytes } from '../../lib/format.js';

export const MEDIA_KIND_OPTIONS = [
  { value: 'image', get label() { return uiText("Image"); } },
  { value: 'figure', get label() { return uiText("Figure"); } },
  { value: 'diagram', get label() { return uiText("Diagram"); } },
  { value: 'graph', get label() { return uiText("Graph"); } },
  { value: 'construction', get label() { return uiText("Construction"); } },
  { value: 'logo', get label() { return uiText("Logo"); } },
  { value: 'thumbnail', get label() { return uiText("Thumbnail"); } },
  { value: 'pdf', get label() { return uiText("PDF / Word document"); } },
  { value: 'other', get label() { return uiText("Other"); } },
];

export function MediaUploader({ defaultKind = 'image', onUploaded, compact = false, imagesOnly = false }) {
  useUiLanguage();
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState({ title: '', alt: {}, caption: {}, kind: defaultKind });
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const limits = useQuery({ queryKey: ['admin', 'media', 'upload-config'], queryFn: () => get('/media/upload-config') });

  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);
  const pick = (list) => {
    const incoming = Array.from(list || []);
    const allowed = defaultKind === 'pdf' ? /\.(pdf|docx?)$/i : imagesOnly ? /\.(png|jpe?g|webp|gif|svg)$/i : /\.(png|jpe?g|webp|gif|svg|pdf|doc|docx)$/i;
    const valid = incoming.filter((f) => allowed.test(f.name));
    if (incoming.length !== valid.length) toast.error(defaultKind === 'pdf' ? uiText("Choose PDF, DOC or DOCX files.") : imagesOnly ? uiText("Choose a supported image file.") : uiText("Choose PNG, JPG, WebP, GIF, SVG, PDF, DOC or DOCX files."));
    if (valid.length > 10) toast.error(uiText("Choose up to 10 files at a time."));
    const sized = valid.filter((f) => !limits.data?.maxBytes || f.size <= limits.data.maxBytes);
    if (sized.length !== valid.length) toast.error(uiTemplate`Each file must be ${formatBytes(limits.data.maxBytes)} or smaller.`);
    setFiles(sized.slice(0, 10));
  };

  const upload = async () => {
    if (!files.length) return;
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    if (meta.title) form.append('title', meta.title);
    form.append('altHi', meta.alt.hi || '');
    form.append('altEn', meta.alt.en || '');
    form.append('captionHi', meta.caption.hi || '');
    form.append('captionEn', meta.caption.en || '');
    form.append('kind', meta.kind);
    setBusy(true);
    setProgress(0);
    try {
      const { data } = await api.post('/media/upload', form, { onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)) });
      data.errors?.forEach((e) => toast.error(`${e.file}: ${errorMessage({ message: e.message, status: 400 })}`));
      toast.success(uiTemplate`${data.items.length} file(s) uploaded`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      setFiles([]);
      setMeta({ title: '', alt: {}, caption: {}, kind: meta.kind });
      onUploaded?.(data.items);
    } catch (error) {
      toast.apiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 px-6 text-center transition',
          compact ? 'py-6' : 'py-10',
          dragging ? 'border-brand bg-brand-soft' : 'hover:border-brand/50',
        )}
      >
        <UploadCloud className="mb-2 size-8 text-brand" aria-hidden="true" />
        <p className="text-sm font-semibold">{uiText("Drop files here or click to choose")}</p>
        <p className="text-xs text-muted-foreground">{uiText("Images, PDF, DOC or DOCX · up to 10 files")}{limits.data && uiTemplate` · ${formatBytes(limits.data.maxBytes)} per file`}</p>
        <input ref={inputRef} type="file" multiple accept={defaultKind === 'pdf' ? '.pdf,.doc,.docx' : imagesOnly ? '.png,.jpg,.jpeg,.webp,.gif,.svg' : '.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.doc,.docx'} hidden aria-hidden="true" onChange={(e) => pick(e.target.files)} />
      </div>

      {files.length > 0 && (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {previews.map(({ file, url }) => (
              <li key={file.name + file.size} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                {/\.(pdf|docx?)$/i.test(file.name) ? <span className="text-xs font-bold">{file.name.split('.').pop().toUpperCase()}</span> : <img src={url} alt="" className="size-12 rounded bg-white object-contain" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={uiText("Title (used for the SEO file name)")} value={meta.title} onChange={(title) => setMeta({ ...meta, title })} />
            <SelectField label={uiText("Type")} value={meta.kind} onChange={(kind) => setMeta({ ...meta, kind })} options={MEDIA_KIND_OPTIONS} />
            <L10nField label={uiText("Alt text (describe the image)")} value={meta.alt} onChange={(alt) => setMeta({ ...meta, alt })} />
            <L10nField label={uiText("Caption")} value={meta.caption} onChange={(caption) => setMeta({ ...meta, caption })} />
          </div>
          {busy && <Progress value={progress} />}
          <Button onClick={upload} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}{uiText("Upload")}{files.length}{uiText("file(s)")}</Button>
        </>
      )}
    </div>
  );
}

export function MediaGrid({ items, selected, onToggle, className }) {
  useUiLanguage();
  return (
    <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {items.map((media) => {
        const isSelected = selected?.some((s) => s._id === media._id);
        return (
          <li key={media._id}>
            <button
              type="button"
              onClick={() => onToggle(media)}
              aria-pressed={isSelected}
              className={cn('group relative block w-full overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md', isSelected && 'ring-3 ring-brand')}
            >
              <span className="flex aspect-[4/3] items-center justify-center bg-white p-2">
                {['pdf', 'doc', 'docx'].includes(media.format) ? <span className="text-sm font-bold uppercase">{media.format} · {media.originalName}</span> : <img src={imageUrl(media, 320)} alt={media.alt?.en || media.title || ''} loading="lazy" className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="block truncate border-t px-2 py-1.5 text-xs font-medium">{media.title || media.originalName}</span>
              <span className="absolute top-1.5 left-1.5 rounded bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">{media.kind}</span>
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-brand text-white">
                  <Check className="size-4" />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Choose existing images from the Media Library or upload new ones. */
export function MediaPicker({ open, onOpenChange, onSelect, multiple = false, kind, imagesOnly = false }) {
  useUiLanguage();
  const [tab, setTab] = useState('library');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kindFilter, setKindFilter] = useState(kind || '');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    if (open) {
      setSelected([]);
      setPage(1);
    }
  }, [open]);

  const library = useQuery({
    queryKey: ['admin', 'media', 'picker', debounced, kindFilter, page],
    queryFn: () => get('/media', { q: debounced || undefined, kind: kindFilter || undefined, page, limit: 24 }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  const toggle = (media) => {
    if (kind === 'pdf' && !['pdf', 'doc', 'docx'].includes(media.format)) return toast.error(uiText("Choose a PDF or Word document."));
    if (imagesOnly && ['pdf', 'doc', 'docx'].includes(media.format)) return toast.error(uiText("Choose an image file."));
    if (!multiple) return setSelected([media]);
    setSelected((list) => (list.some((m) => m._id === media._id) ? list.filter((m) => m._id !== media._id) : [...list, media]));
  };

  const confirm = (items = selected) => {
    if (!items.length) return;
    onSelect(multiple ? items : items[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{uiText("Media Library")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="library">{uiText("Library")}</TabsTrigger>
            <TabsTrigger value="upload">{uiText("Upload new")}</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input className="h-9 pl-8" placeholder={uiText("Search title, alt text, tags…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={uiText("Search media")} />
              </label>
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label={uiText("Filter by type")}>
                <option value="">{uiText("All types")}</option>
                <option value="diagrams">{uiText("Diagrams, graphs & figures")}</option>
                {MEDIA_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {library.isPending ? (
              <div className="grid h-40 place-items-center">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : library.data?.items?.length ? (
              <MediaGrid items={library.data.items} selected={selected} onToggle={toggle} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">{uiText("No files found. Upload one in the “Upload new” tab.")}</p>
            )}
            {library.data?.pages > 1 && (
              <div className="flex items-center justify-center gap-3 text-sm">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{uiText("Previous")}</Button>
                {page} / {library.data.pages}
                <Button variant="outline" size="sm" disabled={page >= library.data.pages} onClick={() => setPage(page + 1)}>{uiText("Next")}</Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <MediaUploader
              imagesOnly={imagesOnly}
              defaultKind={kind && kind !== 'diagrams' ? kind : 'image'}
              onUploaded={(items) => {
                if (multiple) confirm(items);
                else confirm([items[0]]);
              }}
            />
          </TabsContent>
        </Tabs>
        {tab === 'library' && (
          <DialogFooter>
            <span className="mr-auto self-center text-xs text-muted-foreground">{selected.length}{uiText("selected")}</span>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{uiText("Cancel")}</Button>
            <Button disabled={!selected.length} onClick={() => confirm()}>{uiText("Use selected")}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
