import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Chip } from '@/components/content/badges.jsx';
import { LanguageNotice } from '@/components/content/LanguageNotice.jsx';
import { QuestionCard } from '@/components/content/QuestionCard.jsx';
import { RelatedContent } from '@/components/content/RelatedContent.jsx';
import { AdSlot } from '@/components/site/AdSlot.jsx';
import { useL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { ContentHeader, PrevNext } from './ContentHeader.jsx';

export default function QuestionPage({ data, breadcrumbs, related }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();
  const { class: cls, chapter, exercise, question, prev, next } = data;

  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark={question.number}
        eyebrow={
          <>
            <Chip tone="brand">
              {term('class')} {cls.number}
            </Chip>
            <Link to={chapter.url} className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-brand">
              {(() => {
                const raw = t(chapter.title);
                const isInvalid = !raw || raw.includes('Content not available') || raw.includes('उपलब्ध नहीं') || raw.includes('सामग्री उपलब्ध नहीं');
                const clean = !isInvalid ? raw.trim() : (typeof chapter.title === 'object' ? (chapter.title?.en || chapter.title?.hi) : (typeof chapter.title === 'string' ? chapter.title : ''));
                const safe = clean && !clean.includes('Content not available') && !clean.includes('उपलब्ध नहीं') && !clean.includes('सामग्री उपलब्ध नहीं') ? clean.trim() : '';
                return safe ? `${term('chapter')} ${chapter.number} · ${safe}` : `${term('chapter')} ${chapter.number}`;
              })()}
            </Link>
            <Link to={exercise.url} className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-brand">
              {term('exercise')} {exercise.number}
            </Link>
          </>
        }
        title={
          <>
            {term('exercise')} {exercise.number} <span className="text-brand">{term('question')} {question.number}</span>
          </>
        }
        subtitle={(() => {
          const raw = t(chapter.title);
          const isInvalid = !raw || raw.includes('Content not available') || raw.includes('उपलब्ध नहीं') || raw.includes('सामग्री उपलब्ध नहीं');
          const clean = !isInvalid ? raw.trim() : (typeof chapter.title === 'object' ? (chapter.title?.en || chapter.title?.hi) : (typeof chapter.title === 'string' ? chapter.title : ''));
          const safe = clean && !clean.includes('Content not available') && !clean.includes('उपलब्ध नहीं') && !clean.includes('सामग्री उपलब्ध नहीं') ? clean.trim() : '';
          return safe
            ? `${term('class')} ${cls.number} ${term('mathematics')} · ${term('chapter')} ${chapter.number} – ${safe}`
            : `${term('class')} ${cls.number} ${term('mathematics')} · ${term('chapter')} ${chapter.number}`;
        })()}
        aside={<LanguageNotice />}
      />
      <div className="container-page max-w-4xl py-8">
        <QuestionCard question={question} headingLevel="h2" showPermalink={false} />
        <AdSlot placement="afterContent" pageType="question" className="px-0" />
        <PrevNext prev={prev} next={next} t={t} />
        <div className="mt-6">
          <Link to={exercise.url} className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
            <ArrowLeft className="size-4" /> {term('exercise')} {exercise.number} — {term('questions')}
          </Link>
        </div>
        <RelatedContent items={related} />
      </div>
    </>
  );
}
