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
import { MediaPicker } from '../components/media/MediaPicker.jsx';
import { RichContent } from '@/components/content/RichContent.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, put, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';
import { adminUrl } from '@/lib/config';

// Math symbol toolbar shortcuts for rapid formula insertion
const MATH_SHORTCUTS = [
  { label: 'x/y', snippet: '\\frac{a}{b}', title: 'Fraction' },
  { label: '√x', snippet: '\\sqrt{x}', title: 'Square Root' },
  { label: 'x²', snippet: 'x^2', title: 'Power' },
  { label: 'xₙ', snippet: 'x_n', title: 'Subscript' },
  { label: '∫', snippet: '\\int f(x)\\,dx', title: 'Integral' },
  { label: '∑', snippet: '\\sum_{i=1}^{n}', title: 'Summation' },
  { label: '±', snippet: '\\pm', title: 'Plus-minus' },
  { label: '≠', snippet: '\\ne', title: 'Not equal' },
  { label: '≤', snippet: '\\le', title: 'Less or equal' },
  { label: '≥', snippet: '\\ge', title: 'Greater or equal' },
  { label: '∞', snippet: '\\infty', title: 'Infinity' },
  { label: 'π', snippet: '\\pi', title: 'Pi' },
  { label: 'θ', snippet: '\\theta', title: 'Theta' },
  { label: 'α', snippet: '\\alpha', title: 'Alpha' },
  { label: 'β', snippet: '\\beta', title: 'Beta' },
  { label: 'Matrix', snippet: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', title: '2x2 Matrix' },
  { label: 'Display $$', snippet: '$$\\begin{aligned}\n  & = \\dots\n\\end{aligned}$$', title: 'Display Aligned Math' },
];

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

  // Question Editor Modal
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionTab, setQuestionTab] = useState('en');
  const [questionForm, setQuestionForm] = useState({
    number: '1',
    title: { en: '', hi: '' },
    text: { en: '', hi: '' },
    questionType: 'subjective',
    difficulty: 'medium',
    marks: 2,
    status: 'published',
    attachments: [],
  });

  // Solution Editor Modal (with Multiple Methods)
  const [solutionModal, setSolutionModal] = useState(false);
  const [activeQuestionForSolution, setActiveQuestionForSolution] = useState(null);
  const [solutionId, setSolutionId] = useState(null);
  const [solutionStatus, setSolutionStatus] = useState('published');
  const [activeMethodIndex, setActiveMethodIndex] = useState(0);
  const [solutionLangTab, setSolutionLangTab] = useState('en');
  const [methods, setMethods] = useState([
    {
      title: { en: 'Method 1: Standard Method', hi: 'विधि 1: मानक विधि' },
      methodType: 'standard',
      blocks: [
        {
          type: 'step',
          title: { en: 'Step 1: Given Information & Analysis', hi: 'चरण 1: दी गई जानकारी' },
          content: { en: '', hi: '' },
        },
      ],
      finalAnswer: { en: '', hi: '' },
    },
  ]);

  // Media Picker state for image uploads
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null); // 'question' | 'step' | 'book'
  const [mediaPickerStepIndex, setMediaPickerStepIndex] = useState(null);

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

  // Helper for inserting math snippet in focused textarea
  const insertMathSnippet = (snippet, field, setField) => {
    setField((prev) => {
      const current = prev || '';
      return `${current} $${snippet}$ `;
    });
  };

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
        toast.success('Chapter updated');
        setChapters((prev) => prev.map((c) => (c._id === editingChapterId ? updated : c)));
        if (selectedChapter?._id === editingChapterId) setSelectedChapter(updated);
      } else {
        const created = await post('/content/chapters', payload);
        toast.success('Chapter added');
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
      toast.success('Chapter deleted');
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
        toast.success('Exercise updated');
        setExercises((prev) => prev.map((e) => (e._id === editingExerciseId ? updated : e)));
        if (selectedExercise?._id === editingExerciseId) setSelectedExercise(updated);
      } else {
        const created = await post('/content/exercises', payload);
        toast.success('Exercise created');
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
      toast.success('Exercise deleted');
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
  const handleOpenQuestionModal = (q = null) => {
    if (q) {
      setEditingQuestionId(q._id);
      setQuestionForm({
        number: String(q.number),
        title: q.title || { en: '', hi: '' },
        text: q.text || { en: '', hi: '' },
        questionType: q.questionType || 'subjective',
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 2,
        status: q.status || 'published',
        attachments: q.attachments || [],
      });
    } else {
      setEditingQuestionId(null);
      setQuestionForm({
        number: String((questions.length || 0) + 1),
        title: { en: '', hi: '' },
        text: { en: '', hi: '' },
        questionType: 'subjective',
        difficulty: 'medium',
        marks: 2,
        status: 'published',
        attachments: [],
      });
    }
    setQuestionTab('en');
    setQuestionModal(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedExercise?._id) return;
    try {
      const qPayload = {
        number: String(questionForm.number),
        title: questionForm.title,
        text: questionForm.text,
        questionType: questionForm.questionType,
        difficulty: questionForm.difficulty,
        marks: Number(questionForm.marks),
        exercise: selectedExercise._id,
        chapter: selectedChapter._id,
        class: selectedClass._id,
        subject:
          selectedChapter.subject?._id ||
          selectedChapter.subject ||
          selectedClass.subjects?.[0]?._id ||
          selectedClass.subjects?.[0],
        academicSession: selectedSession,
        status: questionForm.status || 'published',
        attachments: questionForm.attachments,
      };

      if (editingQuestionId) {
        await put(`/content/questions/${editingQuestionId}`, qPayload);
        toast.success(uiText('Question updated successfully'));
      } else {
        await post('/content/questions', qPayload);
        toast.success(uiText('Question created successfully'));
      }
      setQuestionModal(false);
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

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
      toast.success('Question deleted');
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDuplicateQuestion = async (q) => {
    try {
      await post(`/content/questions/${q._id}/duplicate`, {});
      toast.success('Question duplicated');
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // ----------------------------------------------------
  // SOLUTION EDITOR (MULTIPLE METHODS & STEP-BY-STEP BUILDER)
  // ----------------------------------------------------
  const handleOpenSolutionModal = async (q) => {
    setActiveQuestionForSolution(q);
    setSolutionModal(true);
    setActiveMethodIndex(0);
    setSolutionLangTab('en');

    try {
      // Fetch fresh question with full populated solution
      const res = await get(`/content/questions/${q._id}`);
      const sol = res.solution;

      if (sol) {
        setSolutionId(sol._id);
        setSolutionStatus(sol.status || 'published');

        if (sol.methods && sol.methods.length > 0) {
          setMethods(
            sol.methods.map((m) => ({
              _id: m._id,
              title: m.title || { en: 'Method 1: Standard Method', hi: 'विधि 1: मानक विधि' },
              methodType: m.methodType || 'standard',
              blocks: m.blocks?.length
                ? m.blocks
                : [{ type: 'step', title: { en: 'Step 1', hi: 'चरण 1' }, content: { en: '', hi: '' } }],
              finalAnswer: m.finalAnswer || { en: '', hi: '' },
            })),
          );
        } else if (sol.blocks && sol.blocks.length > 0) {
          // Wrap legacy flat blocks into Method 1
          setMethods([
            {
              title: { en: 'Method 1: Standard Method', hi: 'विधि 1: मानक विधि' },
              methodType: 'standard',
              blocks: sol.blocks,
              finalAnswer: { en: '', hi: '' },
            },
          ]);
        } else {
          setMethods([
            {
              title: { en: 'Method 1: Standard Method', hi: 'विधि 1: मानक विधि' },
              methodType: 'standard',
              blocks: [
                {
                  type: 'step',
                  title: { en: 'Step 1: Given Information & Analysis', hi: 'चरण 1: दी गई जानकारी' },
                  content: { en: '', hi: '' },
                },
              ],
              finalAnswer: { en: '', hi: '' },
            },
          ]);
        }
      } else {
        // No solution yet
        setSolutionId(null);
        setSolutionStatus('published');
        setMethods([
          {
            title: { en: 'Method 1: Standard Method', hi: 'विधि 1: मानक विधि' },
            methodType: 'standard',
            blocks: [
              {
                type: 'step',
                title: { en: 'Step 1: Given Information & Analysis', hi: 'चरण 1: दी गई जानकारी' },
                content: { en: '', hi: '' },
              },
            ],
            finalAnswer: { en: '', hi: '' },
          },
        ]);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleAddMethod = () => {
    const nextIdx = methods.length + 1;
    const newMethod = {
      title: {
        en: `Method ${nextIdx}: ${nextIdx === 2 ? 'Shortcut Method' : 'Alternative Method'}`,
        hi: `विधि ${nextIdx}: ${nextIdx === 2 ? 'शॉर्टकट विधि' : 'वैकल्पिक विधि'}`,
      },
      methodType: nextIdx === 2 ? 'shortcut' : 'alternative',
      blocks: [
        {
          type: 'step',
          title: { en: 'Step 1: Method Overview & Steps', hi: 'चरण 1: विधि का विवरण' },
          content: { en: '', hi: '' },
        },
      ],
      finalAnswer: { en: '', hi: '' },
    };
    setMethods([...methods, newMethod]);
    setActiveMethodIndex(methods.length);
  };

  const handleRemoveMethod = (indexToRemove) => {
    if (methods.length <= 1) {
      toast.error('At least one solution method must be maintained.');
      return;
    }
    const updated = methods.filter((_, idx) => idx !== indexToRemove);
    setMethods(updated);
    setActiveMethodIndex(Math.max(0, indexToRemove - 1));
  };

  const handleAddStepToCurrentMethod = () => {
    const current = methods[activeMethodIndex];
    if (!current) return;
    const nextStepNum = (current.blocks?.length || 0) + 1;
    const newStep = {
      type: 'step',
      title: { en: `Step ${nextStepNum}`, hi: `चरण ${nextStepNum}` },
      content: { en: '', hi: '' },
    };
    const updatedBlocks = [...(current.blocks || []), newStep];
    const updatedMethods = [...methods];
    updatedMethods[activeMethodIndex] = { ...current, blocks: updatedBlocks };
    setMethods(updatedMethods);
  };

  const handleRemoveStep = (stepIdx) => {
    const current = methods[activeMethodIndex];
    if (!current || (current.blocks || []).length <= 1) return;
    const updatedBlocks = current.blocks.filter((_, idx) => idx !== stepIdx);
    const updatedMethods = [...methods];
    updatedMethods[activeMethodIndex] = { ...current, blocks: updatedBlocks };
    setMethods(updatedMethods);
  };

  const handleSaveSolution = async (targetStatus = 'published') => {
    if (!activeQuestionForSolution?._id) return;
    try {
      const payload = {
        solution: {
          methods: methods.map((m, mIdx) => ({
            title: m.title,
            methodType: m.methodType,
            blocks: m.blocks.map((b) => ({
              type: 'step',
              title: b.title,
              content: b.content,
              latex: b.latex || '',
              media: b.media || [],
            })),
            finalAnswer: m.finalAnswer,
            isDefault: mIdx === 0,
          })),
          status: targetStatus,
        },
      };

      await put(`/content/questions/${activeQuestionForSolution._id}`, payload);
      toast.success(
        targetStatus === 'published'
          ? uiText('Solution published successfully with step-by-step methods!')
          : uiText('Solution saved as Draft (hidden from students)'),
      );
      setSolutionModal(false);
      reloadQuestions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleToggleSolutionStatus = async (q) => {
    if (!q.solution?._id) {
      toast.error('No solution exists yet for this question. Click "Edit Solution" to write one.');
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
          title={`${getBookDisplayName()} Solutions CMS`}
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
                {b.title?.en || b.slug} {b.author ? `(${b.author})` : ''}
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
                  title={isAvailable ? `Class ${num}` : `Class ${num} not enabled for this book`}
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
                {s.name || s} {s.isCurrent ? '(Current)' : ''}
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
              <span>Chapters ({chapters.length})</span>
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenChapterModal(null)}
              className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
            >
              <Plus className="size-3" /> Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
            {loadingChapters ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading chapters...</div>
            ) : chapters.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No chapters added for this book & class. Click "+ Add" to create Chapter 1.
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
                      <span className="font-mono text-brand font-bold mr-1.5">Ch {ch.number}:</span>
                      <span>{ch.title?.en || ch.title?.hi || `Chapter ${ch.number}`}</span>
                    </button>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChapterModal(ch);
                        }}
                        className="p-1 hover:text-brand cursor-pointer"
                        title="Edit Chapter"
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
                        title="Delete Chapter"
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
              <span>Exercises ({exercises.length})</span>
            </h3>
            {selectedChapter && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenExerciseModal(null)}
                className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
              >
                <Plus className="size-3" /> Add
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[550px]">
            {!selectedChapter ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Select a chapter first</div>
            ) : loadingExercises ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading exercises...</div>
            ) : exercises.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No exercises found. Click "+ Add" to add Exercise {selectedChapter.number}.1.
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
                      <span className="font-mono font-bold mr-1.5">Ex {ex.number}</span>
                      {ex.title?.en && <span className="text-muted-foreground text-[11px]">({ex.title.en})</span>}
                    </button>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExerciseModal(ex);
                        }}
                        className="p-1 hover:text-brand cursor-pointer"
                        title="Edit Exercise"
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
                        title="Delete Exercise"
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
                <span>
                  Questions & Solutions {selectedExercise ? `· Ex ${selectedExercise.number}` : ''} ({questions.length})
                </span>
              </h3>
            </div>
            {selectedExercise && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenQuestionModal(null)}
                className="h-7.5 px-3 text-xs gap-1.5 font-bold cursor-pointer bg-brand text-white hover:bg-brand/90"
              >
                <Plus className="size-3.5" />
                {uiText('Add Question')}
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
                  placeholder="Search Q# or text..."
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
                  <option value="all">Q: All</option>
                  <option value="published">Q: Published</option>
                  <option value="draft">Q: Draft</option>
                </select>
              </div>

              {/* Solution Status Filter */}
              <div>
                <select
                  value={solutionStatusFilter}
                  onChange={(e) => setSolutionStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                >
                  <option value="all">Sol: All</option>
                  <option value="published">Sol: Published</option>
                  <option value="draft">Sol: Draft</option>
                  <option value="missing">Sol: Missing</option>
                </select>
              </div>
            </div>
          )}

          {/* Questions Table / List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[550px]">
            {!selectedExercise ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Select an exercise to manage its questions and step-by-step solutions
              </div>
            ) : loadingQuestions ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl m-2">
                <p className="font-semibold text-foreground mb-1">No questions created yet in Exercise {selectedExercise.number}</p>
                <p className="mb-3 text-[11px]">Type question statements or upload scanned question images, then author step-by-step solutions.</p>
                <Button size="sm" onClick={() => handleOpenQuestionModal(null)}>
                  <Plus className="size-3.5 mr-1" /> Add Question 1
                </Button>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No questions match the current search or filters.</div>
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
                        <span className="rounded-md bg-brand text-white font-extrabold text-xs px-2 py-0.5 font-mono">
                          Q {q.number}
                        </span>

                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                          {q.questionType || 'subjective'}
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
                          {q.difficulty || 'medium'} · {q.marks || 2}M
                        </span>

                        {/* Language Badges */}
                        <div className="flex items-center gap-0.5 ml-1">
                          {q.text?.en && (
                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1 rounded">
                              EN
                            </span>
                          )}
                          {q.text?.hi && (
                            <span className="text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-1 rounded">
                              HI
                            </span>
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
                          title="Click to toggle Question Publication status"
                        >
                          Q: {q.status === 'published' ? 'Published' : 'Draft'}
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
                            title="Click to toggle Solution Publication status"
                          >
                            Sol: {isSolPublished ? `Published (${methodsCount}M)` : 'Draft'}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-muted text-muted-foreground border border-border">
                            Sol: None
                          </span>
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
                          title="Click to zoom scanned question image"
                        >
                          <img src={firstImage.url} alt="Question Diagram" className="size-full object-cover" />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">
                            Zoom
                          </span>
                        </button>
                      )}

                      <div className="flex-1 line-clamp-2">
                        {q.text?.en || q.text?.hi ? (
                          <div dangerouslySetInnerHTML={{ __html: q.text?.en || q.text?.hi }} />
                        ) : hasImageAttachment ? (
                          <span className="text-muted-foreground italic flex items-center gap-1">
                            <ImageIcon className="size-3" /> [Scanned question page / diagram attached]
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">[No statement typed yet]</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[11px] gap-2">
                      <div className="flex items-center gap-2">
                        {/* Edit Question */}
                        <button
                          type="button"
                          onClick={() => handleOpenQuestionModal(q)}
                          className="font-bold text-foreground hover:text-brand inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="size-3" />
                          <span>Edit Q</span>
                        </button>

                        {/* Edit / Write Solution */}
                        <button
                          type="button"
                          onClick={() => handleOpenSolutionModal(q)}
                          className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer ml-2"
                        >
                          <Sparkles className="size-3" />
                          <span>{hasSolution ? 'Edit Solution & Methods' : '+ Write Solution'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Live Preview Link */}
                        <Link
                          to={`/reference-solutions/${selectedBook?.slug}/class-${selectedClass?.number}/${selectedChapter?.slug}/${selectedExercise?.slug}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-brand inline-flex items-center gap-1 font-semibold"
                          title="Preview student view"
                        >
                          <span>Live</span>
                          <ExternalLink className="size-3" />
                        </Link>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                          title="Duplicate Question"
                        >
                          <Copy className="size-3" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 cursor-pointer"
                          title="Delete Question"
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
      {/* MODAL 1: QUESTION EDITOR (MANUAL TYPING + SCANS)    */}
      {/* ==================================================== */}
      {questionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  {editingQuestionId ? `Edit Question ${questionForm.number}` : `Create New Question`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedBook?.title?.en} · Class {selectedClass?.number} · Chapter {selectedChapter?.number} · Exercise{' '}
                  {selectedExercise?.number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuestionModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Question Metadata Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Question No. *</label>
                  <input
                    type="text"
                    value={questionForm.number}
                    onChange={(e) => setQuestionForm({ ...questionForm, number: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                    placeholder="e.g. 1, 2(a)"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Type</label>
                  <select
                    value={questionForm.questionType}
                    onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                  >
                    <option value="subjective">Subjective</option>
                    <option value="objective">Objective / MCQ</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="long_answer">Long Answer</option>
                    <option value="proof">Proof / Verification</option>
                    <option value="numerical">Numerical</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="hots">HOTS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Marks</label>
                  <input
                    type="number"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Publication Status</label>
                  <select
                    value={questionForm.status}
                    onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold text-brand"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Unpublished)</option>
                  </select>
                </div>
              </div>

              {/* Optional Question Title */}
              <div>
                <label className="text-xs font-bold block mb-1">Question Title / Topic (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Find the domain and range of rational function"
                  value={questionForm.title.en}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, title: { ...questionForm.title, en: e.target.value } })
                  }
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>

              {/* Bilingual Statement Editor Tabs */}
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionTab('en')}
                      className={cn(
                        'px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors',
                        questionTab === 'en' ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      English Statement
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionTab('hi')}
                      className={cn(
                        'px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors',
                        questionTab === 'hi' ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      Hindi Statement (हिंदी प्रश्न)
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-semibold">Supports KaTeX: $...$ or $$...$$</span>
                </div>

                {/* Math Symbol Toolbar */}
                <div className="flex flex-wrap gap-1 mb-2 p-1.5 rounded-lg bg-muted/40 border">
                  <span className="text-[10px] font-bold text-muted-foreground flex items-center mr-1">Insert Math:</span>
                  {MATH_SHORTCUTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (questionTab === 'en') {
                          insertMathSnippet(item.snippet, questionForm.text.en, (val) =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              text: { ...prev.text, en: typeof val === 'function' ? val(prev.text.en) : val },
                            }))
                          );
                        } else {
                          insertMathSnippet(item.snippet, questionForm.text.hi, (val) =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              text: { ...prev.text, hi: typeof val === 'function' ? val(prev.text.hi) : val },
                            }))
                          );
                        }
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-background border border-border/80 hover:bg-brand hover:text-white transition-colors cursor-pointer"
                      title={item.title}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                {questionTab === 'en' ? (
                  <textarea
                    rows={4}
                    value={questionForm.text.en}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, text: { ...questionForm.text, en: e.target.value } })
                    }
                    placeholder="Type English question statement here. Wrap math in $...$ e.g. Solve for x: $x^2 - 4 = 0$"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:ring-1 focus:ring-brand font-medium"
                  />
                ) : (
                  <textarea
                    rows={4}
                    value={questionForm.text.hi}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, text: { ...questionForm.text, hi: e.target.value } })
                    }
                    placeholder="यहाँ हिंदी में प्रश्न टाइप करें। सूत्र $...$ में लिखें जैसे: $x$ का मान ज्ञात कीजिए।"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:ring-1 focus:ring-brand font-medium"
                  />
                )}
              </div>

              {/* Scanned Question Image / Diagram Attachment */}
              <div className="rounded-xl border border-dashed border-border p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-brand" />
                    <span>Upload Scanned Question Image / Diagram (Optional)</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMediaPickerTarget('question');
                      setMediaPickerOpen(true);
                    }}
                    className="h-7 text-xs font-bold"
                  >
                    <UploadCloud className="size-3.5 mr-1" /> Choose from Library / Upload
                  </Button>
                </div>

                {questionForm.attachments && questionForm.attachments.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {questionForm.attachments.map((att, attIdx) => (
                      <div
                        key={att._id || attIdx}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-background"
                      >
                        <div className="flex items-center gap-2">
                          {att.media?.url && (
                            <img src={att.media.url} alt="Attached Diagram" className="size-10 object-cover rounded" />
                          )}
                          <span className="text-xs truncate max-w-[200px] font-mono">
                            {att.media?.filename || att.media?.url || 'Uploaded Image'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQuestionForm({
                              ...questionForm,
                              attachments: questionForm.attachments.filter((_, idx) => idx !== attIdx),
                            });
                          }}
                          className="h-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    You can either type the question manually above, OR upload a scanned book page / handwritten diagram, or both!
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setQuestionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  <Save className="size-3.5 mr-1" />
                  {editingQuestionId ? 'Update Question' : 'Save Question'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: SOLUTION EDITOR (MULTIPLE METHODS & STEPS) */}
      {/* ==================================================== */}
      {solutionModal && activeQuestionForSolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 my-6 max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" />
                  <span>Author Solution for Question {activeQuestionForSolution.number}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Exercise {selectedExercise?.number} · {selectedBook?.title?.en}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSolutionModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Question Summary Bar for quick reference while authoring */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 mb-4 text-xs">
              <span className="font-extrabold text-brand uppercase tracking-wider text-[10px] block mb-1">
                Question Statement:
              </span>
              <p className="line-clamp-3 text-foreground font-medium">
                {activeQuestionForSolution.text?.en || activeQuestionForSolution.text?.hi || '[Scanned image question]'}
              </p>
            </div>

            {/* Methods Switcher Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Methods:</span>
                {methods.map((method, mIdx) => (
                  <button
                    key={mIdx}
                    type="button"
                    onClick={() => setActiveMethodIndex(mIdx)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      activeMethodIndex === mIdx
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {method.title?.en || `Method ${mIdx + 1}`}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleAddMethod}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand border border-brand/40 bg-brand/5 hover:bg-brand/10 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="size-3" />
                  <span>Add Alternative Method</span>
                </button>
              </div>

              {methods.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMethod(activeMethodIndex)}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3 mr-1" /> Remove Current Method
                </Button>
              )}
            </div>

            {/* Active Method Details & Step Builder */}
            {methods[activeMethodIndex] && (
              <div className="space-y-4 flex-1">
                {/* Method Title & Type Config */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/20">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold block mb-1">Method Title (e.g. Standard / Shortcut / Trick)</label>
                    <input
                      type="text"
                      value={methods[activeMethodIndex].title?.en || ''}
                      onChange={(e) => {
                        const updated = [...methods];
                        updated[activeMethodIndex] = {
                          ...updated[activeMethodIndex],
                          title: { ...updated[activeMethodIndex].title, en: e.target.value },
                        };
                        setMethods(updated);
                      }}
                      className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                      placeholder="e.g. Method 1: Standard Method"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Method Type</label>
                    <select
                      value={methods[activeMethodIndex].methodType || 'standard'}
                      onChange={(e) => {
                        const updated = [...methods];
                        updated[activeMethodIndex] = {
                          ...updated[activeMethodIndex],
                          methodType: e.target.value,
                        };
                        setMethods(updated);
                      }}
                      className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                    >
                      <option value="standard">Standard / Textbook Method</option>
                      <option value="shortcut">Shortcut / Competitive Trick</option>
                      <option value="alternative">Alternative Mathematical Method</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Step-by-Step Explanation Blocks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ListOrdered className="size-3.5 text-brand" />
                      <span>Step-by-Step Mathematical Explanation</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddStepToCurrentMethod}
                      className="h-7 text-xs font-bold"
                    >
                      <Plus className="size-3 mr-1" /> Add Next Step
                    </Button>
                  </div>

                  {methods[activeMethodIndex].blocks?.map((step, sIdx) => (
                    <div key={sIdx} className="rounded-xl border border-border bg-background p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-brand/10 text-brand font-extrabold text-xs px-2 py-0.5">
                          Step {sIdx + 1}
                        </span>
                        {methods[activeMethodIndex].blocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(sIdx)}
                            className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                            title="Remove Step"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>

                      {/* Math Toolbar for this step */}
                      <div className="flex flex-wrap gap-1 p-1 rounded-md bg-muted/40 border">
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center mr-1">Formula:</span>
                        {MATH_SHORTCUTS.slice(0, 10).map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              const updated = [...methods];
                              const currentStep = updated[activeMethodIndex].blocks[sIdx];
                              const currentContent = currentStep.content?.en || '';
                              currentStep.content = {
                                ...currentStep.content,
                                en: `${currentContent} $${item.snippet}$ `,
                              };
                              setMethods(updated);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-background border border-border/80 hover:bg-brand hover:text-white transition-colors cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Step Textarea */}
                      <textarea
                        rows={3}
                        value={step.content?.en || ''}
                        onChange={(e) => {
                          const updated = [...methods];
                          updated[activeMethodIndex].blocks[sIdx].content = {
                            ...updated[activeMethodIndex].blocks[sIdx].content,
                            en: e.target.value,
                          };
                          setMethods(updated);
                        }}
                        placeholder={`Write Step ${sIdx + 1} mathematical explanation. Use $...$ for equations, e.g. Substitute $x = 3$ into equation (1).`}
                        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs font-mono leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* Final Answer Highlight Box */}
                <div className="rounded-xl border-2 border-brand/40 bg-brand/5 p-3.5">
                  <span className="text-xs font-extrabold text-brand uppercase tracking-wider block mb-1">
                    Final Answer Summary
                  </span>
                  <input
                    type="text"
                    value={methods[activeMethodIndex].finalAnswer?.en || ''}
                    onChange={(e) => {
                      const updated = [...methods];
                      updated[activeMethodIndex] = {
                        ...updated[activeMethodIndex],
                        finalAnswer: { ...updated[activeMethodIndex].finalAnswer, en: e.target.value },
                      };
                      setMethods(updated);
                    }}
                    placeholder="e.g. Hence, the roots of the equation are $x = 2$ and $x = 3$."
                    className="w-full h-8.5 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* Solution Save Actions (Independent Publishing) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t mt-4">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-brand" />
                <span>You can save solution as Draft or Publish independently of the question status.</span>
              </span>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSolutionModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveSolution('draft')}
                  className="font-bold border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveSolution('published')}
                  className="font-bold bg-brand text-white hover:bg-brand/90"
                >
                  <Check className="size-3.5 mr-1" />
                  Save & Publish Solution
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: BOOK SETTINGS & CLASS ACCESS CONFIGURATION  */}
      {/* ==================================================== */}
      {bookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="text-base font-extrabold text-foreground">
                {isEditingBook ? `Edit Reference Book: ${bookForm.title?.en}` : `Add New Reference Book`}
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
                <label className="text-xs font-bold block mb-1">Book Name (English) *</label>
                <input
                  type="text"
                  placeholder="e.g. RS Aggarwal Solutions"
                  value={bookForm.title.en}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Book Name (Hindi)</label>
                <input
                  type="text"
                  placeholder="e.g. आर.एस. अग्रवाल गणित समाधान"
                  value={bookForm.title.hi}
                  onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Author Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. R.S. Aggarwal"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="e.g. Bharati Bhawan"
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Edition / Publication</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-27 Edition"
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Status</label>
                  <select
                    value={bookForm.status}
                    onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
                    className="w-full h-8.5 rounded-xl border border-border bg-background px-2 text-xs font-bold text-brand"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              {/* Available Classes Multi-Select */}
              <div>
                <label className="text-xs font-bold block mb-1.5">
                  Available Classes (Select classes enabled for this book) *
                </label>
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
                      >
                        Class {num} {checked ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setBookModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-brand text-white hover:bg-brand/90">
                  <Save className="size-3.5 mr-1" />
                  {isEditingBook ? 'Update Book Settings' : 'Create Book'}
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
              {editingChapterId ? 'Edit Chapter' : `Add Chapter to ${getBookDisplayName()}`}
            </h3>
            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Chapter Number *</label>
                <input
                  type="number"
                  value={chapterForm.number}
                  onChange={(e) => setChapterForm({ ...chapterForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Chapter Title (English) *</label>
                <input
                  type="text"
                  placeholder="e.g. Relations and Functions"
                  value={chapterForm.title.en}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Chapter Title (Hindi)</label>
                <input
                  type="text"
                  placeholder="e.g. सम्बन्ध एवं फलन"
                  value={chapterForm.title.hi}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: { ...chapterForm.title, hi: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setChapterModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Save Chapter
                </Button>
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
              {editingExerciseId ? 'Edit Exercise' : `Add Exercise to Chapter ${selectedChapter?.number}`}
            </h3>
            <form onSubmit={handleSaveExercise} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Exercise Number / Code *</label>
                <input
                  type="text"
                  placeholder="e.g. 1.1, 1.2, Miscellaneous"
                  value={exerciseForm.number}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, number: e.target.value })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Exercise Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Types of Relations"
                  value={exerciseForm.title.en}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: { ...exerciseForm.title, en: e.target.value } })}
                  className="w-full h-8.5 rounded-xl border border-border bg-background px-3 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setExerciseModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Save Exercise
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(mediaItem) => {
          if (mediaPickerTarget === 'question') {
            setQuestionForm((prev) => ({
              ...prev,
              attachments: [
                ...prev.attachments,
                {
                  media: mediaItem,
                  kind: 'image',
                  caption: { en: mediaItem.title || '', hi: '' },
                  placement: 'question',
                },
              ],
            }));
          }
          setMediaPickerOpen(false);
        }}
      />

      {/* Preview Image Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-background p-2">
            <img src={previewImageModal} alt="Zoom Preview" className="max-h-[85vh] object-contain mx-auto" />
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
