import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState } from '@/components/site/States.jsx';
import { api, errorMessage, get } from '@/lib/api';
import { adminUrl } from '@/lib/config';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useUnsavedGuard } from '../components/EditorShell.jsx';
import { ColorField, DateTimeField, Field, L10nField, NumberField, SelectField, SwitchField, TextField } from '../components/fields/Fields.jsx';
import { RefSelect } from '../components/fields/RefSelect.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { ROBOTS_OPTIONS } from '../components/SeoFields.jsx';
import { DragHandle, SortableList, clientKey, moveItem, withKeys } from '../components/SortableList.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { normalizeRefs, useResourceList, useResourceMutations } from '../lib/resources.js';
import { ListEditor } from './HomepagePages.jsx';

export function useSiteSettingsForm() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'site-settings'], queryFn: () => get('/site-settings', { scope: 'admin' }) });
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);

  useEffect(() => {
    if (query.data && !form) {
      setForm(query.data);
      setBaseline(JSON.stringify(query.data));
    }
  }, [query.data, form]);

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;
  useUnsavedGuard(dirty);

  const mutation = useMutation({
    mutationFn: (sections) => api.put('/site-settings', normalizeRefs(Object.fromEntries(sections.map((s) => [s, form[s]])))).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'site-settings'], data);
      queryClient.invalidateQueries({ queryKey: ['site'] });
      setForm(data);
      setBaseline(JSON.stringify(data));
      toast.success(uiText("Settings saved — the website is updated"));
    },
    onError: (error) => toast.apiError(error),
  });

  return {
    query,
    form,
    dirty,
    saving: mutation.isPending,
    save: (sections) => mutation.mutate(sections),
    setSection: (section, value) => setForm((f) => ({ ...f, [section]: value })),
    patch: (section, values) => setForm((f) => ({ ...f, [section]: { ...(f[section] || {}), ...values } })),
  };
}

export function SaveBar({ dirty, saving, onSave, label = uiText("Save changes") }) {
  useUiLanguage();
  return (
    <div className="sticky bottom-0 z-10 -mx-3 mt-6 flex items-center justify-end gap-3 border-t bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <span className={dirty ? 'text-xs font-semibold text-warning' : 'text-xs text-muted-foreground'}>{dirty ? uiText("Unsaved changes") : uiText("All changes saved")}</span>
      <Button onClick={onSave} disabled={saving || !dirty}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} {label}
      </Button>
    </div>
  );
}

function SettingsGate({ settings, children }) {
  useUiLanguage();
  if (settings.query.isError) return <ErrorState error={settings.query.error} onRetry={settings.query.refetch} />;
  if (!settings.form) return <Skeleton className="h-96 rounded-2xl" />;
  return children();
}

const SOCIAL_PLATFORMS = ['youtube', 'facebook', 'instagram', 'x', 'telegram', 'whatsapp', 'linkedin', 'website'].map((value) => ({ value, label: value === 'x' ? 'X (Twitter)' : value[0].toUpperCase() + value.slice(1) }));

