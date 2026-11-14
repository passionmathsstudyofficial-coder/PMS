import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut, Menu, ShieldCheck, UserCog, X, ChevronDown } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/site/ThemeToggle.jsx';
import { adminUrl } from '@/lib/config';
import { failSafe, gsap, shouldAnimate, useGSAP } from '@/lib/motion';
import { useBrand } from '@/lib/site';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '../lib/auth.jsx';
import { ConfirmProvider } from './ConfirmDialog.jsx';
import { NAV_GROUPS } from './nav.js';

function SidebarNavItem({ item, onNavigate }) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const targetUrl = adminUrl(item.to);
  const hasChildren = item.children && item.children.length > 0;

  const isSelfActive = location.pathname === adminUrl(item.to).split('?')[0];
  const isAnyChildActive = hasChildren && item.children.some((child) => {
    const childTarget = adminUrl(child.to);
    return currentPath === childTarget || (child.to.includes('?') && currentPath.endsWith(child.to.slice(child.to.indexOf('?'))));
  });

  const [expanded, setExpanded] = useState(isSelfActive || isAnyChildActive);

  useEffect(() => {
    if (isSelfActive || isAnyChildActive) {
      setExpanded(true);
    }
  }, [isSelfActive, isAnyChildActive]);

  const IconComponent = item.icon;

  if (!hasChildren) {
    return (
      <li>
        <NavLink
          to={targetUrl}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground',
              isActive && 'bg-brand-soft font-semibold text-brand hover:bg-brand-soft hover:text-brand',
            )
          }
        >
          {IconComponent && <IconComponent className="size-4 shrink-0" aria-hidden="true" />}
          <span className="truncate">{item.label}</span>
        </NavLink>
      </li>
    );
  }

  return (
    <li className="space-y-0.5">
      <div className="flex items-center justify-between rounded-lg hover:bg-muted group">
        <NavLink
          to={targetUrl}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex-1 flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors group-hover:text-foreground',
              (isActive || isAnyChildActive) && 'font-bold text-brand',
            )
          }
        >
          {IconComponent && <IconComponent className="size-4 shrink-0 text-brand" aria-hidden="true" />}
          <span className="truncate">{item.label}</span>
        </NavLink>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
          className="p-2 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={uiText("Toggle sub-menu")}
        >
          <ChevronDown className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-180 text-brand')} />
        </button>
      </div>

      {expanded && (
        <ul className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-brand/30 ml-4">
          {item.children.map((child) => {
            const childUrl = adminUrl(child.to);
            const ChildIcon = child.icon;
            const isChildActive = currentPath === childUrl || (child.to.includes('?') && location.pathname === childUrl.split('?')[0] && location.search === child.to.slice(child.to.indexOf('?')));
            return (
              <li key={child.to}>
                <Link
                  to={childUrl}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isChildActive && 'bg-brand-soft font-bold text-brand hover:text-brand',
                  )}
                >
                  {ChildIcon && <ChildIcon className="size-3.5 shrink-0" />}
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function SidebarNav({ onNavigate }) {
  useUiLanguage();
  const { can } = useAdminAuth();
  const brand = useBrand();
  return (
    <div className="flex h-full flex-col">
      <Link to={adminUrl('')} onClick={onNavigate} className="flex items-center gap-2.5 border-b px-4 py-4">
        <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          <img src={brand.logoSrc} alt="" className="size-full object-contain" />
        </span>
        <span className="leading-tight">
          <span className="block font-heading text-sm font-extrabold">{uiText("PMS Admin")}</span>
          <span className="block text-[11px] text-muted-foreground">{uiText("Content Management")}</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label={uiText("Admin")}>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.permission || can(item.permission));
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">{group.label}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <SidebarNavItem key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function MobileSidebar() {
  useUiLanguage();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label={uiText("Open admin menu")}>
          <Menu className="size-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-2xl"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <DialogPrimitive.Title className="sr-only">{uiText("Admin navigation")}</DialogPrimitive.Title>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="absolute top-4 right-3 z-10" aria-label={uiText("Close menu")}>
                    <X />
                  </Button>
                </DialogPrimitive.Close>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </motion.aside>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export function AdminLayout({ children }) {
  useUiLanguage();
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  useGSAP(
    () => {
      if (!shouldAnimate() || !mainRef.current) return undefined;
      gsap.fromTo(mainRef.current, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power1.out', clearProps: 'opacity,visibility,transform' });
      return failSafe(mainRef.current, 1000);
    },
    { dependencies: [location.pathname] },
  );

  const initials = (admin?.name || 'A')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ConfirmProvider>
      <meta name="robots" content="noindex,nofollow" />
      <title>{uiText("PMS Admin")}</title>
      <div className="min-h-dvh bg-muted/40">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background lg:block">
          <SidebarNav />
        </aside>
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-5">
            <MobileSidebar />
            <div className="flex-1" />
            <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex">
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink />{uiText("View website")}</a>
            </Button>
            <LanguageSwitcher /><ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label={uiText("Account menu")}>
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-brand text-xs font-bold text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left text-xs leading-tight sm:block">
                    <span className="block font-semibold">{admin?.name}</span>
                    <span className="block text-muted-foreground capitalize">{uiText(admin?.role)}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{admin?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={adminUrl('account')}>
                    <UserCog />{uiText("My account")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={adminUrl('account')}>
                    <ShieldCheck />{uiText("Two-factor")}{' '}{admin?.totpEnabled ? uiText("enabled") : uiText("setup")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout} variant="destructive">
                  <LogOut />{uiText("Sign out")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main ref={mainRef} className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-6 sm:py-7">
            {children}
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
