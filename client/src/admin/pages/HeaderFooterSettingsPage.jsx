import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Layers,
  LayoutTemplate,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/site/States.jsx';
import { SOCIAL_ICONS } from '@/components/site/SocialIcons.jsx';
import { api, get } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { Field, L10nField, SelectField, SwitchField, TextField } from '../components/fields/Fields.jsx';
import { MediaField } from '../components/media/MediaFields.jsx';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { DragHandle, SortableList, clientKey, moveItem, withKeys } from '../components/SortableList.jsx';
import { useSiteSettingsForm } from './SettingsPages.jsx';

const NAV_TYPES = [
  { value: 'link', get label() { return uiText("Direct link"); } },
  { value: 'dropdown', get label() { return uiText("Dropdown menu (with child links)"); } },
  { value: 'reference-books', get label() { return uiText("Reference Books (Dropdown with Class Submenu)"); } },
  { value: 'mega', get label() { return uiText("Reference Books (Dropdown with Class Submenu)"); } },
  { value: 'classes', get label() { return uiText("Class list (automatic from database)"); } },
];

const COLUMN_TYPES = [
  { value: 'column', get label() { return uiText("Custom links column"); } },
  { value: 'classes', get label() { return uiText("Class list (automatic from database)"); } },
];

const RECOMMENDED_HEADER_NAV = [
  {
    label: { hi: 'होम', en: 'Home' },
    url: '/',
    type: 'link',
    newTab: false,
    isVisible: true,
    children: [],
  },
  {
    label: { hi: 'गणित', en: 'Mathematics' },
    url: '',
    type: 'classes',
    newTab: false,
    isVisible: true,
    children: [
      { label: { hi: 'कक्षा 12 गणित', en: 'Class 12 Maths' }, url: '/class-12/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 11 गणित', en: 'Class 11 Maths' }, url: '/class-11/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 10 गणित', en: 'Class 10 Maths' }, url: '/class-10/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 9 गणित', en: 'Class 9 Maths' }, url: '/class-9/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 8 गणित', en: 'Class 8 Maths' }, url: '/class-8/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 7 गणित', en: 'Class 7 Maths' }, url: '/class-7/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 6 गणित', en: 'Class 6 Maths' }, url: '/class-6/maths', newTab: false, isVisible: true },
    ],
  },
  {
    label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
    url: '/reference-solutions',
    type: 'reference-books',
    newTab: false,
    isVisible: true,
    children: [],
  },
  {
    label: { hi: 'महत्वपूर्ण प्रश्न', en: 'Important Questions' },
    url: '/class-10/maths/important-questions',
    type: 'dropdown',
    newTab: false,
    isVisible: true,
    children: [
      { label: { hi: 'कक्षा 12 महत्वपूर्ण प्रश्न', en: 'Class 12 Important Questions' }, url: '/class-12/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 11 महत्वपूर्ण प्रश्न', en: 'Class 11 Important Questions' }, url: '/class-11/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 10 महत्वपूर्ण प्रश्न', en: 'Class 10 Important Questions' }, url: '/class-10/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 9 महत्वपूर्ण प्रश्न', en: 'Class 9 Important Questions' }, url: '/class-9/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 8 महत्वपूर्ण प्रश्न', en: 'Class 8 Important Questions' }, url: '/class-8/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 7 महत्वपूर्ण प्रश्न', en: 'Class 7 Important Questions' }, url: '/class-7/maths/important-questions', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 6 महत्वपूर्ण प्रश्न', en: 'Class 6 Important Questions' }, url: '/class-6/maths/important-questions', newTab: false, isVisible: true },
    ],
  },
  {
    label: { hi: 'नोट्स', en: 'Notes' },
    url: '/class-10/maths/notes',
    type: 'dropdown',
    newTab: false,
    isVisible: true,
    children: [
      { label: { hi: 'कक्षा 12 गणित नोट्स', en: 'Class 12 Maths Notes' }, url: '/class-12/maths/notes', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 11 गणित नोट्स', en: 'Class 11 Maths Notes' }, url: '/class-11/maths/notes', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 10 गणित नोट्स', en: 'Class 10 Maths Notes' }, url: '/class-10/maths/notes', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 9 गणित नोट्स', en: 'Class 9 Maths Notes' }, url: '/class-9/maths/notes', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 8 गणित नोट्स', en: 'Class 8 Maths Notes' }, url: '/class-8/maths/notes', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 7 गणित नोट्स', en: 'Class 7 Maths Notes' }, url: '/class-7/maths', newTab: false, isVisible: true },
      { label: { hi: 'कक्षा 6 गणित नोट्स', en: 'Class 6 Maths Notes' }, url: '/class-6/maths', newTab: false, isVisible: true },
    ],
  },
  {
    label: { hi: 'हमारे बारे में', en: 'About Us' },
    url: '/about-us',
    type: 'link',
    newTab: false,
    isVisible: true,
    children: [],
  },
];

