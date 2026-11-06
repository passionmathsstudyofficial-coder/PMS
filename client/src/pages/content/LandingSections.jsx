import { useLang } from '@/lib/i18n';
import { RichContent } from '@/components/content/RichContent.jsx';

function local(value, lang) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || '';
}

export default function LandingSections({ page }) {
  const { lang } = useLang();
  if (!page) return null;
  const sections = (page.sections || []).filter((section) => section.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return <>
    {local(page.content, lang) && <section className="container-page py-6"><RichContent html={local(page.content, lang)} /></section>}
    {sections.map((section, index) => <section key={section._id || index} className="container-page py-5">
      <div className="rounded-2xl border bg-card p-5 sm:p-7">
        {local(section.title, lang) && <h2 className="mb-4 text-xl font-bold">{local(section.title, lang)}</h2>}
        {section.image?.url && <img src={section.image.url} alt="" className="mb-4 max-h-96 rounded-xl object-cover" />}
        {local(section.text, lang) && <RichContent html={local(section.text, lang)} />}
        {section.type === 'faq' ? <div className="space-y-3">{(section.items || []).map((item, i) => <details key={item._id || i} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{local(item.title, lang)}</summary><p className="mt-2 text-muted-foreground">{local(item.text, lang)}</p></details>)}</div> : section.type === 'buttons' ? <div className="flex flex-wrap gap-3">{(section.items || []).filter((item) => item.url).map((item, i) => <a key={item._id || i} href={item.url} className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">{local(item.label, lang) || local(item.title, lang)}</a>)}</div> : section.items?.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section.items.map((item, itemIndex) => <article key={item._id || itemIndex} className="rounded-xl border p-4">
          {item.image?.url && <img src={item.image.url} alt="" className="mb-3 max-h-40 w-full rounded-lg object-cover" />}
          {item.url ? <a className="font-semibold text-brand hover:underline" href={item.url}>{local(item.title, lang) || local(item.label, lang)}</a> : <h3 className="font-semibold">{local(item.title, lang)}</h3>}
          {local(item.text, lang) && <p className="mt-2 text-sm text-muted-foreground">{local(item.text, lang)}</p>}
        </article>)}</div>}
      </div>
    </section>)}
  </>;
}
