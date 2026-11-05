import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowRight, BookOpen, CheckCircle, GraduationCap, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Chip } from '@/components/content/badges.jsx';
import { useL10n, useInterfaceL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { ContentHeader } from './ContentHeader.jsx';

export default function StateBoardsPage({ data, breadcrumbs }) {
  useUiLanguage();
  const t = useL10n();
  const term = useTerm();
  const { level = 'hub', board, boards = [], classes = [] } = data || {};

  const sortedClasses = [...classes].sort((a, b) => (a.number || 0) - (b.number || 0));

  if (level === 'board' && board) {
    return (
      <div className="container-page py-10">
        <ContentHeader
          breadcrumbs={breadcrumbs}
          watermark="Board"
          eyebrow={<Chip tone="brand">{uiText("State Board Solutions")}</Chip>}
          title={board.title || board.name}
          lead={board.description}
        />

        <div className="mt-8 space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="size-5 text-brand" />
              <h2 className="font-heading text-lg font-bold text-foreground">
                {uiText("Select Class (Class 6 to 12 Mathematics)")}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedClasses.map((cls) => (
                <Link
                  key={cls._id || cls.number}
                  to={cls.url || `/class-${cls.number}/maths`}
                  className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                >
                  <div>
                    <span className="grid size-10 place-items-center rounded-xl bg-brand/10 font-heading text-sm font-black text-brand transition group-hover:bg-brand group-hover:text-white">
                      {cls.number}
                    </span>
                    <h3 className="mt-3 font-heading text-base font-bold text-foreground group-hover:text-brand">
                      {term('class')} {cls.number} {term('mathematics')}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {uiText("NCERT एवं राज्य बोर्ड समाधान, अध्याय-वार हल एवं सूत्र")}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-brand">
                    <span>{uiText("View Solutions")}</span>
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {boards.length > 1 && (
            <div className="border-t pt-8">
              <h3 className="mb-4 font-heading text-base font-bold text-foreground">
                {uiText("Other State Boards")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {boards
                  .filter((b) => b.slug !== board.slug)
                  .map((b) => (
                    <Link
                      key={b.slug}
                      to={`/state-boards/${b.slug}`}
                      className="flex items-center justify-between rounded-xl border bg-muted/40 p-3 text-sm font-semibold text-foreground transition hover:border-brand hover:bg-background hover:text-brand"
                    >
                      <span>{t(b.name)}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Hub level
  return (
    <div className="container-page py-10">
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark="Boards"
        eyebrow={<Chip tone="brand">{uiText("State Boards")}</Chip>}
        title={{
          hi: 'राज्य बोर्ड गणित समाधान (कक्षा 6–12)',
          en: 'State Boards Mathematics Solutions (Class 6–12)',
        }}
        lead={{
          hi: 'बिहार बोर्ड, यूपी बोर्ड, झारखंड बोर्ड, एमपी बोर्ड एवं राजस्थान बोर्ड के कक्षा 6 से 12 तक के विद्यार्थियों के लिए संपूर्ण गणित समाधान।',
          en: 'Complete chapter-wise and exercise-wise mathematics solutions, notes and formulas for Bihar, UP, Jharkhand, MP, and Rajasthan State Boards.',
        }}
      />

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <div
            key={b.slug}
            className="group flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-xs transition hover:border-brand/40 hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground group-hover:text-brand">
                    {t(b.name)}
                  </h3>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {uiText("Classes 6 to 12")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(b.description)}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t flex items-center justify-between">
              <Link
                to={`/state-boards/${b.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                <span>{uiText("Explore Board Solutions")}</span>
                <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

