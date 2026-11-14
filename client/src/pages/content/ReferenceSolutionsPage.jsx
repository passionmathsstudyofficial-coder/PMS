import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { documentDownloadUrl } from '@/lib/media';
import { resolveMediaUrl } from '@/lib/media';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Sparkles,
  Video,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/content/badges.jsx';
import { Figure } from '@/components/content/Figure.jsx';
import { MathFormula } from '@/components/content/MathFormula.jsx';
import { LanguageNotice } from '@/components/content/LanguageNotice.jsx';
import { PdfViewerDialog } from '@/components/content/PdfViewerDialog.jsx';
import { QuestionCard } from '@/components/content/QuestionCard.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { YouTubeEmbed } from '@/components/content/YouTubeEmbed.jsx';
import { StudySidebar } from '@/components/site/StudySidebar.jsx';
import { EmptyState } from '@/components/site/States.jsx';
import { errorMessage, get } from '@/lib/api';
import { hasContent, useL10n, useInterfaceL10n } from '@/lib/i18n';
import { useTerm } from '@/lib/site';
import { cn } from '@/lib/utils';
import { ContentHeader, PrevNext } from './ContentHeader.jsx';
import { AcademicSessionSelector } from '@/components/site/AcademicSessionSelector.jsx';

export default function ReferenceSolutionsPage({ data, breadcrumbs, path, preview, previewToken }) {
  useUiLanguage();
  const t = useL10n();
  const interfaceL10n = useInterfaceL10n();
  const term = useTerm();
  const rootPrefix = path?.startsWith('/reference-books') ? '/reference-books' : '/reference-solutions';
  const {
    level = 'hub',
    book,
    class: cls,
    chapter,
    exercise,
    books = [],
    classes = [],
    chapters = [],
    exercises = [],
    topics = [],
    notes = [],
    importantQuestions = [],
    resources = [],
    questions: initialQuestions = [],
    pagination = {},
    siblings = [],
    prev,
    next,
    academicSessions = [],
    currentSession = '2026–27',
  } = data;

  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [downloadAllowed, setDownloadAllowed] = useState(true);

  // Exercise pagination state
  const [pages, setPages] = useState([initialQuestions]);
  const [page, setPage] = useState(pagination.page || 1);
  const [loading, setLoading] = useState(false);
  const questions = pages.flat();
  const hasMore = pagination.pages && page < pagination.pages;

  const openPdf = (url, title, canDownload = true) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
    setDownloadAllowed(canDownload);
  };

  const loadMore = async () => {
    setLoading(true);
    try {
      const result = await get('/public/resolve', { path, page: page + 1, preview: preview ? 1 : undefined, previewToken });
      setPages((current) => [...current, result.data.questions]);
      setPage(page + 1);
    } catch (error) {
      toast.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  // 1. HUB LEVEL: /reference-solutions
  if (level === 'hub') {
    return (
      <>
        <ContentHeader
          breadcrumbs={breadcrumbs}
          watermark="Ref"
          eyebrow={<Chip tone="brand">{uiText("Reference Solutions")}</Chip>}
          title={{
            hi: 'संदर्भ पुस्तक हल',
            en: 'Mathematics Reference Book Solutions',
          }}
          subtitle={uiText("Chapter-wise and exercise-wise step-by-step solutions for RS Aggarwal, RD Sharma, and ML Aggarwal for Classes 6 to 12.")}
        />

        <div className="container-page py-10">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <div className="grid gap-6">
                {books.map((b) => (
                  <div
                    key={b.slug}
                    className="flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-xs transition hover:border-brand/40 sm:p-8"
                  >
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand uppercase">
                          {uiText(b.category || "Reference Book")}
                        </span>
                        <span className="text-xs text-muted-foreground">{b.author}</span>
                      </div>
                      <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
                        {interfaceL10n(b.title)}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {interfaceL10n(b.description)}
                      </p>

                      <div className="mt-6">
                        <p className="mb-2.5 text-xs font-bold text-muted-foreground uppercase">{uiText("Select Class for Solutions:")}</p>
                        <div className="flex flex-wrap gap-2">
                          {(b.classes || []).map((cNum) => (
                            <Link
                              key={cNum}
                              to={b.classRecords?.find(c => c.number === cNum)?.url}
                              className="rounded-xl border bg-background px-3.5 py-1.5 text-xs font-bold text-foreground transition hover:border-brand hover:bg-brand hover:text-white"
                            >{uiText("Class")}{' '}{cNum}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t pt-4">
                      <Link
                        to={`${rootPrefix}/${b.slug}`}
                        className="inline-flex items-center text-sm font-bold text-brand hover:underline"
                      >{' '}{uiText("View All Chapters & Exercises for")}{' '}{interfaceL10n(b.title)} <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <StudySidebar />
            </div>
          </div>
        </div>
      </>
    );
  }

  // 2. BOOK HUB LEVEL: /reference-solutions/:bookSlug
  if (level === 'book') {
    return (
      <>
        <ContentHeader
          breadcrumbs={breadcrumbs}
          watermark="Book"
          eyebrow={<Chip tone="brand">{interfaceL10n(book?.title) || uiText("Reference Book")}</Chip>}
          title={book.title}
          subtitle={uiTemplate`Complete exercise-wise step-by-step solutions for ${interfaceL10n(book.title)} across middle and high school classes.`}
        />

        <div className="container-page py-10">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <h2 className="mb-2 font-heading text-xl font-bold text-foreground">{' '}{uiText("Select Your Class for")}{' '}{interfaceL10n(book.title)}
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">{' '}{uiText("Choose your class below to access detailed chapter-by-chapter exercise solutions, step-by-step formulas, and free PDF notes:")}{' '}</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(book.classes || []).map((cNum) => (
                    <Link
                      key={cNum}
                      to={book.classRecords?.find(c => c.number === cNum)?.url}
                      className="group flex items-center justify-between rounded-2xl border bg-background p-4 shadow-xs transition hover:border-brand hover:shadow-md"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="grid size-11 place-items-center rounded-xl bg-brand/10 font-heading text-base font-extrabold text-brand transition group-hover:bg-brand group-hover:text-white">
                          {cNum}
                        </span>
                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground group-hover:text-brand">{interfaceL10n(book.classRecords?.find(c => c.number === cNum)?.name) || `${uiText("Class")} ${cNum}`}</h3>
                          <p className="text-xs text-muted-foreground">{uiText("Chapter & Exercise Solutions")}</p>
                        </div>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-brand" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <StudySidebar currentBook={book} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // 3. BOOK + CLASS LEVEL: /reference-solutions/:bookSlug/class-:number
  if (level === 'class') {
    return (
      <>
        <ContentHeader
          breadcrumbs={breadcrumbs}
          inheritLandingHero={false}
          watermark={`C${cls.number}`}
          eyebrow={
            <div className="flex items-center gap-2">
              <Chip tone="brand">{uiText("Class")}{' '}{cls.number}</Chip>
              <Chip>{interfaceL10n(book.title)}</Chip>
            </div>
          }
          title={{
            hi: `${interfaceL10n(book.title)} — ${interfaceL10n(cls.name) || `कक्षा ${cls.number}`}`,
            en: `${interfaceL10n(book.title)} — ${interfaceL10n(cls.name) || `Class ${cls.number}`}`,
          }}
          subtitle={t(cls.description) || uiTemplate`Browse available chapters and exercises for Class ${cls.number} Mathematics.`}
          actions={<AcademicSessionSelector sessions={academicSessions} currentSession={currentSession} />}
        />

        <div className="container-page py-10">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {cls.thumbnail && <Figure media={cls.thumbnail} alt={t(cls.thumbnail.alt) || t(cls.name)} />}
              {/* Introduction box */}
              <div className="rounded-2xl border bg-card p-5 text-sm text-foreground/90">
                <p>{uiText("Welcome to")}<strong>{interfaceL10n(book.title)}{uiText("Class")}{' '}{cls.number}</strong>{' '}{uiText("solutions index on Passion Maths Study. Every exercise contains clear step-by-step explanations, diagrams, formulas, and downloadable PDFs.")}{' '}</p>
              </div>

              {/* Chapters and Exercise Links */}
              <div className="space-y-4">
                <h2 className="font-heading text-lg font-bold text-foreground">{uiText("Class")}{' '}{cls.number}{uiText("Chapters & Exercises")}</h2>

                {chapters.length === 0 ? (
                  <EmptyState title={uiText("No chapters found")} description={uiText("Chapters for this reference book will appear here.")} />
                ) : (
                  <div className="space-y-4">
                    {chapters.map((ch) => (
                      <div key={ch._id} className="rounded-2xl border bg-card p-5 shadow-xs transition hover:border-brand/40">
                        <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <Link to={ch.url} className="group">
                            <span className="text-xs font-bold text-brand uppercase">{uiText("Chapter")}{' '}{ch.number}</span>
                            <h3 className="font-heading text-base font-bold text-foreground group-hover:text-brand">
                              {t(ch.title)}
                            </h3>
                          </Link>

                          <div className="flex gap-2">
                            {ch.pdfUrl && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPdf(ch.pdfUrl, `${t(ch.title)} PDF`)}>
                                <Eye className="mr-1 size-3" /> PDF
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                              <Link to={ch.url}>{uiText("Chapter Page →")}</Link>
                            </Button>
                          </div>
                        </div>

                        {/* Clickable exercise pills */}
                        {ch.exercises?.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="mb-2 text-[11px] font-bold text-muted-foreground uppercase">{uiText("Exercises:")}</p>
                            <div className="flex flex-wrap gap-2">
                              {ch.exercises.map((ex) => (
                                <Link
                                  key={ex.slug || ex.number}
                                  to={ex.url || `${ch.url}/${ex.slug}`}
                                  className="rounded-lg border bg-background px-3 py-1 text-xs font-bold transition hover:border-brand hover:bg-brand hover:text-white"
                                >{uiText("Exercise")}{' '}{ex.number}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Class Notes if present */}
              {notes?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="font-heading text-lg font-bold text-foreground">{uiText("Class Notes & Formulas")}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {notes.map((n) => (
                      <div key={n._id} className="rounded-xl border bg-card p-4 space-y-1">
                        <h3 className="font-heading text-sm font-bold">{t(n.title)}</h3>
                        {n.summary && <p className="text-xs text-muted-foreground">{t(n.summary)}</p>}
                        {(n.pdfUrl || n.pdfFile?.url) && (
                          <Button size="sm" variant="outline" className="h-6 text-xs mt-1" onClick={() => openPdf(n.pdfUrl || n.pdfFile?.url, `${t(n.title)} PDF`)}>
                            <Eye className="mr-1 size-3" /> PDF
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <StudySidebar currentBook={book} currentClass={cls} chapters={chapters} />
            </div>
          </div>
        </div>

        <PdfViewerDialog
          open={Boolean(activePdfUrl)}
          onOpenChange={(open) => !open && setActivePdfUrl(null)}
          url={activePdfUrl}
          title={activePdfTitle}
          downloadAllowed={downloadAllowed}
        />
      </>
    );
  }

  // 4. BOOK CHAPTER LEVEL: /reference-solutions/:bookSlug/class-:number/:chapterSlug
  if (level === 'chapter') {
    return (
      <>
        <ContentHeader
          breadcrumbs={breadcrumbs}
          watermark={`Ch${chapter.number}`}
          eyebrow={
            <div className="flex items-center gap-2">
              <Chip tone="brand">{uiText("Class")}{' '}{cls.number}</Chip>
              <Chip>{interfaceL10n(book.title)}</Chip>
              <Chip>{uiText("Chapter")}{' '}{chapter.number}</Chip>
            </div>
          }
          title={{
            hi: `${interfaceL10n(book.title)} कक्षा ${cls.number} अध्याय ${chapter.number}: ${t(chapter.title)}`,
            en: `${interfaceL10n(book.title)} Class ${cls.number} Chapter ${chapter.number}: ${chapter.title?.en || t(chapter.title)}`,
          }}
          subtitle={uiTemplate`Exercise-wise step-by-step solutions, key concept summaries, and PDF download for Chapter ${chapter.number}.`}
          actions={<AcademicSessionSelector sessions={academicSessions} currentSession={currentSession} />}
        />

        <div className="container-page py-10">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              {/* Video embed if present */}
              {chapter.introVideo && <YouTubeEmbed video={chapter.introVideo} />}

              {/* PDF Banner */}
              {(chapter.pdfUrl || chapter.pdfFile?.url) && (
                <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-gradient-to-r from-red-500/10 via-brand/10 to-amber-500/10 p-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-foreground">{uiText("Chapter")}{' '}{chapter.number}{uiText("Complete Solution PDF")}</h3>
                      <p className="text-xs text-muted-foreground">{uiText("Download or view the verified solutions guide")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPdf(chapter.pdfUrl || chapter.pdfFile?.url, `${t(chapter.title)} PDF`)}>
                      <Eye className="mr-1.5 size-3.5" />{uiText("View PDF")}</Button>
                    <Button size="sm" variant="default" asChild>
                      <a href={documentDownloadUrl(resolveMediaUrl(chapter.pdfFile?.url || chapter.pdfUrl))} download target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 size-3.5" />{uiText("Download")}</a>
                    </Button>
                  </div>
                </div>
              )}

              {(chapter.image || hasContent(chapter.introduction) || hasContent(chapter.notes) || chapter.formulas?.length > 0) && (
                <section className="space-y-4 rounded-2xl border bg-card p-5">
                  <h2 className="font-heading text-lg font-bold">{uiText("Chapter content")}</h2>
                  {chapter.image && <Figure media={chapter.image} alt={t(chapter.image.alt)} />}
                  <RichContent html={t(chapter.introduction)} />
                  <RichContent html={t(chapter.notes)} />
                  <ReferenceFormulas items={chapter.formulas} />
                </section>
              )}
              {/* Clickable exercises list */}
              <section className="space-y-4">
                <h2 className="font-heading text-lg font-bold text-foreground">{' '}{uiText("Select Exercise in Chapter")}{' '}{chapter.number}
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {exercises.map((ex) => (
                    <Link
                      key={ex.slug || ex.number}
                      to={ex.url || `${chapter.url}/${ex.slug}`}
                      className="group flex items-center justify-between rounded-2xl border bg-card p-4 shadow-xs transition hover:border-brand hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 font-heading text-sm font-extrabold text-brand transition group-hover:bg-brand group-hover:text-white">
                          {ex.number}
                        </span>
                        <div>
                          <h3 className="font-heading text-sm font-bold text-foreground group-hover:text-brand">{uiText("Exercise")}{' '}{ex.number}
                          </h3>
                          <p className="text-xs text-muted-foreground">{uiText("Step-by-step solutions")}</p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-brand" />
                    </Link>
                  ))}
                </div>
              </section>

              {topics.length > 0 && <section className="space-y-3">
                <h2 className="font-heading text-lg font-bold">{uiText("Topics")}</h2>
                {topics.map(topic => <details key={topic._id} id={topic.slug} className="scroll-mt-24 rounded-xl border bg-card p-4">
                  <summary className="cursor-pointer font-semibold">{t(topic.title) || `Topic ${topic.number}`}</summary>
                  <div className="mt-4 space-y-3">
                    <p>{t(topic.shortDescription)}</p>
                    {(topic.featuredImage || topic.image) && <Figure media={topic.featuredImage || topic.image} />}
                    <RichContent html={t(topic.notes, topic.languageMode)} />
                    <ReferenceFormulas items={topic.formulas} />
                    {topic.attachments?.filter(item => item.media?.url).map(item => item.media.format === 'pdf'
                      ? <a key={item._id} className="text-brand underline" href={resolveMediaUrl(item.media.url)}>{t(item.caption) || uiText("Open PDF")}</a>
                      : <Figure key={item._id} media={item.media} alt={t(item.alt)} caption={t(item.caption)} />)}
                  </div>
                </details>)}
              </section>}

              {/* Chapter Notes & Formulas */}
              {notes?.length > 0 && (
                <section className="space-y-4 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
                        <FileText className="size-4" />
                      </span>
                      <h2 className="font-heading text-lg font-bold">{uiText("Chapter Notes & Formula Sheets")}</h2>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note._id} className="rounded-xl border bg-muted/20 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading text-base font-bold text-foreground">{t(note.title)}</h3>
                          {(note.pdfUrl || note.pdfFile?.url) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPdf(note.pdfUrl || note.pdfFile?.url, `${t(note.title)} PDF`)}>
                              <Eye className="mr-1 size-3" /> PDF
                            </Button>
                          )}
                        </div>
                        {note.summary && <p className="text-xs text-muted-foreground">{t(note.summary)}</p>}
                        {note.content && <RichContent html={t(note.content)} />}
                        {note.formulas?.length > 0 && <ReferenceFormulas items={note.formulas} />}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Important Questions */}
              {importantQuestions?.length > 0 && (
                <section className="space-y-4 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
                        <Sparkles className="size-4" />
                      </span>
                      <h2 className="font-heading text-lg font-bold">{uiText("Important Practice Questions")}</h2>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {importantQuestions.map((iq) => (
                      <div key={iq._id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xs font-extrabold text-brand uppercase">{uiText("Question")} {iq.number || ''}</span>
                          <div className="flex items-center gap-1.5">
                            {iq.marks && <Chip tone="brand">{iq.marks}M</Chip>}
                            {iq.difficulty && <Chip>{iq.difficulty}</Chip>}
                          </div>
                        </div>
                        {iq.title && <h3 className="font-heading text-sm font-bold">{t(iq.title)}</h3>}
                        {iq.text && <RichContent html={t(iq.text)} />}
                        {iq.answer && (
                          <details className="rounded-lg border bg-background p-3 text-xs">
                            <summary className="font-bold text-brand cursor-pointer">{uiText("View Solution / Explanation")}</summary>
                            <div className="mt-2 pt-2 border-t">
                              <RichContent html={t(iq.answer)} />
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Chapter overview if available */}
              {chapter.shortDescription && (
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-2 font-heading text-sm font-bold text-foreground">{uiText("Chapter Overview")}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t(chapter.shortDescription)}</p>
                </div>
              )}

              <PrevNext prev={prev} next={next} t={t} />
            </div>

            <div className="lg:col-span-4">
              <StudySidebar currentBook={book} currentClass={cls} chapters={chapters} />
            </div>
          </div>
        </div>

        <PdfViewerDialog
          open={Boolean(activePdfUrl)}
          onOpenChange={(open) => !open && setActivePdfUrl(null)}
          url={activePdfUrl}
          title={activePdfTitle}
          downloadAllowed={downloadAllowed}
        />
      </>
    );
  }

  // 5. BOOK EXERCISE LEVEL: /reference-solutions/:bookSlug/class-:number/:chapterSlug/:exerciseSlug
  return (
    <>
      <ContentHeader
        breadcrumbs={breadcrumbs}
        watermark={`Ex${exercise.number}`}
        eyebrow={
          <div className="flex items-center gap-2">
            <Chip tone="brand">{uiText("Class")}{' '}{cls.number}</Chip>
            <Chip>{interfaceL10n(book.title)}</Chip>
            <Link to={chapter.url} className="text-xs font-semibold text-muted-foreground hover:text-brand">{' '}{uiText("Ch")}{' '}{chapter.number} · {t(chapter.title)}
            </Link>
          </div>
        }
        title={{
          hi: `${interfaceL10n(book.title)} कक्षा ${cls.number} अध्याय ${chapter.number} अभ्यास ${exercise.number}`,
          en: `${interfaceL10n(book.title)} Class ${cls.number} Chapter ${chapter.number} Exercise ${exercise.number} Solutions`,
        }}
        subtitle={uiTemplate`Detailed step-by-step solutions for Exercise ${exercise.number} with mathematical formulas, diagrams, and video lessons.`}
        aside={<LanguageNotice />}
        actions={<AcademicSessionSelector sessions={academicSessions} currentSession={currentSession} />}
      />

      {/* Sibling exercises navigation bar */}
      {siblings.length > 1 && (
        <nav aria-label={uiText("Exercises")} className="border-b bg-background">
          <div className="container-page flex gap-2 overflow-x-auto py-3">
            {siblings.map((s) => (
              <Link
                key={s.slug || s.number}
                to={s.url || `${chapter.url}/${s.slug}`}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition',
                  s.number === exercise.number
                    ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                    : 'bg-card hover:border-brand/40 hover:text-brand',
                )}
              >{uiText("Exercise")}{' '}{s.number}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-8">
            {/* Embedded video if present */}
            {exercise.introVideo && <YouTubeEmbed video={exercise.introVideo} />}

            {/* Exercise PDF Solution Action Card */}
            {(exercise.pdfUrl || chapter.pdfUrl) && (
              <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-gradient-to-r from-brand/5 to-amber-500/5 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-heading text-xs font-bold text-foreground">{uiText("Exercise")}{' '}{exercise.number}{uiText("PDF Solution Sheet")}</h3>
                    <p className="text-[11px] text-muted-foreground">{uiText("View online or download offline file")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openPdf(exercise.pdfUrl || chapter.pdfUrl, `Exercise ${exercise.number} PDF`)}>
                    <Eye className="mr-1 size-3.5" />{uiText("View PDF")}</Button>
                  <Button size="sm" variant="default" className="h-8 text-xs" asChild>
                    <a href={documentDownloadUrl(resolveMediaUrl(exercise.pdfFile?.url || exercise.pdfUrl || chapter.pdfFile?.url || chapter.pdfUrl))} download target="_blank" rel="noopener noreferrer">
                      <Download className="mr-1 size-3.5" />{uiText("Download")}</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Question Jump Navigator */}
            {questions.length > 1 && (
              <div className="rounded-2xl border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {uiText("Jump to Question")} ({questions.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q) => (
                    <a
                      key={q._id}
                      href={`#q-${q.slug}`}
                      className="rounded-lg border bg-background px-2.5 py-1 text-xs font-bold text-foreground transition hover:border-brand hover:bg-brand hover:text-white"
                    >{uiText("Q")}{q.number}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Question cards */}
            {questions.length === 0 ? (
              <div className="rounded-3xl border bg-card p-8 text-center">
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <BookOpen className="size-6" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">{uiText("Exercise")}{' '}{exercise.number}{uiText("Solutions")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{' '}{uiText("Digital question blocks for this exercise are being updated. Use the PDF button above to view complete step-by-step solutions.")}{' '}</p>
              </div>
            ) : (
              questions.map((question) => (
                <QuestionCard key={question._id} question={question} />
              ))
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button size="lg" variant="outline" onClick={loadMore} disabled={loading} className="h-11 rounded-xl px-6">
                  {loading && <Loader2 className="animate-spin" />}
                  {term('loadMore')} ({questions.length}/{pagination.total})
                </Button>
              </div>
            )}

            <PrevNext prev={prev} next={next} t={t} />
          </div>

          <div className="lg:col-span-4">
            <StudySidebar currentBook={book} currentClass={cls} chapters={chapters} />
          </div>
        </div>
      </div>

      <PdfViewerDialog
        open={Boolean(activePdfUrl)}
        onOpenChange={(open) => !open && setActivePdfUrl(null)}
        url={activePdfUrl}
        title={activePdfTitle}
        downloadAllowed={downloadAllowed}
      />
    </>
  );
}

function ReferenceFormulas({ items }) {
  const t = useL10n();
  return items?.map((formula, index) => <div className="overflow-x-auto rounded-lg bg-muted/50 p-3" key={formula._id || index}>
    <p className="font-semibold">{t(formula.title)}</p>
    <MathFormula latex={formula.latex} />
    <p>{t(formula.description)}</p>
  </div>);
}
