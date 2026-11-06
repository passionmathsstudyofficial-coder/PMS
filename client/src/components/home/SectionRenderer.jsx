import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ClassGridSection } from './ClassGridSection.jsx';
import { HeroSection } from './HeroSection.jsx';
import {
  CardGridSection,
  ChapterGridSection,
  CtaSection,
  FaqSection,
  ImageGallerySection,
  NotesSection,
  QuestionListSection,
  ReferenceBooksSection,
  RelatedLinksSection,
  StatisticsSection,
  StepsSection,
  TextSection,
  VideoSection,
} from './Sections.jsx';

// Section type (stored in the database) → React component. New section types only need a new entry here.
const COMPONENTS = {
  hero: HeroSection,
  statistics: StatisticsSection,
  classGrid: ClassGridSection,
  steps: StepsSection,
  referenceBooks: ReferenceBooksSection,
  chapterGrid: ChapterGridSection,
  cardGrid: CardGridSection,
  questionList: QuestionListSection,
  notes: NotesSection,
  videoSection: VideoSection,
  imageGallery: ImageGallerySection,
  cta: CtaSection,
  faq: FaqSection,
  text: TextSection,
  custom: TextSection,
  relatedContent: RelatedLinksSection,
};

export function SectionRenderer({ sections }) {
  useUiLanguage();
  return sections.map((section) => {
    // Replace legacy Structured Learning steps section with the new Reference Books showcase
    const isLegacyStructuredLearning =
      section.type === 'steps' &&
      (section.name === 'hierarchy' ||
        section.title?.en === 'Every question in a clear order' ||
        section.badge?.en === 'Structured learning');

    if (isLegacyStructuredLearning) {
      return <ReferenceBooksSection key={section._id || 'reference-books'} section={section} />;
    }

    const Component = COMPONENTS[section.type];
    return Component ? <Component key={section._id} section={section} /> : null;
  });
}
