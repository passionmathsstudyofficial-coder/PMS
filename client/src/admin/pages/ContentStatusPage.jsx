import { useState, useEffect } from 'react';
import {
  FileCheck,
  Clock,
  Archive,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { Link } from 'react-router';
import { adminUrl } from '@/lib/config';

export default function ContentStatusPage() {
  useUiLanguage();
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [chapters, exercises, questions, notes, importantQuestions, resources, books, topics] = await Promise.all([
        get('/content/chapters', { scope: 'admin', limit: 100 }),
        get('/content/exercises', { scope: 'admin', limit: 100 }),
        get('/content/questions', { scope: 'admin', limit: 100 }),
        get('/content/notes', { scope: 'admin', limit: 100 }),
        get('/content/important-questions', { scope: 'admin', limit: 100 }),
        get('/content/resources', { scope: 'admin', limit: 100 }),
        get('/content/books', { scope: 'admin', limit: 100 }),
        get('/content/topics', { scope: 'admin', limit: 100 }),
      ]);

      const combined = [
        ...(chapters.items || []).map((x) => ({ ...x, entityType: 'Chapter', label: `Chapter ${x.number}: ${x.title?.en || x.title?.hi}` })),
        ...(exercises.items || []).map((x) => ({ ...x, entityType: 'Exercise', label: `Exercise ${x.number}` })),
        ...(questions.items || []).map((x) => ({ ...x, entityType: 'Question', label: `Question ${x.number}` })),
        ...(notes.items || []).map((x) => ({ ...x, entityType: 'Note', label: x.title?.en || x.title?.hi || 'Note' })),
        ...(importantQuestions.items || []).map((x) => ({ ...x, entityType: 'ImportantQuestion', label: x.title?.en || x.text?.en || x.text?.hi || 'Important question' })),
        ...(resources.items || []).map((x) => ({ ...x, entityType: 'Resource', label: x.title?.en || x.title?.hi || 'Resource' })),
        ...(books.items || []).map((x) => ({ ...x, entityType: 'Book', label: x.title?.en || x.title?.hi || 'Book' })),
        ...(topics.items || []).map((x) => ({ ...x, entityType: 'Topic', label: x.title?.en || x.title?.hi || 'Topic' })),
      ];
      setItems(combined);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const filtered = items.filter((i) => {
    if (activeTab === 'all') return true;
    return (i.status || 'published') === activeTab;
  });

  return (
    <div className="space-y-6">
      <Panel
        title={uiText("Drafts & Published Content Status")}
        description={uiText("Overview of educational content across published, draft, scheduled, and archived states.")}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3">
        {[
          { id: 'all', label: 'All Content', count: items.length },
          { id: 'published', label: 'Published', count: items.filter((x) => (x.status || 'published') === 'published').length },
          { id: 'draft', label: 'Drafts', count: items.filter((x) => x.status === 'draft').length },
          { id: 'scheduled', label: 'Scheduled', count: items.filter((x) => x.status === 'scheduled').length },
          { id: 'archived', label: 'Archived', count: items.filter((x) => x.status === 'archived').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
              activeTab === tab.id
                ? 'bg-brand text-white shadow-xs'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            )}
          >
            <span>{tab.label}</span>
            <span className={cn('rounded px-1.5 py-0.2 text-[10px]', activeTab === tab.id ? 'bg-white/20' : 'bg-muted')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 font-bold text-xs uppercase tracking-wider text-muted-foreground flex justify-between">
          <span>Item & Entity</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading content statuses...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No content found in this state.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((item) => (
              <div key={item._id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10">
                <div>
                  <span className="rounded bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-extrabold uppercase mr-2">
                    {item.entityType}
                  </span>
                  <span className="text-sm font-bold text-foreground">{item.label}</span>
                  {item.academicSession && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.academicSession})
                    </span>
                  )}
                  <Link className="ml-3 text-xs font-semibold text-brand hover:underline" to={adminUrl(({ Chapter: 'chapters', Exercise: 'exercises', Question: 'questions', Note: 'notes', ImportantQuestion: 'important-questions-legacy', Resource: 'resources', Book: 'books', Topic: 'topics' })[item.entityType] + `/${item._id}`)}>Edit</Link>
                </div>

                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-extrabold capitalize',
                    (item.status || 'published') === 'published'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : item.status === 'draft'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {item.status || 'published'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