export function WebsiteSettingsPage() {
  useUiLanguage();
  const settings = useSiteSettingsForm();
  const { form, patch, setSection } = settings;
  return (
    <div>
      <PageHeader title={uiText("Website Settings")} description={uiText("Brand, logo, contact details, social links and colours.")} />
      <SettingsGate settings={settings}>
        {() => (
          <>
            <Tabs defaultValue="brand">
              <TabsList className="flex-wrap">
                <TabsTrigger value="brand">{uiText("Brand & logo")}</TabsTrigger>
                <TabsTrigger value="contact">{uiText("Contact")}</TabsTrigger>
                <TabsTrigger value="social">{uiText("Social links")}</TabsTrigger>
                <TabsTrigger value="theme">{uiText("Theme")}</TabsTrigger>
              </TabsList>
              <TabsContent value="brand" className="mt-4">
                <Panel title={uiText("Brand")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <L10nField label={uiText("Website name")} value={form.brand?.name} onChange={(v) => patch('brand', { name: v })} />
                    <TextField label={uiText("Short name")} value={form.brand?.shortName} onChange={(v) => patch('brand', { shortName: v })} />
                    <L10nField label={uiText("Tagline")} value={form.brand?.tagline} onChange={(v) => patch('brand', { tagline: v })} />
                    <TextField label={uiText("Logo alt text")} value={form.brand?.logoAlt} onChange={(v) => patch('brand', { logoAlt: v })} />
                    <MediaField label={uiText("Header logo")} hint={uiText("Used in the header, admin panel and login page.")} value={form.brand?.logo} onChange={(v) => patch('brand', { logo: v })} kind="logo" />
                    <MediaField label={uiText("Footer logo")} value={form.brand?.footerLogo} onChange={(v) => patch('brand', { footerLogo: v })} kind="logo" />
                    <MediaField label={uiText("Favicon")} hint={uiText("Square PNG, at least 192×192px.")} value={form.brand?.favicon} onChange={(v) => patch('brand', { favicon: v })} kind="logo" />
                  </div>
                </Panel>
              </TabsContent>
              <TabsContent value="contact" className="mt-4">
                <Panel title={uiText("Contact details")} description={uiText("Shown in the footer and on the Contact page.")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label={uiText("Email")} type="email" value={form.contact?.email} onChange={(v) => patch('contact', { email: v })} />
                    <TextField label={uiText("Phone")} value={form.contact?.phone} onChange={(v) => patch('contact', { phone: v })} />
                    <TextField label="WhatsApp" value={form.contact?.whatsapp} onChange={(v) => patch('contact', { whatsapp: v })} />
                    <L10nField label={uiText("Address")} multiline rows={2} value={form.contact?.address} onChange={(v) => patch('contact', { address: v })} />
                  </div>
                </Panel>
              </TabsContent>
              <TabsContent value="social" className="mt-4">
                <Panel title={uiText("Social links")}>
                  <ListEditor
                    value={form.social}
                    onChange={(v) => setSection('social', v)}
                    addLabel={uiText("Add social link")}
                    createItem={() => ({ platform: 'youtube', url: '' })}
                    renderFields={(item, set) => (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectField label={uiText("Platform")} value={item.platform} onChange={(platform) => set({ platform })} options={SOCIAL_PLATFORMS} />
                        <TextField label={uiText("URL")} value={item.url} onChange={(url) => set({ url })} placeholder="https://" />
                      </div>
                    )}
                  />
                </Panel>
              </TabsContent>
              <TabsContent value="theme" className="mt-4">
                <Panel title={uiText("Colours")} description={uiText("Brick red and saffron match the PMS logo. Changes apply across the whole website.")}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ColorField label={uiText("Brand colour")} value={form.theme?.brandColor} onChange={(v) => patch('theme', { brandColor: v })} />
                    <ColorField label={uiText("Accent colour")} value={form.theme?.accentColor} onChange={(v) => patch('theme', { accentColor: v })} />
                    <ColorField label={uiText("Text colour")} value={form.theme?.inkColor} onChange={(v) => patch('theme', { inkColor: v })} />
                    <SelectField
                      label={uiText("Default theme")}
                      value={form.theme?.defaultMode}
                      onChange={(v) => patch('theme', { defaultMode: v })}
                      options={[
                        { value: 'light', get label() { return uiText("Light"); } },
                        { value: 'dark', get label() { return uiText("Dark"); } },
                        { value: 'system', get label() { return uiText("Follow the student's device"); } },
                      ]}
                    />
                  </div>
                </Panel>
              </TabsContent>
            </Tabs>
            <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['brand', 'contact', 'social', 'theme'])} />
          </>
        )}
      </SettingsGate>
    </div>
  );
}

const ANNOUNCEMENT_FIELDS = ['text', 'badge', 'linkLabel', 'linkUrl', 'variant', 'startsAt', 'endsAt', 'isVisible'];
const pickFields = (obj, fields) => JSON.stringify(Object.fromEntries(fields.map((f) => [f, obj?.[f] ?? null])));

function AnnouncementCard({ item }) {
  useUiLanguage();
  const confirm = useConfirm();
  const { save, remove } = useResourceMutations('announcements');
  const [form, setForm] = useState(item);
  const dirty = pickFields(form, ANNOUNCEMENT_FIELDS) !== pickFields(item, ANNOUNCEMENT_FIELDS);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <li className="rounded-xl border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <L10nField className="sm:col-span-2" label={uiText("Announcement text")} value={form.text} onChange={(text) => set({ text })} />
        <L10nField label={uiText("Badge")} value={form.badge} onChange={(badge) => set({ badge })} />
        <SelectField
          label={uiText("Colour")}
          value={form.variant}
          onChange={(variant) => set({ variant })}
          options={[
            { value: 'brand', get label() { return uiText("Brand gradient"); } },
            { value: 'info', get label() { return uiText("Indigo"); } },
            { value: 'success', get label() { return uiText("Green"); } },
            { value: 'warning', get label() { return uiText("Saffron"); } },
          ]}
        />
        <L10nField label={uiText("Link label")} value={form.linkLabel} onChange={(linkLabel) => set({ linkLabel })} />
        <TextField label={uiText("Link URL")} value={form.linkUrl} onChange={(linkUrl) => set({ linkUrl })} />
        <DateTimeField label={uiText("Show from (optional)")} value={form.startsAt} onChange={(startsAt) => set({ startsAt })} />
        <DateTimeField label={uiText("Show until (optional)")} value={form.endsAt} onChange={(endsAt) => set({ endsAt })} />
        <SwitchField label={uiText("Visible")} checked={form.isVisible} onChange={(isVisible) => set({ isVisible })} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => confirm({ get title() { return uiText("Delete this announcement?"); }, destructive: true, get confirmLabel() { return uiText("Delete"); }, onConfirm: () => remove.mutateAsync({ id: item._id }) })}
        >
          <Trash2 className="text-destructive" />{uiText("Delete")}</Button>
        <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate({ id: item._id, data: form }, { onSuccess: () => toast.success(uiText("Announcement saved")) })}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save")}</Button>
      </div>
    </li>
  );
}

