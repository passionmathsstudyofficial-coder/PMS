import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { SelectField } from './Fields.jsx';

const DEFAULT_SESSIONS = [
  { name: '2026–27', slug: '2026-27', isCurrent: true },
  { name: '2025–26', slug: '2025-26' },
  { name: '2024–25', slug: '2024-25' },
];

export function AcademicSessionField({ value, onChange, label }) {
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  useEffect(() => {
    let active = true;
    get('/content/sessions').then((result) => {
      if (active && result.items?.length) setSessions(result.items);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const options = sessions.map((session) => ({ value: session.slug || session.name, label: session.name }));
  if (value && !options.some((option) => option.value === value)) options.unshift({ value, label: value.replace('-', '–') });
  return <SelectField label={label || uiText('Academic session')} value={value || sessions.find((session) => session.isCurrent)?.slug || '2026-27'} onChange={onChange} options={options} />;
}
