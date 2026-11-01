import { uiText } from './uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { createContext, useCallback, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { get } from './api';
import { useLang } from './i18n';

const SiteContext = createContext(null);

export const siteQuery = { queryKey: ['site'], queryFn: () => get('/public/site'), staleTime: 0, refetchInterval: 15_000, refetchOnWindowFocus: 'always' };

export function SiteProvider({ children }) {
  const client = useQueryClient();
  const revision = useRef(null);
  const changes = useQuery({ queryKey: ['public-revision'], queryFn: () => get('/public/revision'), refetchInterval: 5000, refetchOnWindowFocus: 'always' });
  useEffect(() => {
    const refresh = () => {
      for (const key of ['site', 'home', 'resolve', 'search', 'suggest']) client.invalidateQueries({ queryKey: [key] });
    };
    const storage = event => { if (event.key === 'pms-content-revision') refresh(); };
    window.addEventListener('pms-content-updated', refresh);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('pms-content-updated', refresh); window.removeEventListener('storage', storage); };
  }, [client]);
  useEffect(() => {
    const next = changes.data?.revision;
    if (next && revision.current && next !== revision.current) {
      for (const key of ['site', 'home', 'resolve', 'search', 'suggest']) client.invalidateQueries({ queryKey: [key] });
    }
    if (next) revision.current = next;
  }, [changes.data, client]);
  const language = useUiLanguage();
  const query = useQuery({ ...siteQuery, queryKey: ['site', language], queryFn: () => get('/public/site',{lang:language}) });
  const theme = query.data?.settings?.theme;

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement.style;
    if (theme.brandColor) root.setProperty('--brand', theme.brandColor);
    if (theme.accentColor) root.setProperty('--saffron', theme.accentColor);
    if (theme.inkColor) root.setProperty('--ink', theme.inkColor);
  }, [theme]);

  return <SiteContext value={query}>{children}</SiteContext>;
}

export function useSiteQuery() {
  return useContext(SiteContext);
}

export function useSite() {
  return useContext(SiteContext)?.data;
}

/** Admin-configurable frontend terminology, e.g. term('chapter', 5) → "अध्याय 5". */
export function useTerm() {
  const site = useSite();
  const { lang } = useLang();
  return useCallback(
    (key, suffix) => {
      const entry = site?.terms?.[key];
      const base = entry?.[lang] || key;
      return suffix === undefined || suffix === null || suffix === '' ? uiText(base) : `${uiText(base)} ${suffix}`;
    },
    [site, lang],
  );
}

export function useBrand() {
  const site = useSite();
  const brand = site?.settings?.brand || {};
  return {
    ...brand,
    logoSrc: brand.logo?.url || brand.logoUrl || '/brand/pms-logo.png',
    footerLogoSrc: brand.footerLogo?.url || brand.logo?.url || brand.logoUrl || '/brand/pms-logo.png',
  };
}
