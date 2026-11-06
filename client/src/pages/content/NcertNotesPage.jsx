import { useState } from 'react';
import { Link } from 'react-router';
import {
  FileText,
  Download,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { Figure } from '@/components/content/Figure.jsx';
import { toViewerImage, useImageViewer } from '@/components/content/ImageViewer.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { useL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { ContentHeader } from './ContentHeader.jsx';

export default function NcertNotesPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();
  const { openViewer } = useImageViewer();

  const {
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    notes = [],
    resources = [],
  } = data;

  const [selectedChapter, setSelectedChapter] = useState('all');
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  const filteredNotes = notes.filter((n) => {
    if (selectedChapter !== 'all' && n.chapter && String(n.chapter._id || n.chapter) !== selectedChapter) return false;
    return true;
  });

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="NOTES"
        eyebrow={<Chip tone="brand">Chapter-wise NCERT Revision Notes</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} गणित NCERT अध्याय-वार नोट्स`,
          en: `CBSE Class ${cls?.number || '6–12'} Maths NCERT Chapter-wise Notes`,
        }}
        subtitle={uiText("Comprehensive revision notes, key concepts, theorem proofs, important definitions, diagrams, and downloadable chapter summaries.")}
        actions={
          <AcademicSessionSelector
            sessions={academicSessions}
            currentSession={currentSession}
          />
        }
      />

      <div className="container-page py-8">
        {/* Class Selection Pill Bar */}
        <div className="mb-8 rounded-2xl border bg-card p-4 sm:p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">
              {uiText("Select Class (अपनी कक्षा चुनें)")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {uiText("Choose your class for NCERT chapter-wise revision notes:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/notes/ncert-chapter-wise-notes/class-${c.number}`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-bold transition-all shadow-xs',
                    isSelected
                      ? 'border-brand bg-brand text-white shadow-md'
                      : 'border-border bg-card text-foreground hover:border-brand/40 hover:bg-muted'
                  )}
                >
                  <span className={cn('grid size-5.5 place-items-center rounded-lg text-xs font-black', isSelected ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand')}>
                    {c.number}
                  </span>
                  <span>{uiText("Class")} {c.number}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Filter Controls: Chapter */}
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-brand" />
            <span className="text-xs font-bold text-foreground">{uiText("Filter by Chapter")}:</span>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="h-8 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">{uiText("All Chapters")}</option>
              {chapters.map((ch) => (
                <option key={ch._id} value={String(ch._id)}>
                  Ch {ch.number}: {t(ch.title)}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            <strong>{filteredNotes.length}</strong> {uiText("Notes Available")}
          </span>
        </div>

        {/* Downloadable PDF Notes Resources */}
        {resources.length > 0 && (
          <section className="mb-10">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Download className="size-4 text-brand" />
              <span>{uiText("Downloadable Chapter Notes (PDF)")}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <div key={r._id} className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-xs">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground truncate">{t(r.title)}</h4>
                    <span className="text-[11px] text-muted-foreground">{r.fileSize || 'PDF Notes'}</span>
                  </div>
                  {r.fileUrl && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openPdf(r.fileUrl, t(r.title))} className="h-7 px-2 text-xs">
                        <Eye className="size-3" />
                      </Button>
                      <a href={documentDownloadUrl(r.fileUrl, t(r.title))} download className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                        <Download className="size-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes Articles */}
        <section className="space-y-6">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
              const images = (note.attachments || []).map((a) =>
                toViewerImage(a.media, { alt: t(a.alt) || t(a.media?.alt), caption: t(a.caption) })
              );
              return (
                <article key={note._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3 mb-3 border-b border-border/60 pb-3">
                    <div>
                      {note.chapter && (
                        <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">
                          {term('chapter')} {note.chapter.number}: {t(note.chapter.title)}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        {t(note.title)}
                      </h3>
                    </div>
                  </div>

                  {note.summary && (
                    <div className="mb-4 rounded-xl border border-brand/10 bg-brand/5 p-3 text-xs sm:text-sm text-foreground/90 font-medium">
                      {t(note.summary)}
                    </div>
                  )}

                  {note.content && (
                    <div className="prose prose-sm max-w-none text-foreground font-normal">
                      <RichContent html={t(note.content)} />
                    </div>
                  )}

                  {images.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 mt-4">
                      {note.attachments.map((a, i) => (
                        <Figure
                          key={a._id || i}
                          media={a.media}
                          alt={images[i]?.alt}
                          caption={images[i]?.caption}
                          onOpen={() => openViewer(images, i)}
                        />
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center bg-card/50">
              <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">
                {uiText("No notes found for this chapter")}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {uiText("Select All Chapters or view chapter solutions directly.")}
              </p>
              <Button variant="outline" size="sm" onClick={() => setSelectedChapter('all')}>
                {uiText("Show All Chapters")}
              </Button>
            </div>
          )}
        </section>
      </div>

      <PdfViewerDialog
        open={Boolean(activePdfUrl)}
        onOpenChange={(open) => !open && setActivePdfUrl(null)}
        fileUrl={activePdfUrl}
        title={activePdfTitle}
      />
    </>
  );
}