function AnnouncementsPanel() {
  useUiLanguage();
  const list = useResourceList('announcements', { limit: 50 });
  const { save } = useResourceMutations('announcements');
  return (
    <Panel
      title={uiText("Announcement bar")}
      description={uiText("The strip above the header. The first active announcement is shown.")}
      actions={
        <Button size="sm" variant="outline" onClick={() => save.mutate({ data: { text: { hi: 'नई घोषणा', en: 'New announcement' }, isVisible: false } }, { onSuccess: () => toast.success(uiText("Announcement added (hidden until you make it visible)")) })}>
          <Plus />{uiText("Add")}</Button>
      }
    >
      {list.isPending ? (
        <Skeleton className="h-40" />
      ) : list.data?.items?.length ? (
        <ul className="space-y-3">
          {list.data.items.map((item) => (
            <AnnouncementCard key={`${item._id}-${item.updatedAt}`} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{uiText("No announcements.")}</p>
      )}
    </Panel>
  );
}

export function HeaderSettingsPage() {
  useUiLanguage();
  const settings = useSiteSettingsForm();
  const { form, patch } = settings;
  return (
    <div>
      <PageHeader
        title={uiText("Header")}
        description={uiText("Logo and brand name come from Website Settings; menu items from Navigation.")}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link to={adminUrl('settings')}>{uiText("Logo & brand")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to={adminUrl('navigation')}>{uiText("Menu items")}</Link>
            </Button>
          </>
        }
      />
      <SettingsGate settings={settings}>
        {() => (
          <div className="space-y-5">
            <Panel title={uiText("Header options")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <SwitchField label={uiText("Sticky header")} checked={form.header?.sticky} onChange={(v) => patch('header', { sticky: v })} />
                <SwitchField label={uiText("Show search")} checked={form.header?.showSearch} onChange={(v) => patch('header', { showSearch: v })} />
                <SwitchField label={uiText("Show हिंदी / ENG switch")} checked={form.header?.showLanguageSwitch} onChange={(v) => patch('header', { showLanguageSwitch: v })} />
                <SwitchField label={uiText("Show light / dark switch")} checked={form.header?.showThemeSwitch} onChange={(v) => patch('header', { showThemeSwitch: v })} />
                <SwitchField label={uiText("Show announcement bar")} checked={form.header?.showAnnouncement} onChange={(v) => patch('header', { showAnnouncement: v })} />
                <L10nField label={uiText("Search placeholder")} value={form.header?.searchPlaceholder} onChange={(v) => patch('header', { searchPlaceholder: v })} />
              </div>
            </Panel>
            <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['header'])} />
            <AnnouncementsPanel />
          </div>
        )}
      </SettingsGate>
    </div>
  );
}

const NAV_TYPES = [
  { value: 'link', get label() { return uiText("Link"); } },
  { value: 'classes', get label() { return uiText("Class list (automatic from database)"); } },
  { value: 'column', get label() { return uiText("Group of links (dropdown / footer column)"); } },
];

export function NavEditor({ navKey, title, description }) {
  useUiLanguage();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'navigation', navKey], queryFn: () => get(`/navigation/${navKey}`) });
  const [items, setItems] = useState(null);
  const [baseline, setBaseline] = useState('');

  const load = (list) => {
    const next = withKeys(list).map((item) => ({ ...item, children: withKeys(item.children || []) }));
    setItems(next);
    setBaseline(JSON.stringify(next));
  };
  useEffect(() => {
    if (query.data && items === null) load(query.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, items]);

  const mutation = useMutation({
    mutationFn: () => api.put(`/navigation/${navKey}`, { items }).then((r) => r.data),
    onSuccess: (data) => {
      load(data.items);
      queryClient.invalidateQueries({ queryKey: ['site'] });
      toast.success(uiTemplate`${title} saved`);
    },
    onError: (error) => toast.apiError(error),
  });

  const dirty = items !== null && JSON.stringify(items) !== baseline;
  const update = (index, patch) => setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Panel
      title={title}
      description={description}
      actions={
        <Button size="sm" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save menu")}</Button>
      }
    >
      {items === null ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <SortableList
            items={items}
            onChange={setItems}
            className="space-y-2"
            renderItem={(item, index, { ref, style, handleProps }) => (
              <li ref={ref} style={style} className={`rounded-xl border bg-background p-3 ${item.isVisible === false ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <DragHandle {...handleProps} />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <L10nField label={uiText("Label")} value={item.label} onChange={(label) => update(index, { label })} />
                    <SelectField label={uiText("Type")} value={item.type || 'link'} onChange={(type) => update(index, { type })} options={NAV_TYPES} />
                    {(item.type || 'link') === 'link' && (
                      <>
                        <TextField label={uiText("URL")} value={item.url} onChange={(url) => update(index, { url })} placeholder={uiText("/about-us or https://…")} />
                        <SwitchField label={uiText("Open in new tab")} checked={item.newTab} onChange={(newTab) => update(index, { newTab })} />
                      </>
                    )}
                    <SwitchField label={uiText("Visible")} checked={item.isVisible !== false} onChange={(isVisible) => update(index, { isVisible })} />
                    {item.type === 'column' && (
                      <div className="sm:col-span-2">
                        <ListEditor
                          label={uiText("Links in this group")}
                          value={item.children}
                          onChange={(children) => update(index, { children })}
                          addLabel={uiText("Add link")}
                          createItem={() => ({ label: {}, url: '', newTab: false, isVisible: true })}
                          renderFields={(child, set) => (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <L10nField label={uiText("Label")} value={child.label} onChange={(label) => set({ label })} />
                              <TextField label={uiText("URL")} value={child.url} onChange={(url) => set({ url })} />
                              <SwitchField label={uiText("Open in new tab")} checked={child.newTab} onChange={(newTab) => set({ newTab })} />
                              <SwitchField label={uiText("Visible")} checked={child.isVisible !== false} onChange={(isVisible) => set({ isVisible })} />
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon-sm" onClick={() => setItems(moveItem(items, index, index - 1))} disabled={index === 0} aria-label={uiText("Move up")}>
                      ↑
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setItems(moveItem(items, index, index + 1))} disabled={index === items.length - 1} aria-label={uiText("Move down")}>
                      ↓
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label={uiText("Remove menu item")}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            )}
          />
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setItems([...items, { _key: clientKey(), label: {}, url: '', type: 'link', newTab: false, isVisible: true, children: [] }])}>
            <Plus />{uiText("Add menu item")}</Button>
        </>
      )}
    </Panel>
  );
}

export function NavigationPage() {
  useUiLanguage();
  return (
    <div>
      <PageHeader title={uiText("Navigation")} description={uiText("Header menu, footer columns and footer bottom links. “Class list” items always show the live classes from the database.")} />
      <Tabs defaultValue="header">
        <TabsList>
          <TabsTrigger value="header">{uiText("Header menu")}</TabsTrigger>
          <TabsTrigger value="footer">{uiText("Footer columns")}</TabsTrigger>
          <TabsTrigger value="footerBottom">{uiText("Footer bottom")}</TabsTrigger>
        </TabsList>
        <TabsContent value="header" className="mt-4">
          <NavEditor navKey="header" title={uiText("Header menu")} description={uiText("Desktop menu. The mobile ☰ menu also lists every class with NCERT Solutions, अध्याय, प्रश्नावली, Important Questions and Notes.")} />
        </TabsContent>
        <TabsContent value="footer" className="mt-4">
          <NavEditor navKey="footer" title={uiText("Footer columns")} />
        </TabsContent>
        <TabsContent value="footerBottom" className="mt-4">
          <NavEditor navKey="footerBottom" title={uiText("Footer bottom links")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function FooterSettingsPage() {
  useUiLanguage();
  const settings = useSiteSettingsForm();
  const { form, patch } = settings;
  return (
    <div>
      <PageHeader title={uiText("Footer")} description={uiText("Footer text, badges and link columns.")} />
      <SettingsGate settings={settings}>
        {() => (
          <div className="space-y-5">
            <Panel title={uiText("Footer content")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField className="sm:col-span-2" label={uiText("Description")} multiline rows={3} value={form.footer?.description} onChange={(v) => patch('footer', { description: v })} />
                <L10nField label={uiText("Copyright")} hint={uiText("{year} is replaced with the current year.")} value={form.footer?.copyright} onChange={(v) => patch('footer', { copyright: v })} />
                <SwitchField label={uiText("Show social links")} checked={form.footer?.showSocial} onChange={(v) => patch('footer', { showSocial: v })} />
                <L10nField className="sm:col-span-2" label={uiText("Disclaimer")} multiline rows={2} value={form.footer?.disclaimer} onChange={(v) => patch('footer', { disclaimer: v })} />
                <div className="sm:col-span-2">
                  <ListEditor
                    label={uiText("Badges")}
                    value={(form.footer?.badges || []).map((b) => (typeof b === 'object' ? b : { hi: b, en: b }))}
                    onChange={(badges) => patch('footer', { badges: badges.map(({ _key, ...b }) => b) })}
                    addLabel={uiText("Add badge")}
                    createItem={() => ({ hi: '', en: '' })}
                    renderFields={(badge, set) => <L10nField label={uiText("Badge text")} value={badge} onChange={(v) => set(v)} />}
                  />
                </div>
              </div>
            </Panel>
            <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['footer'])} />
            <NavEditor navKey="footer" title={uiText("Footer columns")} description={uiText("MATHEMATICS (class list), IMPORTANT LINKS and any other column.")} />
            <NavEditor navKey="footerBottom" title={uiText("Footer bottom links")} />
          </div>
        )}
      </SettingsGate>
    </div>
  );
}

export function LanguageSettingsPage() {
  useUiLanguage();
  const settings = useSiteSettingsForm();
  const { form, patch, setSection } = settings;
  const [newKey, setNewKey] = useState('');
  return (
    <div>
      <PageHeader title={uiText("Language")} description={uiText("Default language, the हिंदी / ENG switch and all frontend terminology (अध्याय, प्रश्नावली, हल…).")} />
      <SettingsGate settings={settings}>
        {() => {
          const terms = form.terminology || [];
          const updateTerm = (index, patchValue) => setSection('terminology', terms.map((t, i) => (i === index ? { ...t, ...patchValue } : t)));
          return (
            <div className="space-y-5">
              <Panel title={uiText("Language switch")}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SelectField
                    label={uiText("Default language")}
                    value={form.language?.default}
                    onChange={(v) => patch('language', { default: v })}
                    options={[
                      { value: 'hi', get label() { return uiText("हिंदी (Hindi)"); } },
                      { value: 'en', get label() { return uiText("English"); } },
                    ]}
                  />
                  <SwitchField label={uiText("Enable हिंदी / ENG switch")} checked={form.language?.enableToggle} onChange={(v) => patch('language', { enableToggle: v })} />
                  <SwitchField label={uiText("Show “हिंदी में देखें / View in English” on study pages")} checked={form.language?.showLanguageNotice} onChange={(v) => patch('language', { showLanguageNotice: v })} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{' '}{uiText("Content is never auto-translated. Every question, solution block and page has its own हिंदी and English fields plus a language mode.")}{' '}</p>
              </Panel>
              <Panel title={uiText("Terminology")} description={uiText("Labels used across the student website. Per the requirement, “अध्याय” and “प्रश्नावली” are used in both languages by default.")}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-semibold">{uiText("Key")}</th>
                        <th className="pb-2 font-semibold">{uiText("हिंदी mode")}</th>
                        <th className="pb-2 font-semibold">{uiText("ENG mode")}</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((t, index) => (
                        <tr key={t.key} className="border-t">
                          <td className="py-1.5 pr-2 font-mono text-xs">{t.key}</td>
                          <td className="py-1.5 pr-2">
                            <Input className="h-8" lang="hi" value={t.hi} onChange={(e) => updateTerm(index, { hi: e.target.value })} aria-label={uiTemplate`${t.key} Hindi`} />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input className="h-8" value={t.en} onChange={(e) => updateTerm(index, { en: e.target.value })} aria-label={uiTemplate`${t.key} English`} />
                          </td>
                          <td>
                            <Button variant="ghost" size="icon-sm" onClick={() => setSection('terminology', terms.filter((_, i) => i !== index))} aria-label={uiTemplate`Reset ${t.key} to default`} title={uiText("Remove (falls back to the built-in default)")}>
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <Input className="h-9 max-w-xs font-mono" placeholder="newTermKey" value={newKey} onChange={(e) => setNewKey(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))} aria-label={uiText("New term key")} />
                  <Button
                    variant="outline"
                    disabled={!newKey || terms.some((t) => t.key === newKey)}
                    onClick={() => {
                      setSection('terminology', [...terms, { key: newKey, hi: '', en: '' }]);
                      setNewKey('');
                    }}
                  >
                    <Plus />{uiText("Add term")}</Button>
                </div>
              </Panel>
              <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['language', 'terminology'])} />
            </div>
          );
        }}
      </SettingsGate>
    </div>
  );
}

const SEO_ROUTE_FIELDS = ['title', 'description', 'robots', 'canonical', 'ogImage'];

function SeoRouteCard({ item }) {
  useUiLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(item);
  const dirty = pickFields(normalizeRefs(form), SEO_ROUTE_FIELDS) !== pickFields(normalizeRefs(item), SEO_ROUTE_FIELDS);
  const mutation = useMutation({
    mutationFn: () => api.put(`/seo-settings/${item.routeKey}`, normalizeRefs(form)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      toast.success(uiTemplate`${item.label} SEO saved`);
    },
    onError: (error) => toast.apiError(error),
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <Panel
      title={item.label}
      actions={
        <Button size="sm" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save")}</Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <L10nField label={uiText("SEO title")} value={form.title} onChange={(title) => set({ title })} />
        <SelectField label={uiText("Robots")} value={form.robots || 'index,follow'} onChange={(robots) => set({ robots })} options={ROBOTS_OPTIONS} />
        <L10nField className="sm:col-span-2" label={uiText("Meta description")} multiline rows={2} value={form.description} onChange={(description) => set({ description })} />
        <TextField label={uiText("Canonical URL")} value={form.canonical} onChange={(canonical) => set({ canonical })} />
        <MediaField label={uiText("Open Graph image")} value={form.ogImage} onChange={(ogImage) => set({ ogImage })} />
      </div>
    </Panel>
  );
}

const AUDIT_PATHS = { Class: 'classes', Chapter: 'chapters', Exercise: 'exercises', Question: 'questions', Note: 'notes', Page: 'pages' };

export function SeoPage() {
  const language = useUiLanguage();
  const settings = useSiteSettingsForm();
  const routes = useQuery({ queryKey: ['admin', 'seo-settings'], queryFn: () => get('/seo-settings') });
  const audit = useQuery({ queryKey: ['admin', 'seo-audit', language], queryFn: () => get('/seo/audit',{lang:language}) });
  const { can } = useAdminAuth();
  const { form, patch } = settings;
  return (
    <div>
      <PageHeader
        title={uiText("SEO")}
        description={uiText("Titles, descriptions, canonical URLs, Open Graph images, breadcrumb / article / FAQ schema and the sitemap. Each class, अध्याय, प्रश्नावली, question, note and page also has its own SEO panel.")}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                <ExternalLink /> sitemap.xml
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/robots.txt" target="_blank" rel="noreferrer">
                <ExternalLink /> robots.txt
              </a>
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        <SettingsGate settings={settings}>
          {() => (
            <>
              <Panel title={uiText("Global SEO defaults")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label={uiText("Website URL")} hint={uiText("e.g. https://www.passionmathsstudy.com — used for canonical URLs and the sitemap.")} value={form.seo?.siteUrl} onChange={(v) => patch('seo', { siteUrl: v })} />
                  <TextField label={uiText("Title template")} hint={uiText("%s is replaced by the page title.")} value={form.seo?.titleTemplate} onChange={(v) => patch('seo', { titleTemplate: v })} />
                  <L10nField label={uiText("Default title")} value={form.seo?.defaultTitle} onChange={(v) => patch('seo', { defaultTitle: v })} />
                  <TextField label={uiText("Organization name (schema)")} value={form.seo?.organizationName} onChange={(v) => patch('seo', { organizationName: v })} />
                  <L10nField className="sm:col-span-2" label={uiText("Default meta description")} multiline rows={2} value={form.seo?.defaultDescription} onChange={(v) => patch('seo', { defaultDescription: v })} />
                  <MediaField label={uiText("Default Open Graph image")} value={form.seo?.defaultOgImage} onChange={(v) => patch('seo', { defaultOgImage: v })} />
                  <div className="grid gap-4">
                    <TextField label={uiText("X / Twitter handle")} value={form.seo?.twitterHandle} onChange={(v) => patch('seo', { twitterHandle: v })} placeholder="@passionmaths" />
                    <TextField label={uiText("Google site verification")} value={form.seo?.googleSiteVerification} onChange={(v) => patch('seo', { googleSiteVerification: v })} />
                  </div>
                </div>
              </Panel>
              {can('settings:write') && <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['seo'])} />}
            </>
          )}
        </SettingsGate>

        {routes.data?.items?.map((item) => (
          <SeoRouteCard key={`${item.routeKey}-${item.updatedAt || ''}`} item={item} />
        ))}

        <Panel title={uiText("Missing SEO fields")} description={uiText("Published content without a custom SEO title or meta description. Automatic values are used until you add them.")}>
          {audit.isPending ? (
            <Skeleton className="h-24" />
          ) : audit.data?.items?.length ? (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {audit.data.items.map((row) => (
                <li key={`${row.type}-${row.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{uiText(row.type)}:</span> {row.localizedLabel ? adminText(row.localizedLabel) : uiText(row.label)}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-warning">{uiText("missing")}{row.missing.map(field => uiText(field)).join(' / ')}</span>
                    <Link to={adminUrl(`${AUDIT_PATHS[row.type]}/${row.id}`)} className="text-xs font-semibold text-brand hover:underline">{uiText("Edit")}</Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-success">{uiText("Every published item has a custom SEO title and description.")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

const PLACEMENTS = [
  { value: 'belowHeader', get label() { return uiText("Below header"); } },
  { value: 'inContent', get label() { return uiText("Inside content (between questions)"); } },
  { value: 'sidebar', get label() { return uiText("Sidebar (desktop)"); } },
  { value: 'afterContent', get label() { return uiText("After content"); } },
  { value: 'aboveFooter', get label() { return uiText("Above footer"); } },
];
const PAGE_TYPES = ['home', 'class', 'subject', 'chapter', 'exercise', 'question', 'notes', 'page', 'search'];
const AD_FIELDS = ['name', 'placement', 'device', 'pageTypes', 'code', 'minHeightMobile', 'minHeightDesktop', 'isEnabled'];

function AdSlotCard({ slot }) {
  useUiLanguage();
  const { can } = useAdminAuth();
  const confirm = useConfirm();
  const { save, remove } = useResourceMutations('ad-slots');
  const [form, setForm] = useState(slot);
  const dirty = pickFields(form, AD_FIELDS) !== pickFields(slot, AD_FIELDS);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canCode = can('ads:code');
  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label={uiText("Name")} value={form.name} onChange={(name) => set({ name })} />
        <SelectField label={uiText("Placement")} value={form.placement} onChange={(placement) => set({ placement })} options={PLACEMENTS} />
        <SelectField
          label={uiText("Device")}
          value={form.device}
          onChange={(device) => set({ device })}
          options={[
            { value: 'all', get label() { return uiText("All devices"); } },
            { value: 'desktop', get label() { return uiText("Desktop only"); } },
            { value: 'mobile', get label() { return uiText("Mobile only"); } },
          ]}
        />
        <SwitchField label={uiText("Enabled")} checked={form.isEnabled} onChange={(isEnabled) => set({ isEnabled })} />
        <NumberField label={uiText("Reserved height — mobile (px)")} value={form.minHeightMobile} onChange={(v) => set({ minHeightMobile: v })} min={0} max={600} />
        <NumberField label={uiText("Reserved height — desktop (px)")} value={form.minHeightDesktop} onChange={(v) => set({ minHeightDesktop: v })} min={0} max={600} />
        <Field label={uiText("Show on pages")} hint={uiText("None selected = all pages")} className="sm:col-span-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {PAGE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm capitalize">
                <Checkbox
                  checked={(form.pageTypes || []).includes(type)}
                  onCheckedChange={(checked) => set({ pageTypes: checked ? [...(form.pageTypes || []), type] : (form.pageTypes || []).filter((t) => t !== type) })}
                />
                {type}
              </label>
            ))}
          </div>
        </Field>
        <Field label={uiText("Ad code (AdSense or sponsor HTML)")} hint={canCode ? uiText("Runs inside a sandboxed frame — it cannot cover questions or read the page.") : uiText("Only the owner account can change ad code.")} className="sm:col-span-2 lg:col-span-4">
          <Textarea rows={4} className="font-mono text-xs" value={form.code} onChange={(e) => set({ code: e.target.value })} disabled={!canCode} />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => confirm({ get title() { return uiTemplate`Delete “${slot.name}”?`; }, destructive: true, get confirmLabel() { return uiText("Delete"); }, onConfirm: () => remove.mutateAsync({ id: slot._id }) })}>
          <Trash2 className="text-destructive" />{uiText("Delete")}</Button>
        <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate({ id: slot._id, data: canCode ? form : { ...form, code: slot.code } }, { onSuccess: () => toast.success(uiText("Ad space saved")) })}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save")}</Button>
      </div>
    </li>
  );
}

