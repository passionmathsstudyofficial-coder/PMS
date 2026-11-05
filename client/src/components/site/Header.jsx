import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useState } from 'react';
import { useSite } from '@/lib/site';
import { cn } from '@/lib/utils';
import { AnnouncementBar } from './AnnouncementBar.jsx';
import { MainNavbar } from './MainNavbar.jsx';
import { MobileMenu } from './MobileMenu.jsx';
import { SponsoredResourcesBar } from './SponsoredResourcesBar.jsx';

export function Header({ className }) {
  useUiLanguage();
  const site = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSticky = site?.settings?.header?.sticky !== false;

  return (
    <header
      data-purpose="pms-header-container"
      className={cn('w-full relative', isSticky && 'sticky top-0 z-40', className)}
    >
      {/* Row 1: Academic Session Announcement Bar */}
      <AnnouncementBar />

      {/* Row 2: Main Desktop & Mobile Navigation Bar */}
      <MainNavbar onOpenMobileMenu={() => setMobileOpen(true)} />

      {/* Row 3: Sponsored Resources Bar */}
      <SponsoredResourcesBar />

      {/* Mobile Drawer Navigation */}
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

export default Header;
