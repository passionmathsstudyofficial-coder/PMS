import { uiTemplate } from '@/lib/uiLanguage.js';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ListOrdered,
  HelpCircle,
  Settings,
  Search,
  Copy,
  Sparkles,
  ExternalLink,
  FileText,
  GraduationCap,
  Star,
  NotebookPen,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, put, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';

const CANONICAL_BOOKS = ['rs-aggarwal', 'rd-sharma', 'ml-aggarwal', 'kc-sinha-maths'];

export default function ReferenceBookManagerPage({ fixedBookSlug }) {
  useUiLanguage();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize book slug
  let rawSlug = fixedBookSlug || params.bookSlug || 'rs-aggarwal';
  if (rawSlug === 'kc-sinha') rawSlug = 'kc-sinha-maths';
  const bookSlug = rawSlug;

  // Active Tab
  const activeTab = searchParams.get('tab') || 'content';
  const setActiveTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next);
  };

  // 1. Core Data State
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [bookClasses, setBookClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('2026-27');

  // Hierarchy Data
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [notes, setNotes] = useState([]);
  const [importantQuestions, setImportantQuestions] = useState([]);

  // Loading States
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingIqs, setLoadingIqs] = useState(false);

  // Search and Filter for Questions Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [questionStatusFilter, setQuestionStatusFilter] = useState('all');
  const [solutionStatusFilter, setSolutionStatusFilter] = useState('all');

  // Modals State
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

  const [chapterModal, setChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapterForm, setChapterForm] = useState({
    number: 1,
    title: { en: '', hi: '' },
    shortDescription: { en: '', hi: '' },
    status: 'published',
  });

  const [exerciseModal, setExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseForm, setExerciseForm] = useState({
    number: '1.1',
    title: { en: '', hi: '' },
    status: 'published',
  });

  const [topicModal, setTopicModal] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [topicForm, setTopicForm] = useState({
    number: 1,
    title: { en: '', hi: '' },
    shortDescription: { en: '', hi: '' },
    notes: { en: '', hi: '' },
    difficulty: 'easy',
    estimatedTime: { en: '30 mins', hi: '30 मिनट' },
    status: 'published',
    isVisible: true,
  });

  const [noteModal, setNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteForm, setNoteForm] = useState({
    title: { en: '', hi: '' },
    chapter: '',
    category: 'formula_sheet',
    summary: { en: '', hi: '' },
    content: { en: '', hi: '' },
    pdfUrl: '',
    status: 'published',
    isVisible: true,
  });

  const [iqModal, setIqModal] = useState(false);
  const [editingIqId, setEditingIqId] = useState(null);
  const [iqForm, setIqForm] = useState({
    title: { en: '', hi: '' },
    number: '1',
    chapter: '',
    text: { en: '', hi: '' },
    answer: { en: '', hi: '' },
    category: 'vvi',
    difficulty: 'medium',
    marks: 4,
    year: 2026,
    paperSet: 'Set 1',
    status: 'published',
    isVisible: true,
  });

  const [classModal, setClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classForm, setClassForm] = useState({
    name: { en: '', hi: '' },
    description: { en: '', hi: '' },
    status: 'published',
    isVisible: true,
    seoTitle: '',
    seoDescription: '',
  });

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

        const allBooks = booksRes.items || [];
        const canonical = allBooks.filter((b) => CANONICAL_BOOKS.includes(b.slug));
        const finalBooks = canonical.length > 0 ? canonical : allBooks;
        setBooks(finalBooks);

        const match = finalBooks.find((b) => b.slug === bookSlug) || finalBooks[0] || null;
        setSelectedBook(match);

        const dbClasses = (classesRes.items || []).sort((a, b) => b.number - a.number);
        setClasses(dbClasses);
        setSelectedClass(dbClasses.find((c) => c.number === 10) || dbClasses[0] || null);

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

  // Load BookClasses for selected book
  const reloadBookClasses = async () => {
    if (!selectedBook?._id) return;
    try {
      const res = await get('/content/book-classes', {
        scope: 'admin',
        book: selectedBook._id,
        limit: 50,
      });
      setBookClasses(res.items || []);
    } catch (err) {
      toast.apiError(err);
    }
  };

  useEffect(() => {
    reloadBookClasses();
  }, [selectedBook?._id]);

  // Load Chapters
  const reloadChapters = async () => {
    if (!selectedBook?._id || !selectedClass?._id) return;
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
  };

  useEffect(() => {
    reloadChapters();
  }, [selectedBook?._id, selectedClass?._id, selectedSession]);

  // Load Exercises
  const reloadExercises = async () => {
    if (!selectedChapter?._id) {
      setExercises([]);
      setSelectedExercise(null);
      setQuestions([]);
      return;
    }
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
  };

  useEffect(() => {
    reloadExercises();
  }, [selectedChapter?._id]);

  // Load Questions
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

  // Load Topics
  const reloadTopics = async () => {
    if (!selectedBook?._id || !selectedClass?._id) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    try {
      const qParams = {
        scope: 'admin',
        book: selectedBook._id,
        class: selectedClass._id,
        limit: 100,
      };
      if (selectedChapter?._id) qParams.chapter = selectedChapter._id;
      const res = await get('/content/topics', qParams);
      setTopics(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'topics' || activeTab === 'content') {
      reloadTopics();
    }
  }, [selectedBook?._id, selectedClass?._id, selectedChapter?._id, activeTab]);

  // Load Notes
  const reloadNotes = async () => {
    if (!selectedBook?._id || !selectedClass?._id) {
      setNotes([]);
      return;
    }
    setLoadingNotes(true);
    try {
      const qParams = {
        scope: 'admin',
        book: selectedBook._id,
        class: selectedClass._id,
        academicSession: selectedSession,
        limit: 100,
      };
      if (selectedChapter?._id) qParams.chapter = selectedChapter._id;
      const res = await get('/content/notes', qParams);
      setNotes(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notes') {
      reloadNotes();
    }
  }, [selectedBook?._id, selectedClass?._id, selectedChapter?._id, selectedSession, activeTab]);

  // Load Important Questions
  const reloadIqs = async () => {
    if (!selectedBook?._id || !selectedClass?._id) {
      setImportantQuestions([]);
      return;
    }
    setLoadingIqs(true);
    try {
      const qParams = {
        scope: 'admin',
        book: selectedBook._id,
        class: selectedClass._id,
        academicSession: selectedSession,
        limit: 100,
      };
      if (selectedChapter?._id) qParams.chapter = selectedChapter._id;
      const res = await get('/content/important-questions', qParams);
      setImportantQuestions(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoadingIqs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'important-questions') {
      reloadIqs();
    }
  }, [selectedBook?._id, selectedClass?._id, selectedChapter?._id, selectedSession, activeTab]);

  const defaultSubject =
    selectedClass?.subjects?.find((s) => /math/i.test(`${s.slug || ''} ${s.name?.en || ''}`))?._id ||
    selectedClass?.subjects?.[0]?._id ||
    selectedClass?.subjects?.[0];

  // BOOK CRUD & SETTINGS
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
        navigate(adminUrl(`reference-books-manager/${created.slug}`));
      }
      setBookModal(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  // CHAPTER CRUD
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
        subject: defaultSubject,
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

  // EXERCISE CRUD
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
        book: selectedBook?._id,
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

  // QUESTION CRUD
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

  // TOPIC CRUD
  const handleOpenTopicModal = (topic = null) => {
    if (topic) {
      setEditingTopicId(topic._id);
      setTopicForm({
        number: topic.number || 1,
        title: topic.title || { en: '', hi: '' },
        shortDescription: topic.shortDescription || { en: '', hi: '' },
        notes: topic.notes || { en: '', hi: '' },
        difficulty: topic.difficulty || 'easy',
        estimatedTime: topic.estimatedTime || { en: '30 mins', hi: '30 मिनट' },
        status: topic.status || 'published',
        isVisible: topic.isVisible !== false,
      });
    } else {
      setEditingTopicId(null);
      setTopicForm({
        number: (topics.length || 0) + 1,
        title: { en: '', hi: '' },
        shortDescription: { en: '', hi: '' },
        notes: { en: '', hi: '' },
        difficulty: 'easy',
        estimatedTime: { en: '30 mins', hi: '30 मिनट' },
        status: 'published',
        isVisible: true,
      });
    }
    setTopicModal(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!selectedBook?._id || !selectedClass?._id || !selectedChapter?._id) return;
    try {
      const payload = {
        number: Number(topicForm.number),
        title: topicForm.title,
        shortDescription: topicForm.shortDescription,
        notes: topicForm.notes,
        difficulty: topicForm.difficulty,
        estimatedTime: topicForm.estimatedTime,
        book: selectedBook._id,
        class: selectedClass._id,
        subject: defaultSubject,
        chapter: selectedChapter._id,
        academicSession: selectedSession,
        status: topicForm.status,
        isVisible: topicForm.isVisible,
      };

      if (editingTopicId) {
        await put(`/content/topics/${editingTopicId}`, payload);
        toast.success(uiText('Topic updated successfully'));
      } else {
        await post('/content/topics', payload);
        toast.success(uiText('Topic created successfully'));
      }
      setTopicModal(false);
      reloadTopics();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteTopic = async (t) => {
    if (!window.confirm(`Delete Topic "${t.title?.en || t.number}"?`)) return;
    try {
      await del(`/content/topics/${t._id}`);
      toast.success(uiText('Topic deleted'));
      reloadTopics();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // NOTE CRUD
  const handleOpenNoteModal = (n = null) => {
    const bookCategory = selectedBook ? `${selectedBook.slug.replace(/-/g, '_')}_notes` : 'formula_sheet';
    if (n) {
      setEditingNoteId(n._id);
      setNoteForm({
        title: n.title || { en: '', hi: '' },
        chapter: n.chapter?._id || n.chapter || (selectedChapter?._id || ''),
        category: n.category || bookCategory,
        summary: n.summary || { en: '', hi: '' },
        content: n.content || { en: '', hi: '' },
        pdfUrl: n.pdfUrl || '',
        status: n.status || 'published',
        isVisible: n.isVisible !== false,
      });
    } else {
      setEditingNoteId(null);
      setNoteForm({
        title: { en: '', hi: '' },
        chapter: selectedChapter?._id || '',
        category: bookCategory,
        summary: { en: '', hi: '' },
        content: { en: '', hi: '' },
        pdfUrl: '',
        status: 'published',
        isVisible: true,
      });
    }
    setNoteModal(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!selectedBook?._id || !selectedClass?._id) return;
    try {
      const payload = {
        title: noteForm.title,
        chapter: noteForm.chapter || selectedChapter?._id,
        category: noteForm.category,
        summary: noteForm.summary,
        content: noteForm.content,
        pdfUrl: noteForm.pdfUrl,
        book: selectedBook._id,
        class: selectedClass._id,
        subject: defaultSubject,
        academicSession: selectedSession,
        status: noteForm.status,
        isVisible: noteForm.isVisible,
      };

      if (editingNoteId) {
        await put(`/content/notes/${editingNoteId}`, payload);
        toast.success(uiText('Note updated successfully'));
      } else {
        await post('/content/notes', payload);
        toast.success(uiText('Note created successfully'));
      }
      setNoteModal(false);
      reloadNotes();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteNote = async (n) => {
    if (!window.confirm(`Delete Note "${n.title?.en || ''}"?`)) return;
    try {
      await del(`/content/notes/${n._id}`);
      toast.success(uiText('Note deleted'));
      reloadNotes();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // IMPORTANT QUESTION CRUD
  const handleOpenIqModal = (iq = null) => {
    if (iq) {
      setEditingIqId(iq._id);
      setIqForm({
        title: iq.title || { en: '', hi: '' },
        number: iq.number || '1',
        chapter: iq.chapter?._id || iq.chapter || (selectedChapter?._id || ''),
        text: iq.text || { en: '', hi: '' },
        answer: iq.answer || { en: '', hi: '' },
        category: iq.category || 'vvi',
        difficulty: iq.difficulty || 'medium',
        marks: iq.marks || 4,
        year: iq.year || 2026,
        paperSet: iq.paperSet || 'Set 1',
        status: iq.status || 'published',
        isVisible: iq.isVisible !== false,
      });
    } else {
      setEditingIqId(null);
      setIqForm({
        title: { en: '', hi: '' },
        number: String((importantQuestions.length || 0) + 1),
        chapter: selectedChapter?._id || '',
        text: { en: '', hi: '' },
        answer: { en: '', hi: '' },
        category: 'vvi',
        difficulty: 'medium',
        marks: 4,
        year: 2026,
        paperSet: 'Set 1',
        status: 'published',
        isVisible: true,
      });
    }
    setIqModal(true);
  };

  const handleSaveIq = async (e) => {
    e.preventDefault();
    if (!selectedBook?._id || !selectedClass?._id) return;
    try {
      const payload = {
        title: iqForm.title,
        number: String(iqForm.number),
        chapter: iqForm.chapter || selectedChapter?._id,
        text: iqForm.text,
        answer: iqForm.answer,
        category: iqForm.category,
        difficulty: iqForm.difficulty,
        marks: Number(iqForm.marks),
        year: Number(iqForm.year),
        paperSet: iqForm.paperSet,
        book: selectedBook._id,
        class: selectedClass._id,
        subject: defaultSubject,
        academicSession: selectedSession,
        status: iqForm.status,
        isVisible: iqForm.isVisible,
      };

      if (editingIqId) {
        await put(`/content/important-questions/${editingIqId}`, payload);
        toast.success(uiText('Important Question updated successfully'));
      } else {
        await post('/content/important-questions', payload);
        toast.success(uiText('Important Question created successfully'));
      }
      setIqModal(false);
      reloadIqs();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDeleteIq = async (iq) => {
    if (!window.confirm(`Delete Important Question ${iq.number || ''}?`)) return;
    try {
      await del(`/content/important-questions/${iq._id}`);
      toast.success(uiText('Important Question deleted'));
      reloadIqs();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // BOOKCLASS CRUD
  const handleOpenClassModal = (bc) => {
    setEditingClassId(bc._id);
    setClassForm({
      name: bc.name || { en: '', hi: '' },
      description: bc.description || { en: '', hi: '' },
      status: bc.status || 'published',
      isVisible: bc.isVisible !== false,
      seoTitle: bc.seo?.metaTitle || '',
      seoDescription: bc.seo?.metaDescription || '',
    });
    setClassModal(true);
  };

  const handleSaveBookClass = async (e) => {
    e.preventDefault();
    if (!editingClassId) return;
    try {
      const payload = {
        name: classForm.name,
        description: classForm.description,
        status: classForm.status,
        isVisible: classForm.isVisible,
        seo: {
          metaTitle: classForm.seoTitle,
          metaDescription: classForm.seoDescription,
        },
      };
      await put(`/content/book-classes/${editingClassId}`, payload);
      toast.success(uiText('Class settings updated successfully'));
      setClassModal(false);
      reloadBookClasses();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // Filtered Questions for Dashboard Table
  const filteredQuestions = questions.filter((q) => {
    if (searchQuery.trim()) {
      const qNumMatch = String(q.number).toLowerCase().includes(searchQuery.toLowerCase());
      const qTextEnMatch = (q.text?.en || '').toLowerCase().includes(searchQuery.toLowerCase());
      const qTextHiMatch = (q.text?.hi || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!qNumMatch && !qTextEnMatch && !qTextHiMatch) return false;
    }
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (questionStatusFilter !== 'all' && q.status !== questionStatusFilter) return false;
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

  const TABS = [
    { id: 'content', label: uiText('3-Column Explorer'), icon: Layers },
    { id: 'classes', label: uiText('Class Management'), icon: GraduationCap, badge: bookClasses.length || 7 },
    { id: 'chapters', label: uiText('Chapters'), icon: Layers, badge: chapters.length },
    { id: 'exercises', label: uiText('Exercises'), icon: ListOrdered, badge: exercises.length },
    { id: 'questions', label: uiText('Questions & Solutions'), icon: HelpCircle, badge: questions.length },
    { id: 'topics', label: uiText('Topics'), icon: BookOpen, badge: topics.length },
    { id: 'notes', label: uiText('Notes & Formulas'), icon: NotebookPen, badge: notes.length },
    { id: 'important-questions', label: uiText('Important Questions'), icon: Star, badge: importantQuestions.length },
    { id: 'settings', label: uiText('Book Settings & SEO'), icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Panel
          title={uiTemplate`${getBookDisplayName()} Solutions CMS`}
          description={uiText(
            'Complete Manual Educational Authoring Workflow: Book → Class → Subject → Chapter → Exercise → Question → Multiple Solution Methods.'
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
            asChild
            className="h-9 gap-1.5 font-bold text-xs cursor-pointer"
          >
            <Link to={`/reference-solutions/${selectedBook?.slug || 'rs-aggarwal'}`} target="_blank">
              <ExternalLink className="size-3.5 text-brand" />
              {uiText('View Live Public Book')}
            </Link>
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
              navigate(adminUrl('reference-books-manager/' + e.target.value + (activeTab ? `?tab=${activeTab}` : '')));
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
            {[6, 7, 8, 9, 10, 11, 12].map((num) => {
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
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  )}
                  title={uiTemplate`Class ${num}`}
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

      {/* Unified Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border',
                isActive
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-extrabold',
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: 3-COLUMN CONTENT EXPLORER                     */}
      {/* ==================================================== */}
      {activeTab === 'content' && (
        <div className="grid gap-4 lg:grid-cols-12 min-h-[620px]">
          {/* Column 1: Chapters (col-span-3) */}
          <div className="lg:col-span-3 rounded-2xl border bg-card p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-brand" />
                <span>{uiText('Chapters (')}{chapters.length})</span>
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenChapterModal(null)}
                className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
              >
                <Plus className="size-3" />
                {uiText('Add')}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
              {loadingChapters ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{uiText('Loading chapters...')}</div>
              ) : chapters.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {uiText('No chapters added for this book & class. Click "+ Add" to create Chapter 1.')}
                </div>
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
                        <span className="font-mono text-brand font-bold mr-1.5">{uiText('Ch ')}{ch.number}:</span>
                        <span>{ch.title?.en || ch.title?.hi || uiTemplate`Chapter ${ch.number}`}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <Link
                          to={adminUrl(`chapters/${ch._id}`)}
                          className="p-1 hover:text-brand cursor-pointer"
                          title={uiText('Open Full Chapter Editor')}
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
                          title={uiText('Edit Chapter')}
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
                          title={uiText('Delete Chapter')}
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
                <span>{uiText('Exercises (')}{exercises.length})</span>
              </h3>
              {selectedChapter && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenExerciseModal(null)}
                  className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
                >
                  <Plus className="size-3" />
                  {uiText('Add')}
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
              {!selectedChapter ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{uiText('Select a chapter first')}</div>
              ) : loadingExercises ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{uiText('Loading exercises...')}</div>
              ) : exercises.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {uiText('No exercises found. Click "+ Add" to add Exercise ')}{selectedChapter.number}.1.
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
                        <span className="font-mono font-bold mr-1.5">{uiText('Ex ')}{ex.number}</span>
                        {ex.title?.en && <span className="text-muted-foreground text-[11px]">({ex.title.en})</span>}
                      </button>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <Link
                          to={adminUrl(`exercises/${ex._id}`)}
                          className="p-1 hover:text-brand cursor-pointer"
                          title={uiText('Open Full Exercise Editor')}
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
                          title={uiText('Edit Exercise')}
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
                          title={uiText('Delete Exercise')}
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

          {/* Column 3: Questions Dashboard (col-span-6) */}
          <div className="lg:col-span-6 rounded-2xl border bg-card p-4 shadow-xs flex flex-col">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b mb-3 gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="size-3.5 text-brand" />
                  <span>
                    {uiText('Questions & Solutions ')}
                    {selectedExercise ? uiTemplate`· Ex ${selectedExercise.number}` : ''} ({questions.length})
                  </span>
                </h3>
              </div>
              {selectedExercise && (
                <Button
                  asChild
                  size="sm"
                  className="h-8 px-3.5 text-xs gap-1.5 font-bold cursor-pointer bg-brand text-white hover:bg-brand/90"
                >
                  <Link
                    to={adminUrl(
                      `questions/new?book=${selectedBook?._id || ''}&class=${selectedClass?._id || ''}&chapter=${selectedChapter?._id || ''}&exercise=${selectedExercise?._id || ''}&session=${selectedSession}`
                    )}
                  >
                    <Plus className="size-3.5" />
                    <span>{uiText('Create New Question (Full CMS Editor)')}</span>
                  </Link>
                </Button>
              )}
            </div>

            {selectedExercise && questions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 pb-3 border-b">
                <div className="sm:col-span-2 relative">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={uiText('Search Q# or text...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <select
                    value={questionStatusFilter}
                    onChange={(e) => setQuestionStatusFilter(e.target.value)}
                    className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                  >
                    <option value="all">{uiText('Q: All')}</option>
                    <option value="published">{uiText('Q: Published')}</option>
                    <option value="draft">{uiText('Q: Draft')}</option>
                  </select>
                </div>
                <div>
                  <select
                    value={solutionStatusFilter}
                    onChange={(e) => setSolutionStatusFilter(e.target.value)}
                    className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                  >
                    <option value="all">{uiText('Sol: All')}</option>
                    <option value="published">{uiText('Sol: Published')}</option>
                    <option value="draft">{uiText('Sol: Draft')}</option>
                    <option value="missing">{uiText('Sol: Missing')}</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[550px]">
              {!selectedExercise ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {uiText('Select an exercise to manage its questions and step-by-step solutions')}
                </div>
              ) : loadingQuestions ? (
                <div className="p-8 text-center text-xs text-muted-foreground">{uiText('Loading questions...')}</div>
              ) : questions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl m-2">
                  <p className="font-semibold text-foreground mb-1">
                    {uiText('No questions created yet in Exercise ')}{selectedExercise.number}
                  </p>
                  <p className="mb-3 text-[11px]">
                    {uiText('Type question statements or upload scanned question images, then author step-by-step solutions.')}
                  </p>
                  <Button asChild size="sm" className="font-bold">
                    <Link
                      to={adminUrl(
                        `questions/new?book=${selectedBook?._id || ''}&class=${selectedClass?._id || ''}&chapter=${selectedChapter?._id || ''}&exercise=${selectedExercise?._id || ''}&session=${selectedSession}`
                      )}
                    >
                      <Plus className="size-3.5 mr-1" /> {uiText('Create Question 1 (Full CMS Editor)')}
                    </Link>
                  </Button>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {uiText('No questions match the current search or filters.')}
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const hasSolution = Boolean(q.solution);
                  const isSolPublished = q.solution?.status === 'published';
                  const methodsCount = q.solution?.methodsCount || q.solution?.methods?.length || 1;
                  const hasImageAttachment = (q.attachments || []).some((a) => a.placement !== 'solution');
                  const firstImage = (q.attachments || []).find((a) => a.placement !== 'solution')?.media;

                  return (
                    <div
                      key={q._id}
                      className="rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs hover:border-brand/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-brand text-white font-extrabold text-xs px-2 py-0.5 font-mono">
                            {uiText('Q ')}{q.number}
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
                            {q.difficulty || uiText('medium')} · {q.marks || 2}{uiText('M')}
                          </span>
                          <div className="flex items-center gap-0.5 ml-1">
                            {q.text?.en && (
                              <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1 rounded">
                                {uiText('EN')}
                              </span>
                            )}
                            {q.text?.hi && (
                              <span className="text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-1 rounded">
                                {uiText('HI')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionStatus(q)}
                            className={cn(
                              'px-2 py-0.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border',
                              q.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
                            )}
                            title={uiText('Click to toggle Question Publication status')}
                          >
                            {uiText('Q: ')}{q.status === 'published' ? uiText('Published') : uiText('Draft')}
                          </button>
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
                              title={uiText('Click to toggle Solution Publication status')}
                            >
                              {uiText('Sol: ')}{isSolPublished ? uiTemplate`Published (${methodsCount}M)` : uiText('Draft')}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-muted text-muted-foreground border border-border">
                              {uiText('Sol: None')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 my-2 text-xs text-foreground/90 font-medium">
                        {hasImageAttachment && firstImage?.url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal(firstImage.url)}
                            className="shrink-0 relative group rounded-md border overflow-hidden size-12 bg-muted/30 cursor-pointer"
                            title={uiText('Click to zoom scanned question image')}
                          >
                            <img src={firstImage.url} alt={uiText('Question Diagram')} className="size-full object-cover" />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">
                              {uiText('Zoom')}
                            </span>
                          </button>
                        )}
                        <div className="flex-1 line-clamp-2">
                          {q.text?.en || q.text?.hi ? (
                            <div dangerouslySetInnerHTML={{ __html: q.text?.en || q.text?.hi }} />
                          ) : hasImageAttachment ? (
                            <span className="text-muted-foreground italic flex items-center gap-1">
                              <ImageIcon className="size-3" />
                              {uiText(' [Scanned question page / diagram attached]')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">{uiText('[No statement typed yet]')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[11px] gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            to={adminUrl(`questions/${q._id}`)}
                            className="font-bold text-foreground hover:text-brand inline-flex items-center gap-1 cursor-pointer"
                            title={uiText('Open in Full Question Editor')}
                          >
                            <Edit2 className="size-3" />
                            <span>{uiText('Edit Question')}</span>
                          </Link>
                          <Link
                            to={adminUrl(`questions/${q._id}`)}
                            className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer ml-2"
                            title={uiText('Open Full Solution Builder with Multiple Methods')}
                          >
                            <Sparkles className="size-3" />
                            <span>{hasSolution ? uiText('Edit Solution & Methods') : uiText('+ Write Solution')}</span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Link
                            to={`/reference-solutions/${selectedBook?.slug}/class-${selectedClass?.number}/${selectedChapter?.slug}/${selectedExercise?.slug}`}
                            target="_blank"
                            className="text-muted-foreground hover:text-brand inline-flex items-center gap-1 font-semibold"
                            title={uiText('Preview student view')}
                          >
                            <span>{uiText('Live')}</span>
                            <ExternalLink className="size-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q)}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                            title={uiText('Duplicate Question')}
                          >
                            <Copy className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q)}
                            className="text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 cursor-pointer"
                            title={uiText('Delete Question')}
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
      )}

      {/* ==================================================== */}
      {/* TAB 2: CLASS MANAGEMENT                             */}
      {/* ==================================================== */}
      {activeTab === 'classes' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <GraduationCap className="size-4 text-brand" />
                <span>{uiText('Class Management for ')}{getBookDisplayName()}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uiText('Control visibility, descriptions, and SEO metadata for Classes 6 through 12.')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              asChild
              className="text-xs font-bold gap-1 cursor-pointer"
            >
              <Link to={adminUrl('book-classes?book=' + (selectedBook?._id || ''))}>
                <ExternalLink className="size-3.5 text-brand" />
                {uiText('Open Book-Classes Table')}
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Class')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Display Name')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Description')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Visibility')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {[6, 7, 8, 9, 10, 11, 12].map((num) => {
                  const bc = bookClasses.find((item) => item.class?.number === num || item.class === num);
                  const cls = classes.find((c) => c.number === num);
                  const isSelected = selectedClass?.number === num;

                  return (
                    <tr
                      key={num}
                      className={cn(
                        'border-b transition-colors hover:bg-muted/20',
                        isSelected && 'bg-brand/5'
                      )}
                    >
                      <td className="py-3 px-3 font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono bg-brand/10 text-brand px-2 py-0.5 rounded-md font-extrabold">
                            {uiText('Class ')}{num}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">
                          {bc?.name?.en || cls?.name?.en || uiTemplate`Class ${num} Mathematics`}
                        </div>
                        {bc?.name?.hi && (
                          <div className="text-[11px] text-muted-foreground">{bc.name.hi}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                        {bc?.description?.en || uiText('Standard class solutions curriculum')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            (bc?.status || 'published') === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {bc?.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px]',
                            bc?.isVisible !== false
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900'
                          )}
                        >
                          {bc?.isVisible !== false ? uiText('Visible') : uiText('Hidden')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (cls) setSelectedClass(cls);
                              setActiveTab('chapters');
                            }}
                            className="font-bold text-brand hover:underline cursor-pointer"
                          >
                            {uiText('Manage Chapters')}
                          </button>
                          {bc && (
                            <button
                              type="button"
                              onClick={() => handleOpenClassModal(bc)}
                              className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                              title={uiText('Edit Class Metadata')}
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                          )}
                          <Link
                            to={`/reference-solutions/${selectedBook?.slug}/class-${num}`}
                            target="_blank"
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('View Public Student Page')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: CHAPTERS MANAGEMENT                           */}
      {/* ==================================================== */}
      {activeTab === 'chapters' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-brand" />
                <span>
                  {uiText('Chapters Management · ')}{selectedClass ? uiTemplate`Class ${selectedClass.number}` : ''} ({chapters.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uiText('Create, edit, reorder, and manage chapter intros, PDF formulas, and syllabus.')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenChapterModal(null)}
              className="h-8 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="size-3.5" />
              {uiText('Add New Chapter')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Ch #')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Title (English & Hindi)')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Short Description')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {chapters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {uiText('No chapters added for this class yet. Click "+ Add New Chapter" above.')}
                    </td>
                  </tr>
                ) : (
                  chapters.map((ch) => (
                    <tr key={ch._id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-brand">
                        {ch.number}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{ch.title?.en || uiTemplate`Chapter ${ch.number}`}</div>
                        {ch.title?.hi && <div className="text-[11px] text-muted-foreground">{ch.title.hi}</div>}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground max-w-sm truncate">
                        {ch.shortDescription?.en || ch.shortDescription?.hi || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            ch.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {ch.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapter(ch);
                              setActiveTab('exercises');
                            }}
                            className="font-bold text-brand hover:underline cursor-pointer"
                          >
                            {uiText('Exercises')}
                          </button>
                          <Link
                            to={adminUrl(`chapters/${ch._id}`)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Open Full Chapter Editor')}
                          >
                            <Edit2 className="size-3.5" />
                          </Link>
                          <Link
                            to={`/reference-solutions/${selectedBook?.slug}/class-${selectedClass?.number}/${ch.slug}`}
                            target="_blank"
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('View Student Chapter Page')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(ch)}
                            className="p-1 hover:text-destructive cursor-pointer text-muted-foreground"
                            title={uiText('Delete Chapter')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: EXERCISES MANAGEMENT                          */}
      {/* ==================================================== */}
      {activeTab === 'exercises' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <ListOrdered className="size-4 text-brand" />
                  <span>{uiText('Exercise Management')}</span>
                </h3>
              </div>
              {chapters.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-semibold">{uiText('Chapter')}:</span>
                  <select
                    value={selectedChapter?._id || ''}
                    onChange={(e) => setSelectedChapter(chapters.find((c) => c._id === e.target.value) || null)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                  >
                    {chapters.map((ch) => (
                      <option key={ch._id} value={ch._id}>
                        {uiText('Ch ')}{ch.number}: {ch.title?.en || ch.title?.hi}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedChapter && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenExerciseModal(null)}
                className="h-8 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
              >
                <Plus className="size-3.5" />
                {uiText('Add New Exercise')}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Ex #')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Title')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {!selectedChapter ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      {uiText('Please select or create a chapter first.')}
                    </td>
                  </tr>
                ) : exercises.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      {uiText('No exercises in Chapter ')}{selectedChapter.number}. {uiText('Click "+ Add New Exercise" above.')}
                    </td>
                  </tr>
                ) : (
                  exercises.map((ex) => (
                    <tr key={ex._id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-brand">
                        {ex.number}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{ex.title?.en || uiTemplate`Exercise ${ex.number}`}</div>
                        {ex.title?.hi && <div className="text-[11px] text-muted-foreground">{ex.title.hi}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            ex.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {ex.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExercise(ex);
                              setActiveTab('questions');
                            }}
                            className="font-bold text-brand hover:underline cursor-pointer"
                          >
                            {uiText('Questions')}
                          </button>
                          <Link
                            to={adminUrl(`exercises/${ex._id}`)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Open Full Exercise Editor')}
                          >
                            <Edit2 className="size-3.5" />
                          </Link>
                          <Link
                            to={`/reference-solutions/${selectedBook?.slug}/class-${selectedClass?.number}/${selectedChapter?.slug}/${ex.slug}`}
                            target="_blank"
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('View Public Exercise Page')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(ex)}
                            className="p-1 hover:text-destructive cursor-pointer text-muted-foreground"
                            title={uiText('Delete Exercise')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: QUESTIONS & SOLUTIONS                         */}
      {/* ==================================================== */}
      {activeTab === 'questions' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <HelpCircle className="size-4 text-brand" />
                <span>{uiText('Questions & Step-by-Step Solutions')}</span>
              </h3>
              {chapters.length > 0 && (
                <select
                  value={selectedChapter?._id || ''}
                  onChange={(e) => setSelectedChapter(chapters.find((c) => c._id === e.target.value) || null)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {uiText('Ch ')}{ch.number}: {ch.title?.en}
                    </option>
                  ))}
                </select>
              )}
              {exercises.length > 0 && (
                <select
                  value={selectedExercise?._id || ''}
                  onChange={(e) => setSelectedExercise(exercises.find((ex) => ex._id === e.target.value) || null)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  {exercises.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {uiText('Ex ')}{ex.number}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedExercise && (
              <Button
                asChild
                size="sm"
                className="h-8 px-3.5 text-xs gap-1.5 font-bold cursor-pointer bg-brand text-white hover:bg-brand/90"
              >
                <Link
                  to={adminUrl(
                    `questions/new?book=${selectedBook?._id || ''}&class=${selectedClass?._id || ''}&chapter=${selectedChapter?._id || ''}&exercise=${selectedExercise?._id || ''}&session=${selectedSession}`
                  )}
                >
                  <Plus className="size-3.5" />
                  <span>{uiText('Create New Question (Full CMS Editor)')}</span>
                </Link>
              </Button>
            )}
          </div>

          {selectedExercise && questions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 pb-3 border-b">
              <div className="sm:col-span-2 relative">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder={uiText('Search Q# or text...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <select
                  value={questionStatusFilter}
                  onChange={(e) => setQuestionStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                >
                  <option value="all">{uiText('Q: All')}</option>
                  <option value="published">{uiText('Q: Published')}</option>
                  <option value="draft">{uiText('Q: Draft')}</option>
                </select>
              </div>
              <div>
                <select
                  value={solutionStatusFilter}
                  onChange={(e) => setSolutionStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                >
                  <option value="all">{uiText('Sol: All')}</option>
                  <option value="published">{uiText('Sol: Published')}</option>
                  <option value="draft">{uiText('Sol: Draft')}</option>
                  <option value="missing">{uiText('Sol: Missing')}</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {!selectedExercise ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {uiText('Please select an exercise above to manage questions and solutions.')}
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                {uiText('No questions found in Exercise ')}{selectedExercise.number}.
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const hasSolution = Boolean(q.solution);
                const isSolPublished = q.solution?.status === 'published';
                const methodsCount = q.solution?.methodsCount || q.solution?.methods?.length || 1;
                const hasImageAttachment = (q.attachments || []).some((a) => a.placement !== 'solution');
                const firstImage = (q.attachments || []).find((a) => a.placement !== 'solution')?.media;

                return (
                  <div
                    key={q._id}
                    className="rounded-xl border border-border/80 bg-background p-4 shadow-2xs hover:border-brand/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-brand text-white font-extrabold text-xs px-2.5 py-0.5 font-mono">
                          {uiText('Q ')}{q.number}
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
                          {q.difficulty || uiText('medium')} · {q.marks || 2}{uiText('M')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionStatus(q)}
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border',
                            q.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
                          )}
                        >
                          {uiText('Q: ')}{q.status === 'published' ? uiText('Published') : uiText('Draft')}
                        </button>
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
                          >
                            {uiText('Sol: ')}{isSolPublished ? uiTemplate`Published (${methodsCount}M)` : uiText('Draft')}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-muted text-muted-foreground border border-border">
                            {uiText('Sol: None')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 my-2 text-xs text-foreground/90 font-medium">
                      {hasImageAttachment && firstImage?.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(firstImage.url)}
                          className="shrink-0 relative group rounded-md border overflow-hidden size-12 bg-muted/30 cursor-pointer"
                        >
                          <img src={firstImage.url} alt={uiText('Question Diagram')} className="size-full object-cover" />
                        </button>
                      )}
                      <div className="flex-1 line-clamp-3">
                        {q.text?.en || q.text?.hi ? (
                          <div dangerouslySetInnerHTML={{ __html: q.text?.en || q.text?.hi }} />
                        ) : (
                          <span className="text-muted-foreground italic">{uiText('[No statement typed yet]')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[11px] gap-2">
                      <div className="flex items-center gap-3">
                        <Link
                          to={adminUrl(`questions/${q._id}`)}
                          className="font-bold text-foreground hover:text-brand inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="size-3" />
                          <span>{uiText('Edit Question')}</span>
                        </Link>
                        <Link
                          to={adminUrl(`questions/${q._id}`)}
                          className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="size-3" />
                          <span>{hasSolution ? uiText('Edit Solution & Methods') : uiText('+ Write Solution')}</span>
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer p-1"
                          title={uiText('Duplicate Question')}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 cursor-pointer p-1"
                          title={uiText('Delete Question')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: TOPICS MANAGEMENT                             */}
      {/* ==================================================== */}
      {activeTab === 'topics' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-brand" />
                <span>{uiText('Topics Management')}</span>
              </h3>
              {chapters.length > 0 && (
                <select
                  value={selectedChapter?._id || ''}
                  onChange={(e) => setSelectedChapter(chapters.find((c) => c._id === e.target.value) || null)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {uiText('Ch ')}{ch.number}: {ch.title?.en}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedChapter && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenTopicModal(null)}
                className="h-8 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
              >
                <Plus className="size-3.5" />
                {uiText('Add New Topic')}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Topic #')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Title')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Difficulty')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Estimated Time')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {!selectedChapter ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {uiText('Please select a chapter above.')}
                    </td>
                  </tr>
                ) : topics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {uiText('No topics added in Chapter ')}{selectedChapter.number}. {uiText('Click "+ Add New Topic" above.')}
                    </td>
                  </tr>
                ) : (
                  topics.map((t) => (
                    <tr key={t._id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-brand">
                        {t.number || 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{t.title?.en || uiTemplate`Topic ${t.number}`}</div>
                        {t.title?.hi && <div className="text-[11px] text-muted-foreground">{t.title.hi}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-muted">
                          {t.difficulty || 'easy'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {t.estimatedTime?.en || '30 mins'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            t.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {t.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenTopicModal(t)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Edit Topic')}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <Link
                            to={adminUrl(`topics/${t._id}`)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Open Full Topic Editor')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(t)}
                            className="p-1 hover:text-destructive cursor-pointer text-muted-foreground"
                            title={uiText('Delete Topic')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 7: NOTES & FORMULAS MANAGEMENT                   */}
      {/* ==================================================== */}
      {activeTab === 'notes' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <NotebookPen className="size-4 text-brand" />
                <span>{uiText('Notes & Formula Sheets')}</span>
              </h3>
              {chapters.length > 0 && (
                <select
                  value={selectedChapter?._id || ''}
                  onChange={(e) => setSelectedChapter(chapters.find((c) => c._id === e.target.value) || null)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  <option value="">{uiText('All Chapters')}</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {uiText('Ch ')}{ch.number}: {ch.title?.en}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenNoteModal(null)}
              className="h-8 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="size-3.5" />
              {uiText('Add New Note / Formula')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Title')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Category')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('PDF Resource')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {uiText('No notes or formula sheets added yet. Click "+ Add New Note / Formula" above.')}
                    </td>
                  </tr>
                ) : (
                  notes.map((n) => (
                    <tr key={n._id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{n.title?.en || uiText('Untitled Note')}</div>
                        {n.title?.hi && <div className="text-[11px] text-muted-foreground">{n.title.hi}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted font-mono">
                          {n.category || 'notes'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {n.pdfUrl ? (
                          <a
                            href={n.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand underline font-semibold flex items-center gap-1"
                          >
                            <FileText className="size-3" />
                            <span>{uiText('View PDF')}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">{uiText('None')}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            n.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {n.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(n)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Edit Note')}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <Link
                            to={adminUrl(`notes/${n._id}`)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Open Full Note Editor')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n)}
                            className="p-1 hover:text-destructive cursor-pointer text-muted-foreground"
                            title={uiText('Delete Note')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 8: IMPORTANT QUESTIONS MANAGEMENT                */}
      {/* ==================================================== */}
      {activeTab === 'important-questions' && (
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Star className="size-4 text-brand" />
                <span>{uiText('Important & Practice Questions')}</span>
              </h3>
              {chapters.length > 0 && (
                <select
                  value={selectedChapter?._id || ''}
                  onChange={(e) => setSelectedChapter(chapters.find((c) => c._id === e.target.value) || null)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  <option value="">{uiText('All Chapters')}</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {uiText('Ch ')}{ch.number}: {ch.title?.en}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenIqModal(null)}
              className="h-8 gap-1.5 font-bold text-xs cursor-pointer bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="size-3.5" />
              {uiText('Add Important Question')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">{uiText('Q#')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Title / Question')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Category')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Difficulty')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Marks')}</th>
                  <th className="py-2.5 px-3 font-bold">{uiText('Status')}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{uiText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {importantQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {uiText('No important questions added yet. Click "+ Add Important Question" above.')}
                    </td>
                  </tr>
                ) : (
                  importantQuestions.map((iq) => (
                    <tr key={iq._id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-brand">
                        {iq.number || '1'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{iq.title?.en || uiText('Question')}</div>
                        {iq.text?.en && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {iq.text.en.replace(/<[^>]+>/g, '')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase px-2 py-0.5 rounded text-[10px] font-bold bg-muted">
                          {iq.category || 'vvi'}
                        </span>
                      </td>
                      <td className="py-3 px-3 capitalize">
                        {iq.difficulty || 'medium'}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {iq.marks || 4}{uiText('M')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                            iq.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                          )}
                        >
                          {iq.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenIqModal(iq)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Edit')}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <Link
                            to={adminUrl(`important-questions/${iq._id}`)}
                            className="p-1 hover:text-brand cursor-pointer text-muted-foreground"
                            title={uiText('Open Full Editor')}
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteIq(iq)}
                            className="p-1 hover:text-destructive cursor-pointer text-muted-foreground"
                            title={uiText('Delete')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 9: BOOK SETTINGS & SEO                           */}
      {/* ==================================================== */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs max-w-3xl space-y-5">
          <div className="pb-3 border-b">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Settings className="size-4 text-brand" />
              <span>{uiText('Book Settings & SEO Configuration')}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uiText('Update author, publisher, cover image, and metadata for ')}{getBookDisplayName()}.
            </p>
          </div>

          <form onSubmit={handleSaveBook} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Book Name (English) *')}</label>
                <input
                  type="text"
                  value={bookForm.title?.en || ''}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Book Name (Hindi)')}</label>
                <input
                  type="text"
                  value={bookForm.title?.hi || ''}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Author Name *')}</label>
                <input
                  type="text"
                  value={bookForm.author || ''}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Publisher')}</label>
                <input
                  type="text"
                  value={bookForm.publisher || ''}
                  onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Edition')}</label>
                <input
                  type="text"
                  value={bookForm.edition || ''}
                  onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">{uiText('Cover Image URL')}</label>
              <input
                type="text"
                placeholder={uiText('https://...')}
                value={bookForm.coverUrl || ''}
                onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Description (English)')}</label>
                <textarea
                  rows={3}
                  value={bookForm.description?.en || ''}
                  onChange={(e) => setBookForm({ ...bookForm, description: { ...bookForm.description, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Description (Hindi)')}</label>
                <textarea
                  rows={3}
                  value={bookForm.description?.hi || ''}
                  onChange={(e) => setBookForm({ ...bookForm, description: { ...bookForm.description, hi: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookForm.isVisible !== false}
                  onChange={(e) => setBookForm({ ...bookForm, isVisible: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                <span>{uiText('Visible on Website')}</span>
              </label>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-bold">{uiText('Status')}:</span>
                <select
                  value={bookForm.status || 'published'}
                  onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                >
                  <option value="published">{uiText('Published')}</option>
                  <option value="draft">{uiText('Draft')}</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                {uiText('Save Book Settings')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS SECTION                                       */}
      {/* ==================================================== */}

      {/* Book Modal */}
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
                <label className="text-xs font-bold block mb-1">{uiText('Book Name (English) *')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. RS Aggarwal Solutions')}
                  value={bookForm.title.en}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Book Name (Hindi)')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. आर.एस. अग्रवाल गणित समाधान')}
                  value={bookForm.title.hi}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Author Name *')}</label>
                  <input
                    type="text"
                    placeholder={uiText('e.g. R.S. Aggarwal')}
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Publisher')}</label>
                  <input
                    type="text"
                    placeholder={uiText('e.g. Bharati Bhawan')}
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setBookModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Book')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {chapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingChapterId ? uiText('Edit Chapter') : uiText('Add New Chapter')}
            </h3>
            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Chapter Number *')}</label>
                <input
                  type="number"
                  value={chapterForm.number}
                  onChange={(e) => setChapterForm({ ...chapterForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Chapter Title (English) *')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. Real Numbers')}
                  value={chapterForm.title.en}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Chapter Title (Hindi)')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. वास्तविक संख्याएँ')}
                  value={chapterForm.title.hi}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setChapterModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Chapter')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {exerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingExerciseId ? uiText('Edit Exercise') : uiTemplate`Add Exercise to Chapter ${selectedChapter?.number}`}
            </h3>
            <form onSubmit={handleSaveExercise} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Exercise Number / Code *')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. 1.1, 1.2, Miscellaneous')}
                  value={exerciseForm.number}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Exercise Title (Optional)')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. Fundamental Theorem of Arithmetic')}
                  value={exerciseForm.title.en}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: { ...exerciseForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setExerciseModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Exercise')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {topicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 my-8">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingTopicId ? uiText('Edit Topic') : uiTemplate`Add Topic to Chapter ${selectedChapter?.number}`}
            </h3>
            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Topic #')}</label>
                  <input
                    type="number"
                    value={topicForm.number}
                    onChange={(e) => setTopicForm({ ...topicForm, number: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Difficulty')}</label>
                  <select
                    value={topicForm.difficulty}
                    onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs"
                  >
                    <option value="beginner">{uiText('Beginner')}</option>
                    <option value="easy">{uiText('Easy')}</option>
                    <option value="medium">{uiText('Medium')}</option>
                    <option value="hard">{uiText('Hard')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Est. Time')}</label>
                  <input
                    type="text"
                    value={topicForm.estimatedTime.en}
                    onChange={(e) => setTopicForm({ ...topicForm, estimatedTime: { ...topicForm.estimatedTime, en: e.target.value } })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Topic Title (English) *')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. Euclid’s Division Lemma')}
                  value={topicForm.title.en}
                  onChange={(e) => setTopicForm({ ...topicForm, title: { ...topicForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Topic Title (Hindi)')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. यूक्लिड विभाजन प्रमेयिका')}
                  value={topicForm.title.hi}
                  onChange={(e) => setTopicForm({ ...topicForm, title: { ...topicForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Notes / Concepts / Formulas')}</label>
                <textarea
                  rows={4}
                  placeholder={uiText('Enter topic explanations, formulas, or LaTeX expressions...')}
                  value={topicForm.notes.en}
                  onChange={(e) => setTopicForm({ ...topicForm, notes: { ...topicForm.notes, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setTopicModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Topic')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 my-8">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingNoteId ? uiText('Edit Note / Formula Sheet') : uiText('Add Note / Formula Sheet')}
            </h3>
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Note Title (English) *')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. Complete Trigonometry Formulas & Quick Revision Notes')}
                  value={noteForm.title.en}
                  onChange={(e) => setNoteForm({ ...noteForm, title: { ...noteForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Note Title (Hindi)')}</label>
                <input
                  type="text"
                  placeholder={uiText('e.g. त्रिकोणमिति के महत्वपूर्ण सूत्र एवं नोट्स')}
                  value={noteForm.title.hi}
                  onChange={(e) => setNoteForm({ ...noteForm, title: { ...noteForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Chapter')}</label>
                  <select
                    value={noteForm.chapter}
                    onChange={(e) => setNoteForm({ ...noteForm, chapter: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs"
                  >
                    <option value="">{uiText('Entire Class / Book')}</option>
                    {chapters.map((ch) => (
                      <option key={ch._id} value={ch._id}>
                        {uiText('Ch ')}{ch.number}: {ch.title?.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Category')}</label>
                  <select
                    value={noteForm.category}
                    onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs"
                  >
                    <option value="formula_sheet">{uiText('Formula Sheet')}</option>
                    {selectedBook && (
                      <option value={`${selectedBook.slug.replace(/-/g, '_')}_notes`}>
                        {selectedBook.title?.en} {uiText('Notes')}
                      </option>
                    )}
                    <option value="vvi_short_notes">{uiText('VVI Short Notes')}</option>
                    <option value="ncert_notes">{uiText('General Notes')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('PDF Download Link (Optional)')}</label>
                <input
                  type="text"
                  placeholder={uiText('https://.../notes.pdf')}
                  value={noteForm.pdfUrl}
                  onChange={(e) => setNoteForm({ ...noteForm, pdfUrl: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Notes Content / Formulas (HTML or LaTeX)')}</label>
                <textarea
                  rows={4}
                  placeholder={uiText('Type mathematical formulas or explanations...')}
                  value={noteForm.content.en}
                  onChange={(e) => setNoteForm({ ...noteForm, content: { ...noteForm.content, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setNoteModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Note')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Important Question Modal */}
      {iqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 my-8">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {editingIqId ? uiText('Edit Important Question') : uiText('Add Important Question')}
            </h3>
            <form onSubmit={handleSaveIq} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Q #')}</label>
                  <input
                    type="text"
                    value={iqForm.number}
                    onChange={(e) => setIqForm({ ...iqForm, number: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Marks')}</label>
                  <input
                    type="number"
                    value={iqForm.marks}
                    onChange={(e) => setIqForm({ ...iqForm, marks: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Difficulty')}</label>
                  <select
                    value={iqForm.difficulty}
                    onChange={(e) => setIqForm({ ...iqForm, difficulty: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs"
                  >
                    <option value="easy">{uiText('Easy')}</option>
                    <option value="medium">{uiText('Medium')}</option>
                    <option value="hard">{uiText('Hard')}</option>
                    <option value="hots">{uiText('HOTS')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Category')}</label>
                  <select
                    value={iqForm.category}
                    onChange={(e) => setIqForm({ ...iqForm, category: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs"
                  >
                    <option value="vvi">{uiText('VVI')}</option>
                    <option value="pyq">{uiText('PYQ')}</option>
                    <option value="extra_questions">{uiText('Extra Qs')}</option>
                    <option value="sample_paper">{uiText('Sample')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Chapter')}</label>
                <select
                  value={iqForm.chapter}
                  onChange={(e) => setIqForm({ ...iqForm, chapter: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold"
                >
                  <option value="">{uiText('Entire Class / Book')}</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {uiText('Ch ')}{ch.number}: {ch.title?.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Question Statement *')}</label>
                <textarea
                  rows={3}
                  placeholder={uiText('Type question statement (supports LaTeX KaTeX math)...')}
                  value={iqForm.text.en}
                  onChange={(e) => setIqForm({ ...iqForm, text: { ...iqForm.text, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Step-by-Step Answer / Solution')}</label>
                <textarea
                  rows={3}
                  placeholder={uiText('Type step-by-step mathematical solution...')}
                  value={iqForm.answer.en}
                  onChange={(e) => setIqForm({ ...iqForm, answer: { ...iqForm.answer, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIqModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Important Question')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {classModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground mb-4">
              {uiText('Edit Class Settings')}
            </h3>
            <form onSubmit={handleSaveBookClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Display Name (English)')}</label>
                <input
                  type="text"
                  value={classForm.name.en}
                  onChange={(e) => setClassForm({ ...classForm, name: { ...classForm.name, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Display Name (Hindi)')}</label>
                <input
                  type="text"
                  value={classForm.name.hi}
                  onChange={(e) => setClassForm({ ...classForm, name: { ...classForm.name, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('Description')}</label>
                <textarea
                  rows={2}
                  value={classForm.description.en}
                  onChange={(e) => setClassForm({ ...classForm, description: { ...classForm.description, en: e.target.value } })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Status')}</label>
                  <select
                    value={classForm.status}
                    onChange={(e) => setClassForm({ ...classForm, status: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold"
                  >
                    <option value="published">{uiText('Published')}</option>
                    <option value="draft">{uiText('Draft')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{uiText('Visibility')}</label>
                  <select
                    value={classForm.isVisible ? 'visible' : 'hidden'}
                    onChange={(e) => setClassForm({ ...classForm, isVisible: e.target.value === 'visible' })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold"
                  >
                    <option value="visible">{uiText('Visible')}</option>
                    <option value="hidden">{uiText('Hidden')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{uiText('SEO Meta Title')}</label>
                <input
                  type="text"
                  value={classForm.seoTitle}
                  onChange={(e) => setClassForm({ ...classForm, seoTitle: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setClassModal(false)}>
                  {uiText('Cancel')}
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  {uiText('Save Class Settings')}
                </Button>
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
            <img src={previewImageModal} alt={uiText('Zoom Preview')} className="max-h-[85vh] object-contain mx-auto" />
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