export function AdsPage() {
  useUiLanguage();
  const settings = useSiteSettingsForm();
  const slots = useResourceList('ad-slots', { limit: 50 });
  const { save } = useResourceMutations('ad-slots');
  return (
    <div>
      <PageHeader
        title={uiText("Ad Spaces")}
        description={uiText("Reserved places for Google AdSense or educational sponsors. Nothing is shown until ads are switched on and a space is enabled.")}
        actions={
          <Button size="lg" variant="outline" onClick={() => save.mutate({ data: { name: 'New ad space', placement: 'afterContent' } }, { onSuccess: () => toast.success(uiText("Ad space added (disabled)")) })}>
            <Plus />{uiText("Add ad space")}</Button>
        }
      />
      <div className="space-y-5">
        <SettingsGate settings={settings}>
          {() => (
            <Panel title={uiText("Advertising")}>
              <SwitchField
                label={uiText("Show advertisements on the website")}
                hint={uiText("Before enabling AdSense, publish a Privacy Policy that mentions cookies and set up a consent banner if required.")}
                checked={settings.form.ads?.enabled}
                onChange={(enabled) => settings.patch('ads', { enabled })}
              />
              <SaveBar dirty={settings.dirty} saving={settings.saving} onSave={() => settings.save(['ads'])} />
            </Panel>
          )}
        </SettingsGate>
        {slots.isPending ? (
          <Skeleton className="h-60 rounded-2xl" />
        ) : (
          <ul className="space-y-4">
            {(slots.data?.items || []).map((slot) => (
              <AdSlotCard key={`${slot._id}-${slot.updatedAt}`} slot={slot} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const RELATED_TYPES = [
  { value: 'Chapter', get label() { return uiText("अध्याय (Chapter)"); }, resource: 'chapters' },
  { value: 'Exercise', get label() { return uiText("प्रश्नावली (Exercise)"); }, resource: 'exercises' },
  { value: 'Question', get label() { return uiText("Question"); }, resource: 'questions' },
  { value: 'Note', get label() { return uiText("Note"); }, resource: 'notes' },
  { value: 'ImportantQuestion', get label() { return uiText("Important question"); }, resource: 'important-questions' },
  { value: 'Page', get label() { return uiText("Page"); }, resource: 'pages' },
];
const resourceOf = (type) => RELATED_TYPES.find((t) => t.value === type)?.resource;

function RelatedEditor({ sourceType, source }) {
  useUiLanguage();
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ['admin', 'related-content', 'for', sourceType, source],
    queryFn: () => get('/related-content', { scope: 'admin', sourceType, source }),
  });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!existing.data) return;
    const doc = existing.data.items[0];
    setForm(doc ? { ...doc, source, items: withKeys(doc.items) } : { sourceType, source, items: [], autoFill: true, limit: 6, isVisible: true });
  }, [existing.data, sourceType, source]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = normalizeRefs({ ...form, source });
      delete payload._id;
      return (form._id ? api.put(`/related-content/${form._id}`, payload) : api.post('/related-content', payload)).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'related-content'] });
      toast.success(uiText("Related content saved"));
    },
    onError: (error) => toast.apiError(error),
  });

  if (!form) return <Skeleton className="h-40 rounded-2xl" />;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Panel
      title={uiText("Related links for this item")}
      description={uiText("Manual links appear first. With “Auto-fill” on, the remaining slots are filled from the same class, अध्याय, प्रश्नावली and tags.")}
      actions={
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}{uiText("Save")}</Button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SwitchField label={uiText("Auto-fill")} checked={form.autoFill} onChange={(autoFill) => set({ autoFill })} />
        <SwitchField label={uiText("Show related section")} checked={form.isVisible} onChange={(isVisible) => set({ isVisible })} />
        <NumberField label={uiText("Maximum links")} value={form.limit} onChange={(limit) => set({ limit })} min={1} max={24} />
      </div>
      <ListEditor
        label={uiText("Manual links")}
        value={form.items}
        onChange={(items) => set({ items })}
        addLabel={uiText("Add link")}
        createItem={() => ({ targetType: 'Exercise', target: null, url: '', label: {} })}
        renderFields={(item, setItem) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label={uiText("Link to")} value={item.targetType} onChange={(targetType) => setItem({ targetType, target: null })} options={[...RELATED_TYPES, { value: 'Url', get label() { return uiText("Custom URL"); } }]} />
            {item.targetType === 'Url' ? (
              <TextField label={uiText("URL")} value={item.url} onChange={(url) => setItem({ url })} />
            ) : (
              <RefSelect key={item.targetType} label={uiText("Item")} resource={resourceOf(item.targetType)} value={item.target} onChange={(target) => setItem({ target })} />
            )}
            <L10nField className="sm:col-span-2" label={uiText("Custom label (optional)")} value={item.label} onChange={(label) => setItem({ label })} />
          </div>
        )}
      />
    </Panel>
  );
}

