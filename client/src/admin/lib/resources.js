import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/notifications.jsx';
import { api, errorMessage, get } from '@/lib/api';

export const RESOURCES = {
  'study-classes': { endpoint: '/study-classes', singular: 'Class', plural: 'Classes', entityType: 'StudyClass' },
  'study-chapters': { endpoint: '/study-chapters', singular: 'Chapter', plural: 'Chapters', entityType: 'StudyChapter' },
  'study-topics': { endpoint: '/study-topics', singular: 'Topic', plural: 'Topics', entityType: 'StudyTopic' },
  'question-categories': { endpoint: '/question-categories', singular: 'Question category', plural: 'Question categories', entityType: 'QuestionCategory' },
  'question-sets': { endpoint: '/question-sets', singular: 'Question set', plural: 'Question sets', entityType: 'QuestionSet' },
  'book-classes': { endpoint: '/book-classes', singular: 'Book class', plural: 'Book classes', entityType: 'BookClass' },
  classes: { endpoint: '/classes', get singular() { return uiText("Class"); }, get plural() { return uiText("Classes"); }, entityType: 'Class' },
  subjects: { endpoint: '/subjects', get singular() { return uiText("Subject"); }, get plural() { return uiText("Subjects"); }, entityType: 'Subject' },
  chapters: { endpoint: '/chapters', get singular() { return uiText("अध्याय (Chapter)"); }, get plural() { return uiText("Chapters"); }, entityType: 'Chapter' },
  exercises: { endpoint: '/exercises', get singular() { return uiText("प्रश्नावली (Exercise)"); }, get plural() { return uiText("Exercises"); }, entityType: 'Exercise' },
  questions: { endpoint: '/questions', get singular() { return uiText("Question"); }, get plural() { return uiText("Questions"); }, entityType: 'Question' },
  solutions: { endpoint: '/solutions', get singular() { return uiText("Solution"); }, get plural() { return uiText("Solutions"); }, entityType: 'Solution' },
  notes: { endpoint: '/notes', get singular() { return uiText("Note"); }, get plural() { return uiText("Notes"); }, entityType: 'Note' },
  'important-questions': { endpoint: '/important-questions', get singular() { return uiText("Important Question"); }, get plural() { return uiText("Important Questions"); }, entityType: 'ImportantQuestion' },
  pages: { endpoint: '/pages', get singular() { return uiText("Page"); }, get plural() { return uiText("Pages"); }, entityType: 'Page' },
  sections: { endpoint: '/sections', get singular() { return uiText("Section"); }, get plural() { return uiText("Homepage Sections"); }, entityType: 'Section' },
  'related-content': { endpoint: '/related-content', get singular() { return uiText("Related Content"); }, get plural() { return uiText("Related Content"); }, entityType: 'RelatedContent' },
  templates: { endpoint: '/templates', get singular() { return uiText("Template"); }, get plural() { return uiText("Templates"); }, entityType: 'Template' },
  'ad-slots': { endpoint: '/ad-slots', get singular() { return uiText("Ad Space"); }, get plural() { return uiText("Ad Spaces"); }, entityType: 'AdSlot' },
  announcements: { endpoint: '/announcements', get singular() { return uiText("Announcement"); }, get plural() { return uiText("Announcements"); }, entityType: 'Announcement' },
  videos: { endpoint: '/videos', get singular() { return uiText("Video"); }, get plural() { return uiText("YouTube Videos"); }, entityType: 'Video' },
  media: { endpoint: '/media', get singular() { return uiText("Media"); }, get plural() { return uiText("Media"); }, entityType: 'Media' },
  topics: { endpoint: '/topics', get singular() { return uiText("Topic"); }, get plural() { return uiText("Topics"); }, entityType: 'Topic' },
  resources: { endpoint: '/resources', get singular() { return uiText("Resource"); }, get plural() { return uiText("Resources"); }, entityType: 'Resource' },
  books: { endpoint: '/books', get singular() { return uiText("Book"); }, get plural() { return uiText("Books"); }, entityType: 'Book' },
};

