import { useState } from 'react';
import { Link } from 'react-router';
import {
  Sparkles,
  Download,
  Eye,
  Filter,
  CheckCircle2,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip, DifficultyBadge } from '@/components/content/badges.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { SolutionRenderer } from '@/components/content/SolutionRenderer.jsx';
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

export default function VviQuestionsPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();
  const { openViewer } = useImageViewer();

  const {
    category,
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    questions = [],
    resources = [],
  } = data;

  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const openPdf = (url, title) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
  };

  const filteredQuestions = questions.filter((q) => {
    if (selectedChapter !== 'all' && q.chapter && String(q.chapter._id || q.chapter) !== selectedChapter) return false;
    if (selectedType !== 'all' && q.questionType !== selectedType) return false;
    return true;
  });

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="VVI"
        eyebrow={<Chip tone="brand">{uiText("Board Special Exam Booster")}</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} गणित VVI महत्वपूर्ण प्रश्न`,
          en: `CBSE Class ${cls?.number || '6–12'} Maths VVI Questions (Board Special)`,
        }}
        subtitle={uiText("High-yield board examination questions, most repeated theorem proofs, short answers, long answers, and scoring formulas.")}
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
              {uiText("Choose your class for VVI board special questions:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/study-materials/vvi-questions/class-${c.number}`}
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

        {/* Board Exam Strategy Card */}
        <div className="mb-8 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/5 via-card to-amber-500/5 p-5 sm:p-6">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
            <Award className="size-4 text-brand" />
            <span>{uiText("Board Exam Scoring Strategy & Tips")}</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {uiText("These VVI (Very Very Important) questions are curated based on recurring patterns in CBSE board examinations over the past 10 years. Practice writing every mathematical step clearly, draw neat diagrams with labels, and write down the relevant formula at the start of each answer to secure full step marks.")}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="size-3.5 text-brand" />
                {uiText("Chapter")}:
              </span>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="h-8 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="all">{uiText("All Chapters")}</option>
                {chapters.map((ch) => (
                  <option key={ch._id} value={String(ch._id)}>{uiText("Ch ")}{ch.number}: {t(ch.title)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {uiText("Type")}:
              </span>
              <div className="flex gap-1">
                {[
                  { id: 'all', label: uiText('All') },
                  { id: 'short', label: uiText('Short (2-3M)') },
                  { id: 'long', label: uiText('Long (5M)') },
                  { id: 'case_study', label: uiText('Case Study') },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer',
                      selectedType === type.id
                        ? 'bg-brand text-white'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-muted-foreground">
            <span>{uiText("Showing")} <strong>{filteredQuestions.length}</strong> {uiText("VVI Questions")}</span>
          </div>
        </div>

        {/* Questions List */}
        <section className="space-y-6">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, idx) => {
              const images = (q.attachments || []).map((a) =>
                toViewerImage(a.media, { alt: t(a.alt) || t(a.media?.alt), caption: t(a.caption) })
              );
              return (
                <article
                  key={q._id}
                  id={q.slug}
                  className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs transition hover:border-brand/40"
                >
                  <header className="flex flex-wrap items-center gap-2 border-b bg-amber-500/10 px-4 py-3 sm:px-5">
                    <span className="grid size-6 place-items-center rounded-md bg-brand text-xs font-extrabold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {uiText("VVI Question")} {idx + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-extrabold text-red-600">
                      <Flame className="size-3" />{uiText(" Board Special")}</span>
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
                          {uiText("Detailed Step-by-Step Solution")}
                        </h4>
                        <SolutionRenderer blocks={q.blocks} languageMode={q.languageMode} />
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed p-12 text-center bg-card/50">
              <Sparkles className="size-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">
                {uiText("No VVI questions found for this filter")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {uiText("Try selecting another chapter or reset filters.")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedChapter('all');
                  setSelectedType('all');
                }}
              >
                {uiText("Reset Filters")}
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

