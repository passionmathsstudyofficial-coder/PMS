import { useState } from 'react';
import { Link } from 'react-router';
import {
  FileSpreadsheet,
  Download,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Sigma,
  Table,
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

export default function FormulaSheetsPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();

  const {
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    formulaNotes = [],
    resources = [],
    symbols = [],
  } = data;

  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="FORMULAS"
        eyebrow={<Chip tone="brand">Complete Mathematics Formula Repository</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} गणित संपूर्ण सूत्र पत्रक (Formula Sheet)`,
          en: `All Maths Formulas for Class ${cls?.number || '6–12'} | Complete Formula Sheet PDF`,
        }}
        subtitle={uiText("Comprehensive chapter-wise formula tables, algebraic identities, trigonometry formulas, mensuration equations, and mathematical symbols guide.")}
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
              {uiText("Choose your class for complete maths formula sheets:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/notes/maths-formula-sheets/class-${c.number}`}
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

        {/* Download Full Formula Sheet Banner */}
        {resources.length > 0 && (
          <div className="mb-10 rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-extrabold text-brand uppercase tracking-wider">
                  Quick Revision
                </span>
                <h3 className="text-base font-bold text-foreground mt-1">
                  {t(resources[0].title) || `Complete Class ${cls?.number || '6-12'} Maths Formula Sheet PDF`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uiText("Printable pocket formula sheet containing all theorems, formulas and proofs.")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {resources[0].fileUrl && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPdf(resources[0].fileUrl, t(resources[0].title))}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Eye className="size-3.5" />
                      <span>{uiText("View Sheet")}</span>
                    </Button>
                    <a
                      href={documentDownloadUrl(resources[0].fileUrl, t(resources[0].title))}
                      download
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors"
                    >
                      <Download className="size-3.5" />
                      <span>{uiText("Download PDF")}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mathematical Symbols Table */}
        {symbols.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Sigma className="size-5 text-brand" />
              <span>{uiText("Essential Mathematical Symbols & Notations")}</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b bg-muted/50 font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Symbol Name</th>
                    <th className="px-4 py-3">Formula / Approximation</th>
                    <th className="px-4 py-3">Common Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {symbols.map((sym, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold text-brand">
                        <RichContent html={`$${sym.symbol}$`} />
                      </td>
                      <td className="px-4 py-3">{t(sym.name)}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        <RichContent html={`$${sym.approx}$`} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t(sym.use)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Chapter-wise Formulas Section */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Table className="size-5 text-brand" />
            <span>{uiText("Chapter-wise Formula Tables")}</span>
          </h2>

          <div className="space-y-6">
            {chapters.map((ch) => (
              <div key={ch._id} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
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
                    to={`/class-${cls?.number || 10}/maths/${ch.slug}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    {uiText("Full Solutions")} &rarr;
                  </Link>
                </div>

                {ch.formulas && (
                  <div className="prose prose-sm max-w-none text-foreground font-normal">
                    <RichContent html={t(ch.formulas)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Formula Notes Authored from Admin Panel */}
        {formulaNotes.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {uiText("Formula Sheet Articles")}
            </h2>
            {formulaNotes.map((fn) => (
              <article key={fn._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                <h3 className="text-base font-bold text-foreground mb-2">{t(fn.title)}</h3>
                {fn.summary && <p className="text-xs text-muted-foreground mb-3">{t(fn.summary)}</p>}
                {fn.content && (
                  <div className="prose prose-sm max-w-none text-foreground font-normal">
                    <RichContent html={t(fn.content)} />
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

