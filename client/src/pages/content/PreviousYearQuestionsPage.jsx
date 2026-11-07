import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  CheckCircle2,
  Filter,
  GraduationCap,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip, DifficultyBadge } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { SolutionRenderer } from '@/components/content/SolutionRenderer.jsx';
import { Figure } from '@/components/content/Figure.jsx';
import { toViewerImage, useImageViewer } from '@/components/content/ImageViewer.jsx';
import { EmptyState } from '@/components/site/States.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { useL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { ContentHeader } from './ContentHeader.jsx';

export default function PreviousYearQuestionsPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();
  const [searchParams] = useSearchParams();
  const { openViewer } = useImageViewer();

  const {
    category,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    examinationYears = [2025, 2024, 2023, 2022, 2020, 2019, 2018],
    papers = [],
    solvedQuestions = [],
  } = data;

  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const filteredPapers = papers.filter((p) => {
    if (selectedYear !== 'all' && String(p.year) !== String(selectedYear)) return false;
    if (selectedBoard !== 'all' && (p.board || 'cbse').toLowerCase() !== selectedBoard.toLowerCase()) return false;
    return true;
  });

  const filteredQuestions = solvedQuestions.filter((q) => {
    if (selectedYear !== 'all' && q.year && String(q.year) !== String(selectedYear)) return false;
    return true;
  });

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="PYQ"
        eyebrow={<Chip tone="brand">{uiText("CBSE Class ")}{cls?.number || '6–12'}{uiText(" Mathematics")}</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} पिछले वर्षों के प्रश्नपत्र (PYQ)`,
          en: `CBSE Class ${cls?.number || '6–12'} Maths Previous Year Question Papers (PYQ)`,
        }}
        subtitle={uiText("Download past 10 years CBSE question papers with question-wise step-by-step solutions, marking schemes, paper sets, and answer keys.")}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {uiText("Select Class (कक्षा चुनें)")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {uiText("Choose your class to view class-specific question papers and solutions:")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/study-materials/previous-year-questions/class-${c.number}`}
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

        {/* Filter Controls: Year, Board */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Filter className="size-3.5 text-brand" />
              {uiText("Filter by Year")}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer',
                  selectedYear === 'all'
                    ? 'bg-brand text-white'
                    : 'bg-card border border-border text-foreground hover:bg-muted'
                )}
              >
                {uiText("All Years")}
              </button>
              {examinationYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(String(yr))}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer',
                    selectedYear === String(yr)
                      ? 'bg-brand text-white'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{uiText("Showing")} <strong>{filteredPapers.length}</strong> {uiText("Papers")}</span>
          </div>
        </div>

        {/* Question Papers List & Downloads */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-5 text-brand" />
              <span>{uiText("Previous Year Question Papers & Marking Schemes")}</span>
            </h2>
          </div>

          {filteredPapers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPapers.map((paper) => (
                <div
                  key={paper._id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-brand/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-extrabold text-brand">
                        {paper.year || uiText('PYQ')}
                      </span>
                      {paper.paperSet && (
                        <span className="rounded-lg border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {paper.paperSet}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">
                      {t(paper.title)}
                    </h3>
                    {paper.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {t(paper.description)}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center gap-2">
                    {paper.fileUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPdf(paper.fileUrl, t(paper.title))}
                          className="flex-1 gap-1.5 text-xs font-bold"
                        >
                          <Eye className="size-3.5" />
                          <span>{uiText("View PDF")}</span>
                        </Button>
                        <a
                          href={documentDownloadUrl(paper.fileUrl, t(paper.title))}
                          download
                          className="inline-flex h-8 items-center justify-center rounded-xl bg-brand px-3 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors"
                        >
                          <Download className="size-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center bg-card/50">
              <p className="text-sm text-muted-foreground mb-3">
                {uiText("Question papers for the selected year will be uploaded shortly.")}
              </p>
              <Button variant="outline" size="sm" onClick={() => setSelectedYear('all')}>
                {uiText("View All Available Years")}
              </Button>
            </div>
          )}
        </section>

        {/* Solved Questions Section */}
        {filteredQuestions.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span>{uiText("Solved Board Questions with Step-by-Step Mathematical Explanations")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {uiText("Real questions from past CBSE board exams with complete factorizations, proofs, equations, and answer keys.")}
              </p>
            </div>

            <div className="space-y-6">
              {filteredQuestions.map((q, idx) => {
                const images = (q.attachments || []).map((a) =>
                  toViewerImage(a.media, { alt: t(a.alt) || t(a.media?.alt), caption: t(a.caption) })
                );
                return (
                  <article
                    key={q._id}
                    id={q.slug}
                    className="overflow-hidden rounded-2xl border bg-card shadow-xs"
                  >
                    <header className="flex flex-wrap items-center gap-2 border-b bg-amber-500/5 px-4 py-3 sm:px-5">
                      <span className="grid size-6 place-items-center rounded-md bg-brand text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {term('question')} {idx + 1}
                      </span>
                      {q.year && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                          CBSE {q.year}
                        </span>
                      )}
                      {q.marks && (
                        <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {q.marks} {term('marks')}
                        </span>
                      )}
                      {q.difficulty && <DifficultyBadge difficulty={q.difficulty} />}
                      {q.chapter && (
                        <span className="ml-auto text-xs font-semibold text-brand">
                          {term('chapter')} {q.chapter.number}: {t(q.chapter.title)}
                        </span>
                      )}
                    </header>

                    <div className="space-y-4 p-5">
                      <RichContent html={t(q.text, q.languageMode)} className="text-base font-medium" />

                      {q.attachments?.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {q.attachments.map((a, i) => (
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

                      {q.blocks?.length > 0 && (
                        <div className="rounded-xl border border-brand/15 bg-brand/[0.02] p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-3">
                            {uiText("Step-by-Step Solution")}
                          </h4>
                          <SolutionRenderer blocks={q.blocks} languageMode={q.languageMode} />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
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

