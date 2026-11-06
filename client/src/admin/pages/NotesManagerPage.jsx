import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  NotebookPen,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  FileText,
  Sigma,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';

export default function NotesManagerPage({ fixedCategory }) {
  useUiLanguage();
  const params = useParams();
  const activeCategory = fixedCategory || params.category || 'ncert';

  const [notes, setNotes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('2026–27');
  const [loading, setLoading] = useState(true);
  const bookSlug = ['rs-aggarwal', 'rd-sharma', 'kc-sinha'].includes(activeCategory) ? activeCategory : null;
  const selectedBook = books.find((book) => book.slug === bookSlug) || null;

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: { en: '', hi: '' },
    summary: { en: '', hi: '' },
    content: { en: '', hi: '' },
    chapter: '',
    category: activeCategory === 'ncert' ? 'ncert_notes' : activeCategory === 'formulas' ? 'formula_sheet' : `${activeCategory}_notes`,
  });

  const CATEGORY_MAP = {
    ncert: { label: 'NCERT Chapter-wise Notes', dbCat: 'ncert_notes' },
    formulas: { label: 'All Maths Formula Sheets', dbCat: 'formula_sheet' },
    'rs-aggarwal': { label: 'RS Aggarwal Formulas & Notes', dbCat: 'rs_aggarwal_notes' },
    'rd-sharma': { label: 'RD Sharma Formulas & Notes', dbCat: 'rd_sharma_notes' },
    'kc-sinha': { label: 'KC Sinha Formulas & Notes', dbCat: 'kc_sinha_notes' },
    vvi: { label: 'VVI Questions & Short Notes', dbCat: 'vvi_short_notes' },
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [clsRes, sessRes, booksRes] = await Promise.all([
          get('/content/classes', { scope: 'admin', limit: 20 }),
          get('/content/sessions'),
          get('/content/books', { scope: 'admin', category: 'reference', limit: 100 }),
        ]);
        setBooks(booksRes.items || []);
        const clsList = (clsRes.items || []).sort((a, b) => b.number - a.number);
        setClasses(clsList);
        const referenceBook = (booksRes.items || []).find((book) => book.slug === bookSlug);
        const refAllowed = referenceBook?.availableClasses?.length ? clsList.filter((c) => referenceBook.availableClasses.includes(c.number)) : [];
        const allowedClasses = refAllowed.length ? refAllowed : clsList;
        setSelectedClass(allowedClasses.find((c) => c.number === 10) || allowedClasses[0] || clsList[0] || null);

        const sessList = sessRes.items || [];
        setSessions(sessList);
        setSelectedSession(sessList.find((s) => s.isCurrent)?.slug || '2026-27');
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [bookSlug]);

  // Load chapters when class changes
  useEffect(() => {
    if (!selectedClass?._id) return;
    async function loadChapters() {
      try {
        const res = await get('/content/chapters', { scope: 'admin', class: selectedClass._id, book: selectedBook?._id || 'none', academicSession: selectedSession, limit: 100 });
        setChapters(res.items || []);
      } catch (err) {
        toast.apiError(err);
      }
    }
    loadChapters();
  }, [selectedClass, selectedBook, selectedSession]);

  const loadNotes = async () => {
    if (!selectedClass?._id) return;
    setLoading(true);
    try {
      const dbCat = CATEGORY_MAP[activeCategory]?.dbCat || 'ncert_notes';
      const params = {
        class: selectedClass._id,
        category: dbCat,
        limit: 50,
      };
      if (selectedChapter !== 'all') {
        params.chapter = selectedChapter;
      }
      const res = await get('/content/notes', { ...params, scope: 'admin', academicSession: selectedSession });
      setNotes(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [selectedClass, selectedChapter, selectedSession, activeCategory]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClass?._id) return;
    try {
      const dbCat = CATEGORY_MAP[activeCategory]?.dbCat || 'ncert_notes';
      const payload = {
        title: form.title,
        summary: form.summary,
        content: form.content,
        chapter: form.chapter || undefined,
        class: selectedClass._id,
        subject: selectedClass.subjects?.find((s) => /math/i.test(`${s.slug || ''} ${s.name?.en || ''}`))?._id || selectedClass.subjects?.[0]?._id || selectedClass.subjects?.[0],
        book: selectedBook?._id || undefined,
        academicSession: selectedSession,
        category: dbCat,
        status: 'published',
      };

      if (editingId) {
        await patch(`/content/notes/${editingId}`, payload);
        toast.success('Note updated successfully');
      } else {
        await post('/content/notes', payload);
        toast.success('Note published successfully');
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({
        title: { en: '', hi: '' },
        summary: { en: '', hi: '' },
        content: { en: '', hi: '' },
        chapter: '',
        category: dbCat,
      });
      loadNotes();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await del(`/content/notes/${id}`);
      toast.success('Note deleted');
      loadNotes();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const currentCategoryMeta = CATEGORY_MAP[activeCategory] || CATEGORY_MAP.ncert;

  const handleEditLanding = async () => {
    try {
      const key = `notes/${activeCategory === 'ncert' ? 'ncert-chapter-wise-notes' : activeCategory === 'formulas' ? 'maths-formula-sheets' : activeCategory === 'vvi' ? 'vvi-questions-short-notes' : activeCategory + '-formulas-notes'}`;
      const res = await post('/content/landing-pages/ensure', { landingKey: key });
      if (res.item?._id) {
        window.location.href = adminUrl(`pages/${res.item._id}`);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title={`${currentCategoryMeta.label} Management`}
        description={uiText("Publish chapter-wise revision notes, mathematical formulas, theorem proofs, and definitions.")}
      />

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-xs">
        {Object.entries(CATEGORY_MAP).map(([key, meta]) => (
          <Link
            key={key}
            to={adminUrl(`notes-manager/${key}`)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
              activeCategory === key
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-background text-foreground hover:bg-muted'
            )}
          >
            {meta.label}
          </Link>
        ))}
      </div>

      {/* Class & Chapter Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">Class:</span>
          <div className="flex gap-1">
            {classes.map((c) => (
              <button
                key={c.number}
                type="button"
                onClick={() => setSelectedClass(c)}
                className={cn(
                  'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition cursor-pointer',
                  selectedClass?.number === c.number
                    ? 'bg-brand text-white'
                    : 'border border-border bg-background text-foreground hover:bg-muted'
                )}
              >
                {c.number}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-bold text-foreground">Session:</span>
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="h-8 rounded-xl border border-border bg-background px-3 text-xs font-semibold">
            {sessions.map((session) => <option key={session._id} value={session.slug}>{session.name}</option>)}
          </select>
          <span className="text-xs font-bold text-foreground">Chapter:</span>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="h-8 rounded-xl border border-border bg-background px-3 text-xs font-semibold focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Chapters</option>
            {chapters.map((ch) => (
              <option key={ch._id} value={ch._id}>
                Ch {ch.number}: {ch.title?.en || ch.title?.hi}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes List */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {currentCategoryMeta.label} — {selectedClass ? `Class ${selectedClass.number}` : 'Select Class'} ({notes.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleEditLanding} className="gap-1.5 font-bold cursor-pointer">
              <FileText className="size-3.5 text-brand" />
              <span>Edit Landing Page</span>
            </Button>
            <Button asChild size="sm" className="gap-1.5 font-bold"><Link to={adminUrl(`notes/new?${new URLSearchParams({ class: selectedClass?._id || '', chapter: selectedChapter !== 'all' ? selectedChapter : chapters[0]?._id || '', category: currentCategoryMeta.dbCat, session: selectedSession, ...(selectedBook?._id ? { book: selectedBook._id } : {}) })}`)}><Plus className="size-3.5" /><span>Add Note / Formula Sheet</span></Link></Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No notes added in this section yet. Click "+ Add Note / Formula Sheet" to publish.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {notes.map((note) => (
              <div key={note._id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/10 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {note.chapter && (
                      <span className="rounded-md bg-brand/10 text-brand px-2 py-0.5 text-xs font-bold">
                        Ch {note.chapter.number}: {note.chapter.title?.en || note.chapter.title?.hi}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {note.title?.en || note.title?.hi}
                  </h4>
                  {note.summary?.en && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {note.summary.en}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button asChild variant="ghost" size="icon-sm" title="Edit note with full draft and media controls" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Link to={adminUrl(`notes/${note._id}`)}><Edit2 className="size-3.5" /></Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(note._id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 my-8">
            <h3 className="text-base font-bold text-foreground mb-4">
              {editingId ? 'Edit Note' : 'Add Note / Formula Sheet'} (Class {selectedClass?.number})
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Assign Chapter</label>
                <select
                  value={form.chapter}
                  onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">General (No specific chapter)</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      Ch {ch.number}: {ch.title?.en || ch.title?.hi}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Note Title (English) *</label>
                <input
                  type="text"
                  placeholder="e.g. Fundamental Theorem of Arithmetic & Proofs"
                  value={form.title.en}
                  onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Note Title (Hindi)</label>
                <input
                  type="text"
                  placeholder="e.g. अंकगणित की आधारभूत प्रमेय"
                  value={form.title.hi}
                  onChange={(e) => setForm({ ...form, title: { ...form.title, hi: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Summary / Key Concept</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of theorems and definitions"
                  value={form.summary.en}
                  onChange={(e) => setForm({ ...form, summary: { ...form.summary, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Detailed Content (LaTeX: $...$)</label>
                <textarea
                  rows={6}
                  placeholder="Detailed notes, formula proofs, and worked examples"
                  value={form.content.en}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  {editingId ? 'Update Note' : 'Publish Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

