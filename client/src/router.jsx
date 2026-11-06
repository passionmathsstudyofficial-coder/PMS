import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Navigate, createBrowserRouter } from 'react-router';
import { ADMIN_PATH } from '@/lib/config';
import Root from '@/Root.jsx';
import PublicLayout from '@/components/site/PublicLayout.jsx';
import RouteError from '@/components/site/RouteError.jsx';
import { PageSkeleton } from '@/components/site/States.jsx';
import HomePage from '@/pages/HomePage.jsx';

const lazyPage = (loader) => async () => ({ Component: (await loader()).default });

// Shown while a code-split page loads on the very first visit (no providers are available yet).
function BootSkeleton() {
  useUiLanguage();
  return (
    <div className="min-h-dvh bg-background">
      <div className="h-[var(--header-height)] border-b" />
      <PageSkeleton />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <BootSkeleton />,
    children: [
      { path: 'admin/login', lazy: lazyPage(() => import('@/admin/pages/LoginPage.jsx')) },
      { path: 'admin', element: <Navigate to={ADMIN_PATH} replace /> },
      { path: 'admin/*', element: <Navigate to={ADMIN_PATH} replace /> },
      { path: `${ADMIN_PATH}/login`, lazy: lazyPage(() => import('@/admin/pages/LoginPage.jsx')) },
      { path: `${ADMIN_PATH}/*`, lazy: lazyPage(() => import('@/admin/AdminApp.jsx')) },
      {
        element: <PublicLayout />,
        children: [
          { path: 'login', element: <Navigate to="/" replace /> },
          { path: 'register', element: <Navigate to="/" replace /> },
          ...['forgot-password', 'reset-password'].map(path => ({ path, lazy: lazyPage(() => import('@/pages/StudentAccountPage.jsx')) })),
          { index: true, element: <HomePage /> },
          { path: 'search', lazy: lazyPage(() => import('@/pages/SearchPage.jsx')) },
          { path: '*', lazy: lazyPage(() => import('@/pages/ContentPage.jsx')) },
        ],
      },
    ],
  },
]);
