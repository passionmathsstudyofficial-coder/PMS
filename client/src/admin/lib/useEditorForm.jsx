import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { ErrorState, PageSkeleton } from '@/components/site/States.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { docLabel } from './format.js';
import { useResourceItem, useResourceMutations } from './resources.js';

const identity = (value) => value;

/**
 * Loads a document into a local form, tracks unsaved changes and handles save / publish / duplicate / delete.
 * Editors are mounted with key={id}, so each document gets a fresh form.
 */
export function useEditorForm({ resource, id, defaults, basePath, toForm = identity, fromForm = identity, label = docLabel }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const isNew = !id || id === 'new';
  const item = useResourceItem(resource, isNew ? null : id);
  const mutations = useResourceMutations(resource);
  const [initialDefaults] = useState(() => (typeof defaults === 'function' ? defaults() : defaults));
  const [form, setFormState] = useState(() => (isNew ? initialDefaults : null));
  const [baseline, setBaseline] = useState(() => (isNew ? JSON.stringify(initialDefaults) : null));
  const [redirect, setRedirect] = useState(null);
  const dirty = form !== null && JSON.stringify(form) !== baseline;

  useEffect(() => {
    if (isNew || !item.data || form) return;
    const next = toForm(item.data);
    setFormState(next);
    setBaseline(JSON.stringify(next));
  }, [isNew, item.data, form, toForm]);

  // Navigate only after the saved state is committed, so the unsaved-changes guard never fires on success.
  useEffect(() => {
    if (redirect && !dirty) navigate(redirect.to, { replace: redirect.replace });
  }, [redirect, dirty, navigate]);

  const setField = (key, value) => setFormState((current) => ({ ...current, [key]: value }));
  const setForm = (updater) => setFormState((current) => (typeof updater === 'function' ? updater(current) : updater));

  /** Sets values without marking the form dirty (async defaults such as the default subject). */
  const initialize = (patch) => {
    const next = { ...form, ...patch };
    setFormState(next);
    setBaseline(JSON.stringify(next));
  };

  const save = async (overrides = {}) => {
    const previousStatus = form.status;
    let doc;
    try {
      doc = await mutations.save.mutateAsync({ id: isNew ? null : id, data: fromForm({ ...form, ...overrides }) });
    } catch {
      return null;
    }
    const next = toForm(doc);
    setFormState(next);
    setBaseline(JSON.stringify(next));
    const status = overrides.status;
    const scheduled = doc.publishedAt && new Date(doc.publishedAt) > new Date();
    if (status === 'published' && previousStatus !== 'published') toast.success(scheduled ? uiText("Scheduled for publishing") : uiText("Published — now live on the website"));
    else if (status === 'draft' && previousStatus === 'published') toast.success(uiText("Unpublished — saved as draft"));
    else if (status === 'archived') toast.success(uiText("Archived"));
    else toast.success(uiText("Saved"));
    if (isNew) setRedirect({ to: `${basePath}/${doc._id}`, replace: true });
    return doc;
  };

  const duplicate = async () => {
    if (dirty) {
      const ok = await confirm({ get title() { return uiText("Duplicate the last saved version?"); }, get description() { return uiText("Your unsaved changes are not included in the copy and will be discarded."); }, get confirmLabel() { return uiText("Duplicate"); } });
      if (!ok) return;
    }
    try {
      const copy = await mutations.duplicate.mutateAsync(id);
      setBaseline(JSON.stringify(form));
      setRedirect({ to: `${basePath}/${copy._id}`, replace: false });
    } catch {
      /* toast shown by mutation */
    }
  };

  const remove = async ({ force = false, description } = {}) => {
    const ok = await confirm({
      get title() { return uiTemplate`Delete “${label(item.data)}”?`; },
      description: description || uiText("This permanently deletes only this item. Anything that still contains other content is protected and cannot be deleted."),
      get confirmLabel() { return uiText("Delete permanently"); },
      destructive: true,
      onConfirm: () => mutations.remove.mutateAsync({ id, force }),
    });
    if (ok) {
      setBaseline(JSON.stringify(form));
      setRedirect({ to: basePath, replace: true });
    }
  };

  return {
    isNew,
    item,
    doc: form || item.data,
    originalDoc: item.data,
    form,
    setForm,
    setField,
    set: setField,
    initialize,
    dirty,
    saving: mutations.save.isPending,
    save,
    duplicate,
    remove,
  };
}

export function EditorGate({ editor, form, children }) {
  useUiLanguage();
  const ed = editor || form;
  if (!ed) return <PageSkeleton />;
  if (!ed.isNew && ed.item?.isError) {
    return <ErrorState error={ed.item.error} onRetry={ed.item.refetch} title={uiText("Could not load this item")} />;
  }
  if (!ed.form) return <PageSkeleton />;
  return typeof children === 'function' ? children() : children;
}