const REF_KEYS = new Set([
  'media', 'video', 'ogImage', 'image', 'featuredImage', 'introVideo', 'introVideoEn', 'introVideoHi', 'thumbnail', 'logo', 'footerLogo', 'favicon',
  'defaultOgImage', 'class', 'subject', 'chapter', 'exercise', 'question', 'linkedQuestion', 'template', 'target', 'source',
  'topic', 'resource', 'book', 'studyClass', 'studyChapter', 'studyTopic', 'questionCategory', 'questionSet', 'pdfFile',
]);
const REF_ARRAY_KEYS = new Set(['subjects', 'relatedChapters', 'classes', 'chapters', 'questions', 'importantQuestions', 'notes', 'videos', 'gallery', 'topics', 'resources', 'books']);
const READ_ONLY = new Set(['__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'searchText']);

export const refId = (value) => (value && typeof value === 'object' ? value._id : value) || undefined;

/** Converts populated references back to ids before saving (the API stores references, not copies). */
export function normalizeRefs(value, key) {
  if (Array.isArray(value)) {
    return REF_ARRAY_KEYS.has(key) ? value.map(refId).filter(Boolean) : value.map((v) => normalizeRefs(v));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if (key && REF_KEYS.has(key) && value._id) return value._id;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (READ_ONLY.has(k)) continue;
      out[k] = normalizeRefs(v, k);
    }
    return out;
  }
  if (key && REF_KEYS.has(key) && value === '') return null;
  return value;
}

export function useResourceList(resource, params = {}, options = {}) {
  const { endpoint } = RESOURCES[resource];
  return useQuery({
    queryKey: ['admin', resource, 'list', params],
    queryFn: () => get(endpoint, { scope: 'admin', ...params }),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useResourceItem(resource, id, options = {}) {
  const { endpoint } = RESOURCES[resource];
  return useQuery({
    queryKey: ['admin', resource, 'item', id],
    queryFn: () => get(`${endpoint}/${id}`),
    enabled: Boolean(id) && id !== 'new',
    ...options,
  });
}

export function useResourceMutations(resource) {
  const queryClient = useQueryClient();
  const meta = RESOURCES[resource];
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', resource] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['resolve'] });
    queryClient.invalidateQueries({ queryKey: ['site'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['search'] });
  };
  const onError = (error) => toast.apiError(error);

  const save = useMutation({
    mutationFn: ({ id, data }) => {
      const payload = normalizeRefs(data);
      delete payload._id;
      return (id && id !== 'new' ? api.put(`${meta.endpoint}/${id}`, payload) : api.post(meta.endpoint, payload)).then((r) => r.data);
    },
    onSuccess: (doc) => {
      invalidate();
      queryClient.setQueryData(['admin', resource, 'item', doc._id], doc);
    },
    onError,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status, publishedAt }) => api.patch(`${meta.endpoint}/${id}/status`, { status, publishedAt }).then((r) => r.data),
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(vars.status === 'published' ? uiText("Published") : vars.status === 'archived' ? uiText("Archived") : uiText("Moved to draft"));
    },
    onError,
  });

  const duplicate = useMutation({
    mutationFn: (id) => api.post(`${meta.endpoint}/${id}/duplicate`).then((r) => r.data),
    onSuccess: () => {
      invalidate();
      toast.success(uiTemplate`${meta.singular} duplicated as a draft`);
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: ({ id, force }) => api.delete(`${meta.endpoint}/${id}`, { params: force ? { force: 'true' } : undefined }).then((r) => r.data),
    onSuccess: () => {
      invalidate();
      toast.success(uiTemplate`${meta.singular} deleted`);
    },
    onError,
  });

  const reorder = useMutation({
    mutationFn: (ids) => api.put(`${meta.endpoint}/reorder`, { ids }).then((r) => r.data),
    onSuccess: () => {
      invalidate();
      toast.success(uiText("Order saved"));
    },
    onError,
  });

  return { save, setStatus, duplicate, remove, reorder };
}
