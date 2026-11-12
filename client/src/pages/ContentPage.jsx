import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { PreviewBanner } from '@/components/site/PreviewBanner.jsx';
import { Seo, breadcrumbSchema } from '@/components/site/Seo.jsx';
import { ErrorState, NotFoundContent, PageSkeleton } from '@/components/site/States.jsx';
import { get } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { useHashScroll } from './HomePage.jsx';
import ChapterPage from './content/ChapterPage.jsx';
import ClassPage from './content/ClassPage.jsx';
import ExercisePage from './content/ExercisePage.jsx';
import ImportantQuestionsPage from './content/ImportantQuestionsPage.jsx';
import { NotePage, NotesListPage } from './content/NotesPages.jsx';
import QuestionPage from './content/QuestionPage.jsx';
import StaticPage from './content/StaticPage.jsx';
import SubjectExercisesPage from './content/SubjectExercisesPage.jsx';
import SubjectPage from './content/SubjectPage.jsx';
import TopicPage from './content/TopicPage.jsx';
import BooksListPage from './content/BooksListPage.jsx';
import ResourcesListPage from './content/ResourcesListPage.jsx';
import StudyCmsPublicPage from './content/StudyCmsPublicPage.jsx';
import StudyMaterialsPage from './content/StudyMaterialsPage.jsx';
import ReferenceSolutionsPage from './content/ReferenceSolutionsPage.jsx';
import StateBoardsPage from './content/StateBoardsPage.jsx';
import PreviousYearQuestionsPage from './content/PreviousYearQuestionsPage.jsx';
import SamplePapersPage from './content/SamplePapersPage.jsx';
import ExtraQuestionsPage from './content/ExtraQuestionsPage.jsx';
import VviQuestionsPage from './content/VviQuestionsPage.jsx';
import MathsSyllabusPage from './content/MathsSyllabusPage.jsx';
import NcertNotesPage from './content/NcertNotesPage.jsx';
import FormulaSheetsPage from './content/FormulaSheetsPage.jsx';
import ReferenceBookNotesPage from './content/ReferenceBookNotesPage.jsx';
import VviShortNotesPage from './content/VviShortNotesPage.jsx';
import LandingSections from './content/LandingSections.jsx';
import { LandingContext } from './content/LandingContext.jsx';

// API page type → template. Every URL below "/" is resolved from the database; no routes are hardcoded.
const TEMPLATES = {
  class: ClassPage,
  subject: SubjectPage,
  subjectExercises: SubjectExercisesPage,
  notesList: NotesListPage,
  note: NotePage,
  resourcesList: ResourcesListPage,
  booksList: BooksListPage,
  studyMaterials: StudyMaterialsPage,
  studyCms: StudyCmsPublicPage,
  referenceSolutions: ReferenceSolutionsPage,
  stateBoards: StateBoardsPage,
  topic: TopicPage,
  importantQuestions: ImportantQuestionsPage,
  chapter: ChapterPage,
  exercise: ExercisePage,
  question: QuestionPage,
  page: StaticPage,
  pyq: PreviousYearQuestionsPage,
  samplePapers: SamplePapersPage,
  extraQuestions: ExtraQuestionsPage,
  vviQuestions: VviQuestionsPage,
  mathsSyllabus: MathsSyllabusPage,
  ncertNotes: NcertNotesPage,
  formulaSheets: FormulaSheetsPage,
  referenceBookNotes: ReferenceBookNotesPage,
  vviShortNotes: VviShortNotesPage,
};
const ARTICLE_TYPES = new Set(['chapter', 'exercise', 'question', 'note', 'topic']);


export default function ContentPage() {
  useUiLanguage();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { lang } = useLang();
  const preview = params.get('preview') === '1';
  const previewToken = params.get('previewToken') || undefined;
  const session = params.get('session') || window.localStorage.getItem('pms.academicSession') || undefined;
  const path = location.pathname;
  const page = params.get('page') || undefined;

  useEffect(() => {
    if (!session) return;
    window.localStorage.setItem('pms.academicSession', session);
    if (!params.has('session')) {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('session', session);
        return next;
      }, { replace: true });
    }
  }, [session, params, setParams]);

  const query = useQuery({
    queryKey: ['resolve', path, preview, previewToken, lang, session, page],
    queryFn: () => get('/public/resolve', { path, lang, preview: preview ? 1 : undefined, previewToken, session, page }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  useHashScroll(query.isSuccess);

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) {
    if (query.error.status === 404) {
      return (
        <>
          <Seo title={uiText("Page not found")} robots="noindex,follow" />
          <NotFoundContent />
        </>
      );
    }
    return (
      <div className="container-page py-16">
        <ErrorState error={query.error} onRetry={query.refetch} />
      </div>
    );
  }

  const result = query.data;
  if (result.type === 'redirect') return <Navigate to={`${result.redirect}${location.search}${location.hash}`} replace />;
  const Template = TEMPLATES[result.type];
  if (!Template) return <NotFoundContent />;
  const seo = result.seo || {};
  const faq = result.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: result.faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
      }
    : null;

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        robots={preview ? 'noindex,nofollow' : seo.robots}
        image={seo.ogImage}
        type={ARTICLE_TYPES.has(result.type) ? 'article' : 'website'}
        jsonLd={[breadcrumbSchema(result.breadcrumbs, lang), faq]}
      />
      {preview && <PreviewBanner />}
      <LandingContext.Provider value={result.data?.landingPage || null}>
        <Template key={`${path}:${lang}`} data={result.data} pageType={result.type} breadcrumbs={result.breadcrumbs} related={result.related} seo={seo} path={path} preview={preview} previewToken={previewToken} />
      </LandingContext.Provider>
      <LandingSections page={result.data?.landingPage} />
    </>
  );
}
