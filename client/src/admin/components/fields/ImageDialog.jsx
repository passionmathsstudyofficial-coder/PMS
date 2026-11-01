import { adminText } from '../../lib/format.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MediaPicker } from '../media/MediaPicker.jsx';
import { imageWidth, validImageUrl } from './ContentImage.js';
import { imageUrl } from '@/lib/media';

export function ImageDialog({ open, onOpenChange, initial, onInsert, onRemove }) {
  useUiLanguage();
  const [form, setForm] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) { setForm({ src: '', alt: '', caption: '', align: 'center', contentWidth: '100%', ...initial }); setError(''); setLoaded(false); }
  }, [open, initial]);
  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); if (key === 'src') { setLoaded(false); setError(''); } };
  const src = validImageUrl(form.src);
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{onRemove ? uiText("Edit image") : uiText("Insert image")}</DialogTitle></DialogHeader>
        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>{uiText("Upload or choose from library")}</Button>
        <label className="space-y-1 text-sm">{uiText("Image URL")}<Input value={form.src || ''} onChange={(e) => set('src', e.target.value)} placeholder="https://example.com/image.png" /></label>
        {form.src && !src && <p role="alert" className="text-sm text-destructive">{uiText("Use an HTTP/HTTPS image URL or an uploaded image.")}</p>}
        {src && <div className="rounded-lg border bg-muted/30 p-3">
          <img src={imageUrl({ url: src })} alt={form.alt || uiText("Image preview")} className="mx-auto max-h-48 max-w-full object-contain" onLoad={() => { setLoaded(true); setError(''); }} onError={() => { setLoaded(false); setError('Image could not be loaded. Check the URL or upload another image.'); }} />
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <label className="space-y-1 text-sm">{uiText("Alternative text")}<Input value={form.alt || ''} onChange={(e) => set('alt', e.target.value)} placeholder={uiText("Describe the image for students")} /></label>
        <label className="space-y-1 text-sm">{uiText("Caption (optional)")}<Input value={form.caption || ''} onChange={(e) => set('caption', e.target.value)} /></label>
        <label className="space-y-1 text-sm">{uiText("Alignment")}<select aria-label={uiText("Image alignment")} className="h-9 w-full rounded-md border bg-background px-3" value={form.align || 'center'} onChange={(e) => set('align', e.target.value)}>
          <option value="left">{uiText("Left")}</option><option value="center">{uiText("Center")}</option><option value="right">{uiText("Right")}</option>
        </select></label>
        <label className="space-y-1 text-sm">{uiText("Width (% or px, aspect ratio preserved)")}<Input value={form.contentWidth || ''} onChange={(e) => set('contentWidth', e.target.value)} placeholder={uiText("100% or 320px")} /></label>
        <DialogFooter>
          {onRemove && <Button type="button" variant="destructive" onClick={() => { onRemove(); onOpenChange(false); }}>{uiText("Remove image")}</Button>}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{uiText("Cancel")}</Button>
          <Button type="button" disabled={!src || !loaded || !form.alt?.trim() || !/^(\d+)(%|px)$/.test(form.contentWidth || '')} onClick={() => { onInsert({ ...form, src, contentWidth: imageWidth(form.contentWidth) }); onOpenChange(false); }}>{uiText("Apply image")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <MediaPicker imagesOnly open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(item) => {
      setForm((f) => ({ ...f, src: item.url, alt: adminText(item.alt) || item.title || '', caption: adminText(item.caption) || '' }));
      setLoaded(false); setError('');
    }} />
  </>;
}
