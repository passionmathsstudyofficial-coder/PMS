import { uiTemplate } from '@/lib/uiLanguage.js';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  Eye,
  Calendar,
  Layers,
  ListOrdered,
  HelpCircle,
  ChevronRight,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  UploadCloud,
  X,
  Settings,
  Search,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
  FileCode,
  Tag,
  ArrowRight,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, put, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';


export default function ReferenceBookManagerPage({ fixedBookSlug }) {
  useUiLanguage();
  const params = useParams();
  const bookSlug = fixedBookSlug || params.bookSlug || 'rs-aggarwal';

  // 1. Core Data State
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('2026-27');

  // Hierarchy Data
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Loading States
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Search and Filter for Questions Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [questionStatusFilter, setQuestionStatusFilter] = useState('all');
  const [solutionStatusFilter, setSolutionStatusFilter] = useState('all');

  // 2. Modals State
  // Book Settings / New Book Modal
  const [bookModal, setBookModal] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: { en: '', hi: '' },
    slug: '',
    author: '',
    publisher: '',
    edition: '2026-27 Edition',
    description: { en: '', hi: '' },
    coverUrl: '',
    category: 'reference',
    availableClasses: [6, 7, 8, 9, 10, 11, 12],
    status: 'published',
    isVisible: true,
  });

  // Chapter Modal
  const [chapterModal, setChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapterForm, setChapterForm] = useState({
    number: 1,
    title: { en: '', hi: '' },
    shortDescription: { en: '', hi: '' },
    status: 'published',
  });

  // Exercise Modal
  const [exerciseModal, setExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseForm, setExerciseForm] = useState({
    number: '1.1',
    title: { en: '', hi: '' },
    status: 'published',
  });

  // Quick image preview lightbox in table
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // 1. Initial Load: Books, Classes, Sessions
  useEffect(() => {
    async function init() {
      setLoadingBooks(true);
      try {
        const [booksRes, classesRes, sessionsRes] = await Promise.all([
          get('/content/books', { scope: 'admin', limit: 50 }),
          get('/content/classes', { scope: 'admin', limit: 20 }),
          get('/content/sessions'),
        ]);

        const dbBooks = booksRes.items || [];
        setBooks(dbBooks);
        const match = dbBooks.find((b) => b.slug === bookSlug) || dbBooks[0] || null;
        setSelectedBook(match);

        const dbClasses = (classesRes.items || []).sort((a, b) => b.number - a.number);
        setClasses(dbClasses);

        const available = match?.availableClasses?.length ? match.availableClasses : [6, 7, 8, 9, 10, 11, 12];
        const supported = dbClasses.filter((c) => available.includes(c.number));
        setSelectedClass(supported.find((c) => c.number === 12) || supported[0] || dbClasses[0] || null);

        const dbSessions = sessionsRes.items || [];
        setSessions(dbSessions);
        const cur = dbSessions.find((s) => s.isCurrent)?.slug || '2026-27';
        setSelectedSession(cur);
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoadingBooks(false);
      }
    }
    init();
  }, [bookSlug]);

  // Keep selectedClass valid when book changes
  useEffect(() => {
    if (!selectedBook || !classes.length) return;
    const available = selectedBook.availableClasses?.length ? selectedBook.availableClasses : [6, 7, 8, 9, 10, 11, 12];
    const supported = classes.filter((c) => available.includes(c.number));
    if (!supported.some((c) => c._id === selectedClass?._id)) {
      setSelectedClass(supported.find((c) => c.number === 12) || supported[0] || null);
    }
  }, [selectedBook, classes]);

  // 2. Load Chapters when Book, Class, or Session changes
  useEffect(() => {
    if (!selectedBook?._id || !selectedClass?._id) return;
    async function loadChapters() {
      setLoadingChapters(true);
      setSelectedChapter(null);
      setSelectedExercise(null);
      setExercises([]);
      setQuestions([]);
      try {
        const res = await get('/content/chapters', {
          scope: 'admin',
          book: selectedBook._id,
          class: selectedClass._id,
          academicSession: selectedSession,
          limit: 100,
        });
        const chList = (res.items || []).sort((a, b) => a.number - b.number);
        setChapters(chList);
        if (chList.length > 0) {
          setSelectedChapter(chList[0]);
        }
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoadingChapters(false);
      }
    }
    loadChapters();
  }, [selectedBook?._id, selectedClass?._id, selectedSession]);

  // 3. Load Exercises when Chapter changes
  useEffect(() => {
    if (!selectedChapter?._id) {
      setExercises([]);
      setSelectedExercise(null);
      setQuestions([]);
      return;
    }
    async function loadExercises() {
      setLoadingExercises(true);
      setSelectedExercise(null);
      setQuestions([]);
      try {
        const res = await get('/content/exercises', {
          scope: 'admin',
          chapter: selectedChapter._id,
          academicSession: selectedSession,
          limit: 100,
        });
        const exList = (res.items || []).sort((a, b) =>
          String(a.number).localeCompare(String(b.number), undefined, { numeric: true }),
        );
        setExercises(exList);
        if (exList.length > 0) {
          setSelectedExercise(exList[0]);
        }
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoadingExercises(false);
      }
    }
    loadExercises();
  }, [selectedChapter?._id]);

  // 4. Load Questions when Exercise changes
  const reloadQuestions = async () => {
    if (!selectedExercise?._id) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await get('/content/questions', {
        scope: 'admin',
        exercise: selectedExercise._id,
        academicSession: selectedSession,
        limit: 200,
      });
      const qList = (res.items || []).sort((a, b) =>
        String(a.number).localeCompare(String(b.number), undefined, { numeric: true }),
      );
      setQuestions(qList);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    reloadQuestions();
  }, [selectedExercise?._id, selectedSession]);



  // ----------------------------------------------------
  // BOOK CRUD & SETTINGS
  // ----------------------------------------------------
  const handleOpenBookModal = (editing = false) => {
    setIsEditingBook(editing);
    if (editing && selectedBook) {
      setBookForm({
        title: selectedBook.title || { en: '', hi: '' },
        slug: selectedBook.slug || '',
        author: selectedBook.author || '',
        publisher: selectedBook.publisher || '',
        edition: selectedBook.edition || '2026-27 Edition',
        description: selectedBook.description || { en: '', hi: '' },
        coverUrl: selectedBook.coverImage?.url || selectedBook.coverUrl || '',
        category: selectedBook.category || 'reference',
        availableClasses: selectedBook.availableClasses?.length ? selectedBook.availableClasses : [6, 7, 8, 9, 10, 11, 12],
        status: selectedBook.status || 'published',
        isVisible: selectedBook.isVisible !== false,
      });
    } else {
      setBookForm({
        title: { en: '', hi: '' },
        slug: '',
        author: '',
        publisher: '',
        edition: '2026-27 Edition',
        description: { en: '', hi: '' },
        coverUrl: '',
        category: 'reference',
        availableClasses: [6, 7, 8, 9, 10, 11, 12],
        status: 'published',
        isVisible: true,
      });
    }
    setBookModal(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (isEditingBook && selectedBook?._id) {
        const updated = await put(`/content/books/${selectedBook._id}`, bookForm);
        toast.success(uiText('Reference Book updated successfully'));
        setSelectedBook(updated);
        setBooks((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
      } else {
        const created = await post('/content/books', bookForm);
        toast.success(uiText('New Reference Book created successfully'));
        setBooks((prev) => [created, ...prev]);
        setSelectedBook(created);
      }
      setBookModal(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  // ----------------------------------------------------
  // CHAPTER CRUD
  // ----------------------------------------------------
  const handleOpenChapterModal = (ch = null) => {
    if (ch) {
      setEditingChapterId(ch._id);
      setChapterForm({
        number: ch.number,
        title: ch.title || { en: '', hi: '' },
        shortDescription: ch.shortDescription || { en: '', hi: '' },
        status: ch.status || 'published',
      });
    } else {
      setEditingChapterId(null);
      setChapterForm({
        number: (chapters.length || 0) + 1,
        title: { en: '', hi: '' },
        shortDescription: { en: '', hi: '' },
        status: 'published',
      });
    }
    setChapterModal(true);
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!selectedBook?._id || !selectedClass?._id) return;
    try {
      const payload = {
        number: Number(chapterForm.number),
        title: chapterForm.title,
        shortDescription: chapterForm.shortDescription,
        book: selectedBook._id,
        class: selectedClass._id,
        subject:
          selectedClass.subjects?.find((s) => /math/i.test(`${s.slug || ''} ${s.name?.en || ''}`))?._id ||
          selectedClass.subjects?.[0]?._id ||
          selectedClass.subjects?.[0],
        academicSession: selectedSession,
        status: chapterForm.status || 'published',
      };

      if (editingChapterId) {
        const updated = await put(`/content/chapters/${editingChapterId}`, payload);
        toast.success(uiText('Chapter updated'));
        setChapters((prev) => prev.map((c) => (c._id === editingChapterId ? updated : c)));
        if (selectedChapter?._id === editingChapterId) setSelectedChapter(updated);
      } else {
        const created = await post('/content/chapters', payload);
        toast.success(uiText('Chapter added'));
        setChapters((prev) => [...prev, created]);
        setSelectedChapter(created);
      }
      setChapterModal(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteChapter = async (ch) => {
    if (!window.confirm(`Delete Chapter ${ch.number}: "${ch.title?.en || ''}"? This will delete its exercises and questions.`)) return;
    try {
      await del(`/content/chapters/${ch._id}`);
      toast.success(uiText('Chapter deleted'));
      setChapters((prev) => prev.filter((c) => c._id !== ch._id));
      if (selectedChapter?._id === ch._id) {
        setSelectedChapter(chapters.find((c) => c._id !== ch._id) || null);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  // ----------------------------------------------------
  // EXERCISE CRUD
  // ----------------------------------------------------
  const handleOpenExerciseModal = (ex = null) => {
    if (ex) {
      setEditingExerciseId(ex._id);
      setExerciseForm({
        number: ex.number,
        title: ex.title || { en: '', hi: '' },
        status: ex.status || 'published',
      });
    } else {
      setEditingExerciseId(null);
      setExerciseForm({
        number: `${selectedChapter?.number || 1}.${exercises.length + 1}`,
        title: { en: '', hi: '' },
        status: 'published',
      });
    }
    setExerciseModal(true);
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    if (!selectedChapter?._id) return;
    try {
      const payload = {
        number: String(exerciseForm.number),
        title: exerciseForm.title,
        chapter: selectedChapter._id,
        class: selectedClass._id,
        academicSession: selectedSession,
        status: exerciseForm.status || 'published',
      };

      if (editingExerciseId) {
        const updated = await put(`/content/exercises/${editingExerciseId}`, payload);
        toast.success(uiText('Exercise updated'));
        setExercises((prev) => prev.map((e) => (e._id === editingExerciseId ? updated : e)));
        if (selectedExercise?._id === editingExerciseId) setSelectedExercise(updated);
      } else {
        const created = await post('/content/exercises', payload);
        toast.success(uiText('Exercise created'));
        setExercises((prev) => [...prev, created]);
        setSelectedExercise(created);
      }
      setExerciseModal(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteExercise = async (ex) => {
    if (!window.confirm(`Delete Exercise ${ex.number}? All its questions will be removed.`)) return;
    try {
      await del(`/content/exercises/${ex._id}`);
      toast.success(uiText('Exercise deleted'));
      setExercises((prev) => prev.filter((e) => e._id !== ex._id));
      if (selectedExercise?._id === ex._id) {
        setSelectedExercise(exercises.find((e) => e._id !== ex._id) || null);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  // ----------------------------------------------------
  // QUESTION CRUD (MOST IMPORTANT FEATURE)
  // ----------------------------------------------------


  const handleToggleQuestionStatus = async (q) => {
    const nextStatus = q.status === 'published' ? 'draft' : 'published';
    try {
      await patch(`/content/questions/${q._id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'published' ? uiText('Question Published') : uiText('Question Un-published (Draft)'));
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm(`Delete Question ${q.number}? This will permanently remove the question and its solution.`)) return;
    try {
      await del(`/content/questions/${q._id}`);
      toast.success(uiText('Question deleted'));
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDuplicateQuestion = async (q) => {
    try {
      await post(`/content/questions/${q._id}/duplicate`, {});
      toast.success(uiText('Question duplicated'));
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };



  const handleToggleSolutionStatus = async (q) => {
    if (!q.solution?._id) {
      toast.error(uiText('No solution exists yet for this question. Click "Edit Solution" to write one.'));
      return;
    }
    const nextStatus = q.solution.status === 'published' ? 'draft' : 'published';
    try {
      await patch(`/content/solutions/${q.solution._id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'published' ? uiText('Solution Published') : uiText('Solution set to Draft'));
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // Filtered Questions for Dashboard Table
  const filteredQuestions = questions.filter((q) => {
    // Search text / number
    if (searchQuery.trim()) {
      const qNumMatch = String(q.number).toLowerCase().includes(searchQuery.toLowerCase());
      const qTextEnMatch = (q.text?.en || '').toLowerCase().includes(searchQuery.toLowerCase());
      const qTextHiMatch = (q.text?.hi || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!qNumMatch && !qTextEnMatch && !qTextHiMatch) return false;
    }
    // Difficulty
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    // Question Status
    if (questionStatusFilter !== 'all' && q.status !== questionStatusFilter) return false;
    // Solution Status
    if (solutionStatusFilter !== 'all') {
      if (solutionStatusFilter === 'published' && q.solution?.status !== 'published') return false;
      if (solutionStatusFilter === 'draft' && (!q.solution || q.solution.status !== 'draft')) return false;
      if (solutionStatusFilter === 'missing' && q.solution) return false;
    }
    return true;
  });

  const getBookDisplayName = () => {
    if (!selectedBook) return 'Reference Book Solutions';
    return selectedBook.title?.en || selectedBook.slug?.toUpperCase();
  };

  const handleEditLanding = async () => {
    try {
      const key = selectedBook?.slug ? `reference-solutions/${selectedBook.slug}` : 'reference-solutions';
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
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Panel
          title={uiTemplate`${getBookDisplayName()} Solutions CMS`}
          description={uiText(
            'Complete Manual Educational Authoring Workflow: Book → Class → Subject → Chapter → Exercise → Question → Multiple Solution Methods (Standard & Shortcut).'
          )}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditLanding}
            className="h-9 gap-1.5 font-bold text-xs cursor-pointer"
          >
            <FileText className="size-3.5 text-brand" />
            {uiText('Edit Landing Page')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenBookModal(true)}
            className="h-9 gap-1.5 font-bold text-xs cursor-pointer"
          >
            <Settings className="size-3.5 text-brand" />
            {uiText('Book Settings & Classes')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenBookModal(false)}
            className="h-9 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="size-3.5" />
            {uiText('Add New Reference Book')}
          </Button>
        </div>
      </div>

      {/* Top Filter Bar: Book, Class, Session */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
        {/* Book Selector */}
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-brand" />
          <span className="text-xs font-bold text-foreground">{uiText('Book')}:</span>
          <select
            value={selectedBook?.slug || bookSlug}
            onChange={(e) => {
              const b = books.find((x) => x.slug === e.target.value);
              setSelectedBook(b);
            }}
            className="h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-brand"
          >
            {books.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title?.en || b.slug} {b.author ? uiTemplate`(${b.author})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selector Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{uiText('Class')}:</span>
          <div className="flex gap-1 overflow-x-auto">
            {[12, 11, 10, 9, 8, 7, 6].map((num) => {
              const isAvailable = (selectedBook?.availableClasses || [6, 7, 8, 9, 10, 11, 12]).includes(num);
              const classObj = classes.find((c) => c.number === num);
              const isSelected = selectedClass?.number === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => classObj && setSelectedClass(classObj)}
                  className={cn(
                    'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : isAvailable
                        ? 'border-border bg-background text-foreground hover:bg-muted'
                        : 'border-border/40 bg-muted/30 text-muted-foreground/60 cursor-not-allowed line-through'
                  )}
                  title={isAvailable ? uiTemplate`Class ${num}` : uiTemplate`Class ${num} not enabled for this book`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Selector */}
        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="size-4 text-brand" />
          <span className="text-xs font-bold text-foreground">{uiText('Session')}:</span>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-brand"
          >
            {sessions.map((s) => (
              <option key={s.slug || s.name || s} value={s.slug || s.name || s}>
                {s.name || s} {s.isCurrent ? uiText('(Current)') : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-Column Hierarchy Explorer */}
      <div className="grid gap-4 lg:grid-cols-12 min-h-[620px]">
        {/* Column 1: Chapters (col-span-3) */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-brand" />
              <span>{uiText("Chapters (")}{chapters.length})</span>
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenChapterModal(null)}
              className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
            >
              <Plus className="size-3" />{uiText(" Add")}</Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
            {loadingChapters ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{uiText("Loading chapters...")}</div>
            ) : chapters.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{uiText("No chapters added for this book & class. Click \"+ Add\" to create Chapter 1.")}</div>
            ) : (
              chapters.map((ch) => {
                const isSelected = selectedChapter?._id === ch._id;
                return (
                  <div
                    key={ch._id}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-all border',
                      isSelected
                        ? 'bg-brand/10 border-brand/50 text-brand font-bold'
                        : 'border-transparent hover:bg-muted text-foreground'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedChapter(ch)}
                      className="flex-1 text-left text-xs font-semibold truncate cursor-pointer pr-1"
                    >
                      <span className="font-mono text-brand font-bold mr-1.5">{uiText("Ch ")}{ch.number}:</span>
                      <span>{ch.title?.en || ch.title?.hi || uiTemplate`Chapter ${ch.number}`}</span>
                    </button>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Link
                        to={adminUrl(`chapters/${ch._id}`)}
                        className="p-1 hover:text-brand cursor-pointer"
                        title={uiText("Open Full Chapter Editor (Image, Video, Formulas, Notes, PDF, SEO)")}
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChapterModal(ch);
                        }}
                        className="p-1 hover:text-brand cursor-pointer"
                        title={uiText("Edit Chapter")}
                      >
                        <Edit2 className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(ch);
                        }}
                        className="p-1 hover:text-destructive cursor-pointer"
                        title={uiText("Delete Chapter")}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Exercises (col-span-3) */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ListOrdered className="size-3.5 text-brand" />
              <span>{uiText("Exercises (")}{exercises.length})</span>
            </h3>
            {selectedChapter && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenExerciseModal(null)}
                className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
              >
                <Plus className="size-3" />{uiText(" Add")}</Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
            {!selectedChapter ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{uiText("Select a chapter first")}</div>
            ) : loadingExercises ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{uiText("Loading exercises...")}</div>
            ) : exercises.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{uiText("No exercises found. Click \"+ Add\" to add Exercise ")}{selectedChapter.number}.1.
              </div>
            ) : (
              exercises.map((ex) => {
                const isSelected = selectedExercise?._id === ex._id;
                return (
                  <div
                    key={ex._id}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-all border',
                      isSelected
                        ? 'bg-brand/10 border-brand/50 text-brand font-bold'
                        : 'border-transparent hover:bg-muted text-foreground'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedExercise(ex)}
                      className="flex-1 text-left text-xs font-semibold cursor-pointer truncate pr-1"
                    >
                      <span className="font-mono font-bold mr-1.5">{uiText("Ex ")}{ex.number}</span>
                      {ex.title?.en && <span className="text-muted-foreground text-[11px]">({ex.title.en})</span>}
                    </button>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Link
                        to={adminUrl(`exercises/${ex._id}`)}
                        className="p-1 hover:text-brand cursor-pointer"
                        title={uiText("Open Full Exercise Editor")}
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExerciseModal(ex);
                        }}
                        className="p-1 hover:text-brand cursor-pointer"
                        title={uiText("Edit Exercise")}
                      >
                        <Edit2 className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExercise(ex);
                        }}
                        className="p-1 hover:text-destructive cursor-pointer"
                        title={uiText("Delete Exercise")}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Exercise Questions Dashboard Table (col-span-6) */}
        <div className="lg:col-span-6 rounded-2xl border bg-card p-4 shadow-xs flex flex-col">
          {/* Dashboard Header */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b mb-3 gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-brand" />
                <span>{uiText("Questions & Solutions ")}{selectedExercise ? uiTemplate`· Ex ${selectedExercise.number}` : ''} ({questions.length})
                </span>
              </h3>
            </div>
            {selectedExercise && (
              <Button asChild size="sm" className="h-8 px-3.5 text-xs gap-1.5 font-bold cursor-pointer bg-brand text-white hover:bg-brand/90">
                <Link to={adminUrl(`questions/new?book=${selectedBook?._id || ''}&class=${selectedClass?._id || ''}&chapter=${selectedChapter?._id || ''}&exercise=${selectedExercise?._id || ''}&session=${selectedSession}`)}>
                  <Plus className="size-3.5" />
                  <span>{uiText('Create New Question (Full CMS Editor)')}</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Filter & Search Bar */}
          {selectedExercise && questions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 pb-3 border-b">
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder={uiText("Search Q# or text...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Question Status Filter */}
              <div>
                <select
                  value={questionStatusFilter}
                  onChange={(e) => setQuestionStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                >
                  <option value="all">{uiText("Q: All")}</option>
                  <option value="published">{uiText("Q: Published")}</option>
                  <option value="draft">{uiText("Q: Draft")}</option>
                </select>
              </div>

              {/* Solution Status Filter */}
              <div>
                <select
                  value={solutionStatusFilter}
                  onChange={(e) => setSolutionStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                >
                  <option value="all">{uiText("Sol: All")}</option>
                  <option value="published">{uiText("Sol: Published")}</option>
                  <option value="draft">{uiText("Sol: Draft")}</option>
                  <option value="missing">{uiText("Sol: Missing")}</option>
                </select>
              </div>
            </div>
          )}

          {/* Questions Table / List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[550px]">
            {!selectedExercise ? (
              <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Select an exercise to manage its questions and step-by-step solutions")}</div>
            ) : loadingQuestions ? (
              <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Loading questions...")}</div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl m-2">
                <p className="font-semibold text-foreground mb-1">{uiText("No questions created yet in Exercise ")}{selectedExercise.number}</p>
                <p className="mb-3 text-[11px]">{uiText("Type question statements or upload scanned question images, then author step-by-step solutions.")}</p>
                <Button asChild size="sm" className="font-bold">
                  <Link to={adminUrl(`questions/new?book=${selectedBook?._id || ''}&class=${selectedClass?._id || ''}&chapter=${selectedChapter?._id || ''}&exercise=${selectedExercise?._id || ''}&session=${selectedSession}`)}>
                    <Plus className="size-3.5 mr-1" /> {uiText('Create Question 1 (Full CMS Editor)')}
                  </Link>
                </Button>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">{uiText("No questions match the current search or filters.")}</div>
            ) : (
              filteredQuestions.map((q) => {
                const hasSolution = Boolean(q.solution);
                const isSolPublished = q.solution?.status === 'published';
                const methodsCount = q.solution?.methodsCount || (q.solution?.methods?.length) || 1;
                const hasImageAttachment = (q.attachments || []).some((a) => a.placement !== 'solution');
                const firstImage = (q.attachments || []).find((a) => a.placement !== 'solution')?.media;

                return (
                  <div
                    key={q._id}
                    className="rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs hover:border-brand/40 transition-colors"
                  >
                    {/* Top Row: Q Number, Badges, Status Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-brand text-white font-extrabold text-xs px-2 py-0.5 font-mono">{uiText("Q ")}{q.number}
                        </span>

                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                          {q.questionType || uiText('subjective')}
                        </span>

                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded',
                            q.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : q.difficulty === 'hard' || q.difficulty === 'hots'
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/40'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {q.difficulty || uiText('medium')} · {q.marks || 2}{uiText("M")}</span>

                        {/* Language Badges */}
                        <div className="flex items-center gap-0.5 ml-1">
                          {q.text?.en && (
                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1 rounded">{uiText("EN")}</span>
                          )}
                          {q.text?.hi && (
                            <span className="text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-1 rounded">{uiText("HI")}</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badges with Click-to-Toggle */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {/* Question Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionStatus(q)}
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border',
                            q.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
                          )}
                          title={uiText("Click to toggle Question Publication status")}
                        >{uiText("Q: ")}{q.status === 'published' ? uiText('Published') : uiText('Draft')}
                        </button>

                        {/* Solution Status Toggle */}
                        {hasSolution ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSolutionStatus(q)}
                            className={cn(
                              'px-2 py-0.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border',
                              isSolPublished
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
                            )}
                            title={uiText("Click to toggle Solution Publication status")}
                          >{uiText("Sol: ")}{isSolPublished ? uiTemplate`Published (${methodsCount}M)` : uiText('Draft')}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-muted text-muted-foreground border border-border">{uiText("Sol: None")}</span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Question Content Snippet & Scanned Image Thumbnail */}
                    <div className="flex items-start gap-3 my-2 text-xs text-foreground/90 font-medium">
                      {hasImageAttachment && firstImage?.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(firstImage.url)}
                          className="shrink-0 relative group rounded-md border overflow-hidden size-12 bg-muted/30 cursor-pointer"
                          title={uiText("Click to zoom scanned question image")}
                        >
                          <img src={firstImage.url} alt={uiText("Question Diagram")} className="size-full object-cover" />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">{uiText("Zoom")}</span>
                        </button>
                      )}

                      <div className="flex-1 line-clamp-2">
                        {q.text?.en || q.text?.hi ? (
                          <div dangerouslySetInnerHTML={{ __html: q.text?.en || q.text?.hi }} />
                        ) : hasImageAttachment ? (
                          <span className="text-muted-foreground italic flex items-center gap-1">
                            <ImageIcon className="size-3" />{uiText(" [Scanned question page / diagram attached]")}</span>
                        ) : (
                          <span className="text-muted-foreground italic">{uiText("[No statement typed yet]")}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[11px] gap-2">
                      <div className="flex items-center gap-2">
                        {/* Edit Question */}
                        <Link
                          to={adminUrl(`questions/${q._id}`)}
                          className="font-bold text-foreground hover:text-brand inline-flex items-center gap-1 cursor-pointer"
                          title={uiText("Open in Full Question Editor")}
                        >
                          <Edit2 className="size-3" />
                          <span>{uiText("Edit Question")}</span>
                        </Link>

                        {/* Edit / Write Solution */}
                        <Link
                          to={adminUrl(`questions/${q._id}`)}
                          className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer ml-2"
                          title={uiText("Open Full Solution Builder with Multiple Methods")}
                        >
                          <Sparkles className="size-3" />
                          <span>{hasSolution ? uiText('Edit Solution & Methods') : uiText('+ Write Solution')}</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Live Preview Link */}
                        <Link
                          to={`/reference-solutions/${selectedBook?.slug}/class-${selectedClass?.number}/${selectedChapter?.slug}/${selectedExercise?.slug}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-brand inline-flex items-center gap-1 font-semibold"
                          title={uiText("Preview student view")}
                        >
                          <span>{uiText("Live")}</span>
                          <ExternalLink className="size-3" />
                        </Link>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                          title={uiText("Duplicate Question")}
                        >
                          <Copy className="size-3" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 cursor-pointer"
                          title={uiText("Delete Question")}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>





      {/* ==================================================== */}
      {/* MODAL 3: BOOK SETTINGS & CLASS ACCESS CONFIGURATION  */}
      {/* ==================================================== */}
      {bookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="text-base font-extrabold text-foreground">
                {isEditingBook ? uiTemplate`Edit Reference Book: ${bookForm.title?.en}` : uiTemplate`Add New Reference Book`}
              </h3>
              <button
                type="button"
                onClick={() => setBookModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Book Name (English) *")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. RS Aggarwal Solutions")}
                  value={bookForm.title.en}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Book Name (Hindi)")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. आर.एस. अग्रवाल गणित समाधान")}
                  value={bookForm.title.hi}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText("Author Name *")}</label>
                  <input
                    type="text"
                    placeholder={uiText("e.g. R.S. Aggarwal")}
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{uiText("Publisher")}</label>
                  <input
                    type="text"
                    placeholder={uiText("e.g. Bharati Bhawan")}
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText("Edition / Publication")}</label>
                  <input
                    type="text"
                    placeholder={uiText("e.g. 2026-27 Edition")}
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{uiText("Status")}</label>
                  <select
                    value={bookForm.status}
                    onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold text-brand"
                  >
                    <option value="published">{uiText("Published")}</option>
                    <option value="draft">{uiText("Draft (Private)")}</option>
                  </select>
                </div>
              </div>

              {/* Available Classes Multi-Select */}
              <div>
                <label className="text-xs font-bold block mb-1.5">{uiText("Available Classes (Select classes enabled for this book) *")}</label>
                <div className="flex flex-wrap gap-2">
                  {[6, 7, 8, 9, 10, 11, 12].map((num) => {
                    const checked = (bookForm.availableClasses || []).includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          const cur = bookForm.availableClasses || [];
                          const updated = checked ? cur.filter((x) => x !== num) : [...cur, num].sort((a, b) => a - b);
                          setBookForm({ ...bookForm, availableClasses: updated });
                        }}
                        className={cn(
                          'h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                          checked
                            ? 'bg-brand text-white border-brand shadow-xs'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                        )}
                      >{uiText("Class ")}{num} {checked ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setBookModal(false)}>{uiText("Cancel")}</Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  <Save className="size-3.5 mr-1" />
                  {isEditingBook ? uiText('Update Book Settings') : uiText('Create Book')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CHAPTER MODAL                               */}
      {/* ==================================================== */}
      {chapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingChapterId ? uiText('Edit Chapter') : uiTemplate`Add Chapter to ${getBookDisplayName()}`}
            </h3>
            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Chapter Number *")}</label>
                <input
                  type="number"
                  value={chapterForm.number}
                  onChange={(e) => setChapterForm({ ...chapterForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Chapter Title (English) *")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. Relations and Functions")}
                  value={chapterForm.title.en}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Chapter Title (Hindi)")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. सम्बन्ध एवं फलन")}
                  value={chapterForm.title.hi}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setChapterModal(false)}>{uiText("Cancel")}</Button>
                <Button type="submit" size="sm" className="font-bold">{uiText("Save Chapter")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: EXERCISE MODAL                              */}
      {/* ==================================================== */}
      {exerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingExerciseId ? uiText('Edit Exercise') : uiTemplate`Add Exercise to Chapter ${selectedChapter?.number}`}
            </h3>
            <form onSubmit={handleSaveExercise} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Exercise Number / Code *")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. 1.1, 1.2, Miscellaneous")}
                  value={exerciseForm.number}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText("Exercise Title (Optional)")}</label>
                <input
                  type="text"
                  placeholder={uiText("e.g. Types of Relations")}
                  value={exerciseForm.title.en}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: { ...exerciseForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setExerciseModal(false)}>{uiText("Cancel")}</Button>
                <Button type="submit" size="sm" className="font-bold">{uiText("Save Exercise")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Preview Image Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-background p-2">
            <img src={previewImageModal} alt={uiText("Zoom Preview")} className="max-h-[85vh] object-contain mx-auto" />
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 text-white p-2"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
