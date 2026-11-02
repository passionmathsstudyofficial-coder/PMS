import { adminText } from '../lib/format.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useSearchParams } from 'react-router';
import { useResourceList } from '../lib/resources.js';

const selectClass = 'h-9 max-w-[16rem] rounded-lg border bg-background px-2 text-sm disabled:opacity-50';

/** Hierarchical URL filters: changing a parent (class) clears its children (chapter, exercise). */
export function useQueryFilters(keys) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']));
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    keys.slice(keys.indexOf(key)).forEach((k) => next.delete(k));
    if (value) next.set(key, value);
    setParams(next, { replace: true });
  };
  const active = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
  return [values, set, active];
}

export function ClassFilter({ value, onChange, label = uiText("All classes") }) {
  useUiLanguage();
  const list = useResourceList('classes', { limit: 100 });
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={selectClass} aria-label={uiText("Filter by class")}>
      <option value="">{uiText(label)}</option>
      {(list.data?.items || []).map((c) => (
        <option key={c._id} value={c._id}>{uiText("Class")}{' '}{c.number}
        </option>
      ))}
    </select>
  );
}

export function ChapterFilter({ classId, value, onChange }) {
  useUiLanguage();
  const list = useResourceList('chapters', { class: classId, limit: 200 }, { enabled: Boolean(classId) });
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={!classId} className={selectClass} aria-label={uiText("Filter by अध्याय")}>
      <option value="">{classId ? uiText("All अध्याय") : uiText("Choose a class first")}</option>
      {classId &&
        (list.data?.items || []).map((c) => (
          <option key={c._id} value={c._id}>{' '}{uiText("अध्याय")}{' '}{c.number} — {adminText(c.title)}
          </option>
        ))}
    </select>
  );
}

export function ExerciseFilter({ chapterId, value, onChange }) {
  useUiLanguage();
  const list = useResourceList('exercises', { chapter: chapterId, limit: 200 }, { enabled: Boolean(chapterId) });
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={!chapterId} className={selectClass} aria-label={uiText("Filter by प्रश्नावली")}>
      <option value="">{chapterId ? uiText("All प्रश्नावली") : uiText("Choose an अध्याय first")}</option>
      {chapterId &&
        (list.data?.items || []).map((e) => (
          <option key={e._id} value={e._id}>{' '}{uiText("प्रश्नावली")}{' '}{e.number}
          </option>
        ))}
    </select>
  );
}
