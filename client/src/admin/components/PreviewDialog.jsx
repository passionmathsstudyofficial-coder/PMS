import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ExternalLink, Laptop, Loader2, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api, errorMessage } from '@/lib/api';
import { normalizeRefs } from '../lib/resources.js';

const DEVICES = {
  desktop: { width: 1280, get label() { return uiText("Desktop"); }, icon: Laptop },
  tablet: { width: 820, get label() { return uiText("Tablet"); }, icon: Tablet },
  mobile: { width: 390, get label() { return uiText("Mobile"); }, icon: Smartphone },
};

function buildUrl(path, token, language) {
  const url = new URL(path,window.location.origin);
  url.searchParams.set('preview','1');
  url.searchParams.set('lang',language);
  if (token) url.searchParams.set('previewToken',token);
  return url.pathname + url.search + url.hash;
}

/** Shows the page exactly as students will see it (including unsaved changes) on desktop, tablet and mobile. */
export function PreviewDialog({ open, onOpenChange, path, entityType, id, data, solution }) {
  useUiLanguage();
  const [device, setDevice] = useState('desktop');
  const [src, setSrc] = useState(null);
  const [previewLanguage, setPreviewLanguage] = useState('en');
  const [scale, setScale] = useState(1);
  const frameBox = useRef(null);

  useEffect(() => {
    if (!open || !path) return undefined;
    let cancelled = false;
    setSrc(null);
    (async () => {
      let token;
      if (entityType && id && id !== 'new' && data) {
        try {
          const response = await api.post('/public/preview', {
            entityType,
            id,
            data: normalizeRefs(data),
            solution: solution ? normalizeRefs(solution) : undefined,
          });
          token = response.data.token;
        } catch (error) {
          toast.error(uiTemplate`Preview of unsaved changes failed: ${errorMessage(error)}`);
        }
      }
      if (!cancelled) setSrc(buildUrl(path, token, previewLanguage));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, path, entityType, id, data, solution, previewLanguage]);

  useEffect(() => {
    if (!open || !frameBox.current) return undefined;
    const update = () => {
      const available = frameBox.current.clientWidth - 24;
      setScale(Math.min(1, available / DEVICES[device].width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frameBox.current);
    return () => observer.disconnect();
  }, [open, device, src]);

  const width = DEVICES[device].width;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] max-w-[96vw] flex-col gap-3 p-3 sm:max-w-[96vw]">
        <DialogHeader className="flex-row flex-wrap items-center gap-3 pr-10">
          <DialogTitle>{uiText("Preview")}</DialogTitle>
          <ToggleGroup type="single" value={previewLanguage} onValueChange={value => value && setPreviewLanguage(value)} aria-label={uiText('Preview language')}>
            <ToggleGroupItem value="en">{uiText('English')}</ToggleGroupItem>
            <ToggleGroupItem value="hi">{uiText('Hindi')}</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" value={device} onValueChange={(v) => v && setDevice(v)} variant="outline" size="sm">
            {Object.entries(DEVICES).map(([key, { label, icon: IconComponent }]) => (
              <ToggleGroupItem key={key} value={key} aria-label={label}>
                <IconComponent /> <span className="hidden sm:inline">{label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs text-muted-foreground">
            {width}px · {Math.round(scale * 100)}%
          </span>
          {src && (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <a href={src} target="_blank" rel="noreferrer">
                <ExternalLink />{uiText("Open in new tab")}</a>
            </Button>
          )}
        </DialogHeader>
        <div ref={frameBox} className="relative flex-1 overflow-auto rounded-xl bg-muted p-3">
          {!src ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mx-auto" style={{ width: width * scale, height: '100%' }}>
              <iframe
                key={src}
                src={src}
                title={uiText("Page preview")}
                className="origin-top-left rounded-lg border bg-background shadow-lg"
                style={{ width, height: `${100 / scale}%`, transform: `scale(${scale})` }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
