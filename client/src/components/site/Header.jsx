import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ChevronRight, Search, Sparkles } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useInterfaceL10n } from '@/lib/i18n';
import { useSite, useTerm } from '@/lib/site';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { MobileMenu } from './MobileMenu.jsx';
import { SearchBar } from './SearchBar.jsx';
import { SmartLink } from './SmartLink.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-muted hover:text-foreground',
    isActive && 'text-brand',
  );

const FALLBACK_CLASSES = [
  { number: 12, url: '/class-12/maths', label: { hi: 'कक्षा 12 गणित', en: 'Class 12 Maths' } },
  { number: 11, url: '/class-11/maths', label: { hi: 'कक्षा 11 गणित', en: 'Class 11 Maths' } },
  { number: 10, url: '/class-10/maths', label: { hi: 'कक्षा 10 गणित', en: 'Class 10 Maths' } },
  { number: 9, url: '/class-9/maths', label: { hi: 'कक्षा 9 गणित', en: 'Class 9 Maths' } },
  { number: 8, url: '/class-8/maths', label: { hi: 'कक्षा 8 गणित', en: 'Class 8 Maths' } },
  { number: 7, url: '/class-7/maths', label: { hi: 'कक्षा 7 गणित', en: 'Class 7 Maths' } },
  { number: 6, url: '/class-6/maths', label: { hi: 'कक्षा 6 गणित', en: 'Class 6 Maths' } },
];

