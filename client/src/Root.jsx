import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useLayoutEffect } from 'react';
import { syncLanguageScope } from '@/lib/uiLanguage.js';
import { ADMIN_PATH } from '@/lib/config';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { ThemeProvider } from '@/lib/theme';
import { MotionConfig } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/lib/i18n';
import { SiteProvider, useSite } from '@/lib/site';

function SettingsBridge({ children }) {
  useUiLanguage();
  const site = useSite();
  const settings = site?.settings;
  return (
    <ThemeProvider defaultTheme={settings?.theme?.defaultMode || 'light'}>
      <LanguageProvider defaultLang={settings?.language?.default || 'hi'}>{children}</LanguageProvider>
    </ThemeProvider>
  );
}

export default function Root() {
  const location = useLocation();
  useLayoutEffect(() => syncLanguageScope(location.pathname, ADMIN_PATH), [location.pathname]);
  useUiLanguage();
  return (
    <SiteProvider>
      <SettingsBridge>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={250}>
            <Outlet />
            <ScrollRestoration getKey={(location) => location.pathname} />
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </MotionConfig>
      </SettingsBridge>
    </SiteProvider>
  );
}
