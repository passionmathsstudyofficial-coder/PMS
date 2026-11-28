import { StudyArticleContent } from '@/components/content/StudyArticleContent.jsx';
import { useState, useMemo } from 'react';
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
import { Chip } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { QuestionPaperContent, getPaperBadgeLabel } from '@/components/content/QuestionPaperContent.jsx';
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

  const {
    category,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    papers = [],
    solvedQuestions = [],
  } = data;

  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  // Only show years for which relevant content exists
  const availableYears = useMemo(() => {
    const set = new Set(
      [
        ...papers.map((p) => p.year),
        ...solvedQuestions.map((q) => q.year),
      ].filter(Boolean).map(Number)
    );
    return Array.from(set).sort((a, b) => b - a);
  }, [papers, solvedQuestions]);

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

  const dynamicHeaderTitle = selectedYear !== 'all'
    ? {
        hi: `CBSE PYQ ${selectedYear} — कक्षा ${cls?.number || '6-12'} गणित प्रश्नपत्र व हल`,
        en: `CBSE PYQ ${selectedYear} — Class ${cls?.number || '6–12'} Maths Previous Year Paper & Solutions`,
      }
    : {
        hi: `CBSE कक्षा ${cls?.number || '6-12'} पिछले वर्षों के प्रश्नपत्र (PYQ)`,
        en: `CBSE Class ${cls?.number || '6–12'} Maths Previous Year Question Papers (PYQ)`,
      };

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="PYQ"
        eyebrow={<Chip tone="brand">{uiText("CBSE Class ")}{cls?.number || '6–12'}{uiText(" Mathematics")}</Chip>}
        title={dynamicHeaderTitle}
        subtitle={uiText("Download past CBSE question papers with question-wise step-by-step solutions, marking schemes, paper sets, and answer keys.")}
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

        {/* Filter Controls: Year Dropdown */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-brand" />
              <label htmlFor="pyq-year-dropdown" className="text-xs font-bold text-foreground">
                {uiText("Select Year")}:
              </label>
              <select
                id="pyq-year-dropdown"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground shadow-xs focus:border-brand focus:outline-none cursor-pointer"
              >
                <option value="all">{uiText("All Available Years")}</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {selectedYear !== 'all' && (
              <span className="inline-flex items-center rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-black text-brand">
                {getPaperBadgeLabel('pyq', selectedYear)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>
              {uiText("Showing")}{' '}
              <strong>{filteredPapers.length + filteredQuestions.length}</strong>{' '}
              {selectedYear !== 'all' ? getPaperBadgeLabel('pyq', selectedYear) : uiText("Papers & Resources")}
            </span>
          </div>
        </div>

        {/* Question Papers List & Downloads (shown when papers exist) */}
        {filteredPapers.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="size-5 text-brand" />
                <span>
                  {selectedYear !== 'all'
                    ? `${getPaperBadgeLabel('pyq', selectedYear)} — ${uiText("Question Papers & Marking Schemes")}`
                    : uiText("Previous Year Question Papers & Marking Schemes")}
                </span>
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPapers.map((paper) => (
                <div
                  key={paper._id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-brand/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-extrabold text-brand">
                        {getPaperBadgeLabel('pyq', paper.year)}
                      </span>
                      {paper.paperSet && (
                        <span className="rounded-lg border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {paper.paperSet}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">
                      {t(paper.title) || getPaperBadgeLabel('pyq', paper.year)}
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
                          onClick={() => openPdf(paper.fileUrl, t(paper.title) || getPaperBadgeLabel('pyq', paper.year))}
                          className="flex-1 gap-1.5 text-xs font-bold"
                        >
                          <Eye className="size-3.5" />
                          <span>{uiText("View PDF")}</span>
                        </Button>
                        <a
                          href={documentDownloadUrl(paper.fileUrl, t(paper.title) || getPaperBadgeLabel('pyq', paper.year))}
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
          </section>
        )}

        {/* Empty State shown only when neither papers nor solved questions exist */}
        {filteredPapers.length === 0 && filteredQuestions.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center bg-card/50 mb-12">
            <p className="text-sm text-muted-foreground mb-3">
              {selectedYear !== 'all'
                ? uiText("Question papers for the selected year will be uploaded shortly.")
                : uiText("Question papers and solutions will be uploaded shortly.")}
            </p>
            {selectedYear !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedYear('all')}>
                {uiText("View All Available Years")}
              </Button>
            )}
          </div>
        )}

        {/* Solved Questions Section with Visual Distinction and Highlighted Cards */}
        {filteredQuestions.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span>
                  {selectedYear !== 'all'
                    ? `${getPaperBadgeLabel('pyq', selectedYear)} — ${uiText("Questions & Step-by-Step Solutions")}`
                    : uiText("Solved Board Questions with Step-by-Step Mathematical Explanations")}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {uiText("Questions from CBSE board exams with complete factorizations, proofs, equations, and answer keys.")}
              </p>
            </div>

            <QuestionPaperContent
              questions={filteredQuestions}
              pageType="pyq"
              defaultYear={selectedYear !== 'all' ? selectedYear : undefined}
            />
          </section>
        )}
      </div>

      <PdfViewerDialog
        open={Boolean(activePdfUrl)}
        onOpenChange={(open) => !open && setActivePdfUrl(null)}
        url={activePdfUrl}
        title={activePdfTitle}
      />
    </>
  );
}
