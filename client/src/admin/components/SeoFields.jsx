import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { L10nField, SelectField, TagsField, TextField, TextareaField } from './fields/Fields.jsx';
import { MediaField } from './media/MediaFields.jsx';
import { compatibleText } from '../../../../shared/localization.js';

export const ROBOTS_OPTIONS = [
  { value: 'index,follow', get label() { return uiText("Index, follow (recommended)"); } },
  { value: 'noindex,follow', get label() { return uiText("Noindex, follow"); } },
  { value: 'index,nofollow', get label() { return uiText("Index, nofollow"); } },
  { value: 'noindex,nofollow', get label() { return uiText("Noindex, nofollow"); } },
];

function Counter({ value, max }) {
  useUiLanguage();
  const length = (value || '').length;
  return <span className={length > max ? 'text-warning' : 'text-muted-foreground'}>{length}/{max}</span>;
}

/** Per-page SEO controls with a Google-style result preview. Empty fields fall back to automatic values. */
export function SeoFields({ value = {}, onChange, fallbackTitle, fallbackDescription, path }) {
  const language = useUiLanguage();
  const set = (patch) => onChange({ ...value, ...patch });
  const field = key => Object.fromEntries(['en','hi'].map(code => [code,value.translations?.[code]?.[key] || (compatibleText(value[key],code) ? value[key] : '')]));
  const setTranslated = (key,slots) => set({translations:Object.fromEntries(['en','hi'].map(code => [code,{...value.translations?.[code],[key]:slots[code] || ''}]))});
  const title = field('title')[language] || fallbackTitle || uiText('Page title');
  const description = field('description')[language] || fallbackDescription || uiText('Meta description…');
  const origin = typeof window !== 'undefined' ? window.location.host : 'example.com';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-3" aria-label={uiText("Search result preview")}>
        <p className="truncate text-xs text-success">
          {origin}
          {path || ''}
        </p>
        <p className="truncate text-[17px] leading-snug text-[#1a0dab] dark:text-indigo">{title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </div>
      <L10nField label={uiText("SEO title")} value={field('title')} onChange={slots => setTranslated('title',slots)} />
      <L10nField label={uiText("Meta description")} value={field('description')} onChange={slots => setTranslated('description',slots)} multiline rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={uiText("Canonical URL")} hint={uiText("Leave empty to use this page URL.")} value={value.canonical} onChange={(v) => set({ canonical: v })} placeholder={path} />
        <SelectField label={uiText("Robots")} value={value.robots || 'index,follow'} onChange={(v) => set({ robots: v })} options={ROBOTS_OPTIONS} />
      </div>
      <L10nField label={uiText("H1 override (optional)")} value={value.h1} onChange={(v) => set({ h1: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <L10nField label={uiText("Open Graph title")} value={field('ogTitle')} onChange={slots => setTranslated('ogTitle',slots)} />
        <L10nField label={uiText("Open Graph description")} value={field('ogDescription')} onChange={slots => setTranslated('ogDescription',slots)} multiline />
      </div>
      <MediaField label={uiText("Open Graph image (social sharing)")} value={value.ogImage} onChange={(v) => set({ ogImage: v })} />
      <L10nField label={uiText('Keywords')} value={Object.fromEntries(['en','hi'].map(code => [code,(value.keywordsByLanguage?.[code] || []).join(', ')]))} onChange={slots => set({keywordsByLanguage:Object.fromEntries(['en','hi'].map(code => [code,slots[code].split(',').map(word => word.trim()).filter(Boolean)]))})} />
    </div>
  );
}
