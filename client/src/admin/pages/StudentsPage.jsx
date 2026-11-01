import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/site/States.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
export default function StudentsPage() {
  useUiLanguage();
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'students', q, page], queryFn: () => get('/students', { q, page, limit: 25 }) });
  const update = useMutation({ mutationFn: user => api.put(`/students/${user._id}`, { isActive: !user.isActive }), onSuccess: () => { client.invalidateQueries({ queryKey: ['admin', 'students'] }); toast.success(uiText('Saved')); }, onError: error => toast.apiError(error) });
  return <div className="space-y-5"><PageHeader title={uiText('Students')} /><Input aria-label={uiText('Search')} placeholder={uiText('Search')} value={q} onChange={event => { setQ(event.target.value); setPage(1); }} />
    {query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : query.isPending ? <p>{uiText('Loading…')}</p> : <>
      <p className="text-sm text-muted-foreground">{query.data.total} {uiText('Students')}</p>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr>{['Name', 'Email', 'Status', 'Actions'].map(label => <th className="p-3" key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{query.data.items.map(user => <tr className="border-t" key={user._id}><td className="p-3">{user.name}</td><td className="p-3">{user.email}</td><td className="p-3">{uiText(user.isActive ? 'Active' : 'Deactivated')}</td><td className="p-3"><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate(user)}>{uiText(user.isActive ? 'Deactivate' : 'Activate')}</Button></td></tr>)}</tbody></table></div>
      {!query.data.total && <p>{uiText('No results found')}</p>}
      <div className="flex gap-3"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>{uiText('Previous')}</Button><span>{page} / {query.data.pages}</span><Button disabled={page >= query.data.pages} onClick={() => setPage(page + 1)}>{uiText('Next')}</Button></div>
    </>}
  </div>;
}
