import { useState } from 'react';
import { Link } from 'react-router';
import {
  FileSpreadsheet,
  Download,
  Eye,
  FileCheck2,
  Calendar,
  Sparkles,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { useL10n } from '@/lib/i18n';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { ContentHeader } from './ContentHeader.jsx';

export default function SamplePapersPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();

  const {
    category,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    papers = [],
    markingSchemes = [],
  } = data;

  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [selectedSet, setSelectedSet] = useState('all');

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  const filteredPapers = papers.filter((p) => {
    if (selectedSet !== 'all' && p.paperSet && p.paperSet !== selectedSet) return false;
    return true;
  });

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="SAMPLE"
        eyebrow={<Chip tone="brand">{uiText("CBSE Class ")}{cls?.number || '6–12'}{uiText(" Mathematics")}</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} सैंपल पेपर्स व मॉडल प्रश्नपत्र`,
          en: `CBSE Class ${cls?.number || '6–12'} Maths Sample Papers & Model Papers`,
        }}
        subtitle={uiText("Official CBSE sample question papers with marking schemes, blueprint, section-wise marks distribution, and model solutions.")}
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
              {uiText("Choose your class for official CBSE sample papers and scoring blueprints:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/study-materials/cbse-sample-papers/class-${c.number}`}
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

        {/* Blueprint & Exam Pattern Card */}
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-card to-brand/5 p-5 sm:p-6">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-brand" />
            <span>{uiText("CBSE Examination Pattern & Blueprint (")}{currentSession})</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {uiText("The question paper consists of 5 sections: Section A (20 MCQs of 1 mark each), Section B (5 Very Short Answer questions of 2 marks each), Section C (6 Short Answer questions of 3 marks each), Section D (4 Long Answer questions of 5 marks each), and Section E (3 Case-Based integrated units of assessment of 4 marks each).")}
          </p>

        </div>

        {/* Sample Question Papers Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-brand" />
              <span>{uiText("CBSE Sample Question Papers (SQP)")}</span>
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
                      <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-extrabold text-brand">{uiText("SQP ")}{paper.year || currentSession}
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
                          <span>{uiText("View Sample Paper")}</span>
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
                {uiText("Sample papers will be published here for download.")}
              </p>
            </div>
          )}
        </section>

        {/* Marking Schemes Section */}
        {markingSchemes.length > 0 && (
          <section className="mb-12">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="size-5 text-emerald-600" />
                <span>{uiText("Official Marking Schemes & Solutions (MS)")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {uiText("CBSE marking scheme showing step-by-step mark distribution for every question.")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markingSchemes.map((ms) => (
                <div
                  key={ms._id}
                  className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-card p-5 shadow-xs"
                >
                  <div>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-extrabold text-emerald-600 mb-2 inline-block">{uiText("Marking Scheme")}</span>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">
                      {t(ms.title)}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center gap-2">
                    {ms.fileUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPdf(ms.fileUrl, t(ms.title))}
                          className="flex-1 gap-1.5 text-xs font-bold"
                        >
                          <Eye className="size-3.5" />
                          <span>{uiText("View Marking Scheme")}</span>
                        </Button>
                        <a
                          href={documentDownloadUrl(ms.fileUrl, t(ms.title))}
                          download
                          className="inline-flex h-8 items-center justify-center rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
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

