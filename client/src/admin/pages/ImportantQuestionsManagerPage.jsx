import { uiTemplate } from '@/lib/uiLanguage.js';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  Star,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';

export default function ImportantQuestionsManagerPage({ fixedCategory }) {
  useUiLanguage();
  const params = useParams();
  const activeCategory = fixedCategory || params.category || 'pyq';

  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('2026–27');
  const [selectedYear, setSelectedYear] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: { en: '', hi: '' },
    text: { en: '', hi: '' },
    category: activeCategory,
    year: 2025,
    paperSet: 'Set 1',
    marks: 4,
    difficulty: 'medium',
    solutionText: { en: '', hi: '' },
    isImportant: true,
  });

  const CATEGORY_NAMES = {
    pyq: 'Previous Year Questions (PYQ)',
    'sample-papers': 'CBSE Sample Papers',
    'extra-questions': 'CBSE Extra Questions',
    vvi: 'VVI Questions (Board Special)',
    syllabus: 'Maths Syllabus Resources',
  };
  const resourceType = activeCategory === 'pyq' ? 'previous_year_paper'
    : activeCategory === 'sample-papers' ? 'sample_paper'
    : activeCategory === 'extra-questions' ? 'extra_questions'
    : activeCategory === 'syllabus' ? 'syllabus'
    : 'important_questions';

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [clsRes, sessRes] = await Promise.all([
          get('/content/classes', { scope: 'admin', limit: 20 }),
          get('/content/sessions'),
        ]);
        const clsList = (clsRes.items || []).sort((a, b) => b.number - a.number);
        setClasses(clsList);
        setSelectedClass(clsList.find((c) => c.number === 10) || clsList[0] || null);

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
  }, []);

  const loadQuestions = async () => {
    if (!selectedClass?._id) return;
    setLoading(true);
    try {
      const dbCat = activeCategory === 'sample-papers' ? 'sample_paper'
        : activeCategory === 'extra-questions' ? 'extra_questions'
        : activeCategory;
      const res = await get('/content/important-questions', {
        scope: 'admin',
        class: selectedClass._id,
        category: dbCat,
        academicSession: selectedSession,
        ...(selectedYear !== 'all' ? { year: Number(selectedYear) } : {}),
        limit: 50,
      });
      setQuestions(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedClass, selectedSession, selectedYear, activeCategory]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClass?._id) return;
    try {
      const dbCat = activeCategory === 'sample-papers' ? 'sample_paper'
        : activeCategory === 'extra-questions' ? 'extra_questions'
        : activeCategory;
      const payload = {
        title: form.title,
        text: form.text,
        category: dbCat,
        class: selectedClass._id,
        subject: selectedClass.subjects?.find((s) => /math/i.test(`${s.slug || ''} ${s.name?.en || ''}`))?._id || selectedClass.subjects?.[0]?._id || selectedClass.subjects?.[0],
        academicSession: selectedSession,
        year: Number(form.year),
        paperSet: form.paperSet,
        marks: Number(form.marks),
        difficulty: form.difficulty,
        isImportant: form.isImportant,
        blocks: form.solutionText.en || form.solutionText.hi ? [
          {
            type: 'step',
            stepNumber: 1,
            title: { en: 'Solution', hi: 'हल' },
            content: form.solutionText,
          },
        ] : [],
        status: 'published',
      };
      await post('/content/important-questions', payload);
      toast.success(uiText('Question published successfully'));
      setModalOpen(false);
      setForm({
        title: { en: '', hi: '' },
        text: { en: '', hi: '' },
        category: activeCategory,
        year: 2025,
        paperSet: 'Set 1',
        marks: 4,
        difficulty: 'medium',
        solutionText: { en: '', hi: '' },
        isImportant: true,
      });
      loadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await del(`/content/important-questions/${id}`);
      toast.success(uiText('Question deleted'));
      loadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleEditLanding = async () => {
    try {
      const key = `study-materials/${activeCategory === 'sample-papers' ? 'cbse-sample-papers' : activeCategory === 'extra-questions' ? 'cbse-extra-questions' : activeCategory === 'vvi' ? 'vvi-questions' : activeCategory === 'syllabus' ? 'maths-syllabus' : 'previous-year-questions'}`;
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
        title={uiTemplate`${CATEGORY_NAMES[activeCategory] || 'Important Questions'} Management`}
        description={uiText("Publish board questions, previous year papers, marking schemes, formulas, and step-by-step mathematical answers.")}
      />

      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
        {/* Category switcher */}
        <div className="flex items-center gap-1.5">
          <Star className="size-4 text-brand" />
          <span className="text-xs font-bold text-foreground">{uiText("Category:")}</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
              <Link
                key={key}
                to={adminUrl(`important-questions/${key}`)}
                className={cn(
                  'rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer',
                  activeCategory === key
                    ? 'bg-brand text-white shadow-xs'
                    : 'border border-border bg-background text-foreground hover:bg-muted'
                )}
              >
                {label.split(' ')[0]}
              </Link>
            ))}
          </div>
        </div>

        {/* Class selector */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-bold text-foreground">{uiText("Class:")}</span>
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
        <label className="flex items-center gap-2 text-xs font-bold">{uiText("Session:")}<select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="h-8 rounded-lg border bg-background px-2">
            {sessions.map((session) => <option key={session._id} value={session.slug}>{session.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-bold">{uiText("Exam year:")}<select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="h-8 rounded-lg border bg-background px-2">
            <option value="all">{uiText("All years")}</option>
            {[...new Set([2026, 2025, 2024, ...questions.map((q) => q.year).filter(Boolean)])].sort((a, b) => b - a).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-brand/5 p-3 text-sm">
        <span>{activeCategory === 'syllabus' ? uiText('Syllabus PDFs are managed in the resource library; class chapters are managed under NCERT Mathematics → Chapter Management.') : uiText('Manage downloadable papers, marking schemes, and supporting PDFs for this category.')}</span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleEditLanding} className="gap-1.5 font-bold cursor-pointer">
            <FileText className="size-3.5 text-brand" />
            <span>{uiText("Edit Landing Page")}</span>
          </Button>
          <Button asChild size="sm" variant="outline"><Link to={adminUrl(`resources?resourceType=${resourceType}${selectedClass?._id ? `&class=${selectedClass._id}` : ''}`)}>{uiText("Open related resources")}</Link></Button>
        </div>
      </div>

      {/* Questions List & Add Button */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {CATEGORY_NAMES[activeCategory]}{uiText(" — Class ")}{selectedClass?.number} ({questions.length})
          </h3>
          {activeCategory !== 'syllabus' && <Button asChild size="sm" className="gap-1.5 font-bold"><Link to={adminUrl(`important-questions-legacy/new?${new URLSearchParams({ class: selectedClass?._id || '', category: activeCategory, session: selectedSession, ...(selectedYear !== 'all' ? { year: selectedYear } : {}) })}`)}><Plus className="size-3.5" /><span>{uiText("Add Question")}</span></Link></Button>}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Loading questions...")}</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{uiText("No questions added in this category yet. Click \"+ Add Question\" to publish one.")}</div>
        ) : (
          <div className="divide-y divide-border/60">
            {questions.map((q) => (
              <div key={q._id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/10 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {q.year && (
                      <span className="rounded-md bg-brand/10 text-brand px-2 py-0.5 text-xs font-bold">
                        {q.year}
                      </span>
                    )}
                    {q.paperSet && (
                      <span className="rounded-md border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {q.paperSet}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {q.difficulty} · {q.marks}{uiText(" Marks")}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground line-clamp-2">
                    {q.title?.en || q.title?.hi || q.text?.en || uiText('Question')}
                  </h4>
                  {q.blocks?.length > 0 && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="size-3" />{uiText(" Step-by-Step Solution Provided")}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button asChild variant="ghost" size="icon-sm" title={uiText("Edit full question and solution")} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Link to={adminUrl(`important-questions-legacy/${q._id}`)}><Edit2 className="size-3.5" /></Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(q._id)}
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
            <h3 className="text-base font-bold text-foreground mb-4">{uiText("Add ")}{CATEGORY_NAMES[activeCategory]}{uiText(" (Class ")}{selectedClass?.number})
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">{uiText("Exam Year")}</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">{uiText("Paper Set")}</label>
                  <input
                    type="text"
                    placeholder={uiText("e.g. Set 1")}
                    value={form.paperSet}
                    onChange={(e) => setForm({ ...form, paperSet: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">{uiText("Marks")}</label>
                  <input
                    type="number"
                    value={form.marks}
                    onChange={(e) => setForm({ ...form, marks: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">{uiText("Question Title / Topic (optional)")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. Quadratic Formula Derivation")}
                  value={form.title.en}
                  onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">{uiText("Question Text (LaTeX formulas: $...$) *")}</label>
                <textarea
                  rows={3}
                  placeholder={uiText("e.g. Find the roots of the quadratic equation: $2x^2 - 7x + 3 = 0$")}
                  value={form.text.en}
                  onChange={(e) => setForm({ ...form, text: { ...form.text, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">{uiText("Step-by-Step Mathematical Solution *")}</label>
                <textarea
                  rows={6}
                  placeholder={uiTemplate`Step 1: Compare with $ax^2 + bx + c = 0$
Here $a = 2, b = -7, c = 3$

Step 2: Apply the quadratic formula
$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$`}
                  value={form.solutionText.en}
                  onChange={(e) => setForm({ ...form, solutionText: { ...form.solutionText, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>{uiText("Cancel")}</Button>
                <Button type="submit" size="sm" className="font-bold">{uiText("Publish Question & Solution")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

