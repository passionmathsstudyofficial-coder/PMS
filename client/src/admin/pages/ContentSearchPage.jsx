import { useState } from 'react';
import { Search, Filter, BookOpen, Layers, HelpCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { adminUrl } from '@/lib/config';

export default function ContentSearchPage() {
  useUiLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const resources = [
        ['classes', 'Class', (x) => x.name?.en || x.name?.hi || `Class ${x.number}`, (x) => `classes/${x._id}`],
        ['chapters', 'Chapter', (x) => x.title?.en || x.title?.hi || `Chapter ${x.number}`, (x) => `chapters/${x._id}`],
        ['exercises', 'Exercise', (x) => x.title?.en || x.title?.hi || `Exercise ${x.number}`, (x) => `exercises/${x._id}`],
        ['questions', 'Question', (x) => x.text?.en || x.text?.hi || `Question ${x.number}`, (x) => `questions/${x._id}`],
        ['topics', 'Topic', (x) => x.title?.en || x.title?.hi || 'Topic', (x) => `topics/${x._id}`],
        ['notes', 'Note', (x) => x.title?.en || x.title?.hi || 'Note', (x) => `notes/${x._id}`],
        ['important-questions', 'ImportantQuestion', (x) => x.title?.en || x.text?.en || x.text?.hi || 'Important question', (x) => `important-questions-legacy/${x._id}`],
        ['resources', 'Resource', (x) => x.title?.en || x.title?.hi || 'Resource', (x) => `resources/${x._id}`],
        ['books', 'Book', (x) => x.title?.en || x.title?.hi || 'Book', (x) => `books/${x._id}`],
      ];
      const results = await Promise.all(resources.map(async ([resource, type, titleOf, pathOf]) => {
        const response = await get(`/content/${resource}`, { scope: 'admin', q: query.trim(), limit: 20 });
        return (response.items || []).map((item) => ({ type, title: titleOf(item), url: adminUrl(pathOf(item)), status: item.status || 'published' }));
      }));
      setResults(results.flat());
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title={uiText("Educational Content Search & Filter")}
        description={uiText("Search across NCERT chapters, exercises, questions, reference book solutions, and notes in Hindi and English.")}
      />

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={uiText("Search by keyword, formula, chapter number, or question...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <Button type="submit" className="font-bold px-6">{uiText("Search")}</Button>
      </form>

      {/* Results */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 font-bold text-xs uppercase tracking-wider text-muted-foreground">{uiText("Search Results (")}{results.length})
        </div>

        {searching ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Searching database...")}</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {query ? uiText('No matching educational content found.') : uiText('Enter a query above to search.')}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {results.map((r, i) => (
              <div key={i} className="p-4 hover:bg-muted/10 transition">
                <span className="rounded bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-extrabold uppercase mr-2">
                  {r.type}
                </span>
                <span className="text-sm font-bold text-foreground">{r.title}</span>
                {r.snippet && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>
                )}
                <a href={r.url} className="text-xs font-semibold text-brand hover:underline block mt-1">{uiText("Edit ")}{r.status === 'draft' ? uiText('(draft)') : ''}</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

