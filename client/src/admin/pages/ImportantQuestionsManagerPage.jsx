import { uiTemplate } from '@/lib/uiLanguage.js';
import { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  BookOpen,
  Wand2,
  RefreshCw,
  AlertTriangle,
  Check,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';
import { RichL10nField } from '../components/fields/RichL10nField.jsx';
import { L10nField, SelectField, TextField } from '../components/fields/Fields.jsx';
import {
  parseAndClassifyQuestions,
  getQuestionTypeBadge,
  QUESTION_TYPES,
} from '@/lib/questionClassifier.js';

export default function ImportantQuestionsManagerPage({ fixedCategory }) {
  useUiLanguage();
  const params = useParams();
  const rawCategory = fixedCategory || params.category || 'pyq';
  const activeCategory = rawCategory === 'extra-questions' ? 'sample-papers' : rawCategory;

  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('2026–27');
  const [selectedYear, setSelectedYear] = useState('all');
  const [loading, setLoading] = useState(true);

  // Editor Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customTitle, setCustomTitle] = useState(false);

  const CATEGORY_NAMES = {
    pyq: 'Previous Year Questions (PYQ)',
    'sample-papers': 'CBSE Sample Papers',
    vvi: 'VVI Questions (Board Special)',
    syllabus: 'Maths Syllabus Resources',
  };

  const resourceType = activeCategory === 'pyq' ? 'previous_year_paper'
    : activeCategory === 'sample-papers' ? 'sample_paper'
    : activeCategory === 'syllabus' ? 'syllabus'
    : 'important_questions';

  const defaultYear = 2026;

  const computeDynamicTitle = (cat, yr, pSet) => {
    const yearStr = yr ? String(yr) : '2026';
    const setSuffix = pSet && pSet.trim() ? ` (${pSet.trim()})` : '';
    if (cat === 'pyq') {
      return {
        en: `CBSE PYQ ${yearStr}${setSuffix}`,
        hi: `सीबीएसई पीवाईक्यू ${yearStr}${setSuffix}`,
      };
    }
    if (cat === 'sample-papers' || cat === 'sample_paper') {
      return {
        en: `CBSE Sample Paper ${yearStr}${setSuffix}`,
        hi: `सीबीएसई सैंपल पेपर ${yearStr}${setSuffix}`,
      };
    }
    return {
      en: `CBSE Important Questions ${yearStr}${setSuffix}`,
      hi: `सीबीएसई महत्वपूर्ण प्रश्न ${yearStr}${setSuffix}`,
    };
  };

  const [form, setForm] = useState({
    title: computeDynamicTitle(activeCategory, defaultYear, ''),
    content: { en: '', hi: '' },
    category: activeCategory === 'sample-papers' ? 'sample_paper' : activeCategory,
    chapter: '',
    year: defaultYear,
    paperSet: '',
    marks: '',
    difficulty: 'medium',
    board: 'CBSE',
    pdfUrl: '',
    status: 'published',
    extractedQuestions: [],
  });

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

  // Fetch chapters whenever selectedClass changes
  useEffect(() => {
    async function loadChapters() {
      if (!selectedClass?._id) {
        setChapters([]);
        return;
      }
      try {
        const res = await get('/content/chapters', {
          scope: 'admin',
          class: selectedClass._id,
          limit: 100,
        });
        setChapters(res.items || []);
      } catch (err) {
        console.error('Error fetching chapters:', err);
      }
    }
    loadChapters();
  }, [selectedClass]);

  const loadQuestions = async () => {
    if (!selectedClass?._id) return;
    setLoading(true);
    try {
      const dbCat = activeCategory === 'sample-papers' ? 'sample_paper' : activeCategory;
      const res = await get('/content/important-questions', {
        scope: 'admin',
        class: selectedClass._id,
        category: dbCat,
        academicSession: selectedSession,
        ...(selectedYear !== 'all' ? { year: Number(selectedYear) } : {}),
        limit: 100,
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

  const openNewModal = () => {
    const yr = selectedYear !== 'all' ? Number(selectedYear) : defaultYear;
    const cat = activeCategory === 'sample-papers' ? 'sample_paper' : activeCategory;
    const initialTitle = computeDynamicTitle(activeCategory, yr, '');
    setEditingId(null);
    setCustomTitle(false);
    setForm({
      title: initialTitle,
      content: { en: '', hi: '' },
      category: cat,
      chapter: selectedChapter !== 'all' ? selectedChapter : '',
      year: yr,
      paperSet: '',
      marks: '',
      difficulty: 'medium',
      board: 'CBSE',
      pdfUrl: '',
      status: 'published',
      extractedQuestions: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingId(q._id);
    setCustomTitle(true);
    let initialContent = q.content || q.text || { en: '', hi: '' };
    if ((!initialContent.en && !initialContent.hi) && q.blocks?.length > 0) {
      const blocksHtml = q.blocks.map(b => `<p><strong>${b.title?.en || 'Step'}:</strong> ${b.content?.en || ''}</p>`).join('');
      initialContent = { en: blocksHtml, hi: blocksHtml };
    }
    const existingExtracted = q.extractedQuestions?.length > 0
      ? q.extractedQuestions
      : parseAndClassifyQuestions(initialContent.en || initialContent.hi);

    setForm({
      title: q.title || computeDynamicTitle(q.category || activeCategory, q.year || defaultYear, q.paperSet),
      content: initialContent,
      category: q.category || (activeCategory === 'sample-papers' ? 'sample_paper' : activeCategory),
      chapter: q.chapter?._id || q.chapter || '',
      subject: q.subject?._id || q.subject || '',
      year: q.year || defaultYear,
      paperSet: q.paperSet || '',
      marks: q.marks ?? '',
      difficulty: q.difficulty || 'medium',
      board: q.board || 'CBSE',
      pdfUrl: q.pdfUrl || '',
      status: q.status || 'published',
      extractedQuestions: existingExtracted,
    });
    setModalOpen(true);
  };

  const handleYearOrSetChange = (newYear, newSet) => {
    const yr = newYear !== undefined ? newYear : form.year;
    const pSet = newSet !== undefined ? newSet : form.paperSet;
    const nextForm = { ...form, year: yr, paperSet: pSet };
    if (!customTitle) {
      nextForm.title = computeDynamicTitle(activeCategory, yr, pSet);
    }
    setForm(nextForm);
  };

  // Re-scan editor content and run automatic classification
  const handleReprocess = () => {
    const textHtml = form.content?.en || form.content?.hi || '';
    const classified = parseAndClassifyQuestions(textHtml, form.extractedQuestions);
    setForm((f) => ({ ...f, extractedQuestions: classified }));
    toast.success(uiText(`Classified ${classified.length} question(s) successfully`));
  };

  // Update specific extracted question item (e.g. manual marks or type override)
  const handleUpdateExtracted = (idx, patch) => {
    setForm((f) => {
      const updated = [...(f.extractedQuestions || [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], ...patch, confidence: 'manual' };
      }
      return { ...f, extractedQuestions: updated };
    });
  };

  const handleInsertTemplate = () => {
    const templateEn = `<h3>Question 1 [2 Marks]</h3>
<p>Solve the quadratic equation: $2x^2 - 7x + 3 = 0$ using the quadratic formula.</p>
<h4>Solution:</h4>
<p><strong>Step 1:</strong> Compare with standard form $ax^2 + bx + c = 0$, where $a = 2, b = -7, c = 3$.</p>
<p><strong>Step 2:</strong> Discriminant $D = b^2 - 4ac = (-7)^2 - 4(2)(3) = 49 - 24 = 25 > 0$.</p>
<p><strong>Step 3:</strong> Using quadratic formula $x = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{7 \\pm 5}{4}$. Hence $x = 3$ or $x = \\frac{1}{2}$.</p>

<h3>Question 2 [5 Marks]</h3>
<p>Prove that $\\sqrt{5}$ is an irrational number.</p>
<h4>Solution:</h4>
<p>Let us assume to the contrary that $\\sqrt{5}$ is rational. Hence $\\sqrt{5} = \\frac{p}{q}$ where $p, q$ are coprime integers and $q \\neq 0$.</p>

<h3>Question 3 (Case Study - 4 Marks)</h3>
<p>Read the following passage and answer the questions that follow: A circus artist is climbing a 20 m long rope tightly stretched from the top of a vertical pole to the ground.</p>
<p>(i) Find the height of the pole if the angle made by the rope with ground is $30^\\circ$.</p>
<p>(ii) If the angle changes to $45^\\circ$, calculate the new length of rope required.</p>
<h4>Solution:</h4>
<p><strong>(i)</strong> Let $h$ be height. $\\sin 30^\\circ = \\frac{h}{20} \\implies h = 10\\text{ m}$.</p>
<p><strong>(ii)</strong> $\\sin 45^\\circ = \\frac{10}{L} \\implies L = 10\\sqrt{2}\\text{ m}$.</p>`;

    const templateHi = `<h3>प्रश्न 1 [2 अंक]</h3>
<p>द्विघात समीकरण हल कीजिए: $2x^2 - 7x + 3 = 0$</p>
<h4>हल:</h4>
<p><strong>चरण 1:</strong> मानक रूप $ax^2 + bx + c = 0$ से तुलना करने पर $a = 2, b = -7, c = 3$.</p>
<p><strong>चरण 2:</strong> विविक्तकर $D = b^2 - 4ac = (-7)^2 - 4(2)(3) = 25 > 0$.</p>
<p><strong>चरण 3:</strong> $x = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{7 \\pm 5}{4}$, अत: $x = 3$ या $x = \\frac{1}{2}$.</p>

<h3>प्रश्न 2 [5 अंक]</h3>
<p>सिद्ध कीजिए कि $\\sqrt{5}$ एक अपरिमेय संख्या है।</p>
<h4>हल:</h4>
<p>मान लेते हैं कि $\\sqrt{5}$ एक परिमेय संख्या है। अत: $\\sqrt{5} = \\frac{p}{q}$ जहाँ $p$ और $q$ सह-अभाज्य पूर्णांक हैं।</p>`;

    const newContent = {
      en: form.content?.en ? `${form.content.en}\n<hr/>\n${templateEn}` : templateEn,
      hi: form.content?.hi ? `${form.content.hi}\n<hr/>\n${templateHi}` : templateHi,
    };
    const newClassified = parseAndClassifyQuestions(newContent.en || newContent.hi);
    setForm((f) => ({
      ...f,
      content: newContent,
      extractedQuestions: newClassified,
    }));
    toast.success(uiText('Question & Solution template inserted into editor'));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClass?._id) {
      toast.error('Class is required');
      return;
    }
    const mathSubId = selectedClass.subjects?.find((s) => /math/i.test(`${s.slug || ''} ${s.name?.en || ''}`))?._id || selectedClass.subjects?.[0]?._id || selectedClass.subjects?.[0];
    if (!mathSubId) {
      toast.error('Subject is required');
      return;
    }

    setSaving(true);
    try {
      const dbCat = activeCategory === 'sample-papers' ? 'sample_paper' : activeCategory;
      // Auto-extract if not yet extracted and sanitize payload
      const rawExtracted = form.extractedQuestions?.length > 0
        ? form.extractedQuestions
        : parseAndClassifyQuestions(form.content?.en || form.content?.hi || '');

      const finalExtracted = (rawExtracted || []).map((qItem, idx) => ({
        questionNumber: String(qItem.questionNumber || idx + 1).trim(),
        marks: typeof qItem.marks === 'number' && !isNaN(qItem.marks) ? qItem.marks : (Number(qItem.marks) || 2),
        questionType: ['vsa', 'short', 'long', 'case_study', 'mcq', 'short_answer', 'long_answer', 'case_based', 'numerical', 'proof'].includes(qItem.questionType)
          ? qItem.questionType
          : 'short',
        questionHtml: qItem.questionHtml || '',
        solutionHtml: qItem.solutionHtml || '',
        needsReview: Boolean(qItem.needsReview),
        confidence: String(qItem.confidence || 'high'),
      }));

      const payload = {
        title: form.title,
        content: form.content,
        text: form.content, // sync text with content so all endpoints render
        category: dbCat,
        class: selectedClass._id,
        subject: form.subject || mathSubId,
        chapter: form.chapter ? form.chapter : null,
        academicSession: selectedSession,
        year: form.year ? Number(form.year) : undefined,
        paperSet: form.paperSet || '',
        marks: form.marks !== '' ? Number(form.marks) : undefined,
        difficulty: form.difficulty || 'medium',
        board: form.board || 'CBSE',
        pdfUrl: form.pdfUrl || '',
        status: form.status || 'published',
        extractedQuestions: finalExtracted,
      };

      if (editingId) {
        await patch(`/content/important-questions/${editingId}`, payload);
        toast.success(uiText('Question paper updated successfully'));
      } else {
        await post('/content/important-questions', payload);
        toast.success(uiText('Question paper published successfully'));
      }

      setModalOpen(false);
      loadQuestions();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(uiText('Delete this question paper?'))) return;
    try {
      await del(`/content/important-questions/${id}`);
      toast.success(uiText('Question paper deleted'));
      loadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleEditLanding = async () => {
    try {
      const key = `study-materials/${activeCategory === 'sample-papers' ? 'cbse-sample-papers' : activeCategory === 'vvi' ? 'vvi-questions' : activeCategory === 'syllabus' ? 'maths-syllabus' : 'previous-year-questions'}`;
      const res = await post('/content/landing-pages/ensure', { landingKey: key });
      if (res.item?._id) {
        window.location.href = adminUrl(`pages/${res.item._id}`);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  const availableFilterYears = useMemo(() => {
    const list = Array.from(new Set(questions.map((q) => q.year).filter(Boolean).map(Number))).sort((a, b) => b - a);
    return list;
  }, [questions]);

  return (
    <div className="space-y-6">
      <Panel
        title={uiTemplate`${CATEGORY_NAMES[activeCategory] || 'CBSE Question Papers'} Management`}
        description={uiText("Create and manage question papers, answers, and solutions in a single rich-text Blog CMS editor.")}
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

        <label className="flex items-center gap-2 text-xs font-bold">
          {uiText("Session:")}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2"
          >
            {sessions.map((session) => (
              <option key={session._id} value={session.slug}>
                {session.name}
              </option>
            ))}
          </select>
        </label>

        {/* Year Filter Dropdown */}
        <label className="flex items-center gap-2 text-xs font-bold">
          <Calendar className="size-3.5 text-brand" />
          {uiText("Filter Year:")}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2 font-bold"
          >
            <option value="all">{uiText("All Years")}</option>
            {availableFilterYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-brand/5 p-3 text-sm">
        <span>
          {activeCategory === 'pyq'
            ? uiText("Author full CBSE PYQ question papers with step-by-step solutions like a blog post.")
            : activeCategory === 'sample-papers'
            ? uiText("Author official CBSE Sample Papers and model solutions using the rich blog editor.")
            : uiText("Manage board special and VVI questions.")}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleEditLanding} className="gap-1.5 font-bold cursor-pointer">
            <FileText className="size-3.5 text-brand" />
            <span>{uiText("Edit Landing Page")}</span>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={adminUrl(`resources?resourceType=${resourceType}${selectedClass?._id ? `&class=${selectedClass._id}` : ''}`)}>
              {uiText("Open related resources")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Papers & Questions List */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {CATEGORY_NAMES[activeCategory]}{uiText(" — Class ")}{selectedClass?.number} ({questions.length})
          </h3>
          {activeCategory !== 'syllabus' && (
            <Button
              type="button"
              size="sm"
              onClick={openNewModal}
              className="gap-1.5 font-bold bg-brand text-white hover:bg-brand/90 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>
                {activeCategory === 'pyq'
                  ? uiText("Add PYQ Paper & Solutions")
                  : activeCategory === 'sample-papers'
                  ? uiText("Add Sample Paper & Solutions")
                  : uiText("Add Questions")}
              </span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Loading questions...")}</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <p className="mb-3">{uiText("No papers or questions added in this category yet.")}</p>
            <Button size="sm" onClick={openNewModal} className="font-bold">
              <Plus className="size-3.5 mr-1" />
              {uiText("Create First Paper")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {questions.map((q) => (
              <div key={q._id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/10 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {q.year && (
                      <span className="rounded-md bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-black">
                        {activeCategory === 'pyq' ? `CBSE PYQ ${q.year}` : activeCategory === 'sample-papers' ? `CBSE Sample Paper ${q.year}` : q.year}
                      </span>
                    )}
                    {q.paperSet && (
                      <span className="rounded-md border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {q.paperSet}
                      </span>
                    )}
                    <span className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-bold">
                      {q.status || 'published'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground line-clamp-2">
                    {q.title?.en || q.title?.hi || (activeCategory === 'pyq' ? `CBSE PYQ ${q.year || ''}` : `CBSE Sample Paper ${q.year || ''}`)}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {(q.content?.en || q.text?.en || '').replace(/<[^>]+>/g, '').slice(0, 140) || uiText("Full paper with step-by-step solutions")}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={uiText("Edit in Blog CMS Editor")}
                    onClick={() => openEditModal(q)}
                    className="h-8 w-8 text-brand hover:text-brand hover:bg-brand/10 cursor-pointer"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(q._id)}
                    className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Blog CMS Question Paper Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 overflow-y-auto backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-2xl animate-in zoom-in-95 my-6 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b bg-muted/30 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-brand" />
                  <span>
                    {editingId ? uiText("Edit CBSE Question Paper & Solutions") : uiText("Create CBSE Question Paper & Solutions")}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {uiText("Author questions and answers together using the rich Blog CMS editor. LaTeX math ($...$), headings, bold, and images are supported.")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer text-xs"
              >
                ✕
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Top Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-xl border bg-muted/15">
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">{uiText("Class")}</label>
                  <select
                    disabled
                    value={selectedClass?._id || ''}
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold"
                  >
                    <option value={selectedClass?._id || ''}>
                      {uiText("Class ")}{selectedClass?.number}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">{uiText("Chapter (optional)")}</label>
                  <select
                    value={form.chapter}
                    onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer"
                  >
                    <option value="">{uiText("All Chapters / Whole Syllabus")}</option>
                    {chapters.map((ch) => (
                      <option key={ch._id} value={ch._id}>
                        {ch.number ? `Ch ${ch.number}: ` : ''}{ch.title?.en || ch.title?.hi || ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">{uiText("Paper Type")}</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      setForm({ ...form, category: nextCat });
                      if (!customTitle) {
                        setForm((f) => ({ ...f, category: nextCat, title: computeDynamicTitle(nextCat, f.year, f.paperSet) }));
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                  >
                    <option value="pyq">{uiText("Previous Year Question Paper (PYQ)")}</option>
                    <option value="sample_paper">{uiText("CBSE Sample Paper")}</option>
                    <option value="vvi">{uiText("VVI / Board Special")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">{uiText("Exam Year")}</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => handleYearOrSetChange(e.target.value, undefined)}
                    placeholder="2026"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">{uiText("Paper Set (optional)")}</label>
                  <input
                    type="text"
                    value={form.paperSet}
                    onChange={(e) => handleYearOrSetChange(undefined, e.target.value)}
                    placeholder={uiText("e.g. Set 1")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Dynamic / Custom Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">
                    {uiText("Paper Title (Auto-generated & Customizable)")}
                  </label>
                  {!customTitle && (
                    <span className="text-[11px] font-semibold text-brand">
                      {uiText("Dynamic auto-title enabled")}
                    </span>
                  )}
                </div>
                <L10nField
                  value={form.title}
                  onChange={(v) => {
                    setCustomTitle(true);
                    setForm({ ...form, title: v });
                  }}
                  placeholder={uiText("CBSE PYQ 2026 / सीबीएसई पीवाईक्यू 2026")}
                />
              </div>

              {/* PDF Document URL (Optional) */}
              <div>
                <label className="text-xs font-bold block mb-1 text-foreground">
                  {uiText("Official Question Paper PDF URL (Optional)")}
                </label>
                <input
                  type="url"
                  value={form.pdfUrl}
                  onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                  placeholder="https://.../cbse-class-10-maths-paper-2026.pdf"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              {/* The Single Rich-Text Blog CMS Editor for Questions and Answers Together */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-brand block">
                      {uiText("Complete Question Paper & Step-by-Step Solutions (Blog CMS Editor)")}
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      {uiText("Enter questions and their corresponding answers/solutions together in this one editor. Use Heading 3 for Questions and Heading 4 for Solutions.")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleInsertTemplate}
                    className="gap-1.5 text-xs font-bold cursor-pointer border-brand/30 hover:bg-brand/10 text-brand"
                  >
                    <Wand2 className="size-3.5" />
                    <span>{uiText("Insert Question & Solution Template")}</span>
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background overflow-hidden p-1 shadow-inner">
                  <RichL10nField
                    value={form.content}
                    onChange={(v) => setForm({ ...form, content: v })}
                    placeholder={uiText("Enter question statements and solutions together. E.g.\n<h3>Question 1</h3>\n<p>Find the roots...</p>\n<h4>Solution:</h4>\n<p>Step-by-step mathematical derivation...</p>")}
                  />
                </div>
              </div>

              {/* Automatic Question Classification & Review Panel */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.03] p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                      <span>{uiText("Automatic Question Classification & Mark Breakdown")}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {uiText("Questions are automatically detected and classified: VSA (1–2M), Short (2–3M), Long (5M), and Case Study (4–5M). Review or override marks and types below:")}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReprocess}
                    className="gap-1.5 text-xs font-bold border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>{uiText("Reprocess Classification")}</span>
                  </Button>
                </div>

                {/* Detected Questions Summary Chips */}
                {form.extractedQuestions?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
                    <span className="font-bold text-foreground">
                      {uiText("Detected Questions")}: <strong>{form.extractedQuestions.length}</strong>
                    </span>
                    <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 font-bold border border-blue-500/20">
                      VSA (1–2M): {form.extractedQuestions.filter(q => q.questionType === 'vsa' || q.marks <= 2).length}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 font-bold border border-emerald-500/20">
                      Short (2–3M): {form.extractedQuestions.filter(q => q.questionType === 'short' || q.marks === 3).length}
                    </span>
                    <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 font-bold border border-amber-500/20">
                      Long (5M): {form.extractedQuestions.filter(q => q.questionType === 'long' || (q.marks >= 4 && q.questionType !== 'case_study')).length}
                    </span>
                    <span className="rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 font-bold border border-purple-500/20">
                      Case Study: {form.extractedQuestions.filter(q => q.questionType === 'case_study').length}
                    </span>
                  </div>
                )}

                {/* Extracted Questions Review Cards */}
                {form.extractedQuestions?.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {form.extractedQuestions.map((qItem, idx) => {
                      const plainText = (qItem.questionHtml || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
                      const snippet = plainText.length > 110 ? `${plainText.substring(0, 110)}...` : plainText;

                      return (
                        <div
                          key={`extracted-${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card shadow-2xs hover:border-brand/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center justify-center rounded-lg bg-brand px-2 py-0.5 text-xs font-black text-white shrink-0">
                                #{qItem.questionNumber || idx + 1}
                              </span>
                              {qItem.needsReview ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20">
                                  <AlertTriangle className="size-2.5" />
                                  {uiText("Review Flagged")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                                  <Check className="size-2.5" />
                                  {uiText("Classified")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {snippet || uiText("Question content parsed from editor")}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <label className="text-[11px] font-bold text-muted-foreground">{uiText("Marks")}:</label>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={qItem.marks ?? 2}
                                onChange={(e) => handleUpdateExtracted(idx, { marks: Number(e.target.value) })}
                                className="w-14 h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold text-center"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <label className="text-[11px] font-bold text-muted-foreground">{uiText("Type")}:</label>
                              <select
                                value={qItem.questionType || 'short'}
                                onChange={(e) => handleUpdateExtracted(idx, { questionType: e.target.value })}
                                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold cursor-pointer"
                              >
                                <option value="vsa">{uiText("VSA (1–2 Marks)")}</option>
                                <option value="short">{uiText("Short (2–3 Marks)")}</option>
                                <option value="long">{uiText("Long (5 Marks)")}</option>
                                <option value="case_study">{uiText("Case Study (4–5 Marks)")}</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    {uiText("Type or paste questions in the editor above, then click 'Reprocess Classification' or insert the template to automatically extract and classify questions.")}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>{uiText("LaTeX formulas ($...$ or $$...$$), headings, lists & diagrams supported")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    {uiText("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="font-bold bg-brand text-white hover:bg-brand/90 cursor-pointer"
                  >
                    {saving ? uiText("Saving...") : editingId ? uiText("Update Paper") : uiText("Publish Question Paper")}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
