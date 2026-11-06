import { useState } from 'react';
import { Link } from 'react-router';
import {
  BookOpen,
  Download,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { useL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { ContentHeader } from './ContentHeader.jsx';

export default function ReferenceBookNotesPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();

  const {
    bookSlug,
    bookTitle,
    book,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    notes = [],
    resources = [],
  } = data;

  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  const currentRoutePrefix = `/notes/${bookSlug}-formulas-notes`;

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="NOTES"
        eyebrow={<Chip tone="brand">{bookTitle} Mathematics</Chip>}
        title={{
          hi: `${bookTitle} कक्षा ${cls?.number || '6-12'} गणित सूत्र व अध्याय नोट्स`,
          en: `${bookTitle} Class ${cls?.number || '6–12'} Maths Formulas & Notes`,
        }}
        subtitle={uiText(`${bookTitle} chapter-wise important formulas, proofs, worked conceptual examples, theorems, and quick revision notes.`)}
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
              {uiText("Select Class (कक्षा चुनें)")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {uiText(`Select your class for ${bookTitle} formulas and notes:`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`${currentRoutePrefix}/class-${c.number}`}
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

        {/* Link to Solutions Banner */}
        <div className="mb-8 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/5 via-card to-amber-500/5 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {uiText(`Looking for ${bookTitle} step-by-step exercise solutions?`)}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uiText(`Access complete question-wise answers for all exercises in ${bookTitle}.`)}
            </p>
          </div>
          <Link
            to={`/reference-solutions/${bookSlug}/class-${cls?.number || 10}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors shrink-0"
          >
            <span>{uiText("Go to Solutions")}</span>
            &rarr;
          </Link>
        </div>

        {/* Downloadable PDF Resources */}
        {resources.length > 0 && (
          <section className="mb-10">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Download className="size-4 text-brand" />
              <span>{uiText(`${bookTitle} Downloadable Notes & Formula Sheets (PDF)`)}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <div key={r._id} className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-xs">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground truncate">{t(r.title)}</h4>
                    <span className="text-[11px] text-muted-foreground">{r.fileSize || 'PDF Document'}</span>
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

        {/* Chapter Formulas & Notes */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {uiText(`${bookTitle} Chapter Formulas & Key Concepts`)}
          </h2>

          {chapters.length > 0 ? (
            chapters.map((ch) => (
              <div key={ch._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-xl bg-brand/10 text-xs font-black text-brand">
                      {ch.number}
                    </span>
                    <h3 className="text-base font-bold text-foreground">
                      {t(ch.title)}
                    </h3>
                  </div>
                  <Link
                    to={`/reference-solutions/${bookSlug}/class-${cls?.number || 10}/${ch.slug}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    {uiText("Exercise Solutions")} &rarr;
                  </Link>
                </div>

                {ch.formulas ? (
                  <div className="prose prose-sm max-w-none text-foreground font-normal">
                    <RichContent html={t(ch.formulas)} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {uiText(`${bookTitle} chapter notes, formulas, and theorem proofs.`)}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center bg-card/50">
              <BookOpen className="size-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">
                {uiText(`No notes found for ${bookTitle}`)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {uiText("Content will be published through the admin CMS.")}
              </p>
            </div>
          )}
        </section>

        {/* Book Notes authored from CMS */}
        {notes.length > 0 && (
          <section className="mt-10 space-y-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {uiText("Articles & Concept Explanations")}
            </h2>
            {notes.map((n) => (
              <article key={n._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                <h3 className="text-base font-bold text-foreground mb-2">{t(n.title)}</h3>
                {n.summary && <p className="text-xs text-muted-foreground mb-3">{t(n.summary)}</p>}
                {n.content && (
                  <div className="prose prose-sm max-w-none text-foreground font-normal">
                    <RichContent html={t(n.content)} />
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
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