export function RelatedContentPage() {
  useUiLanguage();
  const [sourceType, setSourceType] = useState('Exercise');
  const [source, setSource] = useState(null);
  const configured = useResourceList('related-content', { limit: 100 });
  return (
    <div>
      <PageHeader title={uiText("Related Content")} description={uiText("Choose any अध्याय, प्रश्नावली, question, note or page and control the related links shown below it.")} />
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Panel title={uiText("Choose content")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={uiText("Content type")}
                value={sourceType}
                onChange={(v) => {
                  setSourceType(v);
                  setSource(null);
                }}
                options={RELATED_TYPES}
              />
              <RefSelect key={sourceType} label={uiText("Item")} resource={resourceOf(sourceType)} value={source} onChange={setSource} />
            </div>
          </Panel>
          {source && <RelatedEditor key={`${sourceType}-${source._id}`} sourceType={sourceType} source={source._id} />}
        </div>
        <Panel title={uiText("Items with manual links")}>
          {configured.data?.items?.length ? (
            <ul className="space-y-1 text-sm">
              {configured.data.items.map((row) => (
                <li key={row._id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => {
                      setSourceType(row.sourceType);
                      setSource(row.source);
                    }}
                  >
                    <span className="text-muted-foreground">{row.sourceType}:</span> {adminText(row.source?.title) || (row.source?.number ? `#${row.source.number}` : row.source?.slug || uiText("item"))}
                    <span className="block text-xs text-muted-foreground">{row.items.length}{' '}{uiText("manual link(s)")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{uiText("None yet — related links are generated automatically.")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
