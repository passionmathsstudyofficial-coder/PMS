import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { useState } from 'react';
import { resolveMediaUrl, documentType } from '@/lib/media';
import { PdfViewerDialog } from './PdfViewerDialog.jsx';

export function DocumentAttachment({ media, title, downloadAllowed = true }) {
  useUiLanguage();
  const [open, setOpen] = useState(false);
  const url = resolveMediaUrl(media?.url);
  if (!url) return <p className="text-sm text-muted-foreground">{uiText("Document unavailable")}</p>;
  const type = documentType(media);
  const filename = media.originalName || media.filename || title || 'Document';
  return <div className="my-3 space-y-2 rounded-xl border bg-card p-4 text-sm">
    <p className="break-all font-semibold">{title || filename}</p>
    <p className="break-all text-xs text-muted-foreground">{type.toUpperCase()} · {filename}</p>
    <div className="flex flex-wrap gap-4 font-semibold text-brand">
      {type === 'pdf' && <button type="button" onClick={() => setOpen(true)}>{uiText("Preview PDF")}</button>}
      <a href={url} target="_blank" rel="noopener noreferrer">{uiText("Open")}{type.toUpperCase()}</a>
      {downloadAllowed && <a href={documentDownloadUrl(url)} download={filename} target="_blank" rel="noopener noreferrer">{uiText("Download")}{type.toUpperCase()}</a>}
    </div>
    <PdfViewerDialog open={open} onOpenChange={setOpen} url={url} title={title || filename} downloadAllowed={downloadAllowed} />
  </div>;
}
