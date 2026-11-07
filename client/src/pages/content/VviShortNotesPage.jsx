import { useState } from 'react';
import { Link } from 'react-router';
import {
  Sparkles,
  Download,
  Flame,
  BookOpen,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip, DifficultyBadge } from '@/components/content/badges.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { SolutionRenderer } from '@/components/content/SolutionRenderer.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';
import { useL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';
import { ContentHeader } from './ContentHeader.jsx';

export default function VviShortNotesPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();

  const {
    class: cls,
    classes = [],
    academicSessions = [],
    currentSession = '2026–27',
    chapters = [],
    shortNotes = [],
    questions = [],
  } = data;

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="REVISION"
        eyebrow={<Chip tone="brand">{uiText("Last Minute Exam Booster")}</Chip>}
        title={{
          hi: `CBSE कक्षा ${cls?.number || '6-12'} गणित VVI प्रश्न व संक्षिप्त नोट्स`,
          en: `VVI Questions & Short Notes for Class ${cls?.number || '6–12'} Maths`,
        }}
        subtitle={uiText("Rapid revision cheat-sheets, bulleted key concepts, recurring board questions, and high-yield formula summaries for quick recall.")}
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
              {uiText("Choose your class for rapid revision VVI notes:")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => {
              const isSelected = cls && c.number === cls.number;
              return (
                <Link
                  key={c.number}
                  to={`/notes/vvi-questions-short-notes/class-${c.number}`}
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

        {/* Short Notes List */}
        <section className="mb-12 space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-brand" />
            <span>{uiText("Rapid Revision Short Notes")}</span>
          </h2>

          {shortNotes.length > 0 ? (
            shortNotes.map((sn) => (
              <article key={sn._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-extrabold text-brand">{uiText("Quick Revision")}</span>
                  {sn.chapter && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {term('chapter')} {sn.chapter.number}: {t(sn.chapter.title)}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{t(sn.title)}</h3>
                {sn.summary && <p className="text-xs text-muted-foreground mb-3">{t(sn.summary)}</p>}
                {sn.content && (
                  <div className="prose prose-sm max-w-none text-foreground font-normal">
                    <RichContent html={t(sn.content)} />
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {chapters.map((ch) => (
                <div key={ch._id} className="rounded-2xl border bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid size-6 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                      {ch.number}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">{t(ch.title)}</h3>
                  </div>
                  {ch.formulas ? (
                    <div className="prose prose-xs max-w-none text-muted-foreground">
                      <RichContent html={t(ch.formulas)} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {uiText("Formula sheet and quick notes for this chapter.")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* High-Yield VVI Questions */}
        {questions.length > 0 && (
          <section className="space-y-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Flame className="size-5 text-red-500" />
                <span>{uiText("Top Scoring VVI Board Questions")}</span>
              </h2>
            </div>

            {questions.map((q, idx) => (
              <article key={q._id} className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <header className="flex flex-wrap items-center gap-2 border-b bg-amber-500/10 px-4 py-2.5">
                  <span className="grid size-5.5 place-items-center rounded-md bg-brand text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {term('question')} {idx + 1}
                  </span>
                  {q.marks && (
                    <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold">
                      {q.marks} {term('marks')}
                    </span>
                  )}
                  {q.difficulty && <DifficultyBadge difficulty={q.difficulty} />}
                  {q.chapter && (
                    <span className="ml-auto text-xs font-semibold text-brand">{uiText("Ch ")}{q.chapter.number}: {t(q.chapter.title)}
                    </span>
                  )}
                </header>
                <div className="space-y-4 p-4 sm:p-5">
                  <RichContent html={t(q.text, q.languageMode)} className="text-sm sm:text-base font-medium" />
                  {q.blocks?.length > 0 && (
                    <div className="rounded-xl border border-brand/15 bg-brand/[0.02] p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-2">
                        {uiText("Solution")}
                      </h4>
                      <SolutionRenderer blocks={q.blocks} languageMode={q.languageMode} />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

