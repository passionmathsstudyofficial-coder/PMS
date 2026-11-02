import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';

/** Draw one page at a time: mobile browsers do not need a native PDF plugin. */
export default function PdfCanvas({ url, title }) {
  useUiLanguage();
  const canvas = useRef(null);
  const container = useRef(null);
  const [document, setDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [password, setPassword] = useState(false);
  useEffect(() => {
    let task; let cancelled = false;
    setDocument(null); setPage(1); setError(false); setPassword(false); setLoading(true);
    (async () => {
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      task = pdfjs.getDocument({ url, withCredentials: true, isEvalSupported: false, useWasm: false, enableXfa: false, useSystemFonts: true });
      task.onPassword = () => { if (!cancelled) { setPassword(true); setLoading(false); } task.destroy(); };
      const loaded = await task.promise;
      if (!cancelled) setDocument(loaded);
    })().catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; task?.destroy(); };
  }, [url]);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(180, Math.min(1000, entries[0].contentRect.width - 24))));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let render; let cancelled = false;
    setLoading(true);
    (async () => {
      const pdfPage = await document.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: width / pdfPage.getViewport({ scale: 1 }).width });
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.current.width = Math.ceil(viewport.width * scale);
      canvas.current.height = Math.ceil(viewport.height * scale);
      canvas.current.style.width = `${viewport.width}px`;
      canvas.current.style.height = `${viewport.height}px`;
      render = pdfPage.render({ canvasContext: canvas.current.getContext('2d'), viewport, transform: scale === 1 ? null : [scale, 0, 0, scale, 0, 0] });
      await render.promise;
      if (!cancelled) setLoading(false);
    })().catch(error => { if (!cancelled && error.name !== 'RenderingCancelledException') { setError(true); setLoading(false); } });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width]);
  return <div className="flex h-full min-h-0 flex-col" ref={container}>
    {document && <div className="flex shrink-0 items-center justify-center gap-3 p-2 text-sm"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{uiText('Previous')}</Button><span>{page} / {document.numPages}</span><Button size="sm" variant="outline" disabled={page >= document.numPages || loading} onClick={() => setPage(page + 1)}>{uiText('Next')}</Button></div>}
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {loading && <p role="status" className="p-3 text-sm">{uiText('Loading…')}</p>}
      {error || password ? <p role="alert" className="p-3 text-sm">{uiText(password ? 'This PDF is password protected. Open or download it to enter the password.' : 'This document could not be loaded. Please retry or contact the administrator.')}</p> : <canvas ref={canvas} aria-label={title} role="img" className="mx-auto max-w-full bg-white shadow" />}
    </div>
  </div>;
}
