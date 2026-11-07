import { uiTemplate } from '@/lib/uiLanguage.js';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  GraduationCap,
  Download,
  Eye,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
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

export default function MathsSyllabusPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();

  const {
    category,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    resources = [],
    topics = [],
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
        watermark="SYLLABUS"
        eyebrow={<Chip tone="brand">{uiText("Curriculum & Course Structure")}</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} गणित पाठ्यक्रम (${currentSession})`,
          en: `CBSE Class ${cls?.number || '6–12'} Mathematics Syllabus ${currentSession}`,
        }}
        subtitle={uiText("Updated CBSE Mathematics syllabus, unit-wise marks weightage, course structure, prescribed NCERT textbooks, and deleted topics.")}
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
              {uiText("View class-specific syllabus and marks distribution:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/study-materials/maths-syllabus/class-${c.number}`}
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

        {/* Downloadable Official Syllabus PDF */}
        {resources.length > 0 && (
          <div className="mb-10 rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-extrabold text-brand uppercase tracking-wider">{uiText("Syllabus")}</span>
                <h3 className="text-base font-bold text-foreground mt-1">
                  {t(resources[0].title) || uiTemplate`CBSE Class ${cls?.number || '6-12'} Maths Official Syllabus PDF`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uiText("Published syllabus document for the selected academic session.")}
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
                      <span>{uiText("View Syllabus")}</span>
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

        {/* Marks Distribution & Course Units */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Layers className="size-5 text-brand" />
            <span>{uiText("Course Structure & Unit-wise Marks Distribution")}</span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs mb-8">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b bg-muted/50 font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{uiText("Unit No.")}</th>
                  <th className="px-4 py-3">{uiText("Unit Name")}</th>
                  <th className="px-4 py-3 text-right">{uiText("Marks Weightage")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {chapters.map((chapter) => <tr key={chapter._id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-bold text-brand">{chapter.number}</td>
                  <td className="px-4 py-3">{t(chapter.title)}</td>
                  <td className="px-4 py-3 text-right font-bold">{chapter.syllabusMarks ?? '—'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>

          {/* Chapter-wise Syllabus Breakdown */}
          <h3 className="text-base font-bold text-foreground mb-4">
            {uiText("Prescribed Chapters (NCERT Mathematics)")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((ch) => (
              <div key={ch._id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="grid size-6 place-items-center rounded-lg bg-brand/10 text-xs font-black text-brand">
                    {ch.number}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                    {t(ch.title)}
                  </h4>
                </div>
                {ch.image?.url && <img src={ch.image.url} alt={t(ch.title)} className="mt-3 max-h-48 rounded-xl" />}
                {topics.filter((topic) => String(topic.chapter) === String(ch._id)).map((topic) => <div key={topic._id} className="mt-3"><h5 className="font-semibold">{t(topic.title)}</h5><p className="text-sm text-muted-foreground">{t(topic.shortDescription)}</p></div>)}
                {ch.shortDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {t(ch.shortDescription)}
                  </p>
                )}
                <div className="mt-3 pt-2 border-t border-border/50 flex justify-end">
                  <Link
                    to={`/class-${cls?.number || 10}/maths/${ch.slug}`}
                    className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <span>{uiText("View Solutions")}</span>
                    &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
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