const REFERENCE_SCREENSHOT_FOOTER_COLUMNS = [
  {
    label: { hi: 'R.S. Aggarwal Solutions', en: 'R.S. Aggarwal Solutions' },
    type: 'column',
    isVisible: true,
    children: [
      { label: { hi: 'R.S. Aggarwal Class 6', en: 'R.S. Aggarwal Class 6' }, url: '/reference-solutions/rs-aggarwal/class-6', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 7', en: 'R.S. Aggarwal Class 7' }, url: '/reference-solutions/rs-aggarwal/class-7', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 8', en: 'R.S. Aggarwal Class 8' }, url: '/reference-solutions/rs-aggarwal/class-8', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 9', en: 'R.S. Aggarwal Class 9' }, url: '/reference-solutions/rs-aggarwal/class-9', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 10', en: 'R.S. Aggarwal Class 10' }, url: '/reference-solutions/rs-aggarwal/class-10', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 11', en: 'R.S. Aggarwal Class 11' }, url: '/reference-solutions/rs-aggarwal/class-11', isVisible: true },
      { label: { hi: 'R.S. Aggarwal Class 12', en: 'R.S. Aggarwal Class 12' }, url: '/reference-solutions/rs-aggarwal/class-12', isVisible: true },
    ],
  },
  {
    label: { hi: 'R.D. Sharma Solutions', en: 'R.D. Sharma Solutions' },
    type: 'column',
    isVisible: true,
    children: [
      { label: { hi: 'R.D. Sharma Class 6', en: 'R.D. Sharma Class 6' }, url: '/reference-solutions/rd-sharma/class-6', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 7', en: 'R.D. Sharma Class 7' }, url: '/reference-solutions/rd-sharma/class-7', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 8', en: 'R.D. Sharma Class 8' }, url: '/reference-solutions/rd-sharma/class-8', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 9', en: 'R.D. Sharma Class 9' }, url: '/reference-solutions/rd-sharma/class-9', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 10', en: 'R.D. Sharma Class 10' }, url: '/reference-solutions/rd-sharma/class-10', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 11', en: 'R.D. Sharma Class 11' }, url: '/reference-solutions/rd-sharma/class-11', isVisible: true },
      { label: { hi: 'R.D. Sharma Class 12', en: 'R.D. Sharma Class 12' }, url: '/reference-solutions/rd-sharma/class-12', isVisible: true },
    ],
  },
  {
    label: { hi: 'के. सी. सिन्हा गणित', en: 'K.C. Sinha Mathematics Solutions' },
    type: 'column',
    isVisible: true,
    children: [
      { label: { hi: 'के. सी. सिन्हा Class 6', en: 'K.C. Sinha Mathematics Class 6' }, url: '/reference-solutions/kc-sinha-maths/class-6', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 7', en: 'K.C. Sinha Mathematics Class 7' }, url: '/reference-solutions/kc-sinha-maths/class-7', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 8', en: 'K.C. Sinha Mathematics Class 8' }, url: '/reference-solutions/kc-sinha-maths/class-8', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 9', en: 'K.C. Sinha Mathematics Class 9' }, url: '/reference-solutions/kc-sinha-maths/class-9', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 10', en: 'K.C. Sinha Mathematics Class 10' }, url: '/reference-solutions/kc-sinha-maths/class-10', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 11', en: 'K.C. Sinha Mathematics Class 11' }, url: '/reference-solutions/kc-sinha-maths/class-11', isVisible: true },
      { label: { hi: 'के. सी. सिन्हा Class 12', en: 'K.C. Sinha Mathematics Class 12' }, url: '/reference-solutions/kc-sinha-maths/class-12', isVisible: true },
    ],
  },
  {
    label: { hi: 'M.L. Aggarwal Solutions', en: 'M.L. Aggarwal Solutions' },
    type: 'column',
    isVisible: true,
    children: [
      { label: { hi: 'M.L. Aggarwal Class 6', en: 'M.L. Aggarwal Class 6' }, url: '/reference-solutions/ml-aggarwal/class-6', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 7', en: 'M.L. Aggarwal Class 7' }, url: '/reference-solutions/ml-aggarwal/class-7', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 8', en: 'M.L. Aggarwal Class 8' }, url: '/reference-solutions/ml-aggarwal/class-8', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 9', en: 'M.L. Aggarwal Class 9' }, url: '/reference-solutions/ml-aggarwal/class-9', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 10', en: 'M.L. Aggarwal Class 10' }, url: '/reference-solutions/ml-aggarwal/class-10', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 11', en: 'M.L. Aggarwal Class 11' }, url: '/reference-solutions/ml-aggarwal/class-11', isVisible: true },
      { label: { hi: 'M.L. Aggarwal Class 12', en: 'M.L. Aggarwal Class 12' }, url: '/reference-solutions/ml-aggarwal/class-12', isVisible: true },
    ],
  },
  {
    label: { hi: 'Important Links', en: 'Important Links' },
    type: 'column',
    isVisible: true,
    children: [
      { label: { hi: 'Home', en: 'Home' }, url: '/', isVisible: true },
      { label: { hi: 'Mathematics', en: 'Mathematics' }, url: '/#classes', isVisible: true },
      { label: { hi: 'Search', en: 'Search' }, url: '/search', isVisible: true },
      { label: { hi: 'About Us', en: 'About Us' }, url: '/about-us', isVisible: true },
      { label: { hi: 'Contact', en: 'Contact' }, url: '/contact', isVisible: true },
      { label: { hi: 'Privacy Policy', en: 'Privacy Policy' }, url: '/privacy-policy', isVisible: true },
      { label: { hi: 'Terms & Conditions', en: 'Terms & Conditions' }, url: '/terms-and-conditions', isVisible: true },
    ],
  },
];

function generateClassLinks(prefix = 'NCERT', slugPrefix = '/class-') {
  return [12, 11, 10, 9, 8, 7, 6].map((num) => ({
    _key: clientKey(),
    label: { hi: `${prefix} Class ${num}`, en: `${prefix} Class ${num}` },
    url: slugPrefix.includes('reference-solutions') ? `${slugPrefix}/class-${num}` : `/class-${num}/maths`,
    newTab: false,
    isVisible: true,
  }));
}

