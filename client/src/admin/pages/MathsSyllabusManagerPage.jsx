import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminUrl } from '@/lib/config';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { RefSelect } from '../components/fields/RefSelect.jsx';
import { AcademicSessionField } from '../components/fields/AcademicSessionField.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { refId, useResourceList } from '../lib/resources.js';

export default function MathsSyllabusManagerPage() {
  useUiLanguage();
  const [classDoc, setClassDoc] = useState(null);
  const [session, setSession] = useState('2026-27');
  const classId = refId(classDoc);
  const chapters = useResourceList('chapters', { class: classId, book: 'none', academicSession: session, limit: 200, scope: 'admin' });
  const resources = useResourceList('resources', { class: classId, resourceType: 'syllabus', academicSession: session, limit: 100, scope: 'admin' });
  const query = new URLSearchParams({ ...(classId ? { class: classId } : {}), session });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{uiText('Maths Syllabus')}</h1>
        <p className="text-sm text-muted-foreground">{uiText('Manage the published syllabus using the existing chapter, topic, and PDF records.')}</p>
      </div>
      <Panel title={uiText('Syllabus scope')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <RefSelect label={uiText('Class')} resource="classes" value={classDoc} onChange={setClassDoc} />
          <AcademicSessionField value={session} onChange={setSession} />
        </div>
      </Panel>
      {classId && <>
        <Panel title={uiText('Syllabus chapters')} actions={<Button asChild size="sm"><Link to={adminUrl(`chapters/new?${query}`)}><Plus />{uiText('Add chapter')}</Link></Button>}>
          {chapters.data?.items?.length ? <ul className="divide-y">{chapters.data.items.map((chapter) => <li key={chapter._id} className="flex flex-wrap items-center gap-3 py-3">
            <Link className="min-w-0 flex-1 font-medium hover:underline" to={adminUrl(`chapters/${chapter._id}`)}>{chapter.number}. {chapter.title?.en || chapter.title?.hi || uiText('Untitled chapter')}</Link>
            <StatusBadge doc={chapter} />
            <Button asChild size="sm" variant="outline"><Link to={adminUrl(`topics/new?chapter=${chapter._id}`)}><Plus />{uiText('Add topic')}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to={adminUrl(`chapters/${chapter._id}`)}><ImageIcon />{uiText('Edit description & media')}</Link></Button>
          </li>)}</ul> : <p className="text-sm text-muted-foreground">{uiText('No chapters for this class and session yet.')}</p>}
        </Panel>
        <Panel title={uiText('Syllabus PDFs')} actions={<Button asChild size="sm"><Link to={adminUrl(`resources/new?${new URLSearchParams({ ...Object.fromEntries(query), resourceType: 'syllabus' })}`)}><Plus />{uiText('Upload syllabus PDF')}</Link></Button>}>
          {resources.data?.items?.length ? <ul className="divide-y">{resources.data.items.map((resource) => <li key={resource._id} className="flex items-center gap-3 py-3"><FileText className="size-4" /><Link className="min-w-0 flex-1 font-medium hover:underline" to={adminUrl(`resources/${resource._id}`)}>{resource.title?.en || resource.title?.hi || uiText('Syllabus PDF')}</Link><StatusBadge doc={resource} /></li>)}</ul> : <p className="text-sm text-muted-foreground">{uiText('No syllabus PDFs for this class and session yet.')}</p>}
        </Panel>
      </>}
    </div>
  );
}
