import { useL10n } from '@/lib/i18n';
import { uiText } from '@/lib/uiLanguage.js';
import { DocumentAttachment } from './DocumentAttachment.jsx';
import { Figure } from './Figure.jsx';
import { MathFormula } from './MathFormula.jsx';
import { RichContent } from './RichContent.jsx';
import { SolutionRenderer } from './SolutionRenderer.jsx';
import { YouTubeEmbed } from './YouTubeEmbed.jsx';

// Render the fields shared by the full note and important-question editors.
export function StudyArticleContent({ record, question = false, showAttachments = true, showContent = true }) {
  const t = useL10n();
  const text = value => t(value, record.languageMode);
  const document = record.pdfFile?.url ? record.pdfFile : record.pdfUrl ? { url: record.pdfUrl, format: 'pdf' } : null;
  return <div className="space-y-4">
    {[record.image, record.featuredImage].filter(media => media?.url).map((media, index) => <Figure key={index} media={media} alt={text(media.alt)} />)}
    <RichContent html={text(record.introduction)} />
    {showContent && <RichContent html={text(question ? record.text : record.content)} />}
    {showAttachments && record.attachments?.filter(item => item.media?.url).map((item, index) => <Figure key={item._id || index} media={item.media} alt={text(item.alt)} caption={text(item.caption)} />)}
    {question && record.questionType === 'mcq' && record.mcqOptions?.length > 0 && <>
      <ol className="list-[upper-alpha] space-y-2 pl-8">{record.mcqOptions.map((option, index) => <li key={option._id || index}><RichContent html={text(option.text)} /></li>)}</ol>
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">{uiText('Answer and explanation')}</summary>
        {record.mcqOptions.some(option => option.correct) && <p>{uiText('Correct option')} {record.mcqOptions.map((option, index) => option.correct ? String.fromCharCode(65 + index) : null).filter(Boolean).join(', ')}</p>}
        <RichContent html={text(record.explanation)} />
      </details>
    </>}
    {question && showContent && record.blocks?.length > 0 && <SolutionRenderer blocks={record.blocks} languageMode={record.languageMode} />}
    {question && <><RichContent html={text(record.answer)} /><RichContent html={text(record.markingScheme)} /></>}
    {record.formulas?.map((formula, index) => <section className="overflow-x-auto rounded-lg border p-4" key={formula._id || index}>
      <h4 className="font-semibold">{text(formula.title)}</h4>
      <MathFormula latex={formula.latex} />
      <RichContent html={text(formula.description)} />
    </section>)}
    <YouTubeEmbed video={record.introVideo} />
    {record.video?._id !== record.introVideo?._id && <YouTubeEmbed video={record.video} />}
    {document && <DocumentAttachment media={document} title={text(record.title)} />}
  </div>;
}