export function HeaderFooterSettingsPage() {
  useUiLanguage();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Site Settings Form for Header options, Logo, WhatsApp banner, Copyright
  const settings = useSiteSettingsForm();
  const { form, patch, saving } = settings;

  // Header Nav Query & Mutation
  const headerNavQuery = useQuery({ queryKey: ['admin', 'navigation', 'header'], queryFn: () => get('/navigation/header') });
  const [headerItems, setHeaderItems] = useState(null);
  const [headerBaseline, setHeaderBaseline] = useState('');

  // Footer Nav Query & Mutation
  const footerNavQuery = useQuery({ queryKey: ['admin', 'navigation', 'footer'], queryFn: () => get('/navigation/footer') });
  const [footerItems, setFooterItems] = useState(null);
  const [footerBaseline, setFooterBaseline] = useState('');

  // Footer Bottom Query & Mutation
  const footerBottomQuery = useQuery({ queryKey: ['admin', 'navigation', 'footerBottom'], queryFn: () => get('/navigation/footerBottom') });
  const [footerBottomItems, setFooterBottomItems] = useState(null);
  const [footerBottomBaseline, setFooterBottomBaseline] = useState('');

  // Initialize Header Navigation
  useEffect(() => {
    if (headerNavQuery.data && headerItems === null) {
      const items = withKeys(headerNavQuery.data.items || []).map((item) => ({
        ...item,
        children: withKeys(item.children || []),
      }));
      setHeaderItems(items);
      setHeaderBaseline(JSON.stringify(items));
    }
  }, [headerNavQuery.data, headerItems]);

  // Initialize Footer Columns
  useEffect(() => {
    if (footerNavQuery.data && footerItems === null) {
      const items = withKeys(footerNavQuery.data.items || []).map((col) => ({
        ...col,
        children: withKeys(col.children || []),
      }));
      setFooterItems(items);
      setFooterBaseline(JSON.stringify(items));
    }
  }, [footerNavQuery.data, footerItems]);

  // Initialize Footer Bottom
  useEffect(() => {
    if (footerBottomQuery.data && footerBottomItems === null) {
      const items = withKeys(footerBottomQuery.data.items || []);
      setFooterBottomItems(items);
      setFooterBottomBaseline(JSON.stringify(items));
    }
  }, [footerBottomQuery.data, footerBottomItems]);

  const headerDirty = headerItems !== null && JSON.stringify(headerItems) !== headerBaseline;
  const footerDirty = footerItems !== null && JSON.stringify(footerItems) !== footerBaseline;
  const footerBottomDirty = footerBottomItems !== null && JSON.stringify(footerBottomItems) !== footerBottomBaseline;

  // Header Save Mutation
  const headerMutation = useMutation({
    mutationFn: async () => {
      // Also save header options & logo if settings form is dirty
      if (settings.dirty) {
        await settings.save(['brand', 'header']);
      }
      return api.put('/navigation/header', { items: headerItems }).then((r) => r.data);
    },
    onSuccess: (data) => {
      const next = withKeys(data.items || []).map((item) => ({ ...item, children: withKeys(item.children || []) }));
      setHeaderItems(next);
      setHeaderBaseline(JSON.stringify(next));
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'navigation', 'header'] });
      toast.success(uiText("Header navigation & options saved successfully"));
    },
    onError: (err) => toast.apiError(err),
  });

  // Footer Save Mutation
  const footerMutation = useMutation({
    mutationFn: async () => {
      return api.put('/navigation/footer', { items: footerItems }).then((r) => r.data);
    },
    onSuccess: (data) => {
      const next = withKeys(data.items || []).map((col) => ({ ...col, children: withKeys(col.children || []) }));
      setFooterItems(next);
      setFooterBaseline(JSON.stringify(next));
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'navigation', 'footer'] });
      toast.success(uiText("Footer columns saved successfully"));
    },
    onError: (err) => toast.apiError(err),
  });

  // Sponsored Resources Bar Save Mutation
  const sponsoredMutation = useMutation({
    mutationFn: async () => {
      return settings.save(['sponsoredBar']);
    },
  });

  // WhatsApp Banner Save Mutation
  const bannerMutation = useMutation({
    mutationFn: async () => {
      return settings.save(['whatsappBanner']);
    },
  });

  // Copyright & Bottom Save Mutation
  const copyrightMutation = useMutation({
    mutationFn: async () => {
      if (settings.dirty) {
        await settings.save(['brand', 'footer', 'social']);
      }
      return api.put('/navigation/footerBottom', { items: footerBottomItems }).then((r) => r.data);
    },
    onSuccess: (data) => {
      const next = withKeys(data.items || []);
      setFooterBottomItems(next);
      setFooterBottomBaseline(JSON.stringify(next));
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'navigation', 'footerBottom'] });
      toast.success(uiText("Copyright & bottom links saved successfully"));
    },
    onError: (err) => toast.apiError(err),
  });

  if (settings.query.isError) return <ErrorState error={settings.query.error} onRetry={settings.query.refetch} />;
  if (!form || headerItems === null || footerItems === null || footerBottomItems === null) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  const whatsappBanner = form.whatsappBanner || {};
  const bannerIconUrl = resolveMediaUrl(whatsappBanner.icon) || whatsappBanner.iconUrl;

  return (
    <div className="space-y-6">
      <PageHeader
        title={uiText("Header & Footer Settings")}
        description={uiText("Complete dynamic content management for the Header Navigation Bar, Reference Books Footer, WhatsApp Banner, and Copyright.")}
      />

      <Tabs defaultValue="header" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="header" className="flex items-center gap-2">
            <LayoutTemplate className="size-4" />
            <span>{uiText("Header Navigation")}</span>
          </TabsTrigger>
          <TabsTrigger value="sponsored" className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span>{uiText("Sponsored Bar")}</span>
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>{uiText("Footer Columns")}</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="size-4 text-[#25D366]" />
            <span>{uiText("WhatsApp Banner")}</span>
          </TabsTrigger>
          <TabsTrigger value="bottom" className="flex items-center gap-2">
            <Check className="size-4" />
            <span>{uiText("Footer Branding & Legal")}</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HEADER NAVIGATION */}
        <TabsContent value="header" className="space-y-6 mt-4">
          {/* Header Options & Logo */}
          <Panel
            title={uiText("Header Options & Branding")}
            description={uiText("Logo, sticky behavior, search bar visibility, and toggle controls.")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MediaField
                  label={uiText("Header Logo")}
                  hint={uiText("Primary website logo displayed on the left side of the navigation bar.")}
                  value={form.brand?.logo}
                  onChange={(v) => patch('brand', { logo: v })}
                  kind="logo"
                />
              </div>
              <SwitchField
                label={uiText("Sticky Navigation")}
                hint={uiText("Keep header visible at the top while scrolling")}
                checked={form.header?.sticky !== false}
                onChange={(v) => patch('header', { sticky: v })}
              />
              <SwitchField
                label={uiText("Show Search Bar / Icon")}
                hint={uiText("Display search in header on desktop & mobile")}
                checked={form.header?.showSearch !== false}
                onChange={(v) => patch('header', { showSearch: v })}
              />
              <SwitchField
                label={uiText("Show Language Switcher")}
                checked={form.header?.showLanguageSwitch !== false}
                onChange={(v) => patch('header', { showLanguageSwitch: v })}
              />
              <SwitchField
                label={uiText("Show Theme Toggle (Light/Dark)")}
                checked={form.header?.showThemeSwitch !== false}
                onChange={(v) => patch('header', { showThemeSwitch: v })}
              />
              <L10nField
                className="sm:col-span-2"
                label={uiText("Search Placeholder")}
                value={form.header?.searchPlaceholder}
                onChange={(v) => patch('header', { searchPlaceholder: v })}
              />
            </div>
          </Panel>

          {/* Header Navigation Menu Items */}
          <Panel
            title={uiText("Header Navigation Menu Items")}
            description={uiText("Add, edit, reorder via drag & drop, and create dropdown menus for NCERT, reference books, or custom links.")}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: uiText("Load Recommended Header Navigation?"),
                      message: uiText("This will replace current header items with the standard PMS navigation (Home, NCERT Maths, Reference Books, Important Links, About Us, Contact)."),
                      confirmText: uiText("Load Recommended"),
                    });
                    if (ok) {
                      setHeaderItems(withKeys(RECOMMENDED_HEADER_NAV).map((i) => ({ ...i, children: withKeys(i.children || []) })));
                    }
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">{uiText("Load PMS Preset")}</span>
                </Button>
                <Button
                  size="sm"
                  disabled={(!headerDirty && !settings.dirty) || headerMutation.isPending}
                  onClick={() => headerMutation.mutate()}
                >
                  {headerMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  {uiText("Save Header")}
                </Button>
              </div>
            }
          >
            <SortableList
              items={headerItems}
              onChange={setHeaderItems}
              className="space-y-3"
              renderItem={(item, index, { ref, style, handleProps }) => (
                <li
                  ref={ref}
                  style={style}
                  className={`rounded-2xl border bg-card p-4 transition-all shadow-xs ${
                    item.isVisible === false ? 'opacity-60 bg-muted/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <DragHandle {...handleProps} className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <L10nField
                          label={uiText("Menu Label")}
                          value={item.label}
                          onChange={(label) =>
                            setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, label } : it)))
                          }
                        />
                        <SelectField
                          label={uiText("Type")}
                          value={item.type || 'link'}
                          onChange={(type) =>
                            setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, type } : it)))
                          }
                          options={NAV_TYPES}
                        />
                        <div className="flex items-end gap-3 pb-2">
                          <SwitchField
                            label={uiText("Visible")}
                            checked={item.isVisible !== false}
                            onChange={(isVisible) =>
                              setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, isVisible } : it)))
                            }
                          />
                        </div>
                      </div>

                      {item.type === 'link' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextField
                            label={uiText("Destination URL")}
                            value={item.url}
                            onChange={(url) =>
                              setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, url } : it)))
                            }
                            placeholder="https://"
                          />
                          <div className="flex items-end pb-2">
                            <SwitchField
                              label={uiText("Open in new tab")}
                              checked={item.newTab}
                              onChange={(newTab) =>
                                setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, newTab } : it)))
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Dropdown child links */}
                      {(item.type === 'dropdown' || item.type === 'column' || (item.children && item.children.length > 0)) && (
                        <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {uiText("Dropdown Links (Classes / Sub-pages)")} ({item.children?.length || 0})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                title={uiText("Auto-generate Class 6 to 12 links")}
                                onClick={() => {
                                  const classLinks = generateClassLinks(item.label?.en || 'Class', item.url || '/class-');
                                  setHeaderItems(
                                    headerItems.map((it, i) =>
                                      i === index ? { ...it, children: [...(it.children || []), ...classLinks] } : it,
                                    ),
                                  );
                                }}
                              >
                                <GraduationCap className="size-3.5 text-brand" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const newChild = {
                                    _key: clientKey(),
                                    label: { hi: '', en: '' },
                                    url: '',
                                    newTab: false,
                                    isVisible: true,
                                  };
                                  setHeaderItems(
                                    headerItems.map((it, i) =>
                                      i === index ? { ...it, children: [...(it.children || []), newChild] } : it,
                                    ),
                                  );
                                }}
                              >
                                <Plus className="size-3" /> {uiText("Add Dropdown Link")}
                              </Button>
                            </div>
                          </div>

                          {(!item.children || item.children.length === 0) ? (
                            <p className="text-xs text-muted-foreground italic py-2">
                              {uiText("No child links yet. Click 'Add Dropdown Link' or use the Class generator.")}
                            </p>
                          ) : (
                            <SortableList
                              items={item.children}
                              onChange={(children) =>
                                setHeaderItems(headerItems.map((it, i) => (i === index ? { ...it, children } : it)))
                              }
                              className="space-y-2"
                              renderItem={(child, cIdx, { ref: cRef, style: cStyle, handleProps: cHandle }) => (
                                <li
                                  ref={cRef}
                                  style={cStyle}
                                  className={`flex items-start gap-2 rounded-lg border bg-background p-2.5 text-xs shadow-2xs ${
                                    child.isVisible === false ? 'opacity-50' : ''
                                  }`}
                                >
                                  <DragHandle {...cHandle} className="size-6 mt-1" />
                                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                                    <L10nField
                                      label={uiText("Link Title")}
                                      value={child.label}
                                      onChange={(label) => {
                                        const nextChildren = item.children.map((c, ci) =>
                                          ci === cIdx ? { ...c, label } : c,
                                        );
                                        setHeaderItems(
                                          headerItems.map((it, i) => (i === index ? { ...it, children: nextChildren } : it)),
                                        );
                                      }}
                                    />
                                    <TextField
                                      label={uiText("URL")}
                                      value={child.url}
                                      onChange={(url) => {
                                        const nextChildren = item.children.map((c, ci) =>
                                          ci === cIdx ? { ...c, url } : c,
                                        );
                                        setHeaderItems(
                                          headerItems.map((it, i) => (i === index ? { ...it, children: nextChildren } : it)),
                                        );
                                      }}
                                      placeholder="https://"
                                    />
                                    <div className="flex items-center justify-between pt-4">
                                      <SwitchField
                                        label={uiText("Visible")}
                                        checked={child.isVisible !== false}
                                        onChange={(isVisible) => {
                                          const nextChildren = item.children.map((c, ci) =>
                                            ci === cIdx ? { ...c, isVisible } : c,
                                          );
                                          setHeaderItems(
                                            headerItems.map((it, i) => (i === index ? { ...it, children: nextChildren } : it)),
                                          );
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          const nextChildren = item.children.filter((_, ci) => ci !== cIdx);
                                          setHeaderItems(
                                            headerItems.map((it, i) => (i === index ? { ...it, children: nextChildren } : it)),
                                          );
                                        }}
                                        aria-label={uiText("Remove link")}
                                      >
                                        <Trash2 className="size-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </li>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Move and Delete item */}
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setHeaderItems(moveItem(headerItems, index, index - 1))}
                        disabled={index === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setHeaderItems(moveItem(headerItems, index, index + 1))}
                        disabled={index === headerItems.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setHeaderItems(headerItems.filter((_, i) => i !== index))}
                        aria-label={uiText("Delete navigation item")}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </li>
              )}
            />

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                setHeaderItems([
                  ...headerItems,
                  {
                    _key: clientKey(),
                    label: { hi: '', en: '' },
                    url: '',
                    type: 'link',
                    newTab: false,
                    isVisible: true,
                    children: [],
                  },
                ])
              }
            >
              <Plus /> {uiText("Add Navigation Item")}
            </Button>
          </Panel>
        </TabsContent>

        {/* TAB: SPONSORED RESOURCES BAR */}
        <TabsContent value="sponsored" className="space-y-6 mt-4">
          <Panel
            title={uiText("Sponsored Resources Bar (प्रायोजित संसाधन)")}
            description={uiText("Configure the promotional resources bar displayed directly below the main navigation bar.")}
            actions={
              <Button
                size="sm"
                disabled={sponsoredMutation.isPending}
                onClick={() => sponsoredMutation.mutate()}
              >
                {sponsoredMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                {uiText("Save Sponsored Bar")}
              </Button>
            }
          >
            <div className="space-y-4">
              <SwitchField
                label={uiText("Enable Sponsored Resources Bar")}
                hint={uiText("Display the promotional strip below the main navigation bar.")}
                checked={form.sponsoredBar?.enabled !== false}
                onChange={(v) => patch('sponsoredBar', { enabled: v })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField
                  label={uiText("Badge Text (बैज)")}
                  value={form.sponsoredBar?.badge}
                  onChange={(v) => patch('sponsoredBar', { badge: v })}
                  placeholder={uiText("e.g. प्रायोजित संसाधन / Sponsored Resource")}
                />
                <Field label={uiText("Destination Link URL (गंतव्य लिंक)")} hint={uiText("URL to open when students click the explore link.")}>
                  <input
                    type="text"
                    value={form.sponsoredBar?.linkUrl || ''}
                    onChange={(e) => patch('sponsoredBar', { linkUrl: e.target.value })}
                    placeholder="https://"
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                  />
                </Field>
              </div>

              <L10nField
                label={uiText("Announcement Message / Text (संदेश)")}
                value={form.sponsoredBar?.text}
                onChange={(v) => patch('sponsoredBar', { text: v })}
                placeholder={uiText("e.g. 🎯 IIT-JEE फाउंडेशन & NTSE 2026: गणित टेस्ट सीरीज लाइव उपलब्ध")}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField
                  label={uiText("CTA Link Label (बटन टेक्स्ट)")}
                  value={form.sponsoredBar?.linkLabel}
                  onChange={(v) => patch('sponsoredBar', { linkLabel: v })}
                  placeholder={uiText("e.g. अन्वेषण करें → / Explore Now →")}
                />

                <div className="flex items-center pt-6">
                  <SwitchField
                    label={uiText("Open link in new tab")}
                    checked={Boolean(form.sponsoredBar?.isExternal)}
                    onChange={(v) => patch('sponsoredBar', { isExternal: v })}
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  {uiText("Live Strip Preview (लाइव पूर्वावलोकन)")}
                </p>
                <div className="rounded-lg border border-slate-200 dark:border-border/60 bg-slate-50 dark:bg-card/75 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase">
                      {form.sponsoredBar?.badge?.en || form.sponsoredBar?.badge?.hi || uiText('SPONSORED')}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {form.sponsoredBar?.text?.en || form.sponsoredBar?.text?.hi || uiText('IIT-JEE Foundation & NTSE 2026: Mathematics Test Series Live')}
                    </span>
                  </div>
                  <span className="font-bold text-brand">
                    {form.sponsoredBar?.linkLabel?.en || form.sponsoredBar?.linkLabel?.hi || uiText('Explore Now →')}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* TAB 2: FOOTER COLUMNS */}
        <TabsContent value="footer" className="space-y-6 mt-4">
          <Panel
            title={uiText("Footer Content Columns (Desktop 6-Column Layout)")}
            description={uiText("Manage column titles, reorder with drag & drop, add new columns, and manage links inside each column.")}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: uiText("Load Screenshot Preset Layout?"),
                      message: uiText("This will load the columns from the reference layout: R.S. Aggarwal, R.D. Sharma, M.L. Aggarwal, and Important Links."),
                      confirmText: uiText("Load Preset"),
                    });
                    if (ok) {
                      setFooterItems(withKeys(REFERENCE_SCREENSHOT_FOOTER_COLUMNS).map((c) => ({ ...c, children: withKeys(c.children || []) })));
                    }
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">{uiText("Load Screenshot Preset")}</span>
                </Button>
                <Button
                  size="sm"
                  disabled={!footerDirty || footerMutation.isPending}
                  onClick={() => footerMutation.mutate()}
                >
                  {footerMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  {uiText("Save Footer Columns")}
                </Button>
              </div>
            }
          >
            <SortableList
              items={footerItems}
              onChange={setFooterItems}
              className="space-y-4"
              renderItem={(col, colIndex, { ref, style, handleProps }) => (
                <li
                  ref={ref}
                  style={style}
                  className={`rounded-2xl border bg-card p-4 transition-all shadow-xs ${
                    col.isVisible === false ? 'opacity-60 bg-muted/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <DragHandle {...handleProps} className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <L10nField
                          label={uiText("Column Heading")}
                          value={col.label}
                          onChange={(label) =>
                            setFooterItems(footerItems.map((c, i) => (i === colIndex ? { ...c, label } : c)))
                          }
                        />
                        <SelectField
                          label={uiText("Column Mode")}
                          value={col.type || 'column'}
                          onChange={(type) =>
                            setFooterItems(footerItems.map((c, i) => (i === colIndex ? { ...c, type } : c)))
                          }
                          options={COLUMN_TYPES}
                        />
                        <div className="flex items-end pb-2">
                          <SwitchField
                            label={uiText("Visible")}
                            checked={col.isVisible !== false}
                            onChange={(isVisible) =>
                              setFooterItems(footerItems.map((c, i) => (i === colIndex ? { ...c, isVisible } : c)))
                            }
                          />
                        </div>
                      </div>

                      {col.type === 'classes' ? (
                        <p className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                          {uiText("This column automatically renders all active Class 6–12 mathematics links from your database.")}
                        </p>
                      ) : (
                        <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {uiText("Column Links")} ({col.children?.length || 0})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const name = col.label?.en || 'Book';
                                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                                  const generated = [6, 7, 8, 9, 10, 11, 12].map((num) => ({
                                    _key: clientKey(),
                                    label: { hi: `${name} Class ${num}`, en: `${name} Class ${num}` },
                                    url: `/reference-solutions/${slug}/class-${num}`,
                                    newTab: false,
                                    isVisible: true,
                                  }));
                                  setFooterItems(
                                    footerItems.map((c, i) =>
                                      i === colIndex ? { ...c, children: [...(c.children || []), ...generated] } : c,
                                    ),
                                  );
                                }}
                              >
                                <BookOpen className="size-3 text-brand" /> {uiText("Add Classes 6–12")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const newLink = {
                                    _key: clientKey(),
                                    label: { hi: '', en: '' },
                                    url: '',
                                    newTab: false,
                                    isVisible: true,
                                  };
                                  setFooterItems(
                                    footerItems.map((c, i) =>
                                      i === colIndex ? { ...c, children: [...(c.children || []), newLink] } : c,
                                    ),
                                  );
                                }}
                              >
                                <Plus className="size-3" /> {uiText("Add Link")}
                              </Button>
                            </div>
                          </div>

                          {(!col.children || col.children.length === 0) ? (
                            <p className="text-xs text-muted-foreground italic py-2">
                              {uiText("No links in this column yet. Click 'Add Link' or 'Add Classes 6–12'.")}
                            </p>
                          ) : (
                            <SortableList
                              items={col.children}
                              onChange={(children) =>
                                setFooterItems(footerItems.map((c, i) => (i === colIndex ? { ...c, children } : c)))
                              }
                              className="space-y-2"
                              renderItem={(child, cIdx, { ref: cRef, style: cStyle, handleProps: cHandle }) => (
                                <li
                                  ref={cRef}
                                  style={cStyle}
                                  className={`flex items-start gap-2 rounded-lg border bg-background p-2.5 text-xs shadow-2xs ${
                                    child.isVisible === false ? 'opacity-50' : ''
                                  }`}
                                >
                                  <DragHandle {...cHandle} className="size-6 mt-1" />
                                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                                    <L10nField
                                      label={uiText("Link Title")}
                                      value={child.label}
                                      onChange={(label) => {
                                        const nextChildren = col.children.map((c, ci) =>
                                          ci === cIdx ? { ...c, label } : c,
                                        );
                                        setFooterItems(
                                          footerItems.map((c, i) => (i === colIndex ? { ...c, children: nextChildren } : c)),
                                        );
                                      }}
                                    />
                                    <TextField
                                      label={uiText("URL")}
                                      value={child.url}
                                      onChange={(url) => {
                                        const nextChildren = col.children.map((c, ci) =>
                                          ci === cIdx ? { ...c, url } : c,
                                        );
                                        setFooterItems(
                                          footerItems.map((c, i) => (i === colIndex ? { ...c, children: nextChildren } : c)),
                                        );
                                      }}
                                      placeholder="https://"
                                    />
                                    <div className="flex items-center justify-between pt-4">
                                      <SwitchField
                                        label={uiText("Visible")}
                                        checked={child.isVisible !== false}
                                        onChange={(isVisible) => {
                                          const nextChildren = col.children.map((c, ci) =>
                                            ci === cIdx ? { ...c, isVisible } : c,
                                          );
                                          setFooterItems(
                                            footerItems.map((c, i) => (i === colIndex ? { ...c, children: nextChildren } : c)),
                                          );
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          const nextChildren = col.children.filter((_, ci) => ci !== cIdx);
                                          setFooterItems(
                                            footerItems.map((c, i) => (i === colIndex ? { ...c, children: nextChildren } : c)),
                                          );
                                        }}
                                        aria-label={uiText("Remove link")}
                                      >
                                        <Trash2 className="size-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </li>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFooterItems(moveItem(footerItems, colIndex, colIndex - 1))}
                        disabled={colIndex === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFooterItems(moveItem(footerItems, colIndex, colIndex + 1))}
                        disabled={colIndex === footerItems.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFooterItems(footerItems.filter((_, i) => i !== colIndex))}
                        aria-label={uiText("Delete column")}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </li>
              )}
            />

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                setFooterItems([
                  ...footerItems,
                  {
                    _key: clientKey(),
                    label: { hi: '', en: '' },
                    type: 'column',
                    isVisible: true,
                    children: [],
                  },
                ])
              }
            >
              <Plus /> {uiText("Add Footer Column")}
            </Button>
          </Panel>
        </TabsContent>

        {/* TAB 3: WHATSAPP PROMOTIONAL BANNER */}
        <TabsContent value="whatsapp" className="space-y-6 mt-4">
          <Panel
            title={uiText("WhatsApp Channel Promotional Banner")}
            description={uiText("Configure the callout strip displayed at the top of the footer. 100% dynamic and editable.")}
            actions={
              <Button
                size="sm"
                disabled={!settings.dirty || settings.saving}
                onClick={() => bannerMutation.mutate()}
              >
                {settings.saving ? <Loader2 className="animate-spin" /> : <Save />}
                {uiText("Save Banner")}
              </Button>
            }
          >
            <div className="space-y-4">
              <SwitchField
                label={uiText("Enable WhatsApp Promotional Banner")}
                hint={uiText("Display callout banner at the top of the footer")}
                checked={whatsappBanner.enabled !== false}
                onChange={(enabled) => patch('whatsappBanner', { enabled })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <L10nField
                  label={uiText("Banner Title")}
                  value={whatsappBanner.title}
                  onChange={(title) => patch('whatsappBanner', { title })}
                />
                <L10nField
                  label={uiText("Official Badge Text")}
                  value={whatsappBanner.badge}
                  onChange={(badge) => patch('whatsappBanner', { badge })}
                />
                <L10nField
                  className="sm:col-span-2"
                  label={uiText("Description")}
                  multiline
                  rows={2}
                  value={whatsappBanner.description}
                  onChange={(description) => patch('whatsappBanner', { description })}
                />
                <TextField
                  label={uiText("WhatsApp Channel URL")}
                  value={whatsappBanner.url}
                  onChange={(url) => patch('whatsappBanner', { url })}
                  placeholder="https://"
                />
                <L10nField
                  label={uiText("Button Text")}
                  value={whatsappBanner.buttonText}
                  onChange={(buttonText) => patch('whatsappBanner', { buttonText })}
                />
                <div className="sm:col-span-2">
                  <MediaField
                    label={uiText("Promotional Icon (Optional)")}
                    hint={uiText("Upload custom icon. If empty, default official WhatsApp logo is used.")}
                    value={whatsappBanner.icon}
                    onChange={(icon) => patch('whatsappBanner', { icon })}
                    kind="image"
                  />
                </div>
              </div>

              {/* Live Preview of the WhatsApp Banner */}
              <div className="border-t pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {uiText("Live Banner Preview")}
                </p>
                <div className="rounded-2xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/20 via-[#25D366]/10 to-transparent p-5 backdrop-blur-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
                        {bannerIconUrl ? (
                          <img src={bannerIconUrl} alt="WhatsApp" className="size-6 object-contain" />
                        ) : (
                          <SOCIAL_ICONS.whatsapp className="size-6" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-base font-extrabold text-foreground sm:text-lg">
                            {whatsappBanner.title?.en || whatsappBanner.title?.hi || uiText("Passion Maths Study WhatsApp Channel")}
                          </h3>
                          <span className="inline-flex items-center rounded-full bg-[#25D366]/20 px-2 py-0.5 text-[10px] font-bold text-[#25D366] ring-1 ring-[#25D366]/30">
                            {whatsappBanner.badge?.en || whatsappBanner.badge?.hi || uiText("Official")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {whatsappBanner.description?.en ||
                            whatsappBanner.description?.hi ||
                            uiText("Get daily NCERT 2024–25 maths formulas, new solutions, notes and exam updates on WhatsApp.")}
                        </p>
                      </div>
                    </div>
                    <a
                      href={whatsappBanner.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-md"
                    >
                      <SOCIAL_ICONS.whatsapp className="size-4" />
                      <span>{whatsappBanner.buttonText?.en || whatsappBanner.buttonText?.hi || uiText("Follow on WhatsApp")}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* TAB 5: FOOTER BRANDING, COPYRIGHT & SOCIAL */}
        <TabsContent value="bottom" className="space-y-6 mt-4">
          {/* Footer Branding Panel */}
          <Panel
            title={uiText("Footer Branding & Identity")}
            description={uiText("Configure footer logo, website name, subtitle, and description.")}
            actions={
              <Button
                size="sm"
                disabled={(!settings.dirty && !footerBottomDirty) || settings.saving || copyrightMutation.isPending}
                onClick={() => copyrightMutation.mutate()}
              >
                {settings.saving || copyrightMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                {uiText("Save Footer Settings")}
              </Button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MediaField
                  label={uiText("Footer Logo")}
                  hint={uiText("PMS logo displayed in the footer branding section (50 × 50 px). If unselected, uses header logo.")}
                  value={form.brand?.footerLogo}
                  onChange={(v) => patch('brand', { footerLogo: v })}
                  kind="logo"
                />
              </div>
              <L10nField
                label={uiText("Website Name")}
                value={form.brand?.name}
                onChange={(name) => patch('brand', { name })}
              />
              <L10nField
                label={uiText("Subtitle / Tagline")}
                value={form.brand?.tagline}
                onChange={(tagline) => patch('brand', { tagline })}
                hint={uiText("e.g. 'NCERT Class 6–12 Maths'")}
              />
              <L10nField
                className="sm:col-span-2"
                label={uiText("Footer Description")}
                multiline
                rows={3}
                value={form.footer?.description}
                onChange={(description) => patch('footer', { description })}
                hint={uiText("Displayed beside the branding in the footer section.")}
              />
            </div>
          </Panel>

          {/* Social Media Links Panel */}
          <Panel
            title={uiText("Social Media Channels")}
            description={uiText("Update official social media URLs and toggle visibility for WhatsApp, YouTube, Instagram, and Facebook.")}
          >
            <div className="space-y-4">
              <SwitchField
                label={uiText("Show Social Media Links Bar in Footer")}
                checked={form.footer?.showSocial !== false}
                onChange={(showSocial) => patch('footer', { showSocial })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {['whatsapp', 'youtube', 'instagram', 'facebook'].map((platform) => {
                  const Icon = SOCIAL_ICONS[platform];
                  const currentSocial = (form.social || []).find((s) => s.platform === platform) || { platform, url: '', isEnabled: true };
                  return (
                    <div
                      key={platform}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-lg bg-muted text-foreground">
                            {Icon && <Icon className="size-4" />}
                          </span>
                          <span className="text-xs font-bold capitalize text-foreground">{platform}</span>
                        </div>
                        <SwitchField
                          label={uiText("Enabled")}
                          checked={currentSocial.isEnabled !== false}
                          onChange={(isEnabled) => {
                            const list = form.social || [];
                            const exists = list.some((s) => s.platform === platform);
                            const next = exists
                              ? list.map((s) => (s.platform === platform ? { ...s, isEnabled } : s))
                              : [...list, { platform, url: currentSocial.url, isEnabled }];
                            patch('social', next);
                          }}
                        />
                      </div>
                      <TextField
                        label={uiText("URL")}
                        value={currentSocial.url || ''}
                        placeholder={`https://${platform}.com/...`}
                        onChange={(url) => {
                          const list = form.social || [];
                          const exists = list.some((s) => s.platform === platform);
                          const next = exists
                            ? list.map((s) => (s.platform === platform ? { ...s, url } : s))
                            : [...list, { platform, url, isEnabled: currentSocial.isEnabled !== false }];
                          patch('social', next);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel
            title={uiText("Footer Copyright & Disclaimer")}
            description={uiText("Configure copyright text, year behavior, disclaimer and social links.")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <L10nField
                className="sm:col-span-2"
                label={uiText("Copyright Notice")}
                hint={uiText("Use {year} to dynamically insert the active year (e.g. '© {year} Passion Maths Study (PMS). All rights reserved.')")}
                value={form.footer?.copyright}
                onChange={(copyright) => patch('footer', { copyright })}
              />
              <TextField
                label={uiText("Copyright Year")}
                hint={uiText("Type 'auto' to use the current calendar year automatically, or enter a fixed year like '2026'")}
                value={form.footer?.copyrightYear || 'auto'}
                onChange={(copyrightYear) => patch('footer', { copyrightYear })}
              />
              <SwitchField
                label={uiText("Show Social Media Links Bar")}
                checked={form.footer?.showSocial !== false}
                onChange={(showSocial) => patch('footer', { showSocial })}
              />
              <L10nField
                className="sm:col-span-2"
                label={uiText("Disclaimer Text")}
                multiline
                rows={2}
                value={form.footer?.disclaimer}
                onChange={(disclaimer) => patch('footer', { disclaimer })}
              />
            </div>
          </Panel>

          {/* Footer Bottom Links */}
          <Panel
            title={uiText("Footer Bottom Links (Right Side)")}
            description={uiText("Privacy Policy, Terms & Conditions, Contact, and other legal links.")}
          >
            <SortableList
              items={footerBottomItems}
              onChange={setFooterBottomItems}
              className="space-y-2"
              renderItem={(link, index, { ref, style, handleProps }) => (
                <li
                  ref={ref}
                  style={style}
                  className={`flex items-start gap-2 rounded-xl border bg-card p-3 shadow-2xs ${
                    link.isVisible === false ? 'opacity-50' : ''
                  }`}
                >
                  <DragHandle {...handleProps} className="mt-1" />
                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                    <L10nField
                      label={uiText("Label")}
                      value={link.label}
                      onChange={(label) =>
                        setFooterBottomItems(footerBottomItems.map((l, i) => (i === index ? { ...l, label } : l)))
                      }
                    />
                    <TextField
                      label={uiText("URL")}
                      value={link.url}
                      onChange={(url) =>
                        setFooterBottomItems(footerBottomItems.map((l, i) => (i === index ? { ...l, url } : l)))
                      }
                      placeholder="https://"
                    />
                    <div className="flex items-center justify-between pt-4">
                      <SwitchField
                        label={uiText("Visible")}
                        checked={link.isVisible !== false}
                        onChange={(isVisible) =>
                          setFooterBottomItems(footerBottomItems.map((l, i) => (i === index ? { ...l, isVisible } : l)))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFooterBottomItems(footerBottomItems.filter((_, i) => i !== index))}
                        aria-label={uiText("Remove bottom link")}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setFooterBottomItems(moveItem(footerBottomItems, index, index - 1))}
                      disabled={index === 0}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setFooterBottomItems(moveItem(footerBottomItems, index, index + 1))}
                      disabled={index === footerBottomItems.length - 1}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </div>
                </li>
              )}
            />

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setFooterBottomItems([
                  ...footerBottomItems,
                  {
                    _key: clientKey(),
                    label: { hi: '', en: '' },
                    url: '',
                    newTab: false,
                    isVisible: true,
                  },
                ])
              }
            >
              <Plus /> {uiText("Add Bottom Link")}
            </Button>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
