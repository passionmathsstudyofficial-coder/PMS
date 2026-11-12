import { Link, useSearchParams } from 'react-router';
import { Breadcrumbs } from '@/components/site/Breadcrumbs.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { MathFormula } from '@/components/content/MathFormula.jsx';
import { SolutionRenderer } from '@/components/content/SolutionRenderer.jsx';
import { Figure } from '@/components/content/Figure.jsx';
import { resolveMediaUrl } from '@/lib/media';
import { uiText } from '@/lib/uiLanguage.js';
import { useL10n } from '@/lib/i18n';

export default function StudyCmsPublicPage({ data, breadcrumbs, preview }) {
  const t = useL10n();
  const [params, setParams] = useSearchParams();
  const { record, groups, kind, title } = data;
  const page = groups[0]?.page || 1;
  const pages = Math.max(1, ...groups.map(group => group.pages));
  const query = params.toString();
  const studentUrl = url => query && preview ? url + '?' + query : url;
  const changePage = value => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === 1) next.delete('page');
    else next.set('page', value);
    return next;
  });
  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
      <Breadcrumbs items={breadcrumbs} />
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">{t(title)}</h1>
        {record?.description && <p className="text-muted-foreground">{t(record.description)}</p>}
        {record?.summary && <p className="text-muted-foreground">{t(record.summary)}</p>}
      </header>
      {record && <article className="space-y-4">
        {[record.thumbnail, record.image, record.featuredImage].filter(Boolean).map((media, index) => <Figure key={index} media={media} alt={t(media.alt)} />)}
        {kind === 'question' && <p className="text-sm text-muted-foreground">
          {[record.board, record.examType, record.year, record.marks != null && `${record.marks} marks`, record.difficulty].filter(Boolean).join(' · ')}
        </p>}
        <RichContent html={t(record.introduction)} />
        <RichContent html={t(record.text || record.content)} />
        {record.attachments?.filter(item => item.media?.url).map(item => <Figure key={item._id} media={item.media}
          alt={t(item.alt || item.media.alt)} caption={t(item.caption)} />)}
        {record.mcqOptions?.length > 0 && record.questionType === 'mcq' && <>
          <ol className="list-[upper-alpha] space-y-2 pl-8">
            {record.mcqOptions.map((option, index) => <li key={option._id || index}><RichContent html={t(option.text)} /></li>)}
          </ol>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">{uiText('Answer and explanation')}</summary>
            <p className="mt-2">{uiText('Correct option')} {String.fromCharCode(65 + record.mcqOptions.findIndex(option => option.correct))}</p>
            <RichContent html={t(record.explanation)} />
          </details>
        </>}
        {record.blocks?.length > 0 && <SolutionRenderer blocks={record.blocks} languageMode={record.languageMode} />}
        <RichContent html={t(record.answer)} />
        <RichContent html={t(record.markingScheme)} />
        {record.formulas?.map((formula, index) => <section className="overflow-x-auto rounded-lg border p-4" key={formula._id || index}>
          <h2 className="font-semibold">{t(formula.title)}</h2>
          <MathFormula latex={formula.latex} />
          <p>{t(formula.description)}</p>
        </section>)}
        {(record.pdfFile?.url || record.pdfUrl) && <a className="font-medium text-brand underline"
          href={resolveMediaUrl(record.pdfFile?.url || record.pdfUrl)} target="_blank" rel="noreferrer">{uiText('Open PDF')}</a>}
      </article>}
      {groups.filter(group => group.total > 0).map(group => <section key={group.label} className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">{uiText(group.label)}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {group.items.map(item => <li key={item._id}>
            <Link className="block h-full rounded-lg border bg-card p-4 hover:border-brand" to={studentUrl(item.url)}>
              <span className="font-semibold">{t(item.title) || item.number || uiText('View content')}</span>
              {item.description && <p className="mt-1 text-sm text-muted-foreground">{t(item.description)}</p>}
            </Link>
          </li>)}
        </ul>
      </section>)}
      {groups.length > 0 && !groups.some(group => group.total) && <p className="text-muted-foreground">{uiText('No published content is available here yet.')}</p>}
      {pages > 1 && <nav className="flex items-center gap-4" aria-label="Page navigation">
        <button type="button" className="rounded-md border px-3 py-2 disabled:opacity-50" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" className="rounded-md border px-3 py-2 disabled:opacity-50" disabled={page >= pages} onClick={() => changePage(page + 1)}>Next</button>
      </nav>}
    </main>
  );
}
