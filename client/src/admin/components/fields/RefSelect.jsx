import { adminText } from '../../lib/format.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { get } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RESOURCES, refId } from '../../lib/resources.js';
import { docLabel } from '../../lib/format.js';
import { Field } from './Fields.jsx';

export const refLabels = {
  classes: (c) => {
    const name = adminText(c.name) || '';
    return name.includes(String(c.number)) ? name : `${uiText('Class')} ${c.number}${name ? ` — ${name}` : ''}`;
  },
  chapters: (c) => `${uiText('Chapter')} ${c.number} — ${adminText(c.title) || ''}${c.class?.number ? ` (${uiText('Class')} ${c.class.number})` : ''}`,
  exercises: (e) => `${uiText('Exercise')} ${e.number}${e.chapter?.title ? ` — ${adminText(e.chapter.title)}` : ''}`,
  questions: (q) => `${uiText('Question')} ${q.number}${q.exercise?.number ? ` · ${uiText('Exercise')} ${q.exercise.number}` : ''}`,
  subjects: (s) => adminText(s.name) || s.slug,
  notes: (n) => docLabel(n),
  'important-questions': (q) => String(adminText(q.text) || q.slug || '').replace(/<[^>]+>/g, '').slice(0, 80),
  pages: (p) => docLabel(p),
  videos: (v) => adminText(v.title) || v.youtubeId,
};

function useOptions(resource, params, open, q) {
  return useQuery({
    queryKey: ['admin', resource, 'options', params, q],
    queryFn: () => get(RESOURCES[resource].endpoint, { scope: 'admin', limit: 200, q: q || undefined, ...params }),
    enabled: open,
    staleTime: 30_000,
  });
}

/** Searchable single reference picker (Class → Chapter → Exercise cascades use `params`). */
export function RefSelect({ label, hint, error, required, resource, value, onChange, params = {}, placeholder = uiText("Select…"), disabled, getLabel, className, clearable = false }) {
  useUiLanguage();
  const triggerId = useId();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const options = useOptions(resource, params, open, q);
  const labelOf = getLabel || refLabels[resource] || docLabel;
  const id = refId(value);
  const selected = value && typeof value === 'object' ? value : options.data?.items?.find((o) => o._id === id);
  const detail = useQuery({
    queryKey: ['admin', resource, 'item', id],
    queryFn: () => get(`${RESOURCES[resource].endpoint}/${id}`),
    enabled: Boolean(id) && !selected,
  });
  const current = selected || detail.data;

  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} htmlFor={triggerId}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1">
          <PopoverTrigger asChild>
            <button
              id={triggerId}
              ref={triggerRef}
              type="button"
              disabled={disabled}
              aria-invalid={Boolean(error)}
              className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-3 text-left text-sm disabled:opacity-50 aria-invalid:border-destructive"
            >
              <span className={cn('truncate', !current && 'text-muted-foreground')}>{current ? labelOf(current) : id ? uiText("Loading…") : placeholder}</span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          {clearable && id && !disabled && (
            <button type="button" onClick={() => onChange(null)} className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground hover:text-foreground" aria-label={uiText("Clear selection")}>
              <X className="size-4" />
            </button>
          )}
        </div>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0"
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => triggerRef.current?.focus()}
        >
          <div className="border-b p-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={uiText("Search…")} className="h-8 w-full rounded-md bg-muted px-2 text-sm outline-none" aria-label={uiText("Search options")} />
          </div>
          <ul className="max-h-72 overflow-y-auto p-1" role="listbox">
            {options.isPending && (
              <li className="flex justify-center p-3">
                <Loader2 className="size-4 animate-spin" />
              </li>
            )}
            {options.data?.items?.map((option) => (
              <li key={option._id} role="option" aria-selected={option._id === id}>
                <button
                  type="button"
                  onClick={() => {
                    // Return focus now (not after the close animation), so it can't close a picker opened right after.
                    triggerRef.current?.focus();
                    onChange(option);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Check className={cn('size-4 shrink-0', option._id === id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{labelOf(option)}</span>
                  {option.status && option.status !== 'published' && <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase">{option.status}</span>}
                </button>
              </li>
            ))}
            {options.data?.items?.length === 0 && <li className="p-3 text-center text-xs text-muted-foreground">{uiText("Nothing found")}</li>}
          </ul>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

/** Multiple references shown as removable chips. */
export function RefMultiSelect({ label, hint, resource, value = [], onChange, params, getLabel }) {
  useUiLanguage();
  const labelOf = getLabel || refLabels[resource] || docLabel;
  const add = (option) => {
    if (option && !value.some((v) => refId(v) === option._id)) onChange([...value, option]);
  };

  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li key={refId(item)} className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
              <span className="truncate">{typeof item === 'object' ? labelOf(item) : item}</span>
              <button type="button" onClick={() => onChange(value.filter((v) => refId(v) !== refId(item)))} aria-label={uiText("Remove")}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <RefSelect resource={resource} value={null} onChange={add} params={params} placeholder={uiText("Add…")} getLabel={getLabel} />
    </Field>
  );
}
