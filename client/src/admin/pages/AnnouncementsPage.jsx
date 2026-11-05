import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import { adminUrl } from '@/lib/config';
import { EditorShell } from '../components/EditorShell.jsx';
import { DateTimeField, Field, L10nField, SelectField, SwitchField } from '../components/fields/Fields.jsx';
import { LocalizedCell } from '../components/LocalizedCell.jsx';
import { Panel } from '../components/PageHeader.jsx';
import { ResourceListPage } from '../components/ResourceListPage.jsx';
import { EditorGate, useEditorForm } from '../lib/useEditorForm.jsx';

export function AnnouncementsList() {
  useUiLanguage();
  return (
    <ResourceListPage
      resource="announcements"
      hasStatus={false}
      title={uiText("Announcements (सूचनाएं व घोषणाएं)")}
      description={uiText("Create and broadcast urgent announcements, exam alerts, and updates to students on the website header and homepage.")}
      createPath={adminUrl('announcements/new')}
      createLabel={uiText("New Announcement")}
      editPath={(item) => adminUrl(`announcements/${item._id}`)}
      rowLabel={(a) => adminText(a.text) || uiText("Announcement")}
      columns={[
        { get header() { return uiText("Badge"); }, className: 'w-24', cell: (a) => <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{adminText(a.badge) || uiText("Notice")}</span> },
        { get header() { return uiText("Text"); }, cell: (a) => <LocalizedCell value={a.text} /> },
        { get header() { return uiText("Variant"); }, className: 'hidden sm:table-cell', cell: (a) => <span className="capitalize text-xs font-semibold">{a.variant || uiText("brand")}</span> },
        {
          get header() { return uiText("Visible"); },
          className: 'w-20',
          cell: (a) => (
            <span className={`text-xs font-semibold ${a.isVisible !== false ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {a.isVisible !== false ? uiText("Active") : uiText("Hidden")}
            </span>
          ),
        },
      ]}
    />
  );
}

export function AnnouncementEditor({ id }) {
  useUiLanguage();
  const form = useEditorForm({
    resource: 'announcements',
    id,
    basePath: adminUrl('announcements'),
    entityType: 'Announcement',
    defaults: () => ({
      badge: { hi: 'सूचना', en: 'New Alert', mixed: 'New' },
      text: { hi: '', en: '', mixed: '' },
      linkLabel: { hi: 'अधिक जानें', en: 'Learn more', mixed: 'Learn more' },
      linkUrl: '',
      variant: 'brand',
      startsAt: null,
      endsAt: null,
      isVisible: true,
      sortOrder: 0,
    }),
  });

  const { doc, set, isNew } = form;

  return (
    <EditorGate form={form}>
      {() => (
      <EditorShell
        form={form}
        hasStatus={false}
        title={isNew ? uiText("New Announcement") : uiTemplate`Announcement — ${adminText(doc.text) || ''}`}
      >
        <div className="grid gap-6">
          <Panel title={uiText("Announcement Message")}>
            <L10nField label={uiText("Badge Text")} value={doc.badge} onChange={(badge) => set('badge', badge)} placeholder={uiText("e.g. Exam Alert / नया अपडेट")} required />
            <L10nField label={uiText("Main Text")} value={doc.text} onChange={(text) => set('text', text)} placeholder={uiText("e.g. Class 10 Board Exam 2026 Sample Papers and Solutions are now available!")} required />

            <div className="grid gap-4 sm:grid-cols-2">
              <L10nField label={uiText("Link Button Label (Optional)")} value={doc.linkLabel} onChange={(linkLabel) => set('linkLabel', linkLabel)} placeholder={uiText("e.g. View Sample Papers")} />
              <Field label={uiText("Link Destination URL")}>
                <input
                  type="text"
                  value={doc.linkUrl || ''}
                  onChange={(e) => set('linkUrl', e.target.value)}
                  placeholder={uiText("/class-10/maths/resources or https://...")}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                />
              </Field>
            </div>

            <SelectField
              label={uiText("Color Theme / Variant")}
              value={doc.variant || 'brand'}
              onChange={(variant) => set('variant', variant)}
              options={[
                { value: 'brand', get label() { return uiText("Brand (Indigo / Blue)"); } },
                { value: 'info', get label() { return uiText("Info (Sky Blue)"); } },
                { value: 'success', get label() { return uiText("Success (Green)"); } },
                { value: 'warning', get label() { return uiText("Warning (Orange / Saffron)"); } },
              ]}
            />
          </Panel>

          <Panel title={uiText("Visibility & Schedule")}>
            <SwitchField
              label={uiText("Active & Visible")}
              hint={uiText("Instantly broadcast or hide this announcement from students.")}
              checked={doc.isVisible !== false}
              onChange={(isVisible) => set('isVisible', isVisible)}
            />
            <DateTimeField label={uiText("Starts at")} value={doc.startsAt} onChange={(value) => set('startsAt', value || null)} />
            <DateTimeField label={uiText("Ends at")} value={doc.endsAt} onChange={(value) => set('endsAt', value || null)} />
          </Panel>
        </div>
      </EditorShell>
      )}
    </EditorGate>
  );
}
