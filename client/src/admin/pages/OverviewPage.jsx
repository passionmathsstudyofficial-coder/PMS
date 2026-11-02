import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, BookOpenCheck, CircleHelp, Clock, FileDown, FileText, GraduationCap, Image, Layers, ListOrdered, Megaphone, MonitorPlay as Youtube, Plus, Route, Star } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/site/States.jsx';
import { get } from '@/lib/api';
import { adminUrl } from '@/lib/config';
import { useReveal } from '@/lib/motion';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { timeAgo } from '../lib/format.js';

const CARDS = [
  { key: 'students', get label() { return uiText('Students'); }, icon: GraduationCap, to: 'students', permission: 'users:manage' },
  { key: 'classes', get label() { return uiText("Classes"); }, icon: GraduationCap, to: 'classes' },
  { key: 'chapters', get label() { return uiText("Chapters"); }, icon: Layers, to: 'chapters' },
  { key: 'topics', get label() { return uiText("Topics"); }, icon: BookOpen, to: 'topics' },
  { key: 'resources', get label() { return uiText("PDFs & Files"); }, icon: FileDown, to: 'resources' },
  { key: 'books', get label() { return uiText("Books"); }, icon: BookOpenCheck, to: 'books' },
  { key: 'videos', get label() { return uiText("Videos"); }, icon: Youtube, to: 'videos' },
  { key: 'notes', get label() { return uiText("Notes"); }, icon: FileText, to: 'notes' },
  { key: 'exercises', get label() { return uiText("Exercises"); }, icon: ListOrdered, to: 'exercises' },
  { key: 'questions', get label() { return uiText("Questions"); }, icon: CircleHelp, to: 'questions' },
  { key: 'solutions', get label() { return uiText("Solutions"); }, icon: Route, to: 'solutions' },
  { key: 'announcements', get label() { return uiText("Notices"); }, icon: Megaphone, to: 'announcements' },
];

const EDIT_PATHS = {
  classes: 'classes',
  chapters: 'chapters',
  topics: 'topics',
  resources: 'resources',
  books: 'books',
  announcements: 'announcements',
  exercises: 'exercises',
  questions: 'questions',
  notes: 'notes',
  'important-questions': 'important-questions',
  pages: 'pages',
  sections: 'homepage',
};

export default function OverviewPage() {
  useUiLanguage();
  const ref = useRef(null);
  const { admin, can } = useAdminAuth();
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => get('/dashboard') });
  useReveal(ref, { dependencies: [dashboard.isSuccess], y: 12, stagger: 0.03 });
  const data = dashboard.data;

  return (
    <div ref={ref}>
      <PageHeader
        title={uiTemplate`Welcome, ${admin?.name?.split(' ')[0] || 'Admin'}`}
        description={uiText("Everything on the student website is managed from here.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={adminUrl('topics/new')}>
                <Plus className="size-4" />{uiText("Topic")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={adminUrl('resources/new')}>
                <Plus className="size-4" />{' '}{uiText("PDF / File")}{' '}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={adminUrl('books/new')}>
                <Plus className="size-4" />{uiText("Book")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={adminUrl('chapters/new')}>
                <Plus className="size-4" />{uiText("Chapter")}</Link>
            </Button>
          </div>
        }
      />

      {dashboard.isError && <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.filter(card => !card.permission || can(card.permission)).map(({ key, label, icon: IconComponent, to }) => (
          <Link key={key} to={adminUrl(to)} data-reveal className="group rounded-2xl border bg-card p-4 transition hover:border-brand/40 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <IconComponent className="size-4 text-muted-foreground group-hover:text-brand" />
            </div>
            {dashboard.isPending ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 font-heading text-3xl font-extrabold">{data?.totals?.[key] ?? 0}</p>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { get label() { return uiText("Published"); }, value: data?.totals?.published, className: 'text-success' },
          { get label() { return uiText("Drafts"); }, value: data?.totals?.draft, className: 'text-muted-foreground' },
          { get label() { return uiText("Scheduled"); }, value: data?.totals?.scheduled, className: 'text-warning' },
        ].map((item) => (
          <div key={item.label} data-reveal className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4">
            <span className="text-sm font-semibold">{item.localizedLabel ? adminText(item.localizedLabel) : uiText(item.label)}</span>
            <span className={`font-heading text-2xl font-extrabold ${item.className}`}>{item.value ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Panel title={uiText("Recently edited")} className="xl:col-span-2" bodyClassName="p-0">
          {dashboard.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {(data?.recent || []).map((item) => (
                <li key={`${item.resource}-${item.id}`}>
                  <Link to={adminUrl(`${EDIT_PATHS[item.resource]}/${item.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.localizedLabel ? adminText(item.localizedLabel) : uiText(item.label)}</span>
                      <span className="text-xs text-muted-foreground">
                        {uiText(item.type)} · {timeAgo(item.updatedAt)}
                        {item.updatedBy ? ` · ${item.updatedBy}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
              {data?.recent?.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">{uiText("No content yet.")}</li>}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title={uiText("Content status")}>
            <ul className="space-y-2 text-sm">
              {Object.entries(data?.content || {}).map(([resource, stats]) => (
                <li key={resource} className="flex items-center justify-between gap-2">
                  <span className="capitalize">{uiText(resource)}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-success">{stats.published}</span>{' '}{uiText("pub ·")}{' '}{stats.draft}{uiText("draft")}{stats.scheduled ? uiTemplate` · ${stats.scheduled} sched` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          {can('activity:read') && data?.security && (
            <Panel title={uiText("Security (last 24 h)")}>
              <div className="flex items-center gap-3 text-sm">
                <AlertTriangle className={data.security.failedLogins24h ? 'size-5 text-warning' : 'size-5 text-muted-foreground'} />
                <span>
                  <strong>{data.security.failedLogins24h}</strong>{uiText("failed sign-ins ·")}<strong>{data.security.lockouts24h}</strong>{uiText("lockouts")}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {data.activity.slice(0, 5).map((log) => (
                  <li key={log._id} className="flex items-start gap-2 text-xs">
                    <Clock className="mt-0.5 size-3.5 text-muted-foreground" />
                    <span>
                      <strong>{log.adminName || log.adminEmail || uiText("Someone")}</strong> {uiText(log.action)} {log.entityLabel && <em>“{log.entityLabel}”</em>}
                      <span className="block text-muted-foreground">{timeAgo(log.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="link" className="mt-2 px-0">
                <Link to={adminUrl('activity')}>{uiText("All activity →")}</Link>
              </Button>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
