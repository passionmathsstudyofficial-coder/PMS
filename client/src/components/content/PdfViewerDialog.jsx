import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { resolveMediaUrl, documentType } from '@/lib/media';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { useL10n } from '@/lib/i18n';
import { useEffect, useState, lazy, Suspense } from 'react';
import { driveDocument } from '../../../../shared/documents.js';
const PdfCanvas = lazy(() => import('./PdfCanvas.jsx'));
export function PdfViewerDialog({ open, onOpenChange, url, title, downloadAllowed = true }) {
  useUiLanguage();
  url = resolveMediaUrl(url);
  const isWord = ['doc', 'docx'].includes(documentType(url));
  const t = useL10n();
  const drive = driveDocument(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!open || !url || drive) return;
    const controller = new AbortController();
    // Same-origin file errors are observable; cross-origin permissions cannot be inferred from iframe load.
    if (new URL(url, window.location.origin).origin === window.location.origin) {
      fetch(url, { method: 'HEAD', signal: controller.signal }).then(response => {
        if (!response.ok) setFailed(true);
      }).catch(error => { if (error.name !== 'AbortError') setFailed(true); });
    }
    return () => controller.abort();
  }, [open, url]);
  const displayTitle = typeof title === 'object' ? t(title) || uiText('Document unavailable') : title || uiText('Preview PDF');
  if (!url) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex h-[90vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-background shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5 truncate pr-4">
              <span className="grid size-8 place-items-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <FileText className="size-4" />
              </span>
              <DialogPrimitive.Title className="truncate font-heading text-base font-bold text-foreground">
                {displayTitle}
              </DialogPrimitive.Title>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {downloadAllowed && (
                <Button size="sm" variant="outline" asChild>
                  <a href={documentDownloadUrl(url)} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-1.5 size-4" />{uiText("Download")}</a>
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <a href={drive?.open || url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-4" />{uiText(drive ? 'Open in Google Drive' : 'Open in New Tab')}</a>
              </Button>
              <DialogPrimitive.Close asChild>
                <Button size="icon" variant="ghost" aria-label={uiText("Close viewer")}>
                  <X className="size-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col bg-slate-100 p-2 dark:bg-slate-900">
            <DialogPrimitive.Description className="p-2 text-xs text-muted-foreground">{uiText(drive ? 'Google Drive controls access. If a preview requests permission, open in Google Drive and request access from the owner. Downloads depend on the owner’s permissions.' : 'If the preview is unavailable, use Open in New Tab')}</DialogPrimitive.Description>
            {failed ? <p role="alert" className="p-6 text-sm">{uiText('This document could not be loaded. Please retry or contact the administrator.')}</p> : isWord ? <p className="p-6 text-sm">{uiText("Word document · Use Open or Download to read this file.")}</p> : drive ? <iframe
              src={drive?.preview || `${url}#toolbar=1&navpanes=0`}
              title={displayTitle}
              className="min-h-0 w-full flex-1 rounded-xl border bg-white shadow-inner"
              onError={() => setFailed(true)}
            /> : <div className="min-h-0 flex-1"><Suspense fallback={<p role="status">{uiText('Loading…')}</p>}><PdfCanvas url={url} title={displayTitle} /></Suspense></div>}

          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