function ClassesMenu({ label }) {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const rawClasses = site?.classes?.length ? site.classes : FALLBACK_CLASSES;
  const classes = [...rawClasses].sort((a, b) => b.number - a.number);
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-9 bg-transparent px-2 xl:px-3 text-xs xl:text-sm font-semibold text-foreground/75 hover:text-brand whitespace-nowrap">
        {label || term('class')}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid w-[36rem] grid-cols-2 gap-2 p-3">
          {classes.map((cls) => (
            <Link key={cls._id || cls.number} to={cls.url} className="group flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-muted/80">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 font-heading text-sm font-extrabold text-brand transition group-hover:bg-brand group-hover:text-white">
                {cls.number}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold group-hover:text-brand">
                  {cls.name ? t(cls.name) : (t(cls.label) || `${term('class')} ${cls.number}`)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{' '}{uiText("NCERT हल · सूत्र · नोट्स")}{' '}</span>
              </span>
            </Link>
          ))}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function StudyMaterialsMenu() {
  useUiLanguage();
  const items = [
    { get title() { return uiText("NCERT Solutions"); }, get sub() { return uiText("Class 6–12 step-by-step solutions"); }, url: '/study-materials/ncert-solutions' },
    { get title() { return uiText("NCERT Books"); }, get sub() { return uiText("Latest edition textbook PDFs"); }, url: '/study-materials/ncert-books' },
    { get title() { return uiText("NCERT Notes"); }, get sub() { return uiText("Key formulas & chapter summaries"); }, url: '/study-materials/ncert-notes' },
    { get title() { return uiText("CBSE Sample Papers"); }, get sub() { return uiText("Model papers & PYQ with solutions"); }, url: '/study-materials/cbse-sample-papers' },
    { get title() { return uiText("Extra Questions"); }, get sub() { return uiText("Practice questions with steps"); }, url: '/study-materials/extra-questions' },
    { get title() { return uiText("Important Questions"); }, get sub() { return uiText("High-scoring board questions"); }, url: '/study-materials/important-questions' },
    { get title() { return uiText("English Summaries"); }, get sub() { return uiText("Concept summaries & proof guides"); }, url: '/study-materials/english-summaries' },
    { get title() { return uiText("Syllabus"); }, get sub() { return uiText("Updated CBSE curriculum & marking"); }, url: '/study-materials/syllabus' },
  ];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-9 bg-transparent px-2 xl:px-3 text-xs xl:text-sm font-semibold text-foreground/75 hover:text-brand whitespace-nowrap">{uiText("Study Materials")}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid w-[36rem] grid-cols-2 gap-2 p-3">
          {items.map((item) => (
            <Link key={item.url} to={item.url} className="group rounded-xl p-2.5 transition hover:bg-muted/80">
              <span className="block text-sm font-bold text-foreground group-hover:text-brand">
                {item.title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {item.sub}
              </span>
            </Link>
          ))}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ReferenceSolutionsMenu() {
  useUiLanguage();
  const items = [
    { get title() { return uiText("RS Aggarwal Solutions"); }, author: 'R.S. Aggarwal', get sub() { return uiText("Classes 6 to 12 solutions"); }, url: '/reference-solutions/rs-aggarwal' },
    { get title() { return uiText("RD Sharma Solutions"); }, author: 'Dr. R.D. Sharma', get sub() { return uiText("Detailed question steps & proofs"); }, url: '/reference-solutions/rd-sharma' },
    { get title() { return uiText("ML Aggarwal Solutions"); }, author: 'M.L. Aggarwal', get sub() { return uiText("Understanding Mathematics solutions"); }, url: '/reference-solutions/ml-aggarwal' },
  ];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-9 bg-transparent px-2 xl:px-3 text-xs xl:text-sm font-semibold text-foreground/75 hover:text-brand whitespace-nowrap">{uiText("Reference Solutions")}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="w-80 p-2 space-y-1">
          {items.map((item) => (
            <Link key={item.url} to={item.url} className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-muted/80">
              <div>
                <span className="block text-sm font-bold text-foreground group-hover:text-brand">
                  {item.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.sub}
                </span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-brand" />
            </Link>
          ))}
          <div className="border-t pt-1.5 mt-1">
            <Link to="/reference-solutions" className="block text-center text-xs font-bold text-brand hover:underline py-1">{' '}{uiText("Browse All Reference Books →")}{' '}</Link>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function MoreMenu() {
  useUiLanguage();
  const items = [
    { get title() { return uiText("Search Website"); }, url: '/search' },
    { get title() { return uiText("Important Formulas"); }, url: '/class-10/maths/prashnavali' },
    { get title() { return uiText("About Passion Maths"); }, url: '/about-us' },
    { get title() { return uiText("Contact Us"); }, url: '/contact' },
    { get title() { return uiText("Privacy Policy"); }, url: '/privacy-policy' },
  ];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-9 bg-transparent px-2 xl:px-3 text-xs xl:text-sm font-semibold text-foreground/75 hover:text-brand whitespace-nowrap">{uiText("More")}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="w-52 p-2 space-y-0.5">
          {items.map((item) => (
            <li key={item.url}>
              <Link to={item.url} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted hover:text-brand">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function MobileSearch() {
  useUiLanguage();
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label={uiText("Search / खोजें")}>
          <Search className="size-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-x-0 top-0 z-50 border-b bg-background p-4 shadow-xl data-open:animate-in data-open:slide-in-from-top-4">
          <DialogPrimitive.Title className="sr-only">{uiText("Search")}</DialogPrimitive.Title>
          <SearchBar autoFocus size="lg" onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Header() {
  useUiLanguage();
  const site = useSite();
  const t = useInterfaceL10n();
  const term = useTerm();
  const header = site?.settings?.header || {};
  const items = site?.navigation?.header || [];

  return (
    <header
      className={cn(
        'z-40 border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-xs transition-shadow',
        header.sticky !== false && 'sticky top-0',
      )}
    >
      <div className="container-page flex h-[var(--header-height)] items-center gap-2 sm:gap-3">
        <MobileMenu />
        <Logo className="shrink-0 mr-auto sm:hidden" showText={false} />
        <Logo className="shrink-0 hidden sm:flex mr-2 xl:mr-4" />

        <NavigationMenu viewport={false} className="hidden lg:flex shrink-0" aria-label={uiText("Main")}>
          <NavigationMenuList className="gap-0.5 xl:gap-1">
            {site?.navigationConfigured?.header ? items.map((item) => item.type === 'classes' ? (
              header.showClassPills !== false && <ClassesMenu key={item._id} label={t(item.label)} />
            ) : item.children?.length ? (
              <NavigationMenuItem key={item._id}>
                <NavigationMenuTrigger>{t(item.label)}</NavigationMenuTrigger>
                <NavigationMenuContent><div className="w-64 p-2">{item.children.map(child => <SmartLink key={child._id} to={child.url} newTab={child.newTab} className="block rounded-lg p-3 text-sm hover:bg-muted">{t(child.label)}</SmartLink>)}</div></NavigationMenuContent>
              </NavigationMenuItem>
            ) : <NavigationMenuItem key={item._id}><SmartLink to={item.url} newTab={item.newTab} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold hover:bg-muted">{t(item.label)}</SmartLink></NavigationMenuItem>) : <>
              {header.showClassPills !== false && <ClassesMenu label={term('class')} />}
              <StudyMaterialsMenu /><ReferenceSolutionsMenu /><MoreMenu />
            </>}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {header.showLanguageSwitch !== false && <LanguageSwitcher className="hidden sm:flex" />}
          {header.showSearch !== false && (
            <>
              <SearchBar className="hidden md:block w-36 lg:w-44 xl:w-64 transition-all focus-within:w-56 xl:focus-within:w-72" />
              <MobileSearch />
            </>
          )}
          {header.showThemeSwitch !== false && <ThemeToggle />}
          {header.showLoginButton && <Button size="sm" asChild><SmartLink allowAdmin to={header.loginUrl || '/login'}>{t(header.loginLabel) || uiText("Login")}</SmartLink></Button>}

        </div>
      </div>
    </header>
  );
}
